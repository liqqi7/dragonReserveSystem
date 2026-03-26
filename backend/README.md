# Backend Blueprint

本目录承载当前分支的本地后端实现，已经是可运行、可测试、可继续迭代的主后端，并支持微信小程序登录。

## 目标

- 保留微信小程序前端
- 用本地 Python 后端替代微信云函数和云数据库
- 让业务规则、权限、数据模型全部收口到服务端
- 默认对接 MySQL，兼容已有线上版本的持续演进

## 技术方向

- Web 框架：FastAPI
- ORM：SQLAlchemy 2.0
- 数据迁移：Alembic
- 数据库：MySQL
- 驱动：PyMySQL
- 认证：`wx.login` + JWT
- 校验：Pydantic

## 目录说明

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/         # API v1 路由层，只做协议转换、鉴权注入、响应组织
│   ├── core/           # 配置、数据库、认证、日志等基础设施
│   ├── models/         # SQLAlchemy 模型
│   ├── schemas/        # Pydantic 请求/响应模型
│   ├── services/       # 业务规则与用例编排
│   ├── utils/          # 纯工具函数，如距离计算
│   └── main.py         # FastAPI 入口
├── alembic/            # 数据库迁移目录
├── scripts/            # 导入导出、初始化、维护脚本
└── tests/              # 单测与集成测试
```

## 分层约束

- `api/` 不直接写业务规则，不直接拼装复杂数据库操作
- `services/` 负责报名、签到、删人、账单联动、权限判断等业务逻辑
- `models/` 只表达数据结构，不塞业务流程
- `schemas/` 区分创建、更新、返回，不复用同一个大模型
- 所有数据库结构变化必须通过 Alembic
- 数据库连接实现以 MySQL 方言为默认目标，不先按 SQLite 妥协

## 当前能力

当前已经覆盖原小程序主流程所需的后端能力：

- 本地账号注册、登录、JWT 签发
- 微信 `wx.login` 登录、JWT 签发
- 当前用户查询、资料更新、角色切换
- 用户头像上传与公网 URL 返回
- 活动列表、详情、创建、编辑、删除
- 报名、取消报名、签到、移除参与者
- 账单 CRUD
- 鸽子榜与活动账单统计

## 数据库策略

- 默认开发、测试、生产都按 MySQL 建模和验证
- SQLAlchemy 连接串使用 `mysql+pymysql://...`
- 字段类型、索引、唯一约束、默认值均以 MySQL 行为为准
- 不为了本地方便先写 SQLite 兼容分支，避免后续线上行为偏差

## 推荐数据实体

- `users`
- `activities`
- `activity_participants`
- `bills`
- `bill_participants`

不要继续沿用云数据库里的“参与者既可能是字符串也可能是对象”的结构。

## API 设计原则

- 使用 `/api/v1/...` 前缀
- 优先 REST 风格，而不是沿用云函数命名
- 错误响应结构统一
- 权限由后端校验，不信任前端传入的角色标记

## 运行约束

- 本地开发默认使用 MySQL
- 所有配置通过环境变量读取
- 小程序后续统一通过 `wx.request` 调用本后端

示例连接串：

```text
DATABASE_URL=mysql+pymysql://username:password@127.0.0.1:3306/dragon_reserve?charset=utf8mb4
```

## 当前已落地

- FastAPI 入口文件
- API v1 路由注册
- 健康检查接口 `/api/v1/health`
- 登录接口 `/api/v1/auth/login`
- 微信登录接口 `/api/v1/auth/wechat-login`
- 当前用户接口 `/api/v1/users/me`
- 当前用户头像上传接口 `/api/v1/users/me/avatar`
- 当前用户角色接口 `/api/v1/users/me/role`
- 活动接口 `/api/v1/activities`
- 报名、取消报名、签到、移除参与者接口
- 账单接口 `/api/v1/bills`
- 统计接口 `/api/v1/stats/history`、`/api/v1/stats/bills`
- 环境变量配置加载
- SQLAlchemy engine / session 基础设施
- JWT 与密码哈希工具
- 统一错误响应
- `users` ORM 模型
- `activities / activity_participants` ORM 模型
- `bills / bill_participants` ORM 模型
- Alembic 基础配置
- 首批 migrations
- 本地管理员初始化脚本
- `requirements.txt` 与 `.env.example`
- 小程序 API 对接所需的完整主流程
- 后端测试基线

