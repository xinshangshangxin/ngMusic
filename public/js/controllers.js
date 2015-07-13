var mainModule = angular.module('MainModule', ['imgModule']);
var SEARCHURL = 'http://cors.coding.io';
var SERVERURL = 'http://ngmusic.coding.io/node';
//var SERVERURL = 'http://localhost:1340/node';

var LOGINURL = 'http://iuser.coding.io';

mainModule.directive("loadchannel", ['$rootScope', 'MusicFactory', 'MessageFactory', function($rootScope, MusicFactory, MessageFactory) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var id = ele.attr('data-id');
                $rootScope.name = '随心听: ' + ele.attr('data-name');
                $rootScope.$apply();
                MusicFactory.updateList(id);
                MessageFactory.channelChange();
                MessageFactory.loadingBroadcast(true, '加载中...');
            });
        }
    }
}]);

mainModule.directive("pauseaudio", ['MusicFactory', function(MusicFactory) {
    return {
        restrict: "A",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                MusicFactory.playorpauseSong();
            });
        }
    }
}]);

mainModule.directive('removespan', ['MusicFactory', function(MusicFactory) {
    return {
        restrict: "A",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var index = ele.parent().attr('data-index');
                var isUsrPlay = MusicFactory.getSetting('isUsrPlay');
                console.log('isUsrPlay', isUsrPlay);
                if (isUsrPlay) {
                    MusicFactory.removeSong(index);
                }
                else {
                    MusicFactory.addOneSong(index, false);
                }
            });
        }
    }
}]);

mainModule.directive("playaudio", ['MusicFactory', function(MusicFactory) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var index = ele.attr('data-index');
                console.log('searchMode', MusicFactory.getSetting('searchMode'));
                if (MusicFactory.getSetting('searchMode')) {
                    MusicFactory.addOneSong(index, false);
                    MusicFactory.changePlayer(0);
                }
                else {
                    MusicFactory.playSong(index);
                }
            });
        }
    }
}]);

mainModule.directive('detectiveenter', ['MusicFactory', function(MusicFactory) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on('keydown', function(e) {
                if (e.keyCode === 13) {
                    MusicFactory.changePlayer(2, ele[0].value);
                }
            });
        }
    }
}]);

mainModule.directive('progressdiv', ['MusicFactory', function(MusicFactory) {
    return {
        restrict: 'AE',
        link: function(scope, ele) {
            var isProgressBar = false;
            var currentProgressEle = document.getElementById('currentprogress');
            var loadedprogressEle = document.getElementById('loadedprogress');

            function docmove(e) {
                if (isProgressBar) {
                    var rect = ele[0].getBoundingClientRect();
                    var loadedprogressEleLen = loadedprogressEle.getBoundingClientRect().width;
                    var nu = e.x - rect.left;
                    if (nu > loadedprogressEleLen) {
                        nu = loadedprogressEleLen;
                    }
                    else if (nu > rect.width) {
                        nu = rect.width;
                    }
                    currentProgressEle.style.width = nu + 'px';
                    MusicFactory.setAudiocurrentTime(nu / rect.width);
                }
                e.stopPropagation();
                e.preventDefault();
                return false;
            }

            ele.on('mousedown', function() {
                isProgressBar = true;
                document.addEventListener('mousemove', docmove);
            });
            document.addEventListener('mouseup', function(e) {
                docmove(e);
                isProgressBar = false;
                document.removeEventListener('mousemove', docmove);
            });
        }
    }
}]);

