## 龙城俱乐部小程序（前端 + Python 后端）

当前仓库已将原来的“微信云开发直连”升级为 **微信小程序前端 + FastAPI 后端 + MySQL** 的标准三层架构，并保留微信登录体验。

### 架构总览

- **前端**：微信小程序（`miniprogram/`）
- **后端**：FastAPI（`backend/`）
- **数据库**：MySQL
- **调用方式**：小程序通过 `wx.request` 调用 HTTP API（统一前缀 `/api/v1`）
- **认证链路**：微信 `wx.login` + 后端签发 JWT

小程序端已经完全脱离 `wx.cloud`、云函数和云数据库，所有业务规则和数据访问都收口到 Python 后端。

---

## 功能概览

- **活动管理**
  - 创建、编辑、取消、逻辑删除活动
  - 报名 / 取消报名
  - 地点签到（半径校验）
  - 活动详情、分享卡片
- **记账**
  - 按活动记账
  - AA 人数自动分摊
  - 支出汇总与日结
- **历史统计**
  - 鸽子榜（报名 vs 签到次数）
  - 活动账单统计（总额 / 人均）
- **个人中心**
  - 微信登录 / 退出
  - 昵称、微信头像维护
  - 邀请码切换 `guest / user / admin`
- **数据清理**
  - 管理员清空活动和账单数据

---

## 目录结构

```text
.
├── miniprogram/                 # 微信小程序前端
│   ├── app.js / app.json / app.wxss
│   ├── images/
│   ├── pages/
│   │   ├── welcome/             # 首次进入、登录引导
│   │   ├── activity_list/       # 活动列表、详情、报名、编辑
│   │   ├── checkin_map/         # 签到地图页
│   │   ├── accounting/          # 记账与日结
│   │   ├── history/             # 鸽子榜与账单统计
│   │   ├── clear_data/          # 管理员清空数据
│   │   └── profile/             # 个人中心与角色切换
│   └── services/                # 小程序 API 封装层
│       ├── request.js
│       ├── config.js            # 本地环境配置（已从 git 忽略，使用模板注入）
│       ├── config.js.template   # 线上地址模板（提交到仓库）
│       ├── auth.js / user.js
│       ├── activity.js / bill.js
│       └── stats.js
├── backend/                     # Python 后端
│   ├── app/
│   │   ├── api/v1/              # 路由层，只做协议与鉴权
│   │   ├── core/                # 配置、数据库、认证、日志等
│   │   ├── models/              # SQLAlchemy ORM 模型
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── services/            # 业务用例：报名、签到、记账、统计等
│   │   └── main.py              # FastAPI 入口
│   ├── alembic/                 # 数据库迁移
│   ├── scripts/                 # 启动脚本、维护脚本
│   ├── tests/                   # 单测与集成测试
│   └── README.md                # 后端详细说明
├── cloudfunctions/              # 旧微信云函数，仅作迁移参考
├── project.config.json
├── project.private.config.json
└── sitemap.json
```

---

## 重要约定与技术栈

- 小程序：WXML / WXSS / JavaScript
- 后端：FastAPI + SQLAlchemy 2.0 + Alembic
- 数据库：MySQL，驱动 `PyMySQL`
- 校验：Pydantic
- 认证：JWT（包括微信登录后的 JWT）
- 所有数据库变更必须通过 Alembic 迁移完成

### 关键接口一览

- **认证**
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/wechat-login`
- **用户**
  - `GET /api/v1/users/me`
  - `PATCH /api/v1/users/me`
  - `POST /api/v1/users/me/role`
  - `DELETE /api/v1/users/me/role`
  - `POST /api/v1/users/me/avatar`
- **活动**
  - `GET /api/v1/activities`
  - `POST /api/v1/activities`
  - `GET /api/v1/activities/{id}`
  - `PATCH /api/v1/activities/{id}`
  - `DELETE /api/v1/activities/{id}`
  - `POST /api/v1/activities/{id}/signup`
  - `DELETE /api/v1/activities/{id}/signup`
  - `POST /api/v1/activities/{id}/checkin`
  - `DELETE /api/v1/activities/{id}/participants/{participant_id}`
- **账单与统计**
  - `GET /api/v1/bills` / `POST /api/v1/bills` / `PATCH /api/v1/bills/{id}` / `DELETE /api/v1/bills/{id}`
  - `GET /api/v1/stats/history`
  - `GET /api/v1/stats/bills`

更详细的后端设计与运行说明见 `backend/README.md`。

---

## 环境与配置（重点：小程序 config 隔离）

为避免**小程序审核环境误连本地**，以及避免本地测试地址误提交到仓库，当前对 `config.js` 做了物理隔离和脚本注入：

- 仓库中提交的是：`miniprogram/services/config.js.template`

  ```js
  const API_BASE_URL = "https://dragon.liqqihome.top/api/v1";

  function getApiBaseUrl() {
    return API_BASE_URL;
  }

  module.exports = {
    API_BASE_URL,
    getApiBaseUrl
  };
  ```

- `.gitignore` 中忽略 `miniprogram/services/config.js`，本地真实的 `config.js` **永远不提交**。
- **测试环境启动脚本**会在生命周期内自动覆盖 `config.js` 为本地地址，退出脚本后再从 `config.js.template` 恢复为线上地址。

这样保证：

- 小程序审核 / 线上构建时，只会看到正式地址 `https://dragon.liqqihome.top/api/v1`；
- 本地联调时，可一键切换到 `http://127.0.0.1:8001/api/v1`，无需手动改文件。

