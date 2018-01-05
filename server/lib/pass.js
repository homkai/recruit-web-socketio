/**
 * @file 工具
 */
const path = require('path');
const moment = require('moment');
const fs = require('fs');
const PASS_TEMP = path.resolve(__dirname, '../../temp/pass.temp');

// 有效时间（秒）
const EXPIRES = 150;
const DELAY = 90;

exports.getPassTemp = () => {
    let passTemp;
    try {
        passTemp = JSON.parse(fs.readFileSync(PASS_TEMP).toString());
    }
    catch (e) {
        return null;
    }
    return moment(passTemp.expires).isAfter(moment()) ? passTemp : null;
};

exports.setPassTemp = pass => {
    const expires = moment(Date.now() + EXPIRES * 1000).format('YYYY-MM-DD HH:mm:ss');
    fs.writeFileSync(PASS_TEMP, JSON.stringify({
        pass,
        expires
    }));
    return expires;
};

exports.delayPassTemp = passTemp => {
    if ((moment(passTemp.expires) - moment()) / 1000 > DELAY) {
        return passTemp.expires;
    }
    const expires = moment(Date.now() + DELAY * 1000).format('YYYY-MM-DD HH:mm:ss');
    fs.writeFileSync(PASS_TEMP, JSON.stringify({
        pass: passTemp.pass,
        expires
    }));
    return expires;
};