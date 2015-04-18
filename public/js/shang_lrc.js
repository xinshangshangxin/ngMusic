/**
 *
 * @param oAudio audio对象 或者 id
 * @param oLrc Lrc对象 或者 id
 * @returns {{}}
 */
function shangLrcLoad(oAudio, oLrc) {
    var shangLrc = {};
    shangLrc.currentNu = 1;
    shangLrc.nextUpdateTime = -1;
    shangLrc.lrc = [];
    shangLrc.audioObj = typeof(oAudio) === 'string' ? document.getElementById(oAudio) : oAudio;
    shangLrc.lrcObj = (typeof(oLrc) === 'string') ? document.getElementById(oLrc) : oLrc;

    shangLrc.lrchtmlarr = [];
    shangLrc.divContent = document.createElement('div');
    shangLrc.repaireTimeNu = 0;


    var scrollTimer = null;

    shangLrc.addLrc = function(time, lrcstr) {
        shangLrc.lrc.push({
            'time': time,
            'lrcstr': lrcstr
        });
    };

    shangLrc.parseLrc = function(lrcstr) {
        var lrclines = lrcstr.split('\n');
        for (var i = 0; i < lrclines.length; i++) {
            var timeandlrc = lrclines[i].split(']');
            for (var j = 0; j < timeandlrc.length - 1; j++) {
                var timetemp = timeandlrc[j].match(/(\d+)\:(\d+)((\.|\:)(\d+))?/);

                if (timetemp && !/^\s*$/.test(timeandlrc[timeandlrc.length - 1])) {
                    shangLrc.addLrc((+timetemp[1] || 0) * 60 + (+timetemp[2] || 0) + (+timetemp[4] || 0) / 100,
                        timeandlrc[timeandlrc.length - 1]);
                }
            }
        }
    };

    shangLrc.checkUpdate = function() {
        if (shangLrc.audioObj.currentTime >= shangLrc.nextUpdateTime - shangLrc.repaireTimeNu / 10) {
            shangLrc.scrollLrc();
            shangLrc.checkUpdate();
        }
    };
    
    shangLrc.clearClass = function() {
        for (var i = 0; i < shangLrc.lrchtmlarr.length; i++) {
            shangLrc.lrchtmlarr[i].className = '';
        }
    };

    shangLrc.scrollLrc = function() {
        shangLrc.currentNu++;
        if (typeof shangLrc.lrc[shangLrc.currentNu] !== "undefined") {

            clearInterval(scrollTimer);

            shangLrc.nextUpdateTime = shangLrc.lrc[shangLrc.currentNu].time;
            shangLrc.lrchtmlarr[shangLrc.currentNu - 2].className = '';
            shangLrc.lrchtmlarr[shangLrc.currentNu - 1].className = 'current';


            var target = shangLrc.lrchtmlarr[shangLrc.currentNu - 1].moveHeight - 300;
            target = target > 0 ? parseInt(target) : 0;
            var obj = shangLrc.divContent;
            var currentTop = obj.scrollTop;
            scrollTimer = setInterval(function() {
                var dir = -8;
                var curspeed = (target - currentTop) / -dir;
                curspeed = curspeed > 0 ? Math.ceil(curspeed) : Math.floor(curspeed);
                var targetTop = currentTop + curspeed;
                obj.scrollTop = targetTop;

                if (target === targetTop) {
                    clearInterval(scrollTimer);
                }
                currentTop = targetTop;
            }, 30);
        }
    };


    shangLrc.init = function() {
        shangLrc.addLrc(0, '');
        shangLrc.addLrc(0, '');
        shangLrc.addLrc(999999, '');
        shangLrc.lrc.sort(function(a, b) {
            return a.time - b.time;
        });
        shangLrc.audioObj.addEventListener("seeked", function() {
            shangLrc.currentNu = 1;
            shangLrc.nextUpdateTime = -1;
        });
        shangLrc.audioObj.addEventListener("timeupdate", function() {
            shangLrc.checkUpdate();
        });


        if (!window.is_shang_lrc_css) {
            var cssStyle = document.createElement('style');
            cssStyle.type = 'text/css';
            cssStyle.innerHTML = '#shang_lrc_div{margin:0;padding:0;overflow-y:scroll;overflow-x:hidden;height:100%}#shang_lrc_div::-webkit-scrollbar{width:5px;height:5px;border-radius:4px}#shang_lrc_div::-webkit-scrollbar-button{display:none}#shang_lrc_div::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}#shang_lrc_div::-webkit-scrollbar-corner{display:none}.current{color:blueviolet;font-weight:bold}';
            document.getElementsByTagName('head')[0].appendChild(cssStyle);
            window.is_shang_lrc_css = true;
        }


        shangLrc.divContent.id = 'shang_lrc_div';
        shangLrc.lrcObj.innerHTML = '';
        shangLrc.lrcObj.appendChild(shangLrc.divContent);
        var tempDiv = document.createElement('div');
        shangLrc.divContent.appendChild(tempDiv);


        for (var i = 0; i < shangLrc.lrc.length; i++) {
            var ptemp = document.createElement('p');
            shangLrc.lrchtmlarr.push(ptemp);
            ptemp.innerHTML = shangLrc.lrc[i].lrcstr;
            tempDiv.appendChild(ptemp);
            ptemp.moveHeight = ptemp.offsetTop;
        }
    };

    return shangLrc;
}
