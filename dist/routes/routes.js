var path = require('path');
var httpServer = require('../models/httpServer');


module.exports = function(app) {
    app.get('/', getIndex);
    app.get('/getchannellist', httpServer.getchannellist);
    app.get('/getsonglink', httpServer.getSongLinks);
    app.get('/getsonginfo', httpServer.getSongInfo);
    app.get('/serverget', httpServer.serverGet);
    app.get('/getsongsbyids', httpServer.getSongsByIds);
};

function getIndex(req, res) {
    var html = path.normalize(__dirname + '/../views/index.html');
    res.sendfile(html);
}