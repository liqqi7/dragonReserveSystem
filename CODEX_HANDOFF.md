# Codex Handoff

本文档用于在新的 Codex 入口中继续当前任务，避免重复梳理上下文。

## 当前目标

项目正在从“微信云开发”迁移到“微信小程序前端 + 本地 Python 后端”架构，并保留微信登录体验。

目标不是重做前端，而是：

- 保留微信小程序前端
- 去掉 `wx.cloud` / 云函数 / 云数据库依赖
- 使用本机 Python 后端和本机 MySQL
- 这台机器后续将作为正式服务器
- 登录方式保留为真正的微信登录：`wx.login` + 后端调用微信 `jscode2session`

## 当前分支

- 分支名：`feat/local-deploy-without-wechat-cloud`

## 最近关键提交

- `21474cf` `chore: initialize backend skeleton for local python service`
- `fa33c81` `feat: add initial FastAPI backend foundation`
- `7e49830` `test: add backend interface coverage and env setup`
- `919f587` `feat: migrate miniprogram flows to local backend`
- `7f5950f` `docs: refresh readmes for local backend architecture`

## 当前已完成

### 1. 后端基础已落地

目录在 [backend](/Volumes/disk/project/dragonReserveSystem/backend)。

技术栈：

- FastAPI
- SQLAlchemy 2.0
- Alembic
- MySQL
- PyMySQL
- JWT
- Pydantic

已具备的能力：

- 健康检查
- 本地账号登录接口
- 微信登录接口 `POST /api/v1/auth/wechat-login`
- 当前用户查询/更新
- 当前用户角色切换
- 活动 CRUD
- 报名 / 取消报名 / 签到 / 移除参与者
- 账单 CRUD
- 统计接口

### 2. 小程序端已去掉云依赖

`miniprogram/` 下已不再使用：

- `wx.cloud`
- `wx.cloud.database()`
- `wx.cloud.callFunction()`

已迁移页面：

- `pages/welcome`
- `pages/profile`
- `pages/activity_list`
- `pages/checkin_map`
- `pages/history`
- `pages/accounting`
- `pages/clear_data`

新增 API 层：

- `miniprogram/services/config.js`
- `miniprogram/services/request.js`
- `miniprogram/services/auth.js`
- `miniprogram/services/user.js`
- `miniprogram/services/activity.js`
- `miniprogram/services/bill.js`
- `miniprogram/services/stats.js`

### 3. 微信登录已开始切回

当前欢迎页已经不是账号密码表单主入口，而是微信登录按钮：

- [miniprogram/pages/welcome/welcome.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/pages/welcome/welcome.js)
- [miniprogram/pages/welcome/welcome.wxml](/Volumes/disk/project/dragonReserveSystem/miniprogram/pages/welcome/welcome.wxml)

后端已支持：

- [backend/app/api/v1/auth.py](/Volumes/disk/project/dragonReserveSystem/backend/app/api/v1/auth.py)
- [backend/app/services/auth_service.py](/Volumes/disk/project/dragonReserveSystem/backend/app/services/auth_service.py)
- [backend/app/models/user.py](/Volumes/disk/project/dragonReserveSystem/backend/app/models/user.py)
- [backend/alembic/versions/20260308_0004_add_wechat_login_columns.py](/Volumes/disk/project/dragonReserveSystem/backend/alembic/versions/20260308_0004_add_wechat_login_columns.py)

### 4. 测试状态

后端全量测试最近一次结果：

- `27 passed in 12.09s`

相关测试目录：

- [backend/tests](/Volumes/disk/project/dragonReserveSystem/backend/tests)

### 5. 文档已更新

- 根文档：[README.md](/Volumes/disk/project/dragonReserveSystem/README.md)
- 后端文档：[backend/README.md](/Volumes/disk/project/dragonReserveSystem/backend/README.md)
- 环境与测试总结：[backend/TEST_AND_ENV_SUMMARY.md](/Volumes/disk/project/dragonReserveSystem/backend/TEST_AND_ENV_SUMMARY.md)