mainModule.factory('MusicFactory', ['$http', '$q', '$rootScope', 'MessageFactory', function($http, $q, $rootScope, MessageFactory) {
    var _timer = null;
    var _audio = new Audio();
    var _lrcObj = null;
    var _userSongIds = [5963228];
    var _userSongList = [];
    //var _tempAudioList = [];

    var setting = {
        currentHadPlayedNu: 0,
        audioList: [],
        currentIndex: -1,
        playMode: 0,            // 0 列表循环 1 单曲循环 2 随机播放
        isUsrPlay: true,
        isplaying: false,
        channelList: [],
        searchMode: false
    };


    function easyExtend(o1, o2) {
        for (var attr in o1) {
            if (o2.hasOwnProperty(attr)) {
                o1[attr] = o2[attr];
            }
        }
    }

    function _localSaveUsrInfo() {
        var temp = {};      // 去除 不需要的信息保存
        for (var attr in setting) {
            if (setting.hasOwnProperty(attr) && attr != 'audioList' && attr != 'channelList') {
                temp[attr] = setting[attr];
            }
        }

        // 不影响主线程下 尽可能早的保存;
        setTimeout(function() {
            localStorage.setItem('shang_music', JSON.stringify({
                'setting': temp,
                'userSongIds': _userSongIds
            }));
        });
    }


    function _getSongs() {
        var derered = $q.defer();
        MessageFactory.loadingBroadcast(true, '获取中~~', 1000);
        $http({
            url: SERVERURL + '/usersongs',
            method: 'GET',
            headers: {
                'x-access-token': localStorage.getItem('token')
            },
            withCredentials: true
        }).success(function(data) {
            MessageFactory.loadingBroadcast(false);
            if (data.errCode === -1) {
                derered.reject('请重新登录~');
            }
            else {
                _userSongIds = JSON.parse(data.data) || _userSongIds;
                derered.resolve(_userSongIds);
            }
        }).error(function() {
            derered.reject('请重新登录~');
        });

        return derered.promise;
    }

    function _upload(ishow) {
        $http
            .put(SERVERURL + '/usersongs', {
                songs: JSON.stringify(_userSongIds)
            }, {
                headers: {
                    'x-access-token': localStorage.getItem('token')
                },
                'withCredentials': true
            }).success(function(data) {
                if (data.errCode !== 0) {
                    console.log('data.errCode === -1   ' + data.data);
                    location.href = '/#/login';
                }
                else {
                    ishow && MessageFactory.toastBroadcast(true, '上传成功!', 3000);
                }
            })
            .error(function() {
                console.log('put err');
                location.href = '/#/login';
            });
    }


    var localSave = localStorage.getItem('shang_music');
    var localSetting;
    if (localSave) {
        try {
            var obj = JSON.parse(localSave);
            localSetting = obj.setting || {};
            _userSongIds = obj.userSongIds || [];
        }
        catch (e) {
            localSetting = {};
            _userSongIds = [];
        }
        finally {
            easyExtend(setting, localSetting);
        }
    }


    _audio.onerror = function() {
        console.log('_audio.src', _audio.src);
        if (/\/null$/.test(_audio.src)) {
            console.log('match null src');
        }
        else if (setting.currentHadPlayedNu <= 2) {
            setTimeout(function() {
                _audio.src = setting.audioList[setting.currentIndex].songLink;
                _audio.play();
                setting.currentHadPlayedNu++;
                console.log('重新加载   ' + setting.currentHadPlayedNu);
            }, 500);
        }
        else {
            clearTimeout(_timer);
            _timer = setTimeout(function() {
                setting.currentHadPlayedNu = 0;
                MessageFactory.toastBroadcast(true, '加载失败,播放下一首(┬＿┬)', 1000);
                _playNextSong();
            }, 1000);
        }
    };
    _audio.ontimeupdate = function() {
        $rootScope.time = calculateTime();
        $rootScope.$apply();
        loadedprogressLen();
    };
    _audio.onended = function() {
        if (setting.playMode === 1) {
            console.log('单曲循环');
            _playSong(setting.currentIndex);
        }
        else if (setting.playMode === 0) {
            console.log('列表循环');
            _playNextSong();
        }
        else {
            console.log('随机播放');
            var l = setting.audioList.length;
            _playSong(Math.floor(Math.random() * l));
        }
    };

    var loadedprogressEle = document.getElementById('loadedprogress');
    var progressbarEle = document.getElementById('progressbar');
    var currentProgressEle = document.getElementById('currentprogress');
    var maxlen = 0;

    function loadedprogressLen() {
        if (!loadedprogressEle) {
            loadedprogressEle = document.getElementById('loadedprogress');
            progressbarEle = document.getElementById('progressbar');
            currentProgressEle = document.getElementById('currentprogress');
            maxlen = progressbarEle.getBoundingClientRect().width || 0;
        }
        else {
            loadedprogressEle.style.width = getBufferPercent() * maxlen + 'px';
            currentProgressEle.style.width = (_audio.currentTime / _audio.duration) * maxlen + 'px';
        }
    }

    function _playNextSong() {
        console.log('palysong index', (setting.currentIndex + 1) % setting.audioList.length);
        _playSong((setting.currentIndex + 1) % setting.audioList.length);
    }

    function _playSong(nu) {
        _clearProgress();
        if (nu || nu === 0) {
            setting.currentIndex = parseInt(nu);
        }

        if (setting.currentIndex === -1 || setting.currentIndex >= setting.audioList.length) {
            console.log('播放参数错误!');
            //$rootScope.$broadcast('clear');
            return;
        }
        console.log('当前播放nu=   ' + setting.currentIndex);
        _upload();
        playAndAddLrc();
        _localSaveUsrInfo();
    }

    function playAndAddLrc() {
        //_audio.src = null;
        //_audio.load();
        _audio.src = setting.audioList[setting.currentIndex].songLink;
        _audio.play();
        setting.isplaying = true;

        $rootScope.alltime = calculateTime(setting.audioList[setting.currentIndex].time);
        $rootScope.$broadcast('current.update');
        $rootScope.currentIndex = setting.currentIndex;
        MessageFactory.toastBroadcast(true, setting.audioList[setting.currentIndex].songName, 2000);

        _lrcObj = shangLrcLoad.getInstance(_audio, 'lrcdiv');
        $http.get(SEARCHURL + '?method=get&callback=obj&url=http://music.baidu.com' + setting.audioList[setting.currentIndex].lrcLink)
            .success(function(data) {
                _lrcObj.loadNewLrc(data.data, 0);

            })
            .error(function() {
                _lrcObj.loadNewLrc('[00:00]未找到(┬＿┬)', 0);
            });
    }

    function calculateTime(all) {
        all = all || _audio.currentTime;
        var minute = Math.floor(all / 60);
        var second = Math.round(all % 60) < 10 ? "0" + Math.round(all % 60) : Math.round(all % 60);
        return minute + ':' + second;
    }

    function _changeLrcTime(nu) {
        if (_lrcObj && _audio) {
            _lrcObj.setRepaireTimeNu(parseInt(_lrcObj.getRepaireTimeNu()) + parseInt(nu));
            MessageFactory.toastBroadcast(true, _lrcObj.getRepaireTimeNu() / 10 + '', 3000);
        }
    }

    function filterSongs(result, isAdd2UsrSongList) {

        if (!result || !result.data || !result.data.songList) {
            setting.audioList = [];
            return;
        }
        var songArr = result.data.songList;
        var tempArr = songArr.filter(function(value) {
            if (value.songLink && /file\.qianqian\.com/.test(value.songLink) && !/serverget\?url/.test(value.songLink)) {
                // 网盘音乐可能导致整个服务器崩溃, 先分流, 待解决问题!!
                value.songLink = 'http://cors4ngmusic.coding.io/?fun=fun&ngmusic=ngmusic&url=' + encodeURIComponent(value.songLink);
            }
            else if (value.songLink) {
                value.songLink = value.songLink.replace('http://yinyueshiting.baidu.com/data2/music/', 'http://musicdata.baidu.com/data2/music/');
            }
            return value.rate;
        });
        setting.audioList = tempArr;
        if (isAdd2UsrSongList) {
            _userSongList = tempArr;
        }
    }

    function _searchSong(value) {
        if (!value) {
            return;
        }
        value = value.trim();
        if (value) {
            var defer = $q.defer();
            //MessageFactory.loadingBroadcast(true, '搜索中.....');
            $http.get(SEARCHURL + '?method=get&url=' + encodeURIComponent('http://sug.music.baidu.com/info/suggestion?format=json&word=' + value + '&version=2&from=0'))
                .success(function(data) {
                    defer.resolve(data);
                })
                .error(function(error) {
                    console.log('搜索歌曲出错', error);
                    defer.resolve('');
                });
            return defer.promise;
        }
    }

    function _channelList() {
        var defer = $q.defer();
        $http.get(SERVERURL + '/getchannellist').success(function(data) {
            defer.resolve(data.channel_list);
        }).error(function(err) {
            defer.reject(err);
        });
        return defer.promise;
    }


    function _songlink(id) {
        var defer = $q.defer();
        $http.get(SERVERURL + '/getsonglink?id=' + id).success(function(arr) {
            defer.resolve(arr);
        }).error(function(err) {
            defer.reject(err);
        });
        return defer.promise;
    }

    function _updateList(id) {
        var promise = _songlink(id);
        promise.then(function(result) {
            filterSongs(result);
            $rootScope.$broadcast('aduioList.update');
        }, function(err) {
            console.log('更新列表失败   ' + err);
            setting.audioList = [];
            $rootScope.$broadcast('aduioList.update');
        });
    }

    function getChannelsAndPlay() {
        var promise = _channelList();
        promise.then(function(data) {
            setting.channelList = data;
            var ran = Math.floor(Math.random() * data.length);
            _updateList(ran);
            MessageFactory.channelChange();
            MessageFactory.loadingBroadcast(true, data[ran].channel_name);
            $rootScope.name = data[ran].channel_name;
        }, function(err) {
            console.log('加载channel出错', err);
        });
    }

    function getBufferPercent() {
        if (!_audio) {
            return 0;
        }
        var timeRanges = _audio.buffered;
        if (timeRanges.length) {
            // 获取以缓存的时间
            var timeBuffered = timeRanges.end(timeRanges.length - 1);
            // 获取缓存进度，值为0到1
            return timeBuffered / _audio.duration;
        }
    }


    function _clearProgress() {
        if (loadedprogressEle && currentProgressEle) {
            loadedprogressEle.style.width = '0px';
            currentProgressEle.style.width = '0px';
        }
    }

    function _removeSong(index) {
        var nu = parseInt(index);
        if (setting.audioList.length === 1 || nu <= -1) {
            setting.audioList = [];
            _userSongIds = [];
            setting.currentIndex = -1;
            //$rootScope.$broadcast('searchback.update');
            $rootScope.$broadcast('clear');
            _localSaveUsrInfo();
            return;
        }
        else if (nu === setting.currentIndex) {
            _playNextSong();
        }
        setting.audioList.splice(nu, 1);
        _userSongIds.splice(nu, 1);
        if (nu <= setting.currentIndex) {
            console.log('currentIndex', -1);
            setting.currentIndex -= 1;
        }
        console.log(setting.currentIndex);
        $rootScope.currentIndex = setting.currentIndex;
        $rootScope.$broadcast('searchback.update');
        console.log(setting.audioList);
        _localSaveUsrInfo();
        _upload();
    }


    $rootScope.$on('clear', function() {
        console.log('MusicFactory clear');
        _lrcObj = shangLrcLoad(_audio, 'lrcdiv');
        _lrcObj.parseLrc('');
        _lrcObj.setRepaireTimeNu(0);
        _lrcObj.init();
        _audio.src = null;
        _audio.load();
    });


    return {
        channelList: _channelList,
        songlink: _songlink,
        getSongInfo: function(id) {
            var defer = $q.defer();
            $http.get(SERVERURL + '/getsonginfo?id=' + id).success(function(arr) {
                defer.resolve(arr);
            }).error(function(err) {
                defer.reject(err);
            });
            return defer.promise;
        },
        updateList: _updateList,
        getAudioList: function() {
            return setting.audioList;
        },
        playSong: _playSong,
        playorpauseSong: function(isplay) {
            if (isplay) {
                _audio.pause();
                setting.isplaying = false;
            }
            else {
                _audio.play();
                setting.isplaying = true;
            }
        },
        playNextSong: _playNextSong,
        playPrevSong: function() {
            this.playSong((setting.currentIndex - 1 + setting.audioList.length) % setting.audioList.length);
        },
        getCurrentSong: function() {
            return setting.audioList[setting.currentIndex];
        },
        changePlayer: function(playMode, value) {
            // 0 userplay  1 channelplay 2 searchplay 3, back    other usrplay
            MessageFactory.loadingBroadcast(true, '加载中...');
            setting.searchMode = false;
            setting.isUsrPlay = (playMode === 0);
            if (playMode === 0) {

                var ishadAllUsr = true;
                // clone 排序
                var tempUsrSongsList = _userSongList.slice(0).sort(function(s1, s2) {
                    return s1.songId - s2.songId;
                });
                var tempUsrSongIds = _userSongIds.slice(0).sort(function(i1, i2) {
                    return i1 - i2;
                });

                for (var i = 0; i < tempUsrSongIds.length; i++) {
                    if (!tempUsrSongsList[i] || tempUsrSongIds[i] !== tempUsrSongsList[i].songId) {
                        ishadAllUsr = false;
                    }
                }

                if (ishadAllUsr) {
                    setting.isUsrPlay = true;
                    setting.audioList = _userSongList;
                    $rootScope.$broadcast('mode.update');
                    MessageFactory.loadingBroadcast();
                    return;
                }

                console.log(_userSongIds, _userSongList);

                MessageFactory.loadingBroadcast(true, '自定义播放列表');
                $http.get(SERVERURL + '/getsongsbyids?data='
                    + encodeURIComponent(JSON.stringify({
                        ids: _userSongIds
                    })))
                    .success(function(result) {
                        filterSongs(result, true);
                        setting.isUsrPlay = true;
                        $rootScope.$broadcast('mode.update');
                        MessageFactory.loadingBroadcast();
                    })
                    .error(function(error) {
                        console.log(error);
                        MessageFactory.loadingBroadcast();
                    }
                );
            }
            else if (playMode === 1) {
                MessageFactory.loadingBroadcast();
                getChannelsAndPlay();
            }
            else if (playMode === 2) {
                setting.searchMode = true;
                console.log(setting.isUsrPlay);
                MessageFactory.loadingBroadcast(true, '搜索' + value + '中...');
                var promise = _searchSong(value);
                console.log(promise);
                if (!promise) {
                    MessageFactory.toastBroadcast(true, '请输入内容', 3000);
                    MessageFactory.loadingBroadcast();
                    return;
                }
                promise.then(function(data) {
                    setting.isUsrPlay = false;
                    //_tempAudioList = setting.audioList;
                    var arr = data.data.song;
                    arr = arr.map(function(obj) {
                        return obj.songid;
                    });
                    $http.get(SERVERURL + '/getsongsbyids?data=' + encodeURIComponent(JSON.stringify({
                            ids: arr
                        })))
                        .success(function(result) {
                            filterSongs(result);
                            console.log('setting.audioList', setting.audioList);
                            $rootScope.$broadcast('search.update');
                            MessageFactory.loadingBroadcast();
                        })
                        .error(function(error) {
                            console.log(error);
                            MessageFactory.loadingBroadcast();
                        }
                    );
                });
            }
            else if (playMode === 3) {
                MessageFactory.loadingBroadcast();
                setting.audioList = _userSongList;
                setting.isUsrPlay = true;
                $rootScope.$broadcast('searchback.update');
            }
        },
        searchSong: _searchSong,
        addOneSong: function(index, isSetIndes) {
            console.log(index, isSetIndes);
            var tempSong = setting.audioList[index];
            var flag = -1;
            for (var i = 0; i < _userSongList.length; i++) {
                if (_userSongList[i].songId === tempSong.songId) {
                    console.log(_userSongList, tempSong.songId, i);
                    flag = i;
                    break;
                }
            }

            if (flag === -1) {
                _userSongIds.push(tempSong.songId);
                _userSongList.push(tempSong);
                console.log('addOneSong', _userSongList);
                if (isSetIndes) {
                    setting.currentIndex = _userSongList.length - 1;
                }
                MessageFactory.toastBroadcast(true, '添加成功~', 3000);
            }
            else {
                if (isSetIndes) {
                    setting.currentIndex = flag;
                }
                console.log('addOneSong', _userSongList);
                MessageFactory.toastBroadcast(true, '已经存在~', 3000);
            }
            if (!isSetIndes) {
                setting.audioList = _userSongList;
            }
            _upload();
            _localSaveUsrInfo();
        },
        removeSong: _removeSong,
        getSetting: function(attr) {
            if (setting.hasOwnProperty(attr)) {
                return setting[attr];
            }
            return '';
        },
        setSetting: function(attr, value) {
            if (setting.hasOwnProperty(attr)) {
                setting[attr] = value;
            }
        },
        setAudiocurrentTime: function(rate) {
            try {
                _audio.currentTime = rate * _audio.duration;
            }
            catch (e) {
                _audio.setAudiocurrentTime && _audio.setAudiocurrentTime((rate - 10) > 0 ? (rate - 10) : 0);
                console.log('setAudiocurrentTime', e);
            }
        },
        clearProgress: _clearProgress,
        changeLrcTime: _changeLrcTime,
        getSongs: _getSongs,
        upload: _upload
    }
}]);

