var mainModule = angular.module('MainModule', []);
//var SERVERURL = 'http://ngmusic.coding.io/node/';
//var SERVERURL = 'http://localhost:3000/node/';
var SERVERURL = 'http://121.40.81.63:3000/node/';


mainModule.directive("loadchannel", ['$rootScope', 'MusicService', 'MessageService', function($rootScope, MusicService, MessageService) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var id = ele.attr('data-id');
                $rootScope.name = '随心听: ' + ele.attr('data-name');
                $rootScope.$apply();
                MusicService.updateList(id);
                MessageService.channelChange();
                MessageService.loadingBroadcast(true, '加载中...');
            });
        }
    }
}]);

mainModule.directive("pauseaudio", ['MusicService', function(MusicService) {
    return {
        restrict: "A",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                MusicService.playorpauseSong();
            });
        }
    }
}]);

mainModule.directive('removespan', ['MusicService', 'MessageService', function(MusicService, MessageService) {
    return {
        restrict: "A",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var index = ele.parent().attr('data-index');
                var isUsrPlay = MusicService.getSetting('isUsrPlay');
                console.log('isUsrPlay', isUsrPlay);
                if (isUsrPlay) {
                    MusicService.removeSong(index);
                }
                else {
                    MusicService.addOneSong(index, true);
                }
            });
        }
    }
}]);

mainModule.directive("playaudio", ['MusicService', function(MusicService) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var index = ele.attr('data-index');
                console.log('searchMode', MusicService.getSetting('searchMode'));
                if (MusicService.getSetting('searchMode')) {
                    MusicService.addOneSong(index);
                    MusicService.changePlayer(0);
                }
                else {
                    MusicService.playSong(index);
                }
            });
        }
    }
}]);

mainModule.directive('detectiveenter', ['MusicService', function(MusicService) {
    return {
        restrict: "AE",
        link: function(scope, ele) {
            ele.on('keydown', function(e) {
                if (e.keyCode === 13) {
                    MusicService.changePlayer(2, ele[0].value);
                }
            });
        }
    }
}]);

