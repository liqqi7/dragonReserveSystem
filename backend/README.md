# Backend Blueprint

本目录承载“脱离微信云、支持持续迭代”的本地后端实现。

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
- 认证：JWT
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

## 第一阶段范围

第一阶段只做能替代现有微信云能力的基础能力：

- 登录与令牌签发
- 当前用户信息查询与更新
- 活动列表、详情、创建、编辑、删除
- 报名、取消报名、签到
- 账单的基础 CRUD
- 历史统计与排行

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

## 后续建议

开始实现前，优先补以下文件：

- `app/core/config.py`
- `app/core/database.py`
- `app/core/security.py`
- `app/api/v1/__init__.py`
- `app/main.py`

实现业务前，先定义数据库模型和迁移。