mainModule.factory('MessageFactory', ['$rootScope', '$timeout', function($rootScope, $timeout) {
    var _loadingtimer = null;
    var _toasttimer = null;

    return {
        loadingBroadcast: function(isloading, msg, time) {
            $rootScope.$broadcast('loading', isloading, msg);
            time = parseInt(time) || 60 * 1000;
            $timeout.cancel(_loadingtimer);
            _loadingtimer = $timeout(function() {
                $rootScope.$broadcast('loading', false, msg);
            }, time);
        },
        toastBroadcast: function(istoast, msg, time) {
            $rootScope.$broadcast('toast', istoast, msg);
            time = parseInt(time) || 3 * 1000;
            $timeout.cancel(_toasttimer);
            _toasttimer = $timeout(function() {
                $rootScope.$broadcast('toast', false, msg);
            }, time);
        },
        channelChange: function() {
            $rootScope.$broadcast('channel.toggle');
        }
    };

}]);

mainModule.factory('UserFactory', ['$http', '$state', 'MessageFactory', function($http, $state, MessageFactory) {
    function regist(username, password) {
        MessageFactory.loadingBroadcast(true, '注册中');
        $http({
            url: LOGINURL + '/',
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'username=' + username + '&password=' + password
        })
            .success(function(user) {
                MessageFactory.loadingBroadcast(false);
                if (user.errCode === -1) {
                    MessageFactory.toastBroadcast(true, user.data || '注册失败~~', 3000);
                }
                else {
                    localStorage.setItem('token', user.data.token);
                    $state.go('index');
                }
            })
            .error(function(e) {
                MessageFactory.loadingBroadcast(false);
                MessageFactory.toastBroadcast(true, '注册失败,请检查网络~~', 3000);
                console.log(e);
            });
    }

    function login(username, password) {
        MessageFactory.loadingBroadcast(true, '登陆中...');
        $http({
            url: LOGINURL + '/auth',
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            data: 'username=' + username + '&password=' + password
        })
            .success(function(user) {
                MessageFactory.loadingBroadcast(false);
                if (user.errCode === -1) {
                    MessageFactory.toastBroadcast(true, user.data || '登录失败~~', 3000);
                }
                else {
                    localStorage.setItem('token', user.data.token);
                    $state.go('index');
                }
            })
            .error(function(e) {
                MessageFactory.loadingBroadcast(false);
                MessageFactory.toastBroadcast(true, '登录失败,请检查网络~~', 3000);
                console.log(e);
            });
    }

    return {
        login: login,
        regist: regist
    };
}]);

