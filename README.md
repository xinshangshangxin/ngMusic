# ngMusic
---------

在线演示: [ngMusic](http://ngmusic.coding.io/)

## html5播放,只支持chrome!!!

1. 支持百度随心听
2. 支持用户自定义播放列表(通过搜索添加歌曲)
3. 播放码率为128
4. 用localStorage存储用户自定义播放列表
5. 使用 `AngularJS` 和 `node`, 菜鸟学习作品;欢迎批评


## 安装
1. 先clone或者下载代码
2. 在项目根目录下或者dist目录下 `npm install` (根目录下代码未压缩; dist目录下前端显示代码经过压缩,具体看gulpfile.js)
3. 运行`node server.js`
4. 浏览器打开 `http://localhost:1340/`


## todoList
1. ngMusic播放列表高度/歌词高度/歌曲拖动 resize是判断
2. ~~添加按钮后选择状态失效~~
3. ~~随心听界面上传按钮隐藏~~
4. 用户退出时 localStorage 清除
5. 歌曲增删查改修改(包括歌词 快进)
6. 搜索界面 搜索框不隐藏
7. 歌曲 照片 可选 园/方形
8. 退出/注销按钮
9. 歌曲 返回 max-age
10. 歌曲缓存

## 协议
**MIT**