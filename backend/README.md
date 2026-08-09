# 后端说明

后端基于 FastAPI、SQLAlchemy、Alembic 和 MySQL，为微信小程序提供认证、活动、报名、签到、用户资料和排行榜接口。

## 目录

```text
app/        API、配置、模型、数据结构与业务服务
alembic/    数据库迁移
scripts/    测试数据和生产维护脚本
tests/      pytest 测试
storage/    本地空目录占位；生产服务器保存用户头像
deploy/     Caddy 和活动状态同步配置
```

## 数据与规则

- 核心表：`users`、`activities`、`activity_participants`。
- `display_nickname`、`display_avatar_url` 随用户资料更新，历史页展示最新资料，不是资料快照。
- `checkin_method`：`location` 为地点签到，`admin` 为管理员补签，空值为未签到。
- 用户删除会级联删除其活动参与记录。
- 数据库结构变更必须新增 Alembic 迁移并执行 `alembic upgrade head`。

## Windows 本地测试

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q
```

最近完整结果为 `30 passed`。pytest 使用临时 SQLite 数据库，不连接生产库或服务器测试库。

## 小程序联调测试库

服务器测试库为 `dragon_reserve_test`。在 Windows PowerShell 中运行：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

脚本读取 `.env.test`，必要时建立 SSH 隧道，启动本地 FastAPI（默认 `127.0.0.1:8001`），并临时把小程序配置指向本地后端；结束后恢复正式地址模板。

重建虚构测试数据：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\seed_test_database.py
```

测试数据不得使用真实微信身份或真实头像。

## 头像存储

小程序调用 `POST /api/v1/users/me/avatar` 上传文件，后端写入 `MEDIA_ROOT/avatars`，返回 `/media/avatars/...` 地址后再更新用户资料。

生产头像位于服务器 `backend/storage/avatars/`，数据库保存访问地址。该目录是用户数据，不得随代码部署覆盖、删除或从本地空 `storage/` 同步；迁移服务器时必须和数据库一起迁移。

## 连接生产服务器

```powershell
ssh ubuntu@124.156.228.148
```

登录后进入项目：

```bash
cd /home/ubuntu/apps/dragonReserveSystem
```

如需指定密钥，在命令后追加 `-i` 和本机私钥路径。不要将私钥、服务器 `.env` 或数据库密码复制到项目或 Git 仓库。

## 生产服务维护

生产环境变量位于服务器 `backend/.env`，不提交到 Git。生产数据库为 `dragon_reserve`，测试数据库为 `dragon_reserve_test`。

```bash
sudo systemctl status dragonreserve-backend
sudo systemctl restart dragonreserve-backend
sudo journalctl -u dragonreserve-backend -n 100 --no-pager
sudo systemctl status dragonreserve-activity-status-sync.timer
```

`dragonreserve-activity-status-sync.timer` 每 5 分钟执行 `scripts/sync_activity_status.py`，负责同步到期活动状态，是生产依赖，不得删除。

## 更新生产代码

服务器与本地工作区都可能有未提交修改，不能直接在服务器执行 `git pull`。明确传输本次需要的代码后，在服务器运行：

```bash
cd /home/ubuntu/apps/dragonReserveSystem/backend
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
sudo systemctl restart dragonreserve-backend
```

当前数据库迁移版本为 `20260810_0011`。涉及数据删除或结构调整前，先导出数据库备份。

## 部署后验证

检查 `https://dragon.liqqihome.top/api/v1/health`，并在小程序中验证登录、活动列表、报名、签到、头像显示和排行榜。管理员账号由既有管理员维护，不在文档或代码中保存默认密码。
