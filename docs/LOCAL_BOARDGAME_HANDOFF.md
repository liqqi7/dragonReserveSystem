# 新设备本地启动与 BGG / BG Stats 导入交接

更新：2026-09-14。适用分支：`codex/bgg-sync`。本文供另一台电脑上的开发者或大模型直接接手；所有启动、迁移和导入均以独立本地环境为目标。

验收目标：本机后端和导入 worker 可持续运行；微信开发者工具能打开桌游库；BGG / BG Stats 原件、资料、库存和对局经过核对入库；重复导入不新增相同来源记录；另一轮对话可以从本地回执恢复进度。

## 1. 可以直接发给接手模型的任务

> 阅读 AGENTS.md、docs/LOCAL_BOARDGAME_HANDOFF.md 和 backend/boardgame-import-runbook.md。先定位当前工作副本和 codex/bgg-sync 分支，保留已有修改。为这台电脑启动独立本地 MySQL、同分支后端和导入 worker，配置微信开发者工具连接本机 8001 端口，使用本地测试账号。不要运行连接服务器测试库的 start_backend_test 脚本，也不要连接生产。按文档自行验证启动、迁移和页面入口。已有环境或导入任务时直接恢复，不清库、不换来源数据集。若我已提供 BGG 账号和 BG Stats 导出，则核对并导入到本地；游戏、库存、对局分别去重，人员先保留来源身份，之后由我匹配小程序用户。冲突和疑似重复留待核对，其余继续处理；历史先保持 held。缺少 BGG 凭据或原件时完成其余启动工作，并准确列出缺项。密钥和原件只保存在本机私有目录，不输出到聊天或提交。最后保存 LOCAL-HANDOFF.md 与导入回执，说明进程、端口、路径、版本、测试结果和未完成项。

如果希望导入后立刻查看本地排行榜，可追加：

> 对已经核对完成的历史，允许通过正式 publish 接口发布到这个独立本地测试库，用于页面和统计联调；允许保留尚未绑定小程序用户的来源玩家。成绩冲突仍保留 unknown，不猜赢家。此授权只适用于本地测试库。

## 2. 先核对代码、文件和环境

交付代码位于 `liqqi7/dragonReserveSystem` 的 `codex/bgg-sync`。各电脑的 remote 名称可能不同：本开发机的 `origin` 指向上游 `jhzol`，`liqqi7` 指向分享仓库；新克隆分享仓库后通常叫 `origin`。先核对 remote URL，再选择分支，不照搬 remote 名称。

新目录示例：

```sh
git clone --branch codex/bgg-sync https://github.com/liqqi7/dragonReserveSystem.git
cd dragonReserveSystem
git status --short --branch
git log -1 --oneline
```

已有副本先查看状态，获取对应 remote，再切换已有分支并 `git pull --ff-only`。有未提交修改或分叉时保留现场后处理，不执行 `reset --hard`。微信开发者工具与模型必须使用**同一个项目根目录**；这台开发机以前存在两份副本，编辑与编译不同目录曾导致新入口看起来未更新。

新设备需要 Git、Python（本轮使用 3.14；可按依赖兼容情况使用本机 Python）、Node.js，以及本地 MySQL；Mac / Windows 看真实小程序还需要微信开发者工具。Node 测试使用内置测试运行器和 `fs.readdirSync(..., {recursive:true})`，使用支持这些能力的版本。小程序无需额外 `npm install`。

下列内容**不会随 Git 提交**，不能假设另一台电脑已有：

| 内容 | 新设备如何取得 |
| --- | --- |
| Python `.venv`、后端 `.env`、小程序 `services/config.js` | 按本文重新生成 |
| BGG API token | 使用已授权的本机私有配置；缺少时请用户通过本地秘密配置提供，不在聊天中粘贴 |
| BG Stats 完整导出 JSON | 由数据所有者单独提供；从 BG Stats“邮件或分享导出 / 导出至其他 app”取得原始 JSON，图片备份不是对局数据 |
| 本地数据库、导入原件目录、人员映射、中文名维护、导入回执 | 新设备重新导入，或按第 7 节迁移完整本地数据；仅拉代码无法得到这些数据 |
| 微信 AppID、真机权限与本机开发工具配置 | 按接手设备的开发权限配置 |