mainModule.directive('progressdiv', ['MusicService', function(MusicService) {
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
                    MusicService.setAudiocurrentTime(nu / rect.width);
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

mainModule.service('MusicService', ['$http', '$q', '$rootScope', 'MessageService', function($http, $q, $rootScope, MessageService) {
    var _timer = null;
    var _audio = new Audio();
    var _lrcObj = null;             // 无法初始化 lrcobj
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
                MessageService.toastBroadcast(true, '加载失败,播放下一首(┬＿┬)', 1000);
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
        MessageService.toastBroadcast(true, setting.audioList[setting.currentIndex].songName, 2000);

        _lrcObj = shangLrcLoad.getInstance(_audio, 'lrcdiv');
        _lrcObj.loadNewLrc('', 0);
        $http.get(SERVERURL + 'serverjson?url=http://music.baidu.com' + setting.audioList[setting.currentIndex].lrcLink)
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
            MessageService.toastBroadcast(true, _lrcObj.getRepaireTimeNu() / 10 + '', 3000);
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
                value.songLink = SERVERURL + 'serverget?url=' + encodeURIComponent(value.songLink);
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
            $http.get(SERVERURL + 'serverget?url=' + encodeURIComponent('http://sug.music.baidu.com/info/suggestion?format=json&word=' + value + '&version=2&from=0'))
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
        $http.get(SERVERURL + 'getchannellist').success(function(data) {
            defer.resolve(data.channel_list);
        }).error(function(err) {
            defer.reject(err);
        });
        return defer.promise;
    }


    function _songlink(id) {
        var defer = $q.defer();
        $http.get(SERVERURL + 'getsonglink?id=' + id).success(function(arr) {
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
            MessageService.channelChange();
            MessageService.loadingBroadcast(true, data[ran].channel_name);
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
    }


    $rootScope.$on('clear', function() {
        console.log('MusicService clear');
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
            $http.get(SERVERURL + 'getsonginfo?id=' + id).success(function(arr) {
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

            MessageService.loadingBroadcast(true, '加载中');
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
                    MessageService.loadingBroadcast();
                    return;
                }

                console.log(_userSongIds, _userSongList);

                MessageService.loadingBroadcast(true, '自定义播放列表');
                $http.get(SERVERURL + 'getsongsbyids?data=' + encodeURIComponent(JSON.stringify({
                        ids: _userSongIds
                    })))
                    .success(function(result) {
                        filterSongs(result, true);
                        setting.isUsrPlay = true;
                        $rootScope.$broadcast('mode.update');
                        MessageService.loadingBroadcast();
                    })
                    .error(function(error) {
                        console.log(error);
                        MessageService.loadingBroadcast();
                    }
                );
            }
            else if (playMode === 1) {
                MessageService.loadingBroadcast();
                getChannelsAndPlay();
            }
            else if (playMode === 2) {
                setting.searchMode = true;
                console.log(setting.isUsrPlay);
                MessageService.loadingBroadcast(true, '搜索' + value + '中...');
                var promise = _searchSong(value);
                console.log(promise);
                if (!promise) {
                    MessageService.toastBroadcast(true, '请输入内容', 3000);
                    MessageService.loadingBroadcast();
                    return;
                }
                promise.then(function(data) {
                    setting.isUsrPlay = false;
                    //_tempAudioList = setting.audioList;
                    var arr = data.data.song;
                    arr = arr.map(function(obj) {
                        return obj.songid;
                    });
                    $http.get(SERVERURL + 'getsongsbyids?data=' + encodeURIComponent(JSON.stringify({
                            ids: arr
                        })))
                        .success(function(result) {
                            filterSongs(result);
                            console.log('setting.audioList', setting.audioList);
                            $rootScope.$broadcast('search.update');
                            MessageService.loadingBroadcast();
                        })
                        .error(function(error) {
                            console.log(error);
                            MessageService.loadingBroadcast();
                        }
                    );
                });
            }
            else if (playMode === 3) {
                MessageService.loadingBroadcast();
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
                setting.currentIndex = _userSongList.length - 1;
                MessageService.toastBroadcast(true, '添加成功~', 3000);
            }
            else {
                if (isSetIndes) {
                    setting.currentIndex = flag;
                }
                console.log('addOneSong', _userSongList);
                MessageService.toastBroadcast(true, '已经存在~', 3000);
            }
            if (!isSetIndes) {
                setting.audioList = _userSongList;
            }
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
        changeLrcTime: _changeLrcTime
    }
}]);

mainModule.service('MessageService', ['$rootScope', function($rootScope) {

    var _timer = null;

    var _isloading = false;
    var _loadingMsg = '';

    var _istoast = false;
    var _toastMsg = '';

    return {
        loadingBroadcast: function(isloading, msg) {
            this.setLoading(isloading || false);
            this.setLoadingMsg(msg || '');
            this.broadcast();
        },
        setLoading: function(isloading) {
            _isloading = isloading;
        },
        getLoading: function() {
            return _isloading;
        },
        setLoadingMsg: function(msg) {
            _loadingMsg = msg;
        },
        getLoadingMsg: function() {
            return _loadingMsg;
        },
        toastBroadcast: function(istoast, msg, time) {
            this.settoast(istoast || false);
            this.settoastMsg(msg || '');
            this.broadcast();
            if (parseInt(time)) {
                var _this = this;
                clearTimeout(_timer);
                _timer = setTimeout(function() {
                    _this.toastBroadcast(false);
                }, parseInt(time));
            }
        },
        settoast: function(istoast) {
            _istoast = istoast;
        },
        gettoast: function() {
            return _istoast;
        },
        settoastMsg: function(msg) {
            _toastMsg = msg;
        },
        gettoastMsg: function() {
            return _toastMsg;
        },
        broadcast: function() {
            $rootScope.$broadcast('message.update');
        },
        channelChange: function() {
            $rootScope.$broadcast('channel.toggle');
        }
    };
}]);

mainModule.controller('channelCtrl', ['$rootScope', '$scope', 'MusicService', 'MessageService', function($rootScope, $scope, MusicService, MessageService) {

    $scope.isLoading = true;
    $scope.isUsrPlay = MusicService.getSetting('isUsrPlay');
    $scope.toggleChannel = toggleChannel;
    $scope.$on('channel.toggle', toggleChannel);

    var ishide = false;

    function toggleChannel() {
        $scope.channels = MusicService.getSetting('channelList');
        if (ishide) {
            $scope.showhide = 'eleDownIn';
        }
        else {
            $scope.showhide = 'eleDownOut';
        }
        ishide = !ishide;
    }

    $scope.togglePlayer = function() {
        var isUsrPlay = MusicService.getSetting('isUsrPlay');
        $scope.isUsrPlay = !isUsrPlay;
        ishide = false;
        $scope.showhide = 'eleDownOut';

        if (!isUsrPlay) {
            MessageService.loadingBroadcast(true, '切换到用户列表...');
            MusicService.changePlayer(0); // 转到user模式
        }
        else {
            MessageService.loadingBroadcast(true, '切换到随心听...');
            MusicService.changePlayer(1);
        }
    }
}]);

mainModule.controller('listCtrl', ['$rootScope', '$scope', 'MusicService', 'MessageService', function($rootScope, $scope, MusicService, MessageService) {

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
    });

    $rootScope.$on('mode.update', function() {
        console.log('mode.update');
        var isUsrPlay = MusicService.getSetting('isUsrPlay');
        $rootScope.name = isUsrPlay ? '播放列表' : '随心听';
        $scope.isUsrPlay = isUsrPlay;
        $scope.issearch = false;
        $scope.isadd = !isUsrPlay;
        var nu = MusicService.getSetting('currentIndex');
        console.log(nu);
        if (nu > MusicService.getAudioList().length || nu <= -1) {
            nu = 0;
        }
        audioListUpdate(nu);
    });

    $rootScope.$on('searchback.update', function() {
        var isUsrPlay = MusicService.getSetting('isUsrPlay');
        $rootScope.name = isUsrPlay ? '播放列表' : '随心听';
        $scope.isUsrPlay = isUsrPlay;
        $scope.issearch = false;
        $scope.isadd = false;
        $scope.songs = MusicService.getAudioList();
    });

    $rootScope.$on('search.update', function() {
        $scope.isUsrPlay = false;
        $scope.issearch = true;
        $rootScope.name = "搜索 " + $scope.search.name + ' 的结果';
        $scope.songs = MusicService.getAudioList();
    });

    $scope.backUsr = function() {
        MusicService.changePlayer(3);
    };

    function audioListUpdate(nu) {
        $scope.songs = MusicService.getAudioList();
        console.log('播放列表: ', $scope.songs);
        MessageService.loadingBroadcast();
        MusicService.playSong(nu);
        if ($scope.songs.length) {
            MessageService.toastBroadcast(true, $scope.songs[nu].songName, 2000);
        }
    }

    $scope.searchSong = function() {
        MusicService.changePlayer(2, $scope.search.name);
    };


    $scope.isUsrPlay = MusicService.getSetting('isUsrPlay');


    var ua = navigator.userAgent;
    if (!/AppleWebKit\/(\S+)/.test(ua)) { //匹配Webkit内核浏览器（Chrome、Safari、新Opera）
        $rootScope.name = '本网页只支持chrome内核浏览器\n\r原因:在不使用flash下\r\n只有chrome支持播放mp3';
        return;
    }

    if ($scope.isUsrPlay) {
        MusicService.changePlayer(0);
    }
    else {
        MusicService.changePlayer(1);
    }
}]);

mainModule.controller('musciCtrl', ['$rootScope', '$scope', 'MusicService', function($rootScope, $scope, MusicService) {

    $scope.song = {songPicRadio: 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png'};                                       // 当前播放的歌曲
    $scope.playMode = MusicService.getSetting('playMode');    // 单曲循环
    $scope.isPlaying = MusicService.getSetting('isplaying');    // 正在播放

    $scope.changePlaying = function() {
        MusicService.playorpauseSong($scope.isPlaying);
        $scope.isPlaying = MusicService.getSetting('isplaying');
    };

    $rootScope.$on('current.update', function() {
        $rootScope.time = null;         // 清空上次播放时间
        var currentSong = MusicService.getCurrentSong();
        $scope.isPlaying = MusicService.getSetting('isplaying');
        $scope.song = currentSong;
        currentSong.songPicRadio = 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png';               // 先设置默认图片
        var promise = MusicService.getSongInfo(currentSong.songId);
        promise.then(function(data) {
            var arr = data.data.songList;
            // 调整图片
            if (arr && arr.length) {
                var value = arr[0];
                var imgUrl = value.songPicRadio;
                if (!imgUrl) {
                    value.songPicRadio = 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png';
                }
                else if (/http:\/\/qukufile2\.qianqian\.com/.test(imgUrl)) {
                    value.songPicRadio = imgUrl.match(/http:\/\/qukufile2\.qianqian\.com.*?jpg/)[0];
                }
                else {
                    value.songPicRadio = SERVERURL + 'serverget?url=' + encodeURIComponent(value.songPicRadio);
                }
                $scope.song.songPicRadio = value.songPicRadio;
            }
        }, function(err) {
            console.log('获取歌手头像错误', err);
            $scope.song.songPicRadio = 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png';
        });
    });


    $rootScope.$on('clear', function() {
        console.log('musciCtrl clear');
        $rootScope.time = null;
        $rootScope.alltime = null;

        $scope.song = {songPicRadio: 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png'};
        $scope.playMode = MusicService.getSetting('playMode');    // 循环模式
        $scope.isPlaying = false;    // 正在播放

        $rootScope.$apply();
        $scope.$apply();

        MusicService.clearProgress();
        MusicService.setSetting('isplaying', false);
    });

    $scope.prev = function() {
        MusicService.playPrevSong();
    };
    $scope.next = function() {
        MusicService.playNextSong();
    };

    $scope.changeLoop = function() {
        MusicService.setSetting('playMode', (parseInt($scope.playMode) + 1) % 3);
        console.log(MusicService.getSetting('playMode'));
        $scope.playMode = MusicService.getSetting('playMode');
    };
    $scope.changeLrc = function(nu) {
        MusicService.changeLrcTime(nu);
    };
}]);

mainModule.controller('messageCtrl', ['$rootScope', '$scope', 'MessageService', function($rootScope, $scope, MessageService) {
    $scope.$on('message.update', function() {
        $scope.isLoading = MessageService.getLoading();
        $scope.loadingMsg = MessageService.getLoadingMsg();
        $scope.isToast = MessageService.gettoast();
        $scope.toastMsg = MessageService.gettoastMsg();
    });
}]);
