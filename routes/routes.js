var jwt = require('jsonwebtoken');
var path = require('path');
var httpServer = require('../models/httpServer');

var superSecret = process.env.superSecret || 'shang';


// 为静态版本提供接口
var httpServerStatic = require('../models/httpServerStatic');
var songServer = require('../models/song_server');

module.exports = function(app) {
    app.get('/', getIndex);
    app.get('/getchannellist', httpServer.getchannellist);
    app.get('/getsonglink', httpServer.getSongLinks);
    app.get('/getsonginfo', httpServer.getSongInfo);
    app.get('/serverget', httpServer.serverGet);
    app.get('/getsongsbyids', httpServer.getSongsByIds);


    // 为静态版本提供接口
    app.get('/node/getchannellist', httpServerStatic.getchannellist);
    app.get('/node/getsonglink', httpServerStatic.getSongLinks);
    app.get('/node/getsonginfo', httpServerStatic.getSongInfo);
    app.get('/node/serverget', httpServerStatic.serverGet);
    app.get('/node/serverjson', httpServerStatic.serverJson);
    app.get('/node/getsongsbyids', httpServerStatic.getSongsByIds);
    
    
    // 获取 用户歌曲列表
    app
        .options('/node/usersongs', function(req, res) {
            res.setHeader('Access-Control-Allow-Origin', 'http://ngmusic.xinshangshangxin.com');
            res.setHeader('Access-Control-Allow-Credentials', true);
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
            res.setHeader("Access-Control-Allow-Headers", 'x-access-token, Content-Type'); //请求头类型
            res.send(200);
        })
        .get('/node/usersongs', check, function(req, res) {
            console.log(req.decoded);
            songServer.getSongs(req, res);
        })
        .put('/node/usersongs', check, function(req, res) {
            console.log(req.decoded);
            songServer.putSongs(req, res);
        });

    // 获取 用户歌曲列表
    app
        .options('/usersongs', function(req, res) {
            res.setHeader('Access-Control-Allow-Origin', 'http://ngmusic.xinshangshangxin.com');
            res.setHeader('Access-Control-Allow-Credentials', true);
            res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
            res.setHeader("Access-Control-Allow-Headers", 'x-access-token, Content-Type'); //请求头类型
            res.send(200);
        })
        .get('/usersongs', check, function(req, res) {
            console.log(req.decoded);
            songServer.getSongs(req, res);
        })
        .put('/usersongs', check, function(req, res) {
            console.log(req.decoded);
            songServer.putSongs(req, res);
        })
};

function getIndex(req, res) {
    var html = path.normalize(__dirname + '/../views/index.html');
    res.sendfile(html);
}


function check(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://ngmusic.xinshangshangxin.com');
    res.setHeader('Access-Control-Allow-Credentials', true); //是否支持cookie跨域
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader("Access-Control-Allow-Headers", 'x-access-token'); //请求头类型

    //检查post的信息或者url查询参数或者头信息
    var token = req.body.token || req.query.token
        || req.headers['x-access-token'] || req.cookies.token;
    if (token) {
        // 确认token
        jwt.verify(token, superSecret, function(err, decoded) {
            if (err) {
                res.send({
                    errCode: -1,
                    data: 'token错误'
                });
            }
            else {
                // 如果没问题就把解码后的信息保存到请求中，供后面的路由使用
                req.decoded = decoded;
                next();
            }
        });
    }
    else {
        res.send({
            errCode: -1,
            data: '没有token'
        });
    }
}