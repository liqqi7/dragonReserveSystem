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

## 数据库迁移验证与恢复

- `.github/workflows/mysql-migrations.yml` 使用独立 MySQL 8.0 服务验证空库到 head、数据迁移、索引升级/回退和关键回退边界；不访问生产数据库。
- 本地运行：设置 `MIGRATION_TEST_SERVER_URL` 为**专用测试 MySQL 服务**的 URL，再执行 `python -m pytest migration_tests -q`。测试会创建并删除随机命名的 `migration_test_*` 数据库，需要建库权限；不得指向生产服务。URL 中密码的特殊字符应做 URL 编码，例如 `%` 写作 `%25`。
- MySQL 迁移会话固定使用 `+08:00`，与应用存储的上海本地时间一致。SQLite 单元测试继续使用 `create_all`，不把它作为 MySQL 迁移验证。
- 上线前备份数据库并确认备份可恢复；执行 `alembic upgrade head` 前先在独立测试库验证当前版本到目标版本。MySQL DDL 不是整体事务，失败后不可假定改表已自动撤销；应检查实际表结构与版本记录后决定修复或恢复，禁止直接 `stamp head` 掩盖失败。
- 新增 `20261009_0021`：增加活动结束时间索引、删除 openid 普通索引，保留 openid 唯一约束；该迁移可以回退到 `20260924_0020`。
- 新增 `20261010_0022`：删除不再被现行客户端/API 使用的 `activities.signup_deadline`、`activity_type`、`activity_style_key`。开始时间继续作为报名截止边界，封面继续使用 `activity_cover_id`。该迁移会永久删除三列的历史值，拒绝假回退；需要恢复时使用迁移前备份及配套代码。上线时停写、备份并验证恢复能力，再升级数据库和代码，最后恢复服务。本轮仅在临时库验证，未执行真实业务库迁移。
- 历史迁移 `0009`（删除账单）、`0015`（物理删除活动）、`0019`（合并封面标识）无法无损逆转；跨越这些版本的恢复必须使用迁移前备份，不能只回退代码或运行 downgrade。应先停写，再恢复备份和配套旧代码，并核对版本与数据；恢复到备份时间点会舍弃此后的新增数据，应先评估。
- 回退 `0006` 前，如仍有不限人数的活动，必须人工确认各活动的明确人数上限；脚本会拒绝回退，不会擅自替用户填值。

## 安装依赖与 CairoSVG

生产依赖与测试依赖分开维护：

```bash
python -m pip install --require-hashes -r requirements.lock
python -m pip install --require-hashes -r requirements-dev.lock  # 开发/测试环境
```

分享图 SVG 渲染依赖 Cairo 系统库。macOS 安装：`brew install cairo`；Ubuntu/Debian 安装：`sudo apt-get install libcairo2`。安装后再安装 Python 依赖中的 `CairoSVG`。

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

Linux/macOS 的对应入口为 `bash scripts/start_backend_test.sh`（在 `backend` 目录运行）。两种脚本均保留用于联调，不是运行 pytest 的前置步骤；不要为了执行单元测试而启动远程数据库隧道。

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

## 媒体地址配置

小程序内置活动样式的图片地址由 `miniprogram/services/config.js` 中的 API 地址推导，使用同一站点的 `/media/`；生产默认链接与原来一致。公共逻辑保存在被 Git 跟踪的 `config.js.template`，测试启动脚本只替换 API 地址和环境标识，不再重写整份模块。

旧 v1 活动及类型样式接口已移除，现行活动接口使用 `/api/v2/activities`，封面目录与玻璃图片使用 `/api/v2/activity-covers`。登录、用户、排行榜等接口仍使用 v1，不要把小程序的默认 API 地址整体改成 v2。`PUBLIC_BASE_URL` 继续用于分享图等媒体的公开地址；生产环境应配置真实的对外 HTTPS 站点地址，避免反向代理后的内部协议或地址被用于媒体链接。