用户之前使用的 BGG 账号为 `liqqi`；它不是 API token，也不是小程序登录账号。BG Stats 的旧附件临时路径只在原会话设备存在，不能复制那个绝对路径当作新设备文件。

## 3. 建立独立本地后端

### 3.1 安装依赖

Mac / Linux，从项目根运行：

```sh
python3 -m venv backend/.venv
source backend/.venv/bin/activate
python -m pip install -r backend/requirements.txt
```

Windows PowerShell，从项目根运行：

```powershell
py -m venv backend/.venv
& .\backend\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

若 PowerShell 禁止激活脚本，直接使用 `backend\.venv\Scripts\python.exe` 替代以下 `python`，不必更改全局执行策略。后续后端命令都从 `backend/` 执行，另一终端也使用同一虚拟环境。

### 3.2 配置数据库和私有目录

默认使用新建本地 MySQL 库 `dragon_reserve_local`，示例端口 `33306`。已有本地 MySQL 时，由本机数据库管理员建立独立库和仅有该库权限的账号，再配置连接；不更改已有服务或业务库。

若本机已有 Docker，可使用下面的容器方式。先核对容器名 `dragon-boardgame-local`、卷名 `dragon-boardgame-local-db` 和端口没有被其他工作占用。已有同名实例先核对用途再恢复，不能为了启动成功删除旧卷。

首次空环境可以将以下 Python 保存为本机临时脚本，从 `backend/`、使用虚拟环境执行。它生成随机本地密码，并在项目根的**同级目录** `<项目名>.local/` 保存数据库启动配置和原件；已有 `.env` / `.env.test` 或数据库配置时会停止，交由接手模型保留并核对已有配置。

```python
from pathlib import Path
import os
import secrets
from sqlalchemy.engine import URL

backend = Path.cwd().resolve()
assert (backend / 'app/core/config.py').is_file(), '请从 backend/ 执行'
state = backend.parent.parent / (backend.parent.name + '.local')
env_file = backend / '.env'
mysql_file = state / 'mysql.env'
assert not any(p.exists() for p in (env_file, backend / '.env.test', mysql_file)), '已有配置，先核对并复用'
state.mkdir(parents=True, exist_ok=True, mode=0o700)
for name in ('media', 'imports', 'receipts', 'backups'):
    (state / name).mkdir(exist_ok=True, mode=0o700)
password = secrets.token_urlsafe(32)
mysql = {
    'MYSQL_ROOT_PASSWORD': secrets.token_urlsafe(32),
    'MYSQL_DATABASE': 'dragon_reserve_local',
    'MYSQL_USER': 'dragon_local',
    'MYSQL_PASSWORD': password,
}
config = {
    'APP_ENV': 'development', 'APP_DEBUG': 'false',
    'DATABASE_URL': URL.create('mysql+pymysql', username='dragon_local',
        password=password, host='127.0.0.1', port=33306,
        database='dragon_reserve_local', query={'charset': 'utf8mb4'}
    ).render_as_string(hide_password=False),
    'JWT_SECRET_KEY': secrets.token_urlsafe(48),
    'USER_INVITE_CODE': secrets.token_urlsafe(18),
    'ADMIN_INVITE_CODE': secrets.token_urlsafe(18),
    'BOARDGAME_ENABLED': 'true', 'BOARDGAME_IMPORT_WORKER_ENABLED': 'true',
    'BGG_ENABLED': 'false', 'BGG_API_TOKEN': '',
    'BGG_API_BASE_URL': 'https://boardgamegeek.com/xmlapi2',
    'BGG_MIN_INTERVAL_SECONDS': '5',
    'WECHAT_APP_ID': '', 'WECHAT_APP_SECRET': '',
    'MEDIA_ROOT': (state / 'media').as_posix(),
    'BOARDGAME_IMPORT_ROOT': (state / 'imports').as_posix(),
    'PUBLIC_BASE_URL': 'http://127.0.0.1:8001',
}
for path, values in ((mysql_file, mysql), (env_file, config)):
    with path.open('x', encoding='utf-8') as f:
        f.write(''.join(f'{k}={v}\n' for k, v in values.items()))
    if os.name != 'nt':
        path.chmod(0o600)
