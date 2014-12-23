fslider_ws
===

### fSlider_ws V0.3.7 - Rainy

#### Wiki & APIs:
**see the [WIKI](https://github.com/abbshr/fSlider_ws/wiki/fSlider_ws-V0.3---%5BRainy%5D-%E4%B8%AD%E6%96%87%E7%89%88Wiki) page to lookup the whole reference**

fslider_ws是一个Node.js的超轻量级的WebSocket扩展框架。

+ 本着易于使用的原则，当然以容易使用为首～
+ 无论客户端还是服务器仅支持WebSocket协议，并且绝对轻量级。
+ 性能高不高，一试便知道～
+ 全面升级的事件驱动支持
+ 文本/二进制数据传输全部可用，而且提供了方便快捷的语法糖～
+ 命名空间支持，也就是说如果你想搞个多频道app，绝对没问题的～
+ 支持自定义事件（这个想法参考Socket.IO）
+ 自带配合Server的浏览器端框架
+ 附带一个WebSocket non-browser客户端
+ 框架很小，不过功能可不弱哦～
+ 详细的日志输出
+ 无第三方模块依赖（依赖模块全是从这个项目分离出来的）
+ 适合newbies学习Node.js和WebSocket

#### 依赖模块

+ [execQ](https://github.com/abbshr/execQ): 异步执行命令队列
+ [event.js](https://github.com/abbshr/event.js): Node-style前端Pub/Sub事件驱动编程框架
+ [colorlogger](https://github.com/abbshr/colorlogger): 保存/加载/输出彩色终端日志


##### 项目状态

now in v0.3.7, implement websocket server, websocket non-browser client and the security mechanism descripted in RFC 6455

##### Install

```sh
npm install fslider_ws
```

if you have clone this repo, just need to install dependencies:

```sh
npm install
```

##### run test

used in pure Node
```sh
npm test
```

or use with express
```bash
cd test/watcher
npm start
```

##### Usage:

see [example](https://github.com/abbshr/fSlider_ws/tree/v0.3-rainy/test)
