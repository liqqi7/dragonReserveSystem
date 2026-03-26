# 小程序端 README（`miniprogram/`）

本目录为 **微信小程序前端**（WXML/WXSS/JavaScript）。后端为 FastAPI（见仓库根 `README.md` 与 `backend/README.md`）。

## 1) 快速开始

1. 用微信开发者工具导入仓库根目录（项目配置见 `project.config.json`）。
2. 确保后端可访问：
   - **线上**：使用 `miniprogram/services/config.js.template` 中的正式域名
   - **本地/测试联调**：使用仓库脚本自动注入 `miniprogram/services/config.js`（该文件被 `.gitignore` 忽略，不提交）
3. 编译运行小程序。

## 2) 目录结构（小程序端）

```text
miniprogram/
├── app.js / app.json / app.wxss
├── pages/
│   ├── activity_list/         # 活动管理首页（分组卡片流、详情、报名、编辑）
│   ├── checkin_map/           # 签到地图页
│   ├── accounting/            # 记账与日结
│   ├── history/               # 统计/排行榜
│   ├── profile/               # 我的页（登录、角色切换、资料维护）
│   ├── welcome/               # 首次进入/登录引导
│   └── clear_data/            # 管理员清空数据
├── services/
│   ├── request.js             # wx.request 封装（建议仅从这里发请求）
│   ├── config.js.template     # 正式 API 地址模板（提交到仓库）
│   ├── config.js              # 本地注入的真实配置（被忽略，不提交）
│   ├── auth.js / user.js
│   ├── activity.js / bill.js
│   ├── stats.js
│   └── logger.js              # console 级别日志工具
└── images/
```

## 3) 配置与环境切换（重点）

- **不要手改并提交** `miniprogram/services/config.js`
  - 仓库只提交 `config.js.template`
  - 本地联调由脚本生成 `config.js` 指向本机后端（详情见仓库根 `README.md` 的“环境与配置”）

## 4) 设计稿 / PRD 对照

- PRD：`miniprogram-frontend-refactor-prd.md`
- Figma：
  - 普通用户页面节点：`node-id=74-874`
  - 管理员页面节点：见 PRD 中链接

建议改动路径：
1. 先对照 PRD 验收清单（顶栏、分组、卡片、交互）
2. 再对照 Figma 做像素级差异（间距、圆角、阴影、透明度、层级）

## 5) 排查问题（重要：不要用 fetch）

小程序环境 **不支持浏览器的 `fetch`**。排查与埋点建议：

- **网络请求**：统一使用 `wx.request`（优先走 `services/request.js` 的封装）
- **日志**：使用 `console.info / console.warn / console.error`（可结合 `services/logger.js`）
- **布局测量**：使用 `wx.createSelectorQuery().select(...).boundingClientRect()` 获取实际渲染尺寸与位置

如果需要把运行时日志上报到本地调试采集端（例如用于自动收集 NDJSON），也应使用 `wx.request` 发送，不要用 `fetch`。

## 6) 常见问题

### Q1: 进首页显示游客态
- 检查是否完成欢迎页登录、以及“我的”页是否完成邀请码授权。
- 本地缓存键：`hasWeChatAuth`、`isAuthenticated`、`userRole`、`accessToken`、`userId` 等（见 `app.js`）。

### Q2: 请求失败 / 404 / 域名不合法
- 检查 `miniprogram/services/config.js` 当前指向的 API base url
- 检查小程序后台“合法请求域名”配置（线上必须 HTTPS）