print('本地配置已创建；密钥未输出。私有目录：', state)
```

从 `backend/` 运行容器命令，将 `--env-file` 换成刚生成的真实绝对路径；路径含空格时保持引号。容器只将数据库端口绑定到本机回环地址：

```sh
docker run --name dragon-boardgame-local --env-file "<私有目录>/mysql.env" -p 127.0.0.1:33306:3306 -v dragon-boardgame-local-db:/var/lib/mysql -d mysql:8.4
```

等待数据库就绪。停止/恢复使用 `docker stop dragon-boardgame-local` / `docker start dragon-boardgame-local`，不删除卷。本文未在 Windows Docker 上实跑；本轮迁移和接口验证使用隔离本机 MySQL 9.6，目标 MySQL 8.x 需要在新设备自行执行下面的迁移与冒烟。

`MEDIA_ROOT` 是可公开媒体目录，`BOARDGAME_IMPORT_ROOT` 必须位于它之外。不要把导出 JSON 放进 `miniprogram/`、`prototype/`、`storage/` 的公开媒体区或 Git。Windows 对私有目录使用当前用户文件权限。

配置优先级为：**进程环境变量 > backend/.env.test > backend/.env > 默认值**。`start_backend_test.ps1` / `.sh` 会使用服务器测试库或隧道，不用于本文流程。检查环境变量时只输出变量名、主机和数据库名，禁止输出完整连接串或 secrets。

从 `backend/` 运行以下检查，它读取最终生效值但不输出密码：

```sh
python -c "from app.core.config import get_settings; from sqlalchemy.engine import make_url; s=get_settings(); u=make_url(s.database_url); assert s.environment=='development' and u.host in ('127.0.0.1','localhost') and u.database=='dragon_reserve_local'; print({'db_host':u.host,'db_port':u.port,'db_name':u.database,'boardgames':s.boardgame_enabled,'worker':s.boardgame_import_worker_enabled,'bgg_ready':s.bgg_enabled and bool(s.bgg_api_token)})"
```

### 3.3 迁移并启动两个进程

从 `backend/` 执行：

```sh
python -m alembic heads
python -m alembic upgrade head
python -m alembic current
```

本文版本的唯一 head 是 **`20260914_0018`**，合并 `20260907_0017` 活动迁移和 `20260913_0015` 桌游迁移。后续代码增加迁移时以所拉提交的 head 为准。遇到多 head、缺表或失败，保留日志查明原因；不要 `stamp head` 伪装已执行，不用 `Base.metadata.create_all` 代替 MySQL 迁移。

两个独立终端均从 `backend/` 启动：

```sh
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```sh
python scripts/run_boardgame_import_worker.py
```

API 和 worker 必须使用同一份环境、数据库和私有导入目录。`--once` 只推进一次任务处理，不能用于持续解析、BGG 分页和后续 apply。先使用一个 worker；代码或环境变更后重启这两个本地进程。

验证 `http://127.0.0.1:8001/api/v1/health` 和 `http://127.0.0.1:8001/docs`。退出终端会停止前台进程；由模型后台启动时，把 PID、日志文件、启动命令写入私有交接回执，不以“命令执行成功”代替健康检查。

## 4. 本地登录与微信开发者工具

