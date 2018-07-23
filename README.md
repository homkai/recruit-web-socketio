# 在线集中招聘笔试解决方案
路由器组建一个局域网，全程无网环境，提供必要的环境软件下载及技术文档参考，应聘者按照提示在自己电脑完成开发，并最终提交作业源码

- 找一台电脑连入局域网，启动本网站服务
- amdin用户登录（密码在config/admin-pass.conf中配置），获取应聘者临时登录密码
- 应聘者登录到本网站（在config/user-list.conf中配置所有应聘者姓名），查看笔试题及相关参考资料，做完题后可以上传源码
- 对前端招聘，提供应聘者的ip，**可实时查看应聘者的完成效果及源码**（sourcemap）
- 可监控应聘者登录的时间及中途是否断网，中途断网再次登录需要新的临时密码，并会重新记录登录时间
- socket.io加持，管理员页面自动刷新显示

# demo图
![效果图](./demo.jpg)

# 启动
```bash
npm i -g http-server forever
# cd到当前目录
npm i
# start-downloads.bat start-server.bat
```