## 本地启动最小步骤

1. 安装依赖：`pip install -r requirements.txt`
2. 复制环境变量：`cp .env.example .env`
3. 创建数据库：`dragon_reserve`
4. 配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`
5. 执行迁移：`alembic upgrade head`
6. 初始化管理员：`python scripts/create_admin.py`
7. 启动服务：`uvicorn app.main:app --reload`

默认管理员初始化脚本会引导你创建账号；如果使用当前仓库默认本地环境，常见开发命令见 [Makefile](/Volumes/disk/project/dragonReserveSystem/backend/Makefile)。

如果当前联调环境需要先通过 SSH 隧道接入远端测试库，再启动本地后端，可以使用统一命名的脚本：

```bash
cd backend
./scripts/start_backend_test.sh
```

Windows 环境如果没有 `make`，可直接在 PowerShell 中运行：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

`start_backend_test.*` 会：

1. 读取 `backend/.env.test`
2. 在本地 `127.0.0.1:3307` 不可用时自动建立 SSH 隧道
3. 使用 `--env-file .env.test` 启动本地 FastAPI 服务
4. 在整个测试会话期间，将小程序 `miniprogram/services/config.js` 自动切到 `http://127.0.0.1:8001/api/v1`，退出脚本时再从 `config.js.template` 恢复为线上地址
5. 默认带 `--reload`，本地改后端代码会自动重启

默认 SSH 隧道目标会使用：

- `ubuntu@124.156.228.148`
- 本地端口 `3307`
- 远端数据库 `127.0.0.1:3306`

如需覆盖默认值，可在 shell 环境或 `backend/.env.test` 中加入以下变量，后端本身会忽略这些额外字段：

- `SSH_TEST_DB_HOST`
- `SSH_TEST_DB_USER`
- `SSH_TEST_DB_REMOTE_HOST`
- `SSH_TEST_DB_REMOTE_PORT`
- `SSH_TEST_DB_LOCAL_HOST`
- `SSH_TEST_DB_LOCAL_PORT`
- `SSH_TEST_DB_IDENTITY_FILE`

如需关闭热重载，可以这样启动：

```bash
cd backend
APP_RELOAD=0 ./scripts/start_backend_test.sh
```

Windows 下可用：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1 -AppReload 0
```

如果只需要在本机/正式环境直接启动后端（不走 SSH 隧道，也不改小程序配置），可以使用：

```bash
cd backend
./scripts/start_backend_prod.sh
```

或在 Windows PowerShell 中：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_prod.ps1
```

## 头像上传说明

当前个人资料页的微信头像保存链路已经调整为：

1. 小程序 `chooseAvatar` 返回临时文件路径
2. 前端先调用 `POST /api/v1/users/me/avatar` 上传图片文件
3. 后端将图片写入 `MEDIA_ROOT/avatars`
4. 后端返回正式 `avatar_url`
5. 前端再调用 `PATCH /api/v1/users/me` 保存昵称和正式头像地址

这样可以避免把 `http://tmp/...` 或 `wxfile://...` 这类微信临时路径直接写入数据库。

当前涉及的关键环境变量：

- `PUBLIC_BASE_URL`：头像对外返回的正式域名，例如 `https://dragon.liqqihome.top`
- `MEDIA_ROOT`：头像文件落盘目录，默认 `storage`
- `MEDIA_URL_PREFIX`：静态访问前缀，默认 `/media`

当前后端还会拒绝将明显的临时头像路径直接写入 `avatar_url`，避免脏数据再次入库。

## 线上库排查与“手工修头像”踩坑记录

下面这些坑都来自真实线上排障，目的是让你在最短时间内定位“为什么小程序还在加载 `cloud://...` / 为什么头像 500 / 为什么我改了 `users.avatar_url` 还是不生效”。

### 1) 生产环境不再使用微信云，但历史数据可能仍是 `cloud://...`