mainModule.controller('channelCtrl', ['$rootScope', '$scope', 'MusicFactory', 'MessageFactory', function($rootScope, $scope, MusicFactory, MessageFactory) {

    $scope.isLoading = true;
    $scope.isUsrPlay = MusicFactory.getSetting('isUsrPlay') || MusicFactory.getSetting('searchMode');
    $scope.toggleChannel = toggleChannel;
    $scope.$on('channel.toggle', toggleChannel);

    var ishide = false;

    function toggleChannel() {
        $scope.channels = MusicFactory.getSetting('channelList');
        if (ishide) {
            $scope.showhide = 'eleDownIn';
        }
        else {
            $scope.showhide = 'eleDownOut';
        }
        ishide = !ishide;
    }

    $scope.togglePlayer = function() {
        var isUsrPlay = MusicFactory.getSetting('isUsrPlay');
        $scope.isUsrPlay = !isUsrPlay;
        ishide = false;
        $scope.showhide = 'eleDownOut';

        if (!isUsrPlay) {
            MessageFactory.loadingBroadcast(true, '切换到用户列表...');
            MusicFactory.changePlayer(0); // 转到user模式
        }
        else {
            MessageFactory.loadingBroadcast(true, '切换到随心听...');
            MusicFactory.changePlayer(1);
        }
    };

    $scope.upload = function() {
        MusicFactory.upload(true);
    }
}]);

