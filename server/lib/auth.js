const basicAuth = require('basic-auth');
const path = require('path');
const fs = require('fs');
const {getPassTemp} = require('./pass');

const USER_LIST_CONFIG = path.resolve(__dirname, '../../config/user-list.conf');
const ADMIN_PASS_CONFIG = path.resolve(__dirname, '../../config/admin-pass.conf');

module.exports = function () {
    return (ctx, next) => {
        if (ctx.session.userName) {
            return next();
        }

        /**
         * @type {{name, pass}|undefined}
         */
        const user = basicAuth(ctx);

        if (!user) {
            return forbid(ctx);
        }

        try {
            if (user.name === 'admin') {
                const isPass = user.pass === fs.readFileSync(ADMIN_PASS_CONFIG).toString().trim();
                return isPass ? login(ctx, user, next) : forbid(ctx);
            }

            const userList = fs.readFileSync(USER_LIST_CONFIG).toString().replace(/\r/g, '').split('\n');
            if (!~userList.indexOf(user.name)) {
                return forbid(ctx);
            }
            const passTemp = getPassTemp();
            if (user.pass !== passTemp.pass) {
                return forbid(ctx);
            }

            return login(ctx, user, next);
        }
        catch (e) {
            ctx.body = '登陆失败，请联系主考';
        }

        return forbid(ctx);
    };
};

function login(ctx, {name}, next) {
    if (name === 'admin') {
        ctx.session.isAdmin = true;
    }
    ctx.session.userName = name;
    next();
}


function forbid(ctx) {
    ctx.throw(401);
}