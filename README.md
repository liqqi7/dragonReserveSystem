# 龙城俱乐部小程序

当前分支已将项目从“微信云开发直连”迁移为“微信小程序前端 + Python 后端”架构，并保留微信登录体验。

## 当前架构

- 前端：微信小程序
- 后端：FastAPI
- 数据库：MySQL
- 数据访问：小程序通过 `wx.request` 调用 HTTP API
- 认证：`wx.login` + 后端签发 JWT

当前小程序端已经不再依赖 `wx.cloud`、云函数或云数据库。

## 功能概览

- 活动管理
  - 创建、编辑、取消、删除活动
  - 报名、取消报名、签到
  - 活动详情、分享卡片、地点签到
- 记账
  - 按活动记账
  - AA 参与人分摊
  - 当日结算汇总
- 历史统计
  - 鸽子榜
  - 活动账单统计
- 个人中心
  - 微信登录、退出
  - 昵称、微信头像维护
  - 邀请码切换 `guest / user / admin`
- 数据清理
  - 管理员清空活动和账单数据

## 目录结构

```text
.
├── miniprogram/                 微信小程序前端
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── images/
│   ├── pages/
│   │   ├── welcome/             登录 / 注册
│   │   ├── activity_list/       活动列表、详情、报名、编辑
│   │   ├── checkin_map/         地图签到
│   │   ├── accounting/          记账与日结
│   │   ├── history/             鸽子榜与账单统计
│   │   ├── clear_data/          管理员清空数据
│   │   └── profile/             个人中心与角色切换
│   └── services/                小程序 API 封装层
│       ├── request.js
│       ├── config.js
│       ├── auth.js
│       ├── user.js
│       ├── activity.js
│       ├── bill.js
│       └── stats.js
├── backend/                     本地 Python 后端
│   ├── app/
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/
│   ├── scripts/
│   ├── tests/
│   ├── Makefile
│   ├── docker-compose.yml
│   └── README.md
├── cloudfunctions/              旧微信云函数目录，当前分支不再作为运行依赖
├── project.config.json
├── project.private.config.json
└── sitemap.json
```

## 技术栈

- 小程序：WXML / WXSS / JavaScript
- 后端：FastAPI
- ORM：SQLAlchemy 2.0
- 迁移：Alembic
- 数据库：MySQL
- 驱动：PyMySQL
- 认证：JWT
- 校验：Pydantic

## 关键接口

- 认证
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/wechat-login`
- 用户
  - `GET /api/v1/users/me`
  - `PATCH /api/v1/users/me`
  - `POST /api/v1/users/me/role`
  - `DELETE /api/v1/users/me/role`
- 活动
  - `GET /api/v1/activities`
  - `POST /api/v1/activities`
  - `PATCH /api/v1/activities/{id}`
  - `DELETE /api/v1/activities/{id}`
  - `POST /api/v1/activities/{id}/signup`
  - `DELETE /api/v1/activities/{id}/signup`
  - `POST /api/v1/activities/{id}/checkin`
  - `DELETE /api/v1/activities/{id}/participants/{participant_id}`
- 账单与统计
  - `GET /api/v1/bills`
  - `POST /api/v1/bills`
  - `PATCH /api/v1/bills/{id}`
  - `DELETE /api/v1/bills/{id}`
  - `GET /api/v1/stats/history`
  - `GET /api/v1/stats/bills`

## 本地启动

后端先启动，再用微信开发者工具打开小程序。

### 1. 启动后端

```bash
cd backend
cp .env.example .env
make install
make migrate
make create-admin
make run
```

开发环境默认接口地址：

```text
http://127.0.0.1:8000/api/v1
```

小程序 API 地址规则在 [config.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/services/config.js)：

- `develop` 环境默认走本地：`http://127.0.0.1:8000/api/v1`
- 非 `develop` 环境默认走正式域名：`https://dragon.liqqihome.top/api/v1`
- 也可以通过本地存储 `apiBaseUrl` 显式覆盖

### 2. 启动小程序

1. 用微信开发者工具导入仓库根目录
2. 确认请求域名允许访问本地开发地址
3. 编译运行小程序
4. 在欢迎页点击微信登录
5. 进入“我的”页面输入邀请码获取权限

默认邀请码：

- 普通用户：`dragon`
- 管理员：`manage`

## 测试与联调

后端测试：

```bash
cd backend
make test
```

当前分支最近一次全量后端测试结果：

- `28 passed`

已完成本地联调的主链路：

- 微信登录
- 角色升级
- 创建活动
- 报名
- 签到
- 创建账单
- 查询历史统计

已完成腾讯云线上验证的主链路：

- `https://dragon.liqqihome.top/api/v1/health`
- 公网管理员登录
- 公网 `users/me`
- 活动、账单、统计接口线上冒烟

## 说明

- `cloudfunctions/` 仍保留在仓库中，主要用于对照旧实现和迁移参考
- 当前运行链路不再依赖微信云函数或微信云数据库
- 后端微信登录需要在 [backend/.env.example](/Volumes/disk/project/dragonReserveSystem/backend/.env.example) 对应的 `.env` 中配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`
- 生产环境如果接入真机或线上小程序，请改为 HTTPS 域名并在小程序后台配置合法 request 域名

## 上线部署

当前仓库已经提供两种部署文档：

部署入口文档：

- [DEPLOY_MAC_SERVER.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_MAC_SERVER.md)
- [DEPLOY_TENCENT_CLOUD.md](/Volumes/disk/project/dragonReserveSystem/backend/DEPLOY_TENCENT_CLOUD.md)

当前正式环境已验证可用的域名：

- `https://dragon.liqqihome.top`

腾讯云部署后的关键收尾：

1. 在微信小程序后台配置合法 `request` 域名 `https://dragon.liqqihome.top`
2. 修改默认管理员密码 `admin123456`