mainModule.controller('listCtrl', ['$rootScope', '$scope', '$state', 'MusicFactory', 'MessageFactory', function($rootScope, $scope, $state, MusicFactory, MessageFactory) {


    if (!localStorage.getItem('token')) {
        $state.go('login');
        MessageFactory.toastBroadcast(true, '请重新登录~', 3000);
        return;
    }

    $scope.songs = [];              // 播放列表
    $scope.search = {};             // search.name 用来绑定 搜索输入的内容

    $rootScope.$on('clear', function() {
        $scope.songs = [];
        $scope.$apply();
    });

    $rootScope.$on('aduioList.update', function() {
        $scope.isUsrPlay = false;          // 随心听
        $scope.isadd = true;                // 显示 添加按钮
        audioListUpdate(0);
        $scope.$apply();
    });

    $rootScope.$on('mode.update', function() {
        console.log('mode.update');
        var isUsrPlay = MusicFactory.getSetting('isUsrPlay');
        $rootScope.name = isUsrPlay ? '播放列表' : '随心听';
        $scope.isUsrPlay = isUsrPlay;
        $scope.issearch = false;
        $scope.isadd = !isUsrPlay;
        var nu = MusicFactory.getSetting('currentIndex');
        console.log(nu);
        if (nu > MusicFactory.getAudioList().length || nu <= -1) {
            nu = 0;
        }
        audioListUpdate(nu);
    });

    $rootScope.$on('searchback.update', function() {
        var isUsrPlay = MusicFactory.getSetting('isUsrPlay');
        $rootScope.name = isUsrPlay ? '播放列表' : '随心听';
        $scope.isUsrPlay = isUsrPlay;
        $scope.issearch = false;
        $scope.isadd = false;
        $scope.songs = MusicFactory.getAudioList();
    });

    $rootScope.$on('search.update', function() {
        $scope.isUsrPlay = false;
        $scope.issearch = true;
        $rootScope.name = "搜索 " + $scope.search.name + ' 的结果';
        $scope.songs = MusicFactory.getAudioList();
    });

    $scope.backUsr = function() {
        MusicFactory.changePlayer(3);
    };


    function logout() {
        localStorage.removeItem('token');
        $state.go('login');
    }


    function audioListUpdate(nu) {
        $scope.songs = MusicFactory.getAudioList();
        console.log('播放列表: ', $scope.songs);
        MessageFactory.loadingBroadcast();
        MusicFactory.playSong(nu);
        if ($scope.songs.length) {
            MessageFactory.toastBroadcast(true, $scope.songs[nu].songName, 2000);
        }
    }

    $scope.searchSong = function() {
        MusicFactory.changePlayer(2, $scope.search.name);
    };


    $scope.isUsrPlay = MusicFactory.getSetting('isUsrPlay') || MusicFactory.getSetting('searchMode');

    MusicFactory.setSetting('isUsrPlay', $scope.isUsrPlay);
    MusicFactory.setSetting('searchMode', false);

    console.log("MusicFactory.getSetting('isUsrPlay')", MusicFactory.getSetting('isUsrPlay'));


    var ua = navigator.userAgent;
    if (!/AppleWebKit\/(\S+)/.test(ua)) { //匹配Webkit内核浏览器（Chrome、Safari、新Opera）
        $rootScope.name = '本网页只支持chrome内核浏览器\n\r原因:在不使用flash下\r\n只有chrome支持播放mp3';
        return;
    }


    MusicFactory.getSongs()
        .then(function(data) {
            if ($scope.isUsrPlay) {
                MusicFactory.changePlayer(0);
            }
            else {
                MusicFactory.changePlayer(1);
            }
        })
        .catch(function() {
            MessageFactory.toastBroadcast(true, '请重新登录~~', 3000);
            logout();
        })

}]);

