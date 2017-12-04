const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const fs = require('fs');

const WORK_PORT = 8881;
const USER_TEMP = path.resolve(__dirname, '../../temp/user.temp');
let userList;
try {
    const temp = fs.readFileSync(USER_TEMP).toString();
    userList = temp ? JSON.parse(temp) : [];
}
catch (e) {
    userList = []
}

exports.update = (condition, next) => {
    return new Promise((resolve, reject) => {
        const user = _.find(userList, condition);
        if (!user) {
            return reject('Invalid user');
        }

        userList = userList.map(item => {
            if (item !== user) {
                return item;
            }
            if (user.on && !next.on) {
                next.logoutTime = moment().format('YYYY-MM-DD HH:mm:ss');
            }
            return {
                ...item,
                ...next
            };
        });

        fs.writeFileSync(USER_TEMP, JSON.stringify(userList));
        return resolve(filter(userList));
    });
};

exports.list = () => {
    return Promise.resolve(filter(userList));
};

exports.listForAdmin = () => {
    return Promise.resolve(userList.filter(item => item.name/* !== 'admin'*/).map(item => ({
        ..._.omit(item, ['sid']),
        loginTime: moment(item.loginTime).format('MM-DD HH:mm:ss')
    })));
};

exports.add = user => {
    const old = _.find(userList, {name: user.name});
    let loginTime = moment().format('YYYY-MM-DD HH:mm:ss');
    let submitTime = '';
    if (old && !old.on && old.logoutTime && (moment() - moment(old.logoutTime) < 30 * 1000)) {
        loginTime = old.loginTime;
        submitTime = old.submitTime;
    }
    userList = userList.filter(item => item !== old).concat({
        name: user.name,
        sid: user.sid,
        ip: user.ip,
        workPort: WORK_PORT,
        loginTime,
        submitTime,
        on: true
    });
    fs.writeFileSync(USER_TEMP, JSON.stringify(userList));
    return Promise.resolve(filter(userList));
};

exports.find = name => {
    const user = _.find(userList, {name});
    return user ? _.omit(user, ['sid', 'ip']) : undefined;
};

exports.hasSid = sid => _.find(userList, {sid});

function filter(list) {
    return list.filter(item => item.name !== 'admin').map(item => ({
        ..._.omit(item, ['sid', 'ip']),
        loginTime: moment(item.loginTime).format('MM-DD HH:mm:ss')
    }));
}