虽然当前架构已经完全切到 MySQL + 本地落盘头像（`/media/avatars/...`），但历史用户数据里可能仍残留旧的 `cloud://...` 头像 URL。

典型现象：

- 小程序渲染层报：`Failed to load local image resource ... cloud://... (HTTP 500)`

此时需要在 MySQL 里查清楚这串 `cloud://...` 究竟写在哪个字段/哪张表里，而不是只盯 `users.avatar_url`。

### 2) 只更新 `users.avatar_url` 不够：活动列表用的是参与者快照缓存

活动参与者表 `activity_participants` 存了快照字段：

- `nickname_snapshot`
- `avatar_url_snapshot`

活动列表/详情展示参与者信息时会直接使用这些快照（这是为了“报名时刻的昵称/头像”可追溯）。

因此：

- 你更新了 `users.avatar_url` 之后，**历史活动**里仍可能继续展示旧的 `avatar_url_snapshot`（包括 `cloud://...`）
- 需要同步更新 `activity_participants.avatar_url_snapshot`（按 `user_id` 批量更新最稳）

### 3) 线上 MySQL 最稳的查询方式：用 stdin 管道喂给 `mysql`

从 Windows/PowerShell 远程执行 `mysql -e "..."` 很容易被多层引号转义坑到。
更稳的方式是把 SQL 走 stdin 管道传给服务器上的 `mysql`：

```powershell
'SELECT id,nickname,avatar_url FROM users WHERE avatar_url LIKE ''%needle%'' LIMIT 1;' |
  ssh ubuntu@<server> 'sudo mysql -N -D dragon_reserve'
```

同样方式可用于更新并回读验证：

```powershell
@'
UPDATE users SET avatar_url='https://example.com/media/avatars/xxx.jpg' WHERE id=123 LIMIT 1;
UPDATE activity_participants SET avatar_url_snapshot='https://example.com/media/avatars/xxx.jpg' WHERE user_id=123;
SELECT id,nickname,avatar_url FROM users WHERE id=123;
SELECT id,nickname_snapshot,avatar_url_snapshot FROM activity_participants WHERE user_id=123 LIMIT 5;
'@ | ssh ubuntu@<server> 'sudo mysql -N -D dragon_reserve'
```

### 3.1) 为什么“刚开始死活连不上”，后面又能连上？

这是两件事叠加导致的：

- **连的不是同一个库**：一开始走的是 `scripts/start_backend_test.ps1` + `backend/.env.test`，它指向的是测试库（例如 `dragon_reserve_test`，并通过 SSH 本地转发到 `127.0.0.1:3307`）。这套数据量可能很小，也不一定包含生产用户/头像数据。
- **Windows 远程执行的引号转义问题**：在 PowerShell → `ssh` → 远端 `bash` → `mysql -e "..."` 这条链路里，引号/反斜杠非常容易被吃掉，表现为远端 `mysql` 误解析参数然后只打印 usage、或 SQL 被截断。

后面能连上，是因为改成了更稳的方式：

- **直接在生产服务器执行 `sudo mysql`**（生产机本地 socket/权限/默认配置齐全）
- **通过 stdin 管道传 SQL**（避免 `-e` + 多层引号转义）

### 4) “文件扩展名”和“实际图片格式”必须一致

如果你手工上传头像文件到 `backend/storage/avatars/`，要注意：

- 文件名扩展名（`.png`/`.jpg`）应与实际内容一致
- 否则某些客户端（尤其是小程序 WebView/渲染层）可能出现“加载失败/解码失败/缓存异常”

建议：要么上传前就统一转码，要么在落盘时用后端统一生成的文件名与扩展名（推荐走正式接口 `POST /api/v1/users/me/avatar`）。

### 5) 小程序端头像联调新增踩坑（本次）

这次测试库批量写头像时，踩到的坑主要在“小程序图片加载约束”和“测试数据写入方式”：