1. 通过 `POST /api/v1/auth/register` 注册合成本地账号，字段为 `username`、`password`、`nickname`，可省略 `avatar_url`。随后 `POST /api/v1/auth/login` 取得 token，只在运行时保存。
2. 新账号是访客，携带 Bearer token 调用 `POST /api/v1/users/me/role`，正文为 `{"invite_code":"本机配置的成员或管理员邀请码"}`。再读 `GET /api/v1/users/me` 确认角色；不要直接改数据库赋予角色，也不要借用生产 token。
3. 从项目根运行 `node scripts/init_miniprogram_config.cjs`，生成被 Git 忽略的 `miniprogram/services/config.js`。默认地址 `http://127.0.0.1:8001/api/v1`，已有文件不会被覆盖；已有地址不对时保留其辅助函数，只修改 API 地址。
4. 微信开发者工具导入**项目根目录**，不是 `miniprogram/` 子目录。`project.config.json` 的 `miniprogramRoot` 已配置。核对当前编译路径与模型修改路径相同。
5. 配置有权限的 AppID，本地调试按工具要求设置域名校验；用开发工具界面切到 **Skyline**，重新编译并看到“当前渲染模式: Skyline”。本机私有偏好不随 Git 传递。页面仍按自身 JSON 决定 renderer，不能据此宣称所有桌游页已经移植 Skyline。
6. 按 [UI 评审说明的 Console 登录片段](../miniprogram/BOARDGAME_UI_REVIEW.md) 调用 `getApp().applyCurrentUser` 保存本地会话，避免微信自动登录覆盖测试身份。焦点必须在 Console，不在代码编辑器；不得把 token 粘到源码或输出到日志。
7. 从“工具 → 桌游库”进入。空库应有完整标题、操作入口和空态，不能空白。活动详情的“这次玩什么”进入提名和计划；记录开局会带入活动、游戏及相应扩展，计划入口还绑定桌次。

另一台电脑各自启动后端时，各自使用自己的 `127.0.0.1`。如果后续明确要手机访问这台电脑，才按该局域网需求调整绑定地址、API 地址和防火墙，并核对微信真机限制；手机上的 `127.0.0.1` 不指向电脑。

## 5. 将 BGG 和 BG Stats 导入到本地

完整操作契约和 JSON 示例见 [持续导入说明](../backend/boardgame-import-runbook.md)。本文强调新环境执行顺序；模型应读取当前 [请求校验模型](../backend/app/schemas/boardgame_import.py) 与 [实际路由](../backend/app/api/v1/boardgame_imports.py)，不要猜字段或照抄其他数据库的 ID。

### 5.1 导入前准备

- 使用已确认的本地成员账号及 `owner_user_id`，在私有回执保存发起人、所有者和来源信息。管理员可以代导，但任务读取仍按发起人隔离。
- 查询 `/boardgame-imports/datasets`、`/boardgame-imports` 和 `/boardgame-imports/capabilities`。同库续导必须复用同一个账号、所有者和 `source_dataset`，不是每次生成新数据集。capabilities 反映配置开关，不证明 worker 进程正在运行。
- BGG：在后端私有环境中配置 `BGG_API_TOKEN`、`BGG_ENABLED=true`，保留 `BOARDGAME_ENABLED=true`、`BOARDGAME_IMPORT_WORKER_ENABLED=true`，重启 API 与 worker。没有 BGG token 仍可独立导入 BG Stats。
- BG Stats：核验原始文件为 JSON 对象且包含 `games` 和 `plays`，记录 SHA-256、字节数和来源时区（本次为 `Asia/Shanghai`）。当前接口接受 `.json` / `.bgsplay`，上限 20 MiB；过大时保留原文件，先处理上传限制，不随意切分破坏跨表引用。
- 如果库已有数据，先备份数据库和私有原件；暂停 worker 后取得一致备份。不要为了看 UI 运行会清空表的 seed 脚本。

### 5.2 创建和解析来源任务

以下所有路径均加 `/api/v1`。POST 创建、上传、apply、publish 使用 UUID `Idempotency-Key`；同一请求超时重试用原键和原正文，改变正文则使用新键。