---

## 本地 / 测试 / 正式 启动方式

### 1. 后端（本地开发环境）

最小启动流程（使用 Docker MySQL 或本机 MySQL 均可）：

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
alembic upgrade head
python scripts/create_admin.py     # 初始化管理员
uvicorn app.main:app --reload
```

本地开发默认接口地址：

```text
http://127.0.0.1:8000/api/v1
```

更完整的后端开发流程（包含 `make` / `docker-compose`）请参考 `backend/README.md`。

### 2. 启动“测试环境”（走 SSH 隧道 + 自动改小程序 config）

> 场景：本地后端连远端测试库，小程序连本机 8001。

**Mac / Linux：**

```bash
cd backend
./scripts/start_backend_test.sh
```

**Windows PowerShell：**

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

`start_backend_test.*` 会：

1. 读取 `backend/.env.test`
2. 在本地 `127.0.0.1:3307` 不可用时自动建立到远端测试库的 SSH 隧道
3. 使用 `--env-file .env.test` 启动 FastAPI（默认挂在 `http://127.0.0.1:8001`）
4. 在整个测试会话期间，将小程序 `miniprogram/services/config.js` 写成 `http://127.0.0.1:8001/api/v1`
5. 脚本退出时，用 `config.js.template` 恢复为线上地址
6. 默认带 `--reload`，如需关闭可设置 `APP_RELOAD=0` 或传 `-AppReload 0`

### 3. 启动“正式/本机直连”后端（不改小程序配置）

> 场景：本机或正式环境直接跑后端，不走 SSH 隧道，也不动小程序 `config.js`。

**Mac / Linux：**

```bash
cd backend
./scripts/start_backend_prod.sh
```

**Windows PowerShell：**

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_prod.ps1
```

默认使用 `backend/.env` 中的配置，可通过环境变量或脚本参数覆盖 `APP_HOST`、`APP_PORT`、`APP_RELOAD` 等。

### 4. 小程序启动步骤

1. 用微信开发者工具导入仓库根目录
2. 根据需要启动后端：
   - 本地开发：`uvicorn app.main:app --reload` 或 `start_backend_prod.*`
   - 测试联调：`start_backend_test.*`
3. 编译运行小程序
4. 在欢迎页点击微信登录
5. 前往“我的”页面输入邀请码获取权限

默认邀请码：

- 普通用户：`dragon`
- 管理员：`manage`

---

## 测试与主链路验证

后端测试：

```bash
cd backend
make test
```

当前分支最近一次全量后端测试结果：**`28 passed`**  
已完成本地联调的主链路：

- 微信登录 / 角色升级
- 创建活动 / 报名 / 签到
- 记账与统计

线上验证：

- 健康检查：`https://dragon.liqqihome.top/api/v1/health`
- 公网登录、`users/me`、活动、账单、统计接口均已冒烟。

---

## 部署与注意事项

- 生产环境必须使用 HTTPS 域名，并在小程序后台配置合法 `request` 域名：
  - 当前线上域名：`https://dragon.liqqihome.top`
- 部署文档入口：
  - `backend/DEPLOY_MAC_SERVER.md`
  - `backend/DEPLOY_TENCENT_CLOUD.md`
- 上线后请务必：
  1. 在微信小程序后台配置 `https://dragon.liqqihome.top` 为合法请求域名
  2. 修改默认管理员密码
  3. 在 `.env.production` 中正确配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`

`cloudfunctions/` 目录仅用作旧实现参考，当前运行链路完全依赖 `backend/` 下的 FastAPI 服务。 
