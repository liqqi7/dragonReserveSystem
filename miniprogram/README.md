# 小程序前端

本目录是微信小程序前端，使用 WXML、WXSS 和 JavaScript，通过 `wx.request` 调用 FastAPI 后端。

## 使用方式

1. 用微信开发者工具导入项目根目录，配置见 `project.config.json`。
2. 正式环境使用 `services/config.js.template` 中的 API 地址。
3. 日常联调从 `backend/` 运行 `scripts/start_backend_test.ps1`；数据库和媒体均使用服务器测试环境，脚本验证远端依赖后临时生成 `services/config.js`。手机使用同一入口的 LAN 参数，不创建本地数据库，详见 [测试环境规范](../docs/测试环境.md)。
4. 编译并运行小程序。

`services/config.js` 是本机文件，已被 Git 忽略，不应提交。

## 主要目录

```text
pages/activity_list/      首页、活动列表和活动编辑
pages/activity_detail/    活动详情、报名和签到入口
pages/checkin_map/        地图签到
pages/history/            历史统计和排行榜
pages/profile/            登录、角色与个人资料
services/                 API 请求、认证、用户、活动和统计封装
images/                   TabBar 和页面静态图片
```

账单和记账页面、接口及图标均已移除。

## 头像与请求

用户头像由资料页上传到后端，数据库仅保存后端返回的 `/media/avatars/...` 地址；微信临时路径不会写入数据库。活动卡片和排行榜展示用户最新的昵称与头像。

所有网络请求应使用 `wx.request`，优先经由 `services/request.js`。线上请求失败时，先确认配置指向正式 HTTPS 地址，再检查微信小程序后台的合法 request 域名。

## Skyline 与 WebView

页面配置仍以 Skyline 为目标。当前电脑微信预览日志中的渲染器是 WebView，兼容分支以运行时 `this.renderer` 为准，不按操作系统推断。

| 页面或组件 | Skyline 路径 | WebView 对应路径 |
| --- | --- | --- |
| 首页、活动封面预览 | 原生卡片转场、普通导航 | 普通导航，不传原生 `open-container` 节点 |
| 记忆列表 | `grid-view` 瀑布流 | 普通双列布局，按最短列排列；复用封面模板、骨架、淡入和可视窗口加载 |
| 记忆图片预览 | worklet 双击、缩放、平移 | 图片样式直接绑定双击缩放，WXS 只平移外层；开始/结束同步 JS，移动帧不调用 `setData`，放大时拦截翻页 |
| 记忆视频预览 | 原生横向手势、UI 线程进度 | WXS 直接更新横竖屏拖动进度；JS 仅同步开始、时间文字和结束，复用定位及续播状态机；正常播放仍由 JS 插值进度 |
| 活动详情回顶部 | 原生 ScrollContext | `scroll-top` 与滚动动画，支持重复操作 |
| 投稿、新建活动横向列表 | 原生滚动节点设置 | 使用已有 `scroll-view` 属性，不查询 Skyline 节点 |
| Chwazi | 共享值与 `applyAnimatedStyle` | 普通样式更新，不调用原生动画绑定 |
| 内容审核、排行、资料、工具、地图签到、活动编辑、桌游库/录入/详情 | 普通滚动、轮播、表单及页面事件 | 复用同一路径；参与人抽屉保留 WebView 显式高度适配 |

两种渲染器共用媒体会话、缓存预算、预加载与审核逻辑，不维护两套业务状态。WebView 不提供 Skyline 的原生卡片转场，保留正常页面导航；静态编译、自动化交互与浏览器布局检查不等于微信真机渲染验收。

WebView 页面操作底栏使用 `getBottomContentInsetRpx()`，取实际安全区与 24px 最小留白的较大值；底栏本身已有的内边距应扣除，不重复叠加。浮动导航的内容占位使用同一留白加固定 52px 导航高度。普通信息抽屉、媒体控制区和 Chwazi 触摸区域仍保留各自的安全区/设计间距，不全局替换 `getBottomSafeAreaRpx()`。

运行前端测试时，可通过环境变量 `WCC_BIN` 指定微信开发者工具内的 `wcc-exec/wcc.exe`，启用编译后属性监听名称的一致性回归；未配置时仅跳过该项原生编译检查。
