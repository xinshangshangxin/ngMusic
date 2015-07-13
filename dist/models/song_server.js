var saveSongs = require('../models/save_songs');

function putSongs(req, res) {
    var plans = req.body.songs;
    var obj = {};
    obj.content = plans;
    obj.userId = req.decoded;
    console.log(plans);
    saveSongs.addSongs(obj)
        .then(function(doc) {
            res.send({
                errCode: 0
            });
        })
        .catch(function(err) {
            res.send({
                errCode: -1
            });
        });
}

function getSongs(req, res) {
    saveSongs
        .findOneByUser(req.decoded)
        .then(function(data) {
            res.send({
                errCode: 0,
                data: data ? data.content : ''
            });
        })
        .catch(function(err) {
            res.send({
                errCode: -1,
                data: err
            })
        });
}

exports.putSongs = putSongs;
exports.getSongs = getSongs;