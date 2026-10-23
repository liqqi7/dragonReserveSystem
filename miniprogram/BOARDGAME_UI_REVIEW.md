# 桌游功能本地 UI 评审

交付分支：`codex/bgg-sync`。包含 12 个真实小程序页面、配套后端/数据库迁移、统一设计规范及浏览器原型。OCR 尚未接入；此次分享代码不涉及线上部署。

新电脑由大模型启动后端及导入真实本地测试数据，优先按 [本地启动与导入交接](../docs/LOCAL_BOARDGAME_HANDOFF.md) 执行；本文聚焦页面查看。

## 1. 拉取分支

代码分享仓库为 `liqqi7/dragonReserveSystem`。先核对 remote URL；下面假设 `origin` 指向该仓库。已有仓库且尚未创建这个本地分支时，在项目根执行：

```sh
git fetch origin
git switch --track origin/codex/bgg-sync
```

如果本地分支已存在，先切到 `codex/bgg-sync`，再 `git pull --ff-only`。保留自己已有的本地配置和未提交改动，遇到冲突先处理，不强制覆盖。

新拉代码后先运行：

```sh
node scripts/init_miniprogram_config.cjs
```

这会生成 Git 忽略的必需文件 `miniprogram/services/config.js`，默认连接本机 8001 端口，已有配置保持原样。缺少该文件时 JS 模块无法加载，可能直接白屏；没有游戏数据时则应显示标题、按钮和空态。生成后需在开发者工具重新编译。

## 2. 浏览器查看原型

只看设计和示例交互无需启动后端。在项目根执行（Windows 可将 `python3` 换成 `python`）：

```sh
python3 -m http.server 62869 --bind 127.0.0.1 --directory prototype
```

- [完整原型画布](http://127.0.0.1:62869/boardgame-library/canvas.html)
- [交互原型](http://127.0.0.1:62869/boardgame-library/flow.html)

这两项是原型；实际小程序以本分支 WXML/WXSS 和 [现行设计规范](../prototype/design-system/README.md) 为准。原型的页面数量和示例状态不等于小程序路由数量。

## 3. 微信开发者工具查看真实页面

1. 使用微信开发者工具导入**项目根目录**，根目录 `project.config.json` 已设置 `miniprogramRoot=miniprogram/`。使用有权限的 AppID 或自己的本地测试配置。
2. 启动同分支的本地后端，安装 [后端依赖](../backend/requirements.txt)，使用自己的本地 MySQL 开发库并执行 `alembic upgrade head`，应到 `20260914_0018`（后续更新以代码 head 为准）。从 `backend/` 运行 `python -m uvicorn app.main:app --host 127.0.0.1 --port 8001`。具体环境设置见 [本地交接](../docs/LOCAL_BOARDGAME_HANDOFF.md)，查看本地 UI 不需要连接服务器测试库或生产。
3. 在本机环境或 `backend/.env` 配置 `BOARDGAME_ENABLED=true`。`backend/.env.test` 若存在会覆盖 `.env`，需核对最终配置；操作系统环境变量优先于文件。仅查看已有/手动录入桌游、提名、记局和统计不需要 BGG 凭据。
4. `miniprogram/services/config.js` 不随 Git 分发，运行第 1 节初始化命令生成。需要其他 API 地址时，在文件尚未生成前运行 `node scripts/init_miniprogram_config.cjs http://本机地址:端口/api/v1`；已有配置则手工调整，保留媒体地址处理函数。
5. 开发者工具本地调试时开启“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。这是模拟器本地调试设置，真机和正式发布仍需各自配置。
6. 在开发工具切到 Skyline，重新编译并核对“当前渲染模式: Skyline”；具体页面仍按各自 JSON 选择渲染器。使用本地测试成员或管理员登录。新建空库没有展示数据，可先通过下述本地账号调试方式进入，再手工录入示例；活动使用虚构数据。已授权的真实历史按本地交接导入，不会随代码自动出现。

如果还没有微信登录配置，可以使用现有本地账号接口：在 `http://127.0.0.1:8001/docs` 通过 `/api/v1/auth/register` 创建自行命名的测试账号，然后按下方方式登录。新账号默认访客，登录后在“我的 → 访问权限 → 获取权限”输入自己本地 `USER_INVITE_CODE` 配置的成员邀请码。账号和密码自行设置，不复用真实用户凭据。

随后在微信开发者工具 Console 中调用本地登录接口，并由应用保存会话（替换两处测试账号字段）：

```js
wx.request({
  url: 'http://127.0.0.1:8001/api/v1/auth/login',
  method: 'POST',
  data: {username: '你的本地测试账号', password: '你的本地测试密码'},
  success(login) {
    if (login.statusCode !== 200) return console.error('本地登录失败', login.statusCode);
    wx.request({
      url: 'http://127.0.0.1:8001/api/v1/users/me',
      header: {Authorization: 'Bearer ' + login.data.access_token},
      success(me) {
        if (me.statusCode !== 200) return console.error('读取本地用户失败', me.statusCode);
        getApp().applyCurrentUser(me.data, login.data.access_token);
        wx.switchTab({url: '/pages/profile/profile'});
      }
    });
  }
});
```

取得成员权限后，从“工具 → 桌游库”进入功能。需要评审管理员管理入口时，使用自己的本地 `ADMIN_INVITE_CODE`；普通成员与管理员看到的操作范围不同。

调试 BGG 搜索和版本选择时，另配置自己的 `BGG_API_TOKEN`，开启 `BGG_ENABLED=true` 和 `BOARDGAME_IMPORT_WORKER_ENABLED=true`，并从 `backend/` 单独运行 `python scripts/run_boardgame_import_worker.py`。没有 worker 时预览不会完成。不要将本机 `.env`、令牌或 `services/config.js` 提交到 Git。

## 4. 建议查看顺序

| 入口 / 页面 | 重点 |
| --- | --- |
| 工具 → 桌游库 | 封面卡、搜索、全体/我的、最想开/开的最多 |
| 桌游录入 → 详情 | 名称搜索、版本选择或手工录入、归属、库存和扩展 |
| 活动详情 → 桌游 | 提名、安排、扩展/模块选择及记录实际对局 |
| 记录对局 → 计分表 | 成员选择、0分/未填/摆烂/未完成/掀桌、赢家和分项计分 |
| 对局历史 → 统计 | 日期/活动筛选、全体/我的、排行榜与详细统计 |
| 我的收藏 / 导入 / 管理 / 离线记录 | 标签、来源核对、归档恢复、同步冲突及各类弹层 |

空库尚无历史时，统计和榜单显示空态。导入页可以使用仓库内明确标注的合成测试文件；已授权的真实数据按本地交接处理，未匹配玩家保留来源身份，不按昵称自动关联账号。

反馈请记录页面、操作步骤、截图、设备/开发者工具版本和预期表现。重点看安全区、键盘遮挡、滚动、长名称、空态/错误态及抽屉操作栏。自动化与真实 BGG 联调已通过，微信原生渲染仍需要此次 UI 评审确认。完整测试边界见 [验证报告](../backend/design/boardgame-library/verification.md)。
