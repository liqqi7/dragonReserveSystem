# 后端说明

后端基于 FastAPI、SQLAlchemy、Alembic 和 MySQL，为微信小程序提供认证、活动、报名、签到、用户资料和排行榜接口。

## 目录

```text
app/        API、配置、模型、数据结构与业务服务
alembic/    数据库迁移
scripts/    测试数据和生产维护脚本
tests/      pytest 测试
storage/    运行日志/锁及历史本地数据；日常测试媒体使用服务器挂载
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

此处指隔离自动化回归，是允许使用临时 SQLite 的例外，不是小程序日常联调环境。

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q
```

完整测试结果按发版清单记录；pytest 使用临时 SQLite 数据库，生成媒体统一写入系统临时目录并在会话结束后清理，不写入仓库中的 storage，也不连接生产库或服务器测试库。

## 小程序联调测试库

当前统一规范见 [测试环境](../docs/测试环境.md)：**本地 API + 服务器测试 MySQL + 服务器测试媒体目录**。手机与开发者工具共用同一入口；远端不可用就停止，不能创建本地业务数据库。

服务器测试库为 `dragon_reserve_test`。在 Windows PowerShell 中运行：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

脚本读取 `.env.test`，新建独占 SSH 隧道核验数据库，并通过 SSHFS 验证服务器测试媒体存储后，启动本地 FastAPI（默认 `127.0.0.1:8001`）；结束后停止 API、恢复正式地址模板、卸载本会话远端目录并关闭隧道。数据库和上传素材不持久保存在本机。

Linux/macOS 的对应入口为 `bash scripts/start_backend_test.sh`（在 `backend` 目录运行）。两种脚本仅转发到同一个 `scripts/test_environment.py`；不再独立维护环境逻辑。使用 `.env.test.example` 配置凭据，Windows 需安装 WinFsp/SSHFS-Win，其他平台需 SSHFS。这不是运行 pytest 的前置步骤，不要为了执行单元测试而连接共享测试库。

重建虚构测试数据：

```powershell
cd backend
.\.venv\Scripts\python.exe scripts\seed_test_database.py --apply
```

造数脚本要求明确 `--apply`，并通过统一的目标校验和独占隧道连接服务器测试库；不传该参数只校验配置，不插入数据。测试数据不使用真实微信身份或正式头像，空头像使用客户端占位图；本轮没有运行造数脚本。

## 手机联调（同一服务器测试环境）

```powershell
cd backend
.\scripts\start_backend_test.ps1 -AppHost 0.0.0.0 -MiniProgramHost 192.168.10.2 -AppPort 8002
```

替换为当前电脑的 LAN IPv4，手机和电脑连接互通的可信 Wi-Fi，不做公网端口转发。此参数只改变 API 的监听和访问地址，不改变数据库、媒体存储、测试 JWT 或邀请码。退出使用 Ctrl+C。旧本地 SQLite 手机脚本和初始化脚本已移除，历史本地数据不自动删除或导入。扫码预览的域名/HTTPS 限制、客户端连通性仍需单独验证，详见统一规范。

## 媒体地址配置

小程序内置活动样式的图片地址由 `miniprogram/services/config.js` 中的 API 地址推导，使用同一站点的 `/media/`；生产默认链接与原来一致。公共逻辑保存在被 Git 跟踪的 `config.js.template`，测试启动脚本只替换 API 地址和环境标识，不再重写整份模块。

旧 v1 活动及类型样式接口已移除，现行活动接口使用 `/api/v2/activities`，封面目录与玻璃图片使用 `/api/v2/activity-covers`。登录、用户、排行榜等接口仍使用 v1，不要把小程序的默认 API 地址整体改成 v2。`PUBLIC_BASE_URL` 继续用于分享图等媒体的公开地址；生产环境应配置真实的对外 HTTPS 站点地址，避免反向代理后的内部协议或地址被用于媒体链接。

这些配置只改变链接的拼接方式，不会复制、下载或迁移资源，也不会改写数据库里的已有 URL。日常测试的 `MEDIA_ROOT` 与 `MEMORY_STORAGE_ROOT` 由已验证的服务器挂载提供，不指向本地目录，`PUBLIC_BASE_URL` 复用服务器测试 HTTPS 地址，媒体可以直接从服务器读取；现行 v2 内置封面及独立 CDN 配置保持不变。统一测试入口退出时恢复生产模板，不再保留独立手机环境。

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