### 6. 这台 Mac 作为正式服务器的模板已补

新增：

- [backend/.env.production.example](/Volumes/disk/project/dragonReserveSystem/backend/.env.production.example)
- [backend/DEPLOY_MAC_SERVER.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_MAC_SERVER.md)
- [backend/deploy/Caddyfile.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/Caddyfile.example)
- [backend/deploy/com.dragonreserve.backend.plist.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/com.dragonreserve.backend.plist.example)

`Makefile` 新增：

- `make copy-prod-env`
- `make run-prod`

## 已完成的环境操作

这台机器上已经做过：

- 安装本地 MySQL
- 创建数据库 `dragon_reserve`
- 创建业务用户 `dragon_user`
- 安装 Python 依赖到 `backend/.venv`
- 执行 Alembic migration
- 初始化管理员

最近一次已执行的迁移包括：

- `20260308_0004_add_wechat_login_columns`

## 当前关键现实状态

### 1. 微信登录还没真正打通

原因不是代码没写，而是配置还缺：

- `backend/.env` 里还没有真实的 `WECHAT_APP_SECRET`

已确认：

- 小程序 AppID 在 [project.config.json](/Volumes/disk/project/dragonReserveSystem/project.config.json) 中是 `wxa8f3791ae7212bc8`

还缺：

- `WECHAT_APP_SECRET`

后端微信登录依赖：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

### 2. 前端默认 API 地址已改成生产占位域名

当前 [miniprogram/services/config.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/services/config.js) 里默认值已改成：

- `https://your-domain.example/api/v1`

这意味着：

- 如果没有改成真实域名，小程序请求会失败
- 这是故意的，避免把 `127.0.0.1` 留到生产里

### 3. `backend/.env` 需要按正式服务器用途配置

必须改的核心值：

- `JWT_SECRET_KEY`
- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `MYSQL_PASSWORD`

## 下一步优先级

### 第一优先级：把微信登录真正打通

需要做的事：

1. 编辑 `backend/.env`
2. 写入：
   - `WECHAT_APP_ID=wxa8f3791ae7212bc8`
   - `WECHAT_APP_SECRET=<真实 AppSecret>`
3. 重启后端
4. 在微信开发者工具中测试欢迎页微信登录

### 第二优先级：确定正式域名

需要做的事：

1. 确定真实域名
2. 修改 [miniprogram/services/config.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/services/config.js)
3. 修改 `backend/.env` 中的 `CORS_ORIGINS`
4. 配置微信后台合法 request 域名

### 第三优先级：按 Mac 正式服务器落地

参考：

- [backend/DEPLOY_MAC_SERVER.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_MAC_SERVER.md)

需要做的事：

1. 准备 `.env.production`
2. 配 Caddy
3. 配 `launchd`
4. 确认 `run-prod`
5. 做真机联调

## 当前未提交状态

在生成本文档的这个时点，最近正在进行中的工作包括：

- 微信登录切回
- Mac 作为正式服务器的部署模板

这些改动是否已全部提交，需要新入口中的 Codex 先执行：

```bash
git status --short
git log --oneline -n 10
```

然后再决定是否继续提交 / push。

## 需要特别注意的约束

- 不要把 `CODEX_DEEP_ANALYSIS_SUMMARY.md`
- `CODEX_FULL_ANALYSIS.md`
- `CODE_SUMMARY.md`

误提交进正式改动，除非用户明确要求。

- 用户要求每次 `git push` 后给出：
  - 分支链接
  - PR 链接
  - 提交链接

- 用户偏好：中文、直接、少废话。

## 新入口建议的第一条动作

新的 Codex 入口接手后，建议先做这几步：

1. `git status --short`
2. 确认 `backend/.env` 中是否已配置 `WECHAT_APP_SECRET`
3. 确认 [miniprogram/services/config.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/services/config.js) 是否已换成真实域名
4. 如果 `WECHAT_APP_SECRET` 已有，直接启动后端并在微信开发者工具里联调微信登录
5. 若联调报错，再按报错继续修
