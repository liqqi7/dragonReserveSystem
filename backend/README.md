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
- 最近一次全量测试结果：`25 passed`
- 已完成本地联调：
  - 微信登录
  - 角色切换
  - 创建活动
  - 报名
  - 签到
  - 创建账单
  - 查询统计

## 作为正式服务器

如果当前这台 Mac 后续就是正式服务器，直接看：

- [DEPLOY_MAC_SERVER.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_MAC_SERVER.md)
- [Caddyfile.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/Caddyfile.example)
- [com.dragonreserve.backend.plist.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/com.dragonreserve.backend.plist.example)
- [.env.production.example](/Volumes/disk/project/dragonReserveSystem/backend/.env.production.example)