| 来源 | 请求 | 解析后的处理 |
| --- | --- | --- |
| BGG 当前收藏 | `POST /boardgame-imports`，`{"kind":"bgg_collection","username":"liqqi"}` | worker 自动查询基础游戏与扩展，并筛选 `own=1`；用户无需分别提交 subtype |
| BGG 游戏详细资料 | 同路径，`{"kind":"bgg_thing","ids":[已核对的BGG_ID]}` | 每批最多 20 个，补齐 Thing 原始字段、分类、机制、版本等；收藏摘要不能视为完整详情 |
| BG Stats 原件 | `POST /boardgame-imports/bgstats-file`，multipart：`file`、`source_timezone`，按需 `owner_user_id`、`source_dataset` | 首次可不传 dataset，保存响应值；续导必须传回对应数据集 |
| BGG 对局历史 | `POST /boardgame-imports`，`{"kind":"bgg_plays","username":"liqqi"}` | worker 继续分页取得历史；限定区间时必须同时提供 `from` / `to` |

建议先完成游戏/扩展资料，再处理库存与 BG Stats 对局，最后将 BGG 历史与已有对局核对关联。先分页读取所有任务 items，不能只处理第一页；排除 archive 项作业务审阅，原件仍保留。

任务收到 202 只表示接受。读取任务的 `state`、`next_attempt_at`、`progress`、`error_code`，等待 worker 推进；BGG 202 / 429 是排队或限流，不是无数据。遵循服务端退避，不密集 retry。

### 5.3 审阅、映射和应用

1. **作品**：已有 BGG ID / 来源映射的资料直接复用；人工录入且尚未绑定 BGG 的资料先核对。不能按中英文名称差异再造一款。扩展保持独立作品，并建立经确认的兼容关系。
2. **一盒实物**：BGG 与 BG Stats 同时描述的同一盒使用 `link_inventory`；真实拥有多盒才创建多条。BG Stats 的非当前持有项不能默认记为“可使用”；原导出样本存在 9 条此类来源，需要逐条选择保留历史或跳过。
3. **玩家和地点**：恢复已有映射；历史玩家允许 `create_person` 保留来源身份，之后与小程序用户人工匹配。`person_id` 不是 `users.id`，不按昵称或“liqqi”自动绑定；匿名槽位不合并成同一个人。
4. **对局**：同来源按稳定 ID 复用；已确认跨来源同局用 `link_play`，只是同日同游戏只能视为候选。BGG `quantity>1` 必须逐局核对分段，不复制一份总成绩和时长。保留扩展/部分模块、地点、时间、团队结果及计分表，未知字段仍留原件。
5. **成绩**：未填保持未填，0 分是实际分数；“摆烂”保留参局并计未获胜，整局未完成/掀桌按状态处理。原 BG Stats 样本有 4 局赢家/名次等证据冲突，继续 unknown 并列待核对，不让模型猜胜者。
6. **应用**：先 `PATCH /boardgame-imports/{job_id}/items/{item_id}` 保存逐项 decision，再以最新 job/item revision 提交 `POST .../{job_id}/apply`。读取每项 `applied_result` 和 report，分别统计新增、复用、关联、跳过、失败和待处理。

### 5.4 中文展示和历史公开是两个后续步骤

中文名称：采用用户在 BG Stats 中维护且已核对的名称，其次采用经核对的 BGG 中文别名；经 `PATCH /boardgames/{id}` 的 `set_overrides.name` 保存。既有人工覆盖有冲突时保留并列出，不让重复导入静默覆盖。已核对的中文简介可覆盖展示文本，BGG 原文 JSON/XML 始终保留。`original_name` 是原始投影的只读字段，页面中文主标题、原名副标题；没有中文时保留原名。版次/语言显示标签由代码转换，分类/机制的完整翻译与 OCR 尚未接入。