mainModule.controller('musciCtrl', ['$rootScope', '$scope', 'MusicFactory', 'ImgFactory', function($rootScope, $scope, MusicFactory, ImgFactory) {

    $scope.song = {songPicRadio: ImgFactory.headImg};                                       // 当前播放的歌曲
    $scope.playMode = MusicFactory.getSetting('playMode');    // 单曲循环
    $scope.isPlaying = MusicFactory.getSetting('isplaying');    // 正在播放

    $scope.changePlaying = function() {
        MusicFactory.playorpauseSong($scope.isPlaying);
        $scope.isPlaying = MusicFactory.getSetting('isplaying');
    };

    $rootScope.$on('current.update', function() {
        $rootScope.time = null;         // 清空上次播放时间
        var currentSong = MusicFactory.getCurrentSong();
        $scope.isPlaying = MusicFactory.getSetting('isplaying');
        $scope.song = currentSong;
        currentSong.songPicRadio = ImgFactory.headImg;               // 先设置默认图片
        var promise = MusicFactory.getSongInfo(currentSong.songId);
        promise.then(function(data) {
            var arr = data.data.songList;
            // 调整图片
            if (arr && arr.length) {
                var value = arr[0];
                var imgUrl = value.songPicRadio;
                if (!imgUrl) {
                    value.songPicRadio = ImgFactory.headImg;
                }
                else if (/http:\/\/qukufile2\.qianqian\.com/.test(imgUrl)) {
                    value.songPicRadio = imgUrl.match(/http:\/\/qukufile2\.qianqian\.com.*?jpg/)[0];
                }
                else {
                    value.songPicRadio = SERVERURL + '/serverget?url=' + encodeURIComponent(value.songPicRadio);
                }
                $scope.song.songPicRadio = value.songPicRadio;
            }
        }, function(err) {
            console.log('获取歌手头像错误', err);
            $scope.song.songPicRadio = ImgFactory.headImg;
        });
    });


    $rootScope.$on('clear', function() {
        console.log('musciCtrl clear');
        $rootScope.time = null;
        $rootScope.alltime = null;

        $scope.song = {songPicRadio: ImgFactory.headImg};
        $scope.playMode = MusicFactory.getSetting('playMode');    // 循环模式
        $scope.isPlaying = false;    // 正在播放

        $rootScope.$apply();
        $scope.$apply();

        MusicFactory.clearProgress();
        MusicFactory.setSetting('isplaying', false);
    });

    $scope.prev = function() {
        MusicFactory.playPrevSong();
    };
    $scope.next = function() {
        MusicFactory.playNextSong();
    };

    $scope.changeLoop = function() {
        MusicFactory.setSetting('playMode', (parseInt($scope.playMode) + 1) % 3);
        console.log(MusicFactory.getSetting('playMode'));
        $scope.playMode = MusicFactory.getSetting('playMode');
    };
    $scope.changeLrc = function(nu) {
        MusicFactory.changeLrcTime(nu);
    };
}]);

mainModule.controller('messageCtrl', ['$scope', function($scope) {
    $scope.$on('loading', function(event, isloading, msg) {
        $scope.isLoading = isloading;
        $scope.loadingMsg = msg;
    });

    $scope.$on('toast', function(event, istoast, msg) {
        $scope.isToast = istoast;
        $scope.toastMsg = msg;
    });
}]);

mainModule.controller('loginCtrl', ['$scope', '$http', '$state', 'UserFactory', function($scope, $http, $state, UserFactory) {
    if (localStorage.getItem('token')) {
        $state.go('index');
    }
    $scope.username = 'shang';

    $scope.login = function() {
        UserFactory.login($scope.username, $scope.password);
    };
    $scope.regist = function() {
        UserFactory.regist($scope.username, $scope.password);
    };
}]);