- 小程序里不能用 `fetch` 做日志上报或网络请求，统一使用 `wx.request`
- 微信 `<image>` 对 HTTP 地址会直接拦截（例如 `http://127.0.0.1:8001/media/...`），报“请升级到 HTTPS”
- 因为上条限制，本地联调时不要把头像渲染 URL 直接拼成 HTTP 后端地址
- 测试头像建议走小程序本地静态资源（例如 `/images/avatars/test-avatar-xx.svg`）或正式 HTTPS 域名
- 批量修头像时要同时更新：
  - `users.avatar_url`
  - `activity_participants.avatar_url_snapshot`
  否则活动列表仍会显示旧头像快照
- 如果测试库通过 SSH 隧道连接，先确认 `127.0.0.1:3307` 可用，再执行批量脚本；隧道断开会导致“写到一半失败”

本次新增的测试数据脚本（便于复用）：

- `backend/scripts/seed_test_activities.py`：批量造活动和参与者
- `backend/scripts/fix_test_avatar_urls.py`：批量替换无效头像 URL（如 `example.com`）
- `backend/scripts/assign_test_avatars.py`：生成/分配测试头像

## 环境建设

当前仓库已经补齐本地开发所需的基础环境文件：

- [Makefile](/Volumes/disk/project/dragonReserveSystem/backend/Makefile)：统一依赖安装、迁移、启动命令
- [docker-compose.yml](/Volumes/disk/project/dragonReserveSystem/backend/docker-compose.yml)：本地 MySQL 8.4
- [Dockerfile](/Volumes/disk/project/dragonReserveSystem/backend/Dockerfile)：后端容器运行镜像
- [.env.example](/Volumes/disk/project/dragonReserveSystem/backend/.env.example)：本地环境变量模板
- [.gitignore](/Volumes/disk/project/dragonReserveSystem/.gitignore)：忽略本地环境和缓存文件

## 推荐本地开发流程

### 方式一：本机 Python + Docker MySQL

1. 进入目录：`cd backend`
2. 复制环境变量：`make copy-env`
3. 启动数据库：`make db-up`
4. 安装依赖：`make install`
5. 执行迁移：`make migrate`
6. 初始化管理员：`make create-admin`
7. 启动服务：`make run`
8. 运行测试：`make test`

### 方式二：Homebrew MySQL + 本机 Python

如果当前机器没有 Docker，但有 Homebrew，可以直接：

1. 安装 MySQL：`brew install mysql`
2. 启动 MySQL：`make db-up-brew`
3. 复制环境变量：`make copy-env`
4. 安装依赖：`make install`
5. 执行迁移：`make migrate`
6. 初始化管理员：`make create-admin`
7. 启动服务：`make run`

### 方式三：仅用 Docker 运行数据库，Python 仍在本机

如果本机已有 Python 环境，但没有 MySQL，推荐使用这种方式。数据库连接默认指向：

```text
mysql+pymysql://dragon_user:dragon_password@127.0.0.1:3306/dragon_reserve?charset=utf8mb4
```

### 方式四：容器化后端

当前 `Dockerfile` 已可用于单独构建后端镜像，但默认开发路径仍建议：

- MySQL 用 `docker compose`
- FastAPI 用本机 `uvicorn --reload`

这样调试效率更高。

## 当前验证结果

- 后端接口测试已覆盖现有公开接口
- 最近一次全量测试结果：`28 passed`
- 已完成本地联调：
  - 微信登录
  - 角色切换
  - 创建活动
  - 报名
  - 签到
  - 创建账单
  - 查询统计
- 已完成腾讯云服务器部署验证：
  - Ubuntu 24.04
  - MySQL 8
  - Caddy HTTPS
  - `systemd` 常驻后端服务
  - 公网 `health` / `login` / `users/me`
  - 线上主流程接口冒烟

## 作为正式服务器

如果当前这台 Mac 后续就是正式服务器，直接看：

- [DEPLOY_MAC_SERVER.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_MAC_SERVER.md)
- [Caddyfile.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/Caddyfile.example)
- [com.dragonreserve.backend.plist.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/com.dragonreserve.backend.plist.example)
- [.env.production.example](/Volumes/disk/project/dragonReserveSystem/backend/.env.production.example)

如果当前正式环境部署在腾讯云 Ubuntu 服务器，直接看：

- [DEPLOY_TENCENT_CLOUD.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_TENCENT_CLOUD.md)