历史公开：导入对局默认 `publication_status=held`，不会出现在公开历史和排行榜，这不代表导入失败。从任务 items 读取私有历史。已明确授权在独立本地库展示时，读取 `GET /boardgame-imports/{job_id}/items/{item_id}/preview` 的 `applied_plays`，取得每局最新 `review_token` 和 revision，再逐批调用 publish。正文需要最新 job revision、selection、reason、`acknowledge_public=true`；保留未绑定玩家时还需要 `acknowledge_unmatched_people=true`。先列出实际拟发布项，按已给定的本地授权执行，不能改库绕过发布校验。

公开后再次核对历史、游戏榜单和原件；未绑定来源玩家不自动计为当前登录用户的“我的”成绩。本机的发布状态和人工映射不会通过 Git 同步到另一设备。

## 6. 接手模型必须自行执行的验收

| 检查 | 通过标准 |
| --- | --- |
| 环境和迁移 | 数据库在本机、应用为 development、唯一迁移 head 正确；API 和 worker 都存活 |
| 登录和权限 | 本地成员/管理员取得对应角色；匿名请求被拒绝，另一成员不能读私人导入任务 |
| 桌游 UI | 中英文均能搜索；中文主标题/原名副标题；封面短边铺满，详情和库存可读 |
| 来源解析 | BGG 收藏/Thing/历史或 BG Stats 原件解析完成；读取所有分页和状态，原件可读回 |
| 导入完整性 | 资料、盒数、对局、来源关联和计分表分别计数；冲突有明确清单 |
| 防重复 | 同一来源重导后已确认记录复用原 ID；跨来源确认同局只有一条 Play、多个来源关联 |
| 活动流程 | 创建合成活动（名称最多 10 字且 remark 非空），提名基础游戏及部分扩展，撤回再提名，安排桌次，从两个入口打开记录；所属活动/计划/扩展正确 |
| 成绩和计时 | 手动开始/结束计时，保存 0 分、未填和摆烂；活动历史筛选与统计结果符合规则 |
| 清理与复核 | 测试对局作废、临时活动取消，用户原有数据不变；不要删除真实导入来清理测试 |

活动提名在开始前可修改；普通签到按最新 main 限于进行中的活动，管理员补签另有权限。记录权限看服务端 `permissions.can_record`，不要通过改活动时间或直接写表绕过权限。快捷“记录开局”进入带预填信息的表单，不自动新建一条完成局，也不自动开始计时。

当前活动关联通过活动入口带入；独立“记录对局”页面尚无活动选择器。接手时不要将这个缺口误判为后端不支持活动关联，或宣称所有页面都可自由切换所属活动。

自动化从项目根执行 Node 测试；后端从 `backend/` 执行。测试前明确使用本地配置，外部服务凭据置空，**移除 `BOARDGAME_TEST_DATABASE_URL`**，默认 pytest 每项使用临时 SQLite，不能指向导入库做清表测试。

```sh
node --test miniprogram/tests/*.test.js
```

```sh
python -m pytest tests -q
```

本次合并后的基线为后端 201 项、小程序 405 项、隔离 MySQL 72 项通过。微信 WCC 36 个 WXML/WXS 输入、WCSC 34 个 WXSS 编译通过；开发工具已核对 Skyline 模式及代表页面。本轮实际 HTTP 冒烟覆盖提名、部分扩展、计划、开局、幂等、计时、0 分获胜/摆烂未获胜及活动筛选。iOS/Android 真机、Windows Docker 和目标 MySQL 8.x 仍由接手设备实际验证，不能用这些数字替代。

## 7. 迁移现有本地数据与保存交接回执

**重新导入新空库**：携带原始 JSON、BGG 账号和凭据即可按第 5 节重建；新库的本地 ID 和 dataset 可以不同。共享资料中文覆盖、人工跨来源关联、发布状态和人员绑定不会仅凭原件全部自动恢复，需结合已授权转移的回执重新核对。

