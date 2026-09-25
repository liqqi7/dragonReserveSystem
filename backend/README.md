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

完整测试结果按发版清单记录；pytest 使用临时 SQLite 数据库，不连接生产库或服务器测试库。

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

## 本地数据库 + 手机联调环境（Windows）

`start_backend_test.ps1` 的数据库是服务器的 `dragon_reserve_test`（必要时建 SSH 隧道），**不是**完全本地环境。手机联调且不希望连接远程测试库时，改用以下脚本；无需 Docker/MySQL/SSH：

```powershell
cd backend
.\scripts\start_backend_local_phone.ps1
# 如自动选址失败或电脑有多个网卡：
.\scripts\start_backend_local_phone.ps1 -MiniProgramHost 192.168.10.2 -AppPort 8002
```

`-MiniProgramHost` 要替换为**当前电脑在手机所在局域网的 IPv4**（可用 `ipconfig` 查看，脚本会验证它确实分配给本机）。默认端口 `8002`，监听 `0.0.0.0`；绑定电脑所有网卡；只在可信局域网使用，不做路由器端口转发，也不要在公共网络启动。脚本要求 `backend/.venv` 和 `backend/.env.test` 中的 `WECHAT_APP_ID`/`WECHAT_APP_SECRET`（与本小程序 AppID 配套），但明确覆盖数据库连接等设置，绝不连接其中的远程数据库；微信登录仍需访问微信官方 `code2session` 服务，并非完全离线。手机和电脑需位于互通的 Wi-Fi／局域网；VPN、访客网络、客户端隔离或本机防火墙可能阻断连接。

启动时脚本创建专用 SQLite（已有数据库只检查必需表和列，不自动迁移） `backend/storage/local-phone-test/local-phone.sqlite3`，新库使用当前 ORM 表结构（**不执行 MySQL 专用 Alembic 迁移，也不自动重建/清空已有数据**），并将头像、分享图等媒体保存到同目录 `media/`。首次启动是空库，不包含服务器历史活动。结构不兼容时会报错，需自行备份并明确迁移，脚本不会覆盖。只初始化/检查数据库、不改小程序配置和不启动后端，可加 `-InitializeOnly`。

启动时小程序的 `miniprogram/services/config.js` 暂指向 `http://<电脑局域网 IP>:8002/api/v1`，服务端返回的媒体 URL 也使用该 IP；脚本会先将原配置备份在 `backend/storage/local-phone-test/config-before-*.js`，保存运行状态到 `session.json`，然后在后台运行后端并返回终端。完成测试后**必须显式停止**，脚本会按记录的进程身份停止后端并恢复**启动前的原配置**：

```powershell
cd backend
.\scripts\start_backend_local_phone.ps1 -Stop
```

不要用 Ctrl+C 或关闭终端来代替 `-Stop`；如果意外中断，可重新运行 `-Stop`。若 `session.json` 丢失，可从对应的 `config-before-*.js` 手动恢复原配置。脚本拒绝与另一正在使用 `test` 配置的测试会话并行；先停旧脚本再启动。运行时 SQLite/媒体目录持久保留，`-Stop` 不删除测试数据。

在微信开发者工具打开本项目、重新编译，使用**真机调试**而非上传/发布（项目 `project.config.json` 的开发设置已关闭 URL 合法域名校验）。先在手机浏览器访问 `http://<电脑局域网 IP>:8002/api/v1/health`，应返回 `{"status":"ok"}`；再看小程序请求是否连到此地址。此项只能由手机实际验证，本机健康检查不代表手机已连通。HTTP/IP 的调试设置**不等于**普通预览包或线上版的合法域名配置。

本地库里真实微信账号首次登录是 `guest`，可用脚本启动时显示的**本地管理员邀请码**在小程序内获取管理员角色，之后测试创建活动、编辑地址／时间、进入详情及分享；它只对本轮本地服务有效，脚本每次重启会换新的 JWT 密钥和邀请码，重启后请重新登录。原远程测试环境的登录态/活动数据不通用。分享静态 PNG 会在活动创建/相关编辑时写到本机 `media/share-previews/`；手机需要在分享前能从局域网下载该图片。生产 HTTPS 分享路径不受该调试配置影响。

可自行做的本机检查：两个地址的 `/api/v1/health`、`/api/v2/activities` 以及活动封面资源接口返回正确状态；微信开发者工具编译和手机真机卡片样式必须分别验证。请勿在该环境使用真实生产数据，退出后切勿将本地 HTTP 配置上传发布。

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

## 部署后验证

检查 `https://dragon.liqqihome.top/api/v1/health`，并在小程序中验证登录、活动列表、报名、签到、头像显示和排行榜。管理员账号由既有管理员维护，不在文档或代码中保存默认密码。
