# Backend Test And Environment Summary

本文档记录当前 `backend/` 目录在本机上的环境建设、运行验证和测试结果。

## 一、当前结论

后端已经具备以下能力：

- 本地 Python 虚拟环境已创建
- 依赖已安装
- 本地 MySQL 已安装并启动
- 数据库和应用账号已创建
- Alembic migration 已执行完成
- 默认管理员账号已初始化
- FastAPI 应用可正常导入
- 健康检查和登录链路已验证
- 当前所有已实现接口已有接口级测试覆盖

## 二、环境建设结果

### Python 环境

- Python 版本：`3.9.6`
- 虚拟环境路径：`backend/.venv`

### Python 依赖

已安装并实际使用的关键依赖包括：

- `fastapi`
- `uvicorn`
- `sqlalchemy`
- `alembic`
- `pymysql`
- `python-jose`
- `passlib[bcrypt]`
- `cryptography`
- `httpx`
- `pytest`

### MySQL 环境

当前机器通过 Homebrew 安装并启动了 MySQL：

- MySQL 版本：`9.6.0`
- 安装方式：`brew install mysql`
- 服务启动方式：`brew services start mysql`

### 本地数据库

已创建数据库：

- `dragon_reserve`

已创建应用账号：

- 用户名：`dragon_user`
- 密码：`dragon_password`

### 应用初始化

已执行：

- `alembic upgrade head`
- `python scripts/create_admin.py`

默认管理员账号已创建：

- 用户名：`admin`
- 密码：`admin123456`

## 三、接口验证结果

### 健康检查

已验证：

- `GET /api/v1/health`

结果：

- HTTP `200`
- 返回体：

```json
{"status":"ok"}
```

### 登录验证

已验证：

- `POST /api/v1/auth/login`

使用账号：

- `admin / admin123456`

结果：

- HTTP `200`
- 返回字段包含：
  - `access_token`
  - `expires_in`
  - `token_type`

## 四、自动化测试结果

最近一次完整执行命令：

```bash
make test
```

执行结果：

```text
19 passed in 8.92s
```

### 当前测试覆盖文件

- `backend/tests/conftest.py`
- `backend/tests/test_health.py`
- `backend/tests/test_auth.py`
- `backend/tests/test_users.py`
- `backend/tests/test_activities.py`
- `backend/tests/test_bills.py`
- `backend/tests/test_stats.py`

### 当前已覆盖接口

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `GET /api/v1/users/me`
- `PATCH /api/v1/users/me`
- `GET /api/v1/activities`
- `GET /api/v1/activities/{id}`
- `POST /api/v1/activities`
- `PATCH /api/v1/activities/{id}`
- `DELETE /api/v1/activities/{id}`
- `POST /api/v1/activities/{id}/signup`
- `DELETE /api/v1/activities/{id}/signup`
- `POST /api/v1/activities/{id}/checkin`
- `GET /api/v1/bills`
- `POST /api/v1/bills`
- `PATCH /api/v1/bills/{id}`
- `DELETE /api/v1/bills/{id}`
- `GET /api/v1/stats/history`
- `GET /api/v1/stats/bills`

## 五、过程中修复的问题

在环境打通和测试补全过程中，已经修复以下问题：

- `Settings` 读取系统环境变量时与本机 `DEBUG=release` 冲突
- Python 3.9 不支持代码里部分 `X | None` 注解
- SQLAlchemy 在 Python 3.9 下解析 `Mapped[...]` 注解失败
- MySQL migration 中 `TEXT` 字段默认值不兼容
- `PyMySQL` 连接 MySQL 9 时缺少 `cryptography`
- `Makefile` 最初没有默认使用 `.venv`
- `create_admin.py` 直接执行时找不到 `app` 包
- 测试链路缺少 `httpx`

## 六、当前可直接使用的命令

在 `backend/` 目录下：

```bash
make install
make migrate
make create-admin
make run
make test
make dev-check
make db-up-brew
make db-down-brew
```

## 七、当前残余说明

- 测试目前使用的是隔离测试数据库方案，不直接跑本机 MySQL 中的真实业务数据
- 接口层测试已覆盖当前已实现的公开接口，但这不等于未来改动后天然无回归，后续仍需持续补测试
- 微信小程序前端尚未开始对接本地后端 API

## 八、建议下一步

- 提交并推送当前环境建设与测试补全结果
- 开始改造小程序前端的数据访问层
- 将 `wx.cloud.*` 逐步替换为 `wx.request`