**接续同一套数据**：先停止写入与 worker，一并备份本地数据库、`BOARDGAME_IMPORT_ROOT`、`MEDIA_ROOT` 和私有回执，通过用户选定方式转移。新设备恢复到新的本地库，保留 users/Person、任务、source_dataset、来源键、映射和审计，再修正路径并重新登录。数据库与私有原件应是同一备份时间点；源电脑 SQLite 文件不能直接作为 MySQL 备份恢复。

原开发机真实测试导入使用仓库外的私有 SQLite 和启动脚本，未作为通用启动脚本提交。本文件的 MySQL 方式适合新设备从迁移建立可持续开发的库；不要根据原电脑不存在于 Git 的路径猜测运行方式，也不要将 SQLite `stamp` 成 MySQL 迁移 head。

在 `<项目名>.local/receipts/` 保存 `LOCAL-HANDOFF.md` 和每次导入的 JSON 回执，至少记录：

- 项目绝对路径、分支/提交、操作系统、Python/Node/MySQL/开发工具版本。
- API 地址、DB 主机/端口/库名、迁移版本；配置文件路径（不写密码）、私有原件与媒体路径。
- API/worker 的 PID、启动命令、日志位置、停止/恢复方式；下次接手先验证 PID 命令，不能直接杀已复用的 PID。
- 当前发起人/数据所有者的本地 ID、BGG 用户名、BG Stats source_dataset、文件哈希、任务 ID、所有分页是否完成。
- 各类新增/复用/关联/更新/发布/待处理数量和资源 ID、确认依据；待匹配人员、重复候选、成绩冲突与失败原因。
- 冒烟步骤、实际结果、未覆盖的设备行为，以及已取消/作废的合成记录。

回执不包含 token、密码或原始玩家明细，原件另存于私有目录。交接时从任务和回执恢复，而不是依赖模型记忆。测试数据量会随新来源变化；旧机样本曾有 221 款资料、207 盒实物、216 条去重历史，对新设备只作数量核对参考，不能硬凑到这些数字。

## 8. 常见故障与恢复

| 现象 | 排查顺序 |
| --- | --- |
| 桌游入口空白 / Cannot find module './config' | 生成 config.js → 核对开发工具真实路径 → 重新编译 → 查看首个 JS 错误 |
| 接口 401 / 403 | API 地址、token 所属本地库、当前角色；访客先用本地邀请码取得成员权限 |
| 桌游接口 404 / 503 | 是否同分支后端、BOARDGAME_ENABLED、worker/BGG 开关与凭据；不能解释成“空库” |
| BGG 任务停在 queued / fetching | worker 是否运行、同一 DB/目录、next_attempt_at 和错误码；遵守退避，不反复创建任务 |
| BG Stats 上传成功但历史空白 | 检查 items/apply/report；仅解析不等于应用，held 不进入公开历史 |
| 导入出现 409 | 重新读取 job/item/play revision 和差异；source_owned_elsewhere / source_changed 不能靠换 dataset 绕过 |
| 收藏没有全量 Thing 字段 | 补齐 bgg_thing 任务；收藏和 BG Stats 只提供它们自身的字段 |
| 想看的“我的”排行为空 | 来源玩家是否绑定该小程序用户、历史是否公开、筛选是否包含这批历史 |
| 名称仍为英文 | 核对是否有可靠中文来源和本地覆盖；不把含汉字的日文别名自动当中文 |
| 提名/开局按钮不显示 | activity_id、真实活动状态、报名/签到状态与权限；已取消/流局只读 |
| 端口占用或启动指向远程 | 查占用进程和最终配置来源，换本地端口同步前端；不停止未知服务 |
| 文件原件 404 / private_import_storage_required | 核对 API/worker 私有目录一致、恢复时原件是否同行、目录不在 MEDIA_ROOT 内 |

停止本地服务不删除数据。若新代码需回滚，先停 worker、关闭桌游入口/功能开关，恢复兼容代码并保留数据库与原件；有业务数据时不直接 downgrade 删除桌游表。本文不执行部署，线上环境需由线上运维项目另行备份、迁移至当前 head 并验证。
