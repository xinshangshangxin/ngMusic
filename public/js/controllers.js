var mainModule = angular.module('MainModule', []);
var SERVERURL = 'http://cors.coding.io';

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

mainModule.directive('removespan', ['MusicService', function(MusicService) {
    return {
        restrict: "E",
        template: '<span class="badge"><i class="fa fa-remove"></i></span>',
        replace: true,
        link: function(scope, ele) {
            ele.on("click", function(e) {
                e.stopPropagation();
                var index = ele.parent().attr('data-index');
                MusicService.removeSong(index);
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

mainModule.service('MusicService', ['$http', '$q', '$rootScope', 'MessageService', function($http, $q, $rootScope, MessageService) {

    var _timer = null;
    var _audio = new Audio();
    var _lrcObj = null;
    var _userSongIds = [5963228];
    var _tempAudioList = [];

    var setting = {
        currentHadPlayedNu: 0,
        audioList: [],
        currentIndex: -1,
        isOneLoop: false,
        isUsrPlay: true,
        isplaying: false,
        channelList: [],
        searchMode : false
    };


    function easyExtend(o1, o2) {
        for (var attr in o1) {
            if (o2.hasOwnProperty(attr)) {
                o1[attr] = o2[attr];
            }
        }
    }

    function localSaveUsrInfo() {
        localStorage.setItem('shang_music', JSON.stringify({
            'setting': setting,
            'userSongIds': _userSongIds
        }));
    }


    var localSave = localStorage['shang_music'];
    var localSetting;
    if (localSave) {
        try{
            var obj = JSON.parse(localSave);
            localSetting = obj.setting || {};
            _userSongIds = obj.userSongIds || [];
        }
        catch(e) {
            localSetting = {};
            _userSongIds = [];
        }
        finally{
            easyExtend(setting, localSetting);
        }
    }


    _audio.onerror = function() {
        if (setting.currentHadPlayedNu <= 2) {
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
    };
    _audio.onended = function() {
        if (setting.isOneLoop) {
            _playSong(setting.currentIndex);
        }
        else {
            _playNextSong();
        }
    };

    function _playNextSong() {
        console.log('palysong index', (setting.currentIndex + 1) % setting.audioList.length)
        _playSong((setting.currentIndex + 1) % setting.audioList.length);
    }

    function _playSong(nu) {
        if (nu || nu === 0) {
            setting.currentIndex = parseInt(nu);
        }
        else if (setting.currentIndex === -1 || setting.currentIndex >= setting.audioList.length) {
            console.log('播放参数错误!');
            return;
        }
        console.log('当前播放nu=   ' + setting.currentIndex);
        playAndAddLrc();
        localSaveUsrInfo();
    }

    function playAndAddLrc() {
        _audio.src = null;
        _audio.load();
        _audio.src = setting.audioList[setting.currentIndex].songLink;
        _audio.play();

        setting.isplaying = true;
        $rootScope.$broadcast('current.update');
        MessageService.toastBroadcast(true, setting.audioList[setting.currentIndex].songName, 2000);

        _lrcObj = shangLrcLoad(_audio, 'lrcdiv');
        $http.get(SERVERURL + '?method=get&callback=obj&url=http://music.baidu.com' + setting.audioList[setting.currentIndex].lrcLink)
            .success(function(data) {
                _lrcObj.parseLrc(data.data);
                _lrcObj.repaireTimeNu = 0;
                _lrcObj.init();
            })
            .error(function() {
                _lrcObj.parseLrc('[00:00]未找到(┬＿┬)');
                _lrcObj.repaireTimeNu = 0;
                _lrcObj.init();
            });
    }

    function calculateTime() {
        var all = _audio.currentTime;
        var minute = Math.floor(all / 60);
        var second = Math.round(all % 60) < 10 ? "0" + Math.round(all % 60) : Math.round(all % 60);
        return minute + ':' + second;
    }

    function _changeLrcTime(nu) {
        if (_lrcObj && _audio) {
            _lrcObj.repaireTimeNu = parseInt(_lrcObj.repaireTimeNu) + parseInt(nu);
            MessageService.toastBroadcast(true, _lrcObj.repaireTimeNu / 10 + '', 3000);
        }
    }

    function filterSongs(result) {

        if (!result || !result.data || !result.data.songList) {
            setting.audioList = [];
            return;
        }
        var songArr = result.data.songList;
        setting.audioList = songArr.filter(function(value) {
            if (value.songLink && /file\.qianqian\.com/.test(value.songLink) && !/serverget\?url/.test(value.songLink)) {
                value.songLink = 'serverget?url=' + encodeURIComponent(value.songLink);
            }
            else if (value.songLink) {
                value.songLink = value.songLink.replace('http://yinyueshiting.baidu.com/data2/music/', 'http://musicdata.baidu.com/data2/music/');
            }
            return value.rate;
        });
    }

    function _searchSong(value) {
        value = value.trim();
        if (value) {
            var defer = $q.defer();
            //MessageService.loadingBroadcast(true, '搜索中.....');
            $http.get(SERVERURL + '?method=get&url=' + encodeURIComponent('http://sug.music.baidu.com/info/suggestion?format=json&word=' + value + '&version=2&from=0'))
                .success(function(data) {
                    defer.resolve(data);
                })
                .error(function(error) {
                    console.log('搜索歌曲出错', error);
                    defer.resolve('');
                });
            return defer.promise;
        }
        else {
            MessageService.toastBroadcast(true, '请输入内容', 3000);
        }
    }

    function _channelList() {
        var defer = $q.defer();
        $http.get('getchannellist').success(function(data) {
            defer.resolve(data.channel_list);
        }).error(function(err) {
            defer.reject(err);
        });
        return defer.promise;
    }


    function _songlink(id) {
        var defer = $q.defer();
        $http.get('getsonglink?id=' + id).success(function(arr) {
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


    $rootScope.$on('clear', function() {
        console.log('clear');
        _lrcObj = shangLrcLoad(_audio, 'lrcdiv');
        _lrcObj.parseLrc('');
        _lrcObj.repaireTimeNu = 0;
        _lrcObj.init();
        _audio.src = null;
        _audio.load();
    });

    return {
        channelList: _channelList,
        songlink: _songlink,
        getSongInfo: function(id) {
            var defer = $q.defer();
            $http.get('getsonginfo?id=' + id).success(function(arr) {
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
                var ishadAllUsr = false;
                for (var i = 0; i < _userSongIds.length; i++) {
                    ishadAllUsr = false;
                    for (var j = 0, list = setting.audioList; j < list.length; j++) {
                        if (_userSongIds[i] === list[j].songId) {
                            ishadAllUsr = true;
                            break;
                        }
                    }
                    if (!ishadAllUsr) {
                        break;
                    }
                }

                if (!setting.audioList.length) {
                    ishadAllUsr = false;
                }


                if (ishadAllUsr) {
                    setting.isUsrPlay = true;
                    $rootScope.$broadcast('mode.update');
                    MessageService.loadingBroadcast();
                    return;
                }

                console.log(_userSongIds, setting.audioList);
                MessageService.loadingBroadcast(true, '自定义播放列表');
                $http.get('getsongsbyids?data=' + encodeURIComponent(JSON.stringify({
                    ids: _userSongIds
                })))
                    .success(function(result) {
                        filterSongs(result);
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
                MessageService.loadingBroadcast(true, '搜索' + value + '中...');
                var promise = _searchSong(value);
                promise.then(function(data) {
                    setting.isUsrPlay = true;
                    _tempAudioList = setting.audioList;
                    var arr = data.data.song;
                    arr = arr.map(function(obj) {
                       return obj.songid;
                    });
                    $http.get('getsongsbyids?data=' + encodeURIComponent(JSON.stringify({
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
                setting.audioList = _tempAudioList;
                setting.isUsrPlay = true;
                $rootScope.$broadcast('searchback.update');
            }
        },
        searchSong: _searchSong,
        addOneSong: function(index) {
            _userSongIds.push(setting.audioList[index].songId);
            _tempAudioList.push(setting.audioList[index]);
            setting.audioList = _tempAudioList;
            setting.currentIndex = _tempAudioList.length - 1;
            localSaveUsrInfo();
        },
        removeSong: function(index) {
            var nu = parseInt(index);
            if (setting.audioList.length === 1) {
                setting.audioList = [];
                _userSongIds = [];
                setting.currentIndex = -1;
                $rootScope.$broadcast('searchback.update');
                $rootScope.$broadcast('clear');
                return;
            }
            else if (nu === setting.currentIndex) {
                _playNextSong();
            }
            setting.audioList.splice(nu, 1);
            _userSongIds.splice(nu, 1);
            if (nu <= setting.currentIndex) {
                setting.currentIndex -= 1;
            }
            $rootScope.$broadcast('searchback.update');
            console.log(setting.audioList);
            localSaveUsrInfo();
        },
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
        $scope.isUsrPlay = isUsrPlay;
        ishide = false;
        $scope.showhide = 'eleDownOut';
        if (!isUsrPlay) {
            MusicService.changePlayer(0); // 转到user模式
        }
        else {
            MusicService.changePlayer(1);
        }
    }
}]);

mainModule.controller('listCtrl', ['$rootScope', '$scope', 'MusicService', 'MessageService', function($rootScope, $scope, MusicService, MessageService) {

    $scope.songs = [];              // 播放列表
    $scope.search = {};             // search.name 用来绑定 搜索输入的内容


    $rootScope.$on('aduioList.update', function() {
        $scope.isUsrPlay = false;          // 随心听/用户播放列表
        audioListUpdate(0);
    });

    $rootScope.$on('mode.update', function() {
        console.log('mode.update');
        var isUsrPlay = MusicService.getSetting('isUsrPlay');
        $rootScope.name = isUsrPlay ? '播放列表' : '随心听';
        $scope.isUsrPlay = isUsrPlay;
        $scope.issearch = false;
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
        $scope.songs = MusicService.getAudioList();
    });

    $rootScope.$on('search.update', function() {
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
        MessageService.toastBroadcast(true, $scope.songs[nu].songName, 2000);
    }

    $scope.searchSong = function() {
        MusicService.changePlayer(2, $scope.search.name);
    };


    $scope.isUsrPlay = MusicService.getSetting('isUsrPlay');

    if ($scope.isUsrPlay) {
        MusicService.changePlayer(0);
    }
    else {
        MusicService.changePlayer(1);
    }
}]);

mainModule.controller('musciCtrl', ['$rootScope', '$scope', 'MusicService', function($rootScope, $scope, MusicService) {

    $scope.song = {songPicRadio : 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png'};                                       // 当前播放的歌曲
    $scope.isoneloop = MusicService.getSetting('isOneLoop');    // 单曲循环
    $scope.isPlaying = MusicService.getSetting('isplaying');    // 正在播放

    $scope.changePlaying = function() {
        MusicService.playorpauseSong($scope.isPlaying);
        $scope.isPlaying = MusicService.getSetting('isplaying');
    };

    $rootScope.$on('current.update', function() {
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
                    value.songPicRadio = 'serverget?url=' + encodeURIComponent(value.songPicRadio);
                }
                $scope.song.songPicRadio = value.songPicRadio;
            }
        }, function(err) {
            console.log('获取歌手头像错误', err);
            $scope.song.songPicRadio = 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png';
        });
    });
    
    $rootScope.$on('clear', function() {
        console.log('clear');
        $rootScope.time = null;
        $scope.song = {songPicRadio: 'http://7xiblm.com1.z0.glb.clouddn.com/o_19irpgates13ec7n3a1gck1hho9.png'};
        $scope.isoneloop = MusicService.getSetting('isOneLoop');    // 单曲循环
        $scope.isPlaying = false;    // 正在播放
        MusicService.setSetting('isplaying', false);
        $rootScope.$apply();
    });
    
    $scope.prev = function() {
        MusicService.playPrevSong();
    };
    $scope.next = function() {
        MusicService.playNextSong();
    };

    $scope.changeLoop = function() {
        MusicService.setSetting('isOneLoop', !$scope.isoneloop);
        $scope.isoneloop = MusicService.getSetting('isOneLoop');
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
