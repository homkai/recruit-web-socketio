const Koa = require('koa');
const app = new Koa();
const auth = require('./lib/auth');
const session = require('koa-generic-session');
const serve = require('koa-static');
const multer = require('koa-multer');
const {store: ssStore, getSid, getSS, ssPrefix, ssKey} = require('./lib/store');
const router = require('koa-router')();
const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);

const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const moment = require('moment');

const userModel = require('./models/user');
const {getPassTemp, setPassTemp, delayPassTemp} = require('./lib/pass');

const PUBLIC_DIR = path.join(__dirname, '../public');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

app.keys = ['some secret hurr'];

const CONFIG = {
    key: ssKey,
    prefix: ssPrefix,
    store: ssStore
};

// custom 401 handling
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        if (401 == err.status) {
            ctx.status = 401;
            ctx.set('WWW-Authenticate', 'Basic');
            ctx.body = '请先登录';
        } else {
            throw err;
        }
    }
});

app.use(session(CONFIG, app));

// auth
app.use(auth());

router.get('/', async ctx => {
    ctx.type = 'html';
    ctx.body = fs.createReadStream(path.resolve(PUBLIC_DIR, 'index.html'));
});

router.get('/getPass', async ctx => {
    if (!ctx.session.isAdmin) {
        return ctx.throw(404);
    }
    ctx.type = 'html';
    let passTemp;
    if (passTemp = getPassTemp()) {
        const expires = delayPassTemp(passTemp);
        ctx.body = `密码：${passTemp.pass}<br>过期时间：${expires}`;
        return;
    }
    const pass = _.random(1000, 9999) + '';
    const expires = setPassTemp(pass);
    ctx.body = `密码：${pass}<br>过期时间：${expires}`;
});

const storage = multer.diskStorage({
    //文件保存路径
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
    },
    //修改文件名称
    filename: async function (req, file, cb) {
        const ext = (file.originalname).split(".").reverse()[0];
        const sid = getSid(req.headers.cookie);
        const ss = await getSS(sid);
        cb(null, moment().format('MMDDHHmmssSSS') + '-' + ss.userName + "." + ext);
    }
});
const upload = multer({
    storage,
    limits: {
        files: 1,
        fileSize: 1 * 1024 * 1024
    },
    fileFilter(req, file, cb) {
        const ext = (file.originalname).split(".").reverse()[0];
        if (['zip'].includes(ext)) {
            return cb(null, true);
        }
        return cb('必须是zip类型', false);
    }
});

router.post('/upload', async ctx => {
    ctx.type = 'html';
    try {
        await upload.single('file')(ctx);
    }
    catch (err) {
        ctx.body = '<h4>必须是zip类型，1M以内！</h4>';
        return;
    }
    const userList = await userModel.update({name: ctx.session.userName}, {submitTime: moment().format('MM-DD HH:mm:ss')});
    io.sockets.emit('sync userList', userList);
    ctx.body = '<h3>上传成功！</h3><script>setTimeout(function () {location.href = "/"}, 3000)</script>';
});


app.use(router.routes());

app.use(serve(PUBLIC_DIR));


io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('disconnect', async () => {
        const sid = getSid(socket.handshake.headers.cookie);
        const ss = await getSS(sid);
        if (!sid || !ss || !ss.userName) {
            return socket.emit('reload');
        }
        const userList = await userModel.update({name: ss.userName}, {on: false});
        socket.broadcast.emit('sync userList', userList);
        console.log('user disconnected' + ` ${ss.userName}`);
    });

    socket.on('reconnect', async () => {
        const sid = getSid(socket.handshake.headers.cookie);
        const ss = await getSS(sid);
        if (!sid || !ss || !ss.userName) {
            return socket.emit('reload');
        }
    });

    socket.on('login', async ({from}, send) => {
        const ip = socket.handshake.address.split(':').reverse()[0];
        const sid = getSid(socket.handshake.headers.cookie);
        const ss = await getSS(sid);
        if (!sid || !ss || !ss.userName) {
            return socket.emit('reload');
        }
        const userList = await userModel.add({name: ss.userName, sid, ip});
        const user = await userModel.find(ss.userName);
        console.log('user login' + ` ${ss.userName}`);
        send(user);
        socket.emit('sync userList', userList);
        socket.broadcast.emit('sync userList', userList);
    });

    socket.on('update user', async ({id, data}) => {
        const userList = await userModel.update({id}, data);

        socket.emit('sync userList', userList);
        socket.broadcast.emit('sync userList', userList);
    });

    socket.on('sync userList for admin', async ({}, send) => {
        const sid = getSid(socket.handshake.headers.cookie);
        const ss = await getSS(sid);
        if (!sid || !ss || !ss.userName || !ss.isAdmin) {
            return socket.emit('reload');
        }

        const userList = await userModel.listForAdmin();
        send(userList);
    });
});

server.listen(666);