# 小程序前端

本目录是微信小程序前端，使用 WXML、WXSS 和 JavaScript，通过 `wx.request` 调用 FastAPI 后端。

## 使用方式

1. 用微信开发者工具导入项目根目录，配置见 `project.config.json`。
2. 正式环境使用 `services/config.js.template` 中的 API 地址。
3. 本地与服务器测试库联调时，从 `backend/` 运行 `scripts/start_backend_test.ps1`；脚本会临时生成 `services/config.js`。
4. 编译并运行小程序。

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
pages/clear_data/         管理员清理活动数据
services/                 API 请求、认证、用户、活动和统计封装
images/                   TabBar 和页面静态图片
```

账单和记账页面、接口及图标均已移除。

## 头像与请求

用户头像由资料页上传到后端，数据库仅保存后端返回的 `/media/avatars/...` 地址；微信临时路径不会写入数据库。活动卡片和排行榜展示用户最新的昵称与头像。

所有网络请求应使用 `wx.request`，优先经由 `services/request.js`。线上请求失败时，先确认配置指向正式 HTTPS 地址，再检查微信小程序后台的合法 request 域名。
