# 小程序前端

本目录是微信小程序前端，使用 WXML、WXSS 和 JavaScript，通过 `wx.request` 调用 FastAPI 后端。

桌游分支本地查看入口：[UI 评审说明](BOARDGAME_UI_REVIEW.md)，包含浏览器原型和微信开发者工具两种方式、后端开关及 12 个页面的查看顺序。

## 使用方式

1. 新拉项目后，在项目根运行 `node scripts/init_miniprogram_config.cjs`，生成必需的 `services/config.js`；已有配置不会覆盖。默认 API 为本机 `http://127.0.0.1:8001/api/v1`，可以在命令末尾指定其他地址。
2. 用微信开发者工具导入项目根目录，配置见 `project.config.json`。
3. 配置并启动同分支本地后端，桌游功能需开启 `BOARDGAME_ENABLED=true`。随后重新编译并运行小程序。
4. 已配置服务器测试库的开发者仍可从 `backend/` 运行 `scripts/start_backend_test.ps1`，沿用其临时配置流程；纯本地UI评审不要求连接服务器测试库。

`services/config.js` 是本机文件，已被 Git 忽略，不应提交。

## 主要目录

```text
pages/activity_list/      首页、活动列表和活动编辑
pages/activity_calendar/  日程
pages/activity_detail/    活动详情、报名和签到入口
pages/checkin_map/        地图签到
pages/history/            历史统计和排行榜
pages/profile/            登录、角色与个人资料
pages/welcome/            首次登录引导
services/                 API 请求、认证、用户、活动和统计封装
images/                   TabBar 和页面静态图片
```

账单和记账页面、接口及图标均已移除。

## 头像与请求

用户头像由资料页上传到后端，数据库仅保存后端返回的 `/media/avatars/...` 地址；微信临时路径不会写入数据库。活动卡片和排行榜展示用户最新的昵称与头像。

所有网络请求应使用 `wx.request`，优先经由 `services/request.js`。线上请求失败时，先确认配置指向正式 HTTPS 地址，再检查微信小程序后台的合法 request 域名。
