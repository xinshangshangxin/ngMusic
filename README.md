# ngMusic_static
---------

在线演示: [ngMusic](http://ngmusic.coding.io/)

## html5播放,只支持chrome!!!

## 说明
1. `client` 为前台静态代码
2. `dist` 为前台静态压缩代码
3. `server` 为服务器接口代码
4. 无法直接双击打开 `client/index.html`, 因为需要跨域请求资源
5. 代码中`client\js\controllers.js` 直接使用了服务器资源; 文件夹 `server` 仅为例子, 并未工作

## 安装
1. 先clone或者下载代码
2. 在项目根目录下 `npm install`
3. 需要静态服务器环境, windows下运行 `node_modules\.bin\http-server.cmd ./client`;
4. 浏览器打开 `http://localhost:8080/`
