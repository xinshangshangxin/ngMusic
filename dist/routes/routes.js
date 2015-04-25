var path = require('path');
var httpServer = require('../models/httpServer');

// 为静态版本提供接口
var httpServerStatic = require('../models/httpServerStatic');

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
};

function getIndex(req, res) {
    var html = path.normalize(__dirname + '/../views/index.html');
    res.sendfile(html);
}