这些配置只改变链接的拼接方式，不会复制、下载或迁移资源，也不会改写数据库里的已有 URL。测试环境若需要展示旧样式，应在对应的 `MEDIA_ROOT/images/` 下准备同名资源；现行 v2 封面及其独立 CDN 配置保持不变。PowerShell 和 Bash 远程测试脚本退出时恢复生产模板，本地独立真机脚本仍用 `-Stop` 恢复启动前配置。

## 业务时间与分享图清理

活动、天气和排行榜的业务时钟统一使用 `app/utils/app_time.py` 的 `app_now()`；带时区的活动时间经 `to_app_naive()` 转为上海本地时间，无时区值视为已有的上海本地时间，不重复平移。分享图使用相同转换生成时间文字和文件哈希；登录凭证、安全有效期及文件保留期的 UTC 时钟不随此合并改动。

分享图生成与读取只接受 `activity-<活动 ID>-<24 位小写十六进制哈希>.png`。`scripts/prune_activity_share_previews.py` 的离线扫描范围保留 24～32 位哈希，用于识别历史文件，不代表接口允许读取这些历史格式，也不依赖旧客户端是否存在。

清理默认 dry-run、保留期 14 天，`--min-age-days` 不得低于 7；只有显式 `--apply` 才删除。数据库已引用的文件、未超过保留期的文件、命名不符合扫描规则的文件均跳过，并在删除前再次查询引用。这里描述的是运维工具约束，不代表已经执行清理；运行前仍需确认目标数据库与媒体目录。

## 头像存储

小程序调用 `POST /api/v1/users/me/avatar` 上传文件，后端写入 `MEDIA_ROOT/avatars`，返回 `/media/avatars/...` 地址后再更新用户资料。

生产头像位于服务器 `backend/storage/avatars/`，数据库保存访问地址。该目录是用户数据，不得随代码部署覆盖、删除或从本地空 `storage/` 同步；迁移服务器时必须和数据库一起迁移。

## 连接生产服务器

```powershell
ssh <deploy-user>@<server-host>
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

## 桌游库预览 worker

桌游库上线使用 `deploy/dragonreserve-boardgame-preview-worker.service` 监管名称搜索预览任务。它与正式 API 使用同一工作目录、虚拟环境和 `.env`，不替换活动状态或天气定时任务。API 重启时，已启动的 worker 也随之重启，避免 API 与 worker 使用不同版本代码。

安装服务前，先备份、核验实际 MySQL 版本与迁移状态，并完成 `20260924_0020` → `20261007_0021`。若已有同名桌游表或数据库版本与预期不符，停止并检查，不直接升级。仅在目标环境启用 `BOARDGAME_ENABLED`、`BOARDGAME_PREVIEW_WORKER_ENABLED`、`BGG_ENABLED` 并配置有效的后端 `BGG_API_TOKEN`；不复制本地 `.env.test`，不覆盖正式 `.env` 或媒体目录。

```bash
sudo systemd-analyze verify deploy/dragonreserve-boardgame-preview-worker.service
sudo install -m 0644 deploy/dragonreserve-boardgame-preview-worker.service /etc/systemd/system/dragonreserve-boardgame-preview-worker.service
sudo systemctl daemon-reload
sudo systemctl enable --now dragonreserve-boardgame-preview-worker.service
```

单实例运行该服务。`active` 和轮询接口返回 200 只说明进程或接口可用，仍须通过真实 BGG 名称搜索确认任务从 queued/fetching 到 ready、评分/排名/重度与版本有值，再检查原有登录、活动和排行榜接口。功能开关关闭或 BGG 凭据缺失时，worker 会空转，不能视为搜索验收通过。

回退时停止新 worker、关闭桌游库开关并恢复部署前的应用版本，保留桌游表和已录入数据；不要直接 downgrade `20261007_0021`，它会删除六张新表。小程序上传体验版之前必须配置已验证的公网 HTTPS API；一次性 BGG 馆藏导入独立执行，本次上线不自动导入。
