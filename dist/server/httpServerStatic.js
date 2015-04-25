var http = require('http');
var request = require('request');
var url = require('url');
var async = require('async');
var log4js = require('log4js');
var logger = log4js.getLogger();
logger.setLevel('INFO');

//var iconv = require('iconv-lite');
//var BufferHelper = require('bufferhelper'); // bufferHelper.concat(chunk);
//var querystring = require('querystring');


function getSongLinks(req, res) {
    logger.info('start getSongLinks');
    async.waterfall([
        function(cb) {
            console.log(url.parse(req.url, true).query.id)
            if (req.url && url.parse(req.url, true) && url.parse(req.url, true).query.id) {
                var id = url.parse(req.url, true).query.id;
                request.get('http://fm.baidu.com/dev/api/?tn=playlist&id=' + id, function(error, response, body) {
                    if (error) {
                        cb('http://fm.baidu.com/dev/api/?tn=playlist&id=' + error);
                    }
                    var list = JSON.parse(body).list;
                    cb(null, list.map(function(obj) {
                        return obj.id;
                    }));
                });
            }
            else {
                cb('url error');
            }
        },
        function(arr, cb) {
            getSongs(arr, cb);
        }
    ], function(err, result) {
        if (err) {
            logger.error(err);
            res.end('');
        }
        else {
            res.end(result);
        }
    });
}

function getSongsByIds(req, res) {
    var arr = [];
    try {
        arr = JSON.parse(url.parse(req.url, true).query.data).ids;
    }
    catch (e) {
        arr = [];
    }
    finally {
        getSongs(arr, function(error, data) {
            if (error) {
                res.end('');
            }
            else {
                res.end(data);
            }
        });
    }
}

function getSongs(arr, cb) {
    var options = {
        url: 'http://fm.baidu.com/data/music/songlink',
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.89 Safari/537.36'
        },
        form: {
            songIds: arr.join(',')
        }
    };
    request(options,
        function(error, response, body) {
            if (!error && response.statusCode === 200) {
                try {
                    cb(null, body);
                }
                catch (e) {
                    logger.error(e);
                    cb('request songlink');
                }
            }
        });
}

function getSongInfo(req, res) {
    if (req.url && url.parse(req.url, true) && url.parse(req.url, true).query.id) {
        request.post({
            url: 'http://ting.baidu.com/data/music/links',
            form: {songIds: url.parse(req.url, true).query.id}
        }, function(err, httpResponse, body) {
            if (err) {
                res.end(err);
            }
            else {
                res.end(body);
            }
        });
    }
}

function serverPipe(req, res) {
    request.get(url.parse(req.url, true).query.url).pipe(res);
}

function serverJson(req, res) {
    request.get(url.parse(req.url, true).query.url, function(error, response, body) {
        res.end(JSON.stringify({
            data: body
        }));
    });
}


http.createServer(function(req, res) {
    // 跨域支持
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
        "Access-Control-Allow-Methods",
        "PUT, GET, POST, DELETE, HEAD, PATCH"
    );

    logger.info(req.url);
    var fun = url.parse(req.url, true).pathname.replace(/^\/node/, '');

    switch (fun) {
        case '/getchannellist':
        {
            request.get('http://fm.baidu.com/dev/api/?tn=channellist').pipe(res);
            break;
        }
        case '/getsonglink':
        {
            getSongLinks(req, res);
            break;
        }
        case '/getsonginfo':
        {
            getSongInfo(req, res);
            break;
        }
        case '/serverget':
        {
            serverPipe(req, res);
            break;
        }
        case '/getsongsbyids':
        {
            getSongsByIds(req, res);
            break;
        }
        case '/serverjson':
        {
            serverJson(req, res);
            break;
        }
        default:
        {
            res.end('路径错误');
        }
    }
}).listen(1340, '0.0.0.0');
logger.info('0.0.0.0:1340');