生产环境变量位于当前运行版本的 `backend/.env`，不提交到 Git。通过 `systemctl show dragonreserve-backend -p WorkingDirectory --value` 查询实际目录；`/home/ubuntu/apps/dragonReserveSystem/active-release.json` 记录激活版本。旧项目根目录下的 `backend/` 保留作为回滚版本及历史媒体位置，不应只凭该目录的 Git HEAD 判断线上代码。生产数据库为 `dragon_reserve`，测试数据库为 `dragon_reserve_test`。

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

## 记忆模块正式发布

2026-10-20 已发布 `memory-20261020-r1`。正式 API 地址仍为 `https://dragon.liqqihome.top/api/v1`，实际代码目录为 `/home/ubuntu/apps/dragonReserveSystem-releases/memory-20261020-r1/backend`。发布包包含未提交的本期工作区文件，以服务器 `release-manifest.json` 中的逐文件 SHA256 为准，不以旧目录的 Git HEAD 代替发布标识。

- 正式库通过 Alembic 从 `20261010_0023` 升级到 `20261011_0024`，仅新增四张记忆表，迁移前后原有业务行的数量和摘要一致。`scripts/migrate_memory_schema.py` 仍为测试库专用，不能用于正式迁移。
- 正式公共媒体保留在原 `backend/storage/`；记忆私有媒体使用 `/home/ubuntu/apps/dragonReserveSystem/private-storage/memories`，不在公共静态目录下。初始记忆容量预算为 10,000,000,000 字节，磁盘保底空闲 3GiB。原始媒体按既有处理逻辑，在压缩结果持久化成功后删除；本次没有改压缩参数。
- 保留原有正式 JWT 密钥、算法、有效期、成员码、管理员码和微信配置，仅新增独立的记忆媒体签名配置。不复制测试 `.env`、账号、业务数据或素材。后续更改配置时以实际运行目录为准。
- `dragonreserve-memory-worker.service` 单实例串行处理，CPU 配额 75%、低调度优先级、内存高水位 640MiB、硬上限 900MiB；6000 万像素合成图实测进程峰值约 710MiB。活动状态、天气（含原有 flock 互斥）及桌游 worker 保留，服务器测试服务与路由未变。
- 新 API 先在备用端口验证旧签名凭证、用户资料/角色、排行、活动、桌游和既有封面，再热切换代理；主服务更新期间由已验证的备用服务承接请求。临时服务已停止并移除。
- 备份位于 `/home/ubuntu/backups/dragonReserveSystem/current`，是本次发布前 `0023` 的代码、数据库、媒体和必要配置的一致快照，已在隔离恢复库验证恢复与新迁移。最终仅保留这一套完整备份。备份期间维护提示约 32 秒，正式迁移也执行了短暂维护，不宣称零中断。
- 普通回滚先停止记忆 worker，再切回旧代码与匹配服务配置，保留新增记忆表和已接收投稿；禁止直接 downgrade 记忆迁移。恢复旧数据库备份会舍弃备份后的写入，必须另行停写、评估并明确确认，不能作为自动回滚步骤。

发版验收：前端 979 项、后端 453 项、独立 MySQL 实例迁移 6 项全部通过；全量 WXSS 静态检查零错误，29 个 WXML 与 3 个 WXS 经微信原生编译器编译通过。正式 HTTPS 已实测图片/视频上传、重复回执、提交、worker 压缩、私有媒体鉴权、视频 Range、拒绝/回待审、上架/下架/重新上架及删除；仅验收投稿被清理。另从 Windows 电脑实测约 632KiB 图片上传加回执 0.932 秒、1.6KiB 图片 0.303 秒，声明接口约 0.30 秒；这些是当次样本，不是性能保证，也不是微信原生真机证据。

提审前必须确认正式 HTTPS 请求、上传和下载域名配置，生成最新正式体验包并完成 iOS 与 PC 微信验收。本轮开发者工具未运行，未为此另开窗口，尚未生成新的微信预览包、上传提审或执行新版真机界面验收。
