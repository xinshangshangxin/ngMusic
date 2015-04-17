var path = require('path');
var httpServer = require('../models/httpServer');
var userInfoSave = require('../models/userInfoSave');


module.exports = function(app) {
    app.get('/', getIndex);
    app.get('/getchannellist', httpServer.getchannellist);
    app.get('/getsonglink', httpServer.getSongLinks);
    app.get('/getsonginfo', httpServer.getSongInfo);
    app.get('/serverget', httpServer.serverGet);
    app.get('/getsongsbyids', httpServer.getSongsByIds);
    app.post('/savelist', userInfoSave.saveList);
};

function getIndex(req, res) {
    var html = path.normalize(__dirname + '/../views/index.html');
    res.sendfile(html);
}