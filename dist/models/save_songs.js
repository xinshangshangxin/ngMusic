var mongoose = require('mongoose');
var q = require('q');

function getCodingMongodbUri() {
    try {
        return JSON.parse(process.env.VCAP_SERVICES).mongodb[0].credentials.uri;
    }
    catch (e) {
        return false;
    }
}

function getDaoCloudorLocalMongodbUri(database) {
    // 链接格式:    mongodb://user:pass@localhost:port/database
    // DaoCloud链接地址
    mongodbUri = 'mongodb://';

    if (process.env.MONGODB_USERNAME) {
        mongodbUri += process.env.MONGODB_USERNAME;

        if (process.env.MONGODB_PASSWORD) {
            mongodbUri += ":" + process.env.MONGODB_PASSWORD
        }
        mongodbUri += "@";
    }

    mongodbUri += (process.env.MONGODB_PORT_27017_TCP_ADDR || 'localhost')
        + ":" + (process.env.MONGODB_PORT_27017_TCP_PORT || 27017)
        + '/' + (process.env.MONGODB_INSTANCE_NAME || database || 'test');

    return mongodbUri;
}

function getMongodbUri() {
    var _args = arguments;
    // 返回函数 为了添加参数database
    return function(database) {
        for (var i = 0, l = _args.length; i < l; i++) {
            var fn = _args[i];
            var uri = fn(database);
            if (uri !== false) {
                return uri;
            }
        }
    }
}

var mongodbUri = getMongodbUri(getCodingMongodbUri, getDaoCloudorLocalMongodbUri)('ngmusic');
// 链接数据库
var db = mongoose.connect(mongodbUri);

// 每个用户只有一个备份
var plansSchema = new mongoose.Schema({
    userId: {type: String, default: 'shang'},
    uniqueId: {type: String},
    content: {type: String},
    saveTime: {type: Number, default: Date.now}
});

// 每次提交都备份
var backSchema = new mongoose.Schema({
    userId: {type: String, default: 'shang'},
    uniqueId: {type: String},
    content: {type: String},
    saveTime: {type: Number, default: Date.now}
});

var plansModel = db.model('plans', plansSchema);
var backModel = db.model('back', backSchema);

function addSongs(plansInfo) {
    var defered = q.defer();
    plansInfo.uniqueId = createId();

    findOneByUser(plansInfo.userId)
        .then(function(data) {
            if (data) {
                // 更新
                plansModel.findOneAndUpdate({
                        userId: plansInfo.userId
                    }, plansInfo, function(err, doc) {
                        if (err) {
                            console.log(err, 'plansModel更新数据库出错');
                            defered.reject('err');
                        }
                        else {
                            defered.resolve(doc);
                        }
                    }
                );
            }
            else {
                // 添加
                plansModel.create(plansInfo, function(err, doc) {
                        if (err) {
                            console.log(err, 'plansModel插入数据库出错');
                            defered.reject('err');
                        }
                        else {
                            defered.resolve(doc);
                        }
                    }
                );
            }
        })
        .catch(function(e) {
            defered.reject('err');
        });


    // 添加
    backModel.create(plansInfo, function(err, doc) {
            if (err) {
                console.log(err, 'backModel插入数据库出错');
            }
        }
    );


    return defered.promise;
}

/**
 * JavaScript生成GUID的算法
 * from  http://www.cnblogs.com/snandy/p/3261754.html
 * @returns {string}
 */
function createId() {
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = "-";
    return s.join("");
}

function findOne(id) {
    return plansModel.findOne({
        uniqueId: id
    }, {_id: 0});
}

function findOneByUser(id) {
    return plansModel.findOne({
        userId: id
    }, {_id: 0});
}

function removeOne(id) {
    return plansModel.findOneAndRemove({
        uniqueId: id
    });
}

function removeOneFromeBack(id) {
    return backModel.findOneAndRemove({
        uniqueId: id
    });
}

exports.addSongs = addSongs;
exports.findOne = findOne;
exports.findOneByUser = findOneByUser;
exports.removeOne = removeOne;
exports.removeOneFromeBack = removeOneFromeBack;