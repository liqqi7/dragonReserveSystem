# 龙城俱乐部活动系统 · 代码审查报告

- 审查日期：2026-10-08
- 审查对象：`小程序本体` 当前工作区代码（HEAD `31d7b17`），包括 `backend/` 和 `miniprogram/`。`* 2` 结尾的 Finder 重复目录不在范围内。
- 审查方式：只读静态审查，分 4 个方向（后端业务与并发、后端安全与配置、统计/天气/迁移/脚本、小程序前端）。关键结论都回到源码逐行核对过，部分做了最小化运行验证（时区 TypeError、httpx 日志格式、迁移 hex 编码、git 跟踪文件、仓库可见性）。
- 测试基线：
  - 前端：`node --test tests/*.test.js` 共 548 条，全部通过，0 失败。
  - 后端：**未能运行**。`backend/.venv` 里缺 `cairosvg`，导入 `app/services/activity_share_preview_service.py` 时就报 `ModuleNotFoundError`。所以本报告的后端结论没有测试兜底。

## 本轮处理与验收（2026-10-08）

- 范围：处理 #1、#2、#4、#5、#6、#7、#8、#10；#9 暂不处理（仅按产品要求设置活动人数上限最低为 3）；原审查结论和测试基线保留，具体处理状态见对应条目。
- 后端：`DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .venv/bin/python -m pytest -q`，**179 passed，0 failed，59 warnings**（42.07 秒；本轮按用户要求移除密码登录/注册后，旧登录测试也改为直接签发测试 token）。警告未作为本轮独立整改范围，测试通过不代表已消除警告。
- 前端：`node --test tests/*.test.js`，**550 passed，0 failed**。
- 静态检查：`git diff --check`、后端 Python 编译检查及改动前端 JS 的 `node --check` 通过；本轮未修改 WXML/WXSS，未执行开发者工具或真机渲染验收。
- 为执行测试，在本地 backend/.venv 补装项目已声明的 CairoSVG；未改依赖声明。生产未部署，本轮未再次连接生产核查。
- 用户确认：#1 不再要求邀请码至少 16 字符；#2 永久移除密码登录/注册，只保留微信登录；#6 接受所有用户可见签到位置；#4、#5、#10 的结论确认无异议；#9 暂不处理，人数上限最低值另按要求设为 3。#7 是否从 Git 跟踪及历史中清除数据库待确认；#1 单进程内存限流有部署边界。

## 冗余清理与验收（2026-10-09）

- 用户确认废弃日历页和旧活动表单弹层；按引用核实结果清理 #35、#36、#38。以下处理均在本地，未提交 Git、未部署；本节不代表历史条目或保留项已经全部解决。
- 前端：`cd miniprogram && node --test tests/*.test.js`，**491 passed，0 failed**。移除废弃功能的专属测试，同步 3 处仍依赖无用样式/图标的断言；保留现行骨架屏、图标、路由和交互验证。
- 后端：`cd backend && DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .venv/bin/python -m pytest tests -q`，**210 passed，0 failed，84 warnings**。新增 7 个状态分支边界用例，确认删除不可达分支不改变活动状态规则。
- Skyline：对首页、详情页、个人页、封面选择器、全局 WXSS 及引用的 `styles/dragonChrome.wxss` 执行 `skyline-cli wxss check`，**0 errors，0 diagnostics**；文件路径以 `miniprogram/` 为根，已排除未读取文件或缺少 import 依赖的情况。
- 引用检查：46 个已删除图片没有剩余的字面量运行时引用；页面、Tab 图标、组件注册、相对 JS 模块和静态本地图片路径检查通过。动态类名（如卡片入场和骨架屏状态）保留。
- 基础检查：改动 JS 语法、后端 Python 语法、JSON 解析和 `git diff --check` 通过。尚未进行开发者工具/真机视觉验收，静态检查与单元测试不能替代实际渲染验证。

## 旧 v1 接口流量复核（2026-10-09 18:10，SSH 只读）

- 在生产服务器本地聚合 `backend/logs/application.log` 的 `request_completed` 记录（方法、路径、状态码；不输出 query、令牌或原始日志）。可解析请求 **94,263 条**，日志覆盖 **2026-08-10 12:50:01 至 2026-10-09 18:10:01**，解析失败 0 条。以下「近 7 天」为 **2026-10-02 18:10:55—2026-10-09 18:10:55**，「近 30 天」为 **2026-09-09 18:10:55—2026-10-09 18:10:55**，时区均为服务器北京时间。近 7 天每天都有请求完成记录，待清理接口没有另见异常/错误事件。Caddy 当前另有封面专项诊断日志，不是完整的 HTTP access log；以下结论只代表现有应用日志的观察窗口。

| 接口（`/api/v1` 下） | 近 7 天请求 | 近 30 天请求 | 最近一次完成请求 |
|---|---:|---:|---|
| 活动路由 `/activities` 及其子路由 | 0 | 96（均为 2xx，其中分享预览 57） | 2026-09-25 16:00:06 |
| `/stats/history` | 0 | 0 | 2026-08-21 23:23:14 |
| `/stats/history-summary` | 0 | 0 | 2026-08-19 15:07:30 |
| `/weather/activity` | 0 | 0 | 2026-09-04 18:52:29 |
| `/client-config` | 0 | 9（均为 2xx） | 2026-09-27 09:35:08 |
| `POST /diagnostics/client-logs`（单条） | 0 | 0 | 2026-08-21 23:23:14 |
| **整个 `/api/v1`** | **1,720** | **11,816** | **2026-10-09 18:10:01** |

- **结论**：拟清理的旧活动、历史统计、天气、client-config、单条诊断接口近 7 天均零记录；但活动与 client-config 近 30 天仍有成功调用，不能称「长期零流量」。整个 v1 近 7 天仍有微信登录、用户、排行榜、批量诊断和健康检查流量，绝不可整体删除。
- **纠正原审查前提**：当前小程序 `services/activity.js` 仅对活动请求传 `apiVersion: 2`；`services/request.js` 只有显式传版本时才改写基础 URL；登录/用户/排行榜等仍用 v1。旧接口尚未删除；是否需要保留旧客户端/外部调用方兼容，不能仅凭 7 天零记录作决定。此次未改生产配置、未删除接口。

## 线上核查结果（2026-10-08，SSH 只读）

本节内容来自对 `ubuntu@124.156.228.148` 的只读核查。所有密钥只比对了长度、是否为默认值，以及是否与日志内容一致，明文没有打印也没有复制到本地。服务器上没有做任何修改。

| 项 | 线上实际情况 | 影响的报告条目 |
|---|---|---|
| 微信 AppSecret 写入日志 | `logs/application.log` 中有 **244 行**包含**当前正在使用的** `WECHAT_APP_SECRET`，时间范围是 2026-08-11 至 2026-10-08 | #3 **已在生产环境确认** |
| 高德 Key 写入日志 | **66 行**包含当前的 `AMAP_WEB_SERVICE_KEY`，时间范围是 2026-09-12 至 2026-10-05 | #3 **已在生产环境确认** |
| logrotate | `/etc/logrotate.d/dragonreserve-backend` 是 **CRLF 换行**，logrotate 每天都报 `lines must begin with a keyword` 并跳过这个文件。上一次成功轮转是 2026-08-11。日志已经涨到 **62 MB** 且从未轮转过，文件权限是 644 | 新增；#15 的风险被放大 |
| 诊断日志 | `client_diagnostic` 有 23,808 行，和应用日志混在同一个文件里 | #15 |
| `APP_ENV` | **`.env` 里是空值**，systemd unit 也没有设置。所以 `config.py` 的生产校验**从来没有执行过** | #11：校验确实失效 |
| JWT 密钥 | 已设置，长度 23，**不是默认值** | #11：当前没有被利用的风险 |
| 邀请码 | admin 码 8 位、user 码 12 位，**都只由小写字母组成**，两者不同 | #1：随机暴力破解 8 位小写约需 2×10¹¹ 次，不现实；但如果是单词或拼音，按字典很快能猜中。限流仍然必须加 |
| `APP_DEBUG` / CORS / PUBLIC_BASE_URL | `false` / 只允许自己的域名 / `https://dragon.liqqihome.top` | #30 的 CORS 风险在生产不存在；生产已配置 HTTPS 头像地址的基础域名 |
| 密码注册账号 | `wechat_openid` 为空的用户 **0 个**，即目前还没有人用过 `/auth/register` | #2 |
| 用户 | admin 5 / user 32 / guest 23 | — |
| 迁移 | `alembic_version = 20260924_0020`，0010 已执行 | #4 |
| 迁移 0010 的实际影响 | 「已结束」且参与人数 ≤2 的活动只有 2 个（id 25、42），两个都是 1 人报名且已签到。所以**没有出现「流局被改成已结束、然后被算作鸽子」的数据**，鸽子统计没有受影响。0010 的 bug 依然存在，但生产数据**不需要修复** | #4 降级 |
| sshd | `PasswordAuthentication no`（好），`PermitRootLogin yes`，**fail2ban 没有运行** | #36 |
| 服务器代码 | HEAD 是 `1dfcead`（2026-09-13），落后于 origin/main。`git status` 显示所有文件都被修改了（看起来是整棵树都变成了 CRLF），无法用 git 判断线上实际运行的版本 | 新增（部署规范） |

据此调整的优先级：
- **#3 维持 P0**：历史核查确认请求日志包含密钥。最新处理决定（2026-10-10）：保留现有微信 AppSecret 与高德 Key，本地关闭敏感请求日志后待部署，历史日志清理按 #15 延后。
- **#4 从 P1 降为 P3**：只修代码中的写法即可，不需要修数据。
- **#11 维持 P1**：密钥目前是安全的，但校验处于失效状态。一旦以后有人改 `.env` 时漏掉某个值，不会有任何报错。
- **新增 P1**：logrotate 因为 CRLF 换行而失效（修复方法见文末）。

## 优先级定义

| 级别 | 含义 | 建议处理时间 |
|---|---|---|
| **P0** | 可被外部利用的安全问题，或正在泄露密钥 | 立即 |
| **P1** | 会导致数据错误、隐私泄露，或用户在主流程上被卡住 | 本迭代 |
| **P2** | 边界条件下的 500 或竞态、体验问题、明显的性能浪费 | 近期排期 |
| **P3** | 可维护性、死代码、配置卫生 | 有空时清理 |

每条问题都标了核实结论：
- **已确认**：从代码路径上确定会发生。
- **很可能**：取决于运行时配置或时序，代码上成立，但没有在生产环境复现。

## 总览

状态统一说明：**后续处理**＝用户已确认延后安排；**已认可，待处理**＝用户认可问题，尚未实施；**待确认**＝尚未决定是否处理；**不处理**＝用户已确认保留现状；**已本地修复，待部署**＝本地修改及测试已完成，尚未上线。后续处理不代表已确定排期。

| # | 级别 | 模块 | 问题 | 结论 / 处理状态（更新于 2026-10-10） |
|---|---|---|---|---|
| 3 | P0 | 后端/安全 | httpx 的 INFO 日志把微信 `secret`、高德 `key` 原样写进 application.log | 已本地修复，待部署；用户确认保留现有微信 AppSecret 与高德 Key，历史日志清理按 #15 延后 |
| 7 | P1 | 仓库/隐私 | 公开 GitHub 仓库跟踪含真实 openid 的数据库，另一份数据库含用户资料/密码哈希 | 部分处理：忽略规则和当前数据库文件删除已完成；Git 历史未清理 |
| 11 | P1 | 后端/安全 | 生产环境可能静默使用开发 JWT 密钥 | 本地已对非 SQLite 数据库强制生产安全校验；待部署并核验线上配置 |
| 12 | P1 | 前端 | 首页分组漏掉「进行中（未报名）」和「已取消」活动 | 不处理：按用户确认属刻意设计 |
| 13 | P1 | 前端 | 使用过程中 token 失效后没有重新登录路径 | 后续处理：token 失效后的重新登录 |
| 14 | P1 | 前端 | 签到页拒绝定位授权后无引导、无重试 | 待确认 |
| 15 | P1 | 后端/运维 | 诊断日志接口可被匿名或注册用户刷爆磁盘 | 后续处理：单独版本清理历史日志及日志生成逻辑；日志盘点见详细说明 |
| 35 | P3 | 前端 | 不可达页面/组件、死代码和无用资源 | 代码清理完成，用户反馈测试无问题、验收通过，待发布。下方 35.1–35.7 是清理前快照，不是当前待删清单 |
| 36 | P3 | 仓库 | Finder 重复文件、README 服务器信息 | 部分已处理：删除空重复目录与重复文件、README 地址改占位符、媒体域名统一到环境配置；线上 SSH 配置保留 |
| 38 | P3 | 后端 | 冗余代码及 v1 遗留清理 | 部分已处理：旧接口及试验资源已清理，脚本已核查，业务时间已统一，分享图校验差异已补测；其余见剩余清单 |

---

## P0：立即处理

### 3. 微信 AppSecret 和高德 Key 被写进应用日志

- **处理状态（2026-10-10）**：已本地修复，待部署；用户确认保留现有微信 AppSecret 与高德 Key。关闭 httpx/httpcore 的低级别请求日志；模拟微信和高德请求验证凭据不会写入日志，普通业务日志仍保留。历史日志清理按 #15 延后。

- **位置**
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/core/logging.py:19-23`：root logger 设为 `basicConfig(level=logging.INFO)`。
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/auth_service.py:66-74`：`params={"appid":…, "secret": s.wechat_app_secret, …}`
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/amap_service.py:102`：`params={"key": key, …}`
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/deploy/dragonreserve-backend.service:13-14`：stdout/stderr 追加写入 `logs/application.log`。
- **问题**
  - 已在本地 venv 核实：httpx 0.28.1 每次请求都会以 INFO 级别记录 `HTTP Request: GET <完整 URL 含 query> ...`。
  - root 是 INFO，httpx logger 会向上传播。因此每次微信登录都会把 `secret=...` 写进日志文件，每次签到逆地理编码都会把 `key=...` 写进去。
  - 和风天气用的是 Header JWT，不受影响。
- **场景**：任何能读到服务器日志的人或流程（日志打包、logrotate 归档、排障时贴日志给别人、将来接入的日志平台）都能拿到微信 AppSecret。拿到后可以调用微信服务端接口，例如换取 access_token、对任意 code 做 code2session。
- **推荐方案**
  1. 立即在 `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/core/logging.py` 里加上：
     ```python
     logging.getLogger("httpx").setLevel(logging.WARNING)
     logging.getLogger("httpcore").setLevel(logging.WARNING)
     ```
  2. 部署后验证新的微信/高德请求不再写出密钥。用户已确认保留现有密钥，历史日志清理按 #15 延后。
  3. 以后新增外部调用时，统一走一个封装好的 client：密钥放 Header（如果对方支持），或者用 `event_hooks` 在日志里脱敏。

---

## P1：本迭代处理

### 7. 公开仓库里有真实用户数据

- **白话解释（2026-10-08）**：涉及三份本地数据库。① `backend/dragon_reserve_local.db`（约 104 KB）已被 Git 跟踪；报告此前核查称远端仓库为公开，检查时发现其中有 **1 条真实格式的微信 openid**。② `backend/dragon_reserve_local_test_runtime.db`（约 112 KB）未被跟踪，报告此前检查记录为 **16 个用户条目，含 openid 和密码哈希**；风险是将来误 `git add` 后上传。③ `backend/dragon_reserve_test.db`（约 68 KB）是测试数据库，本轮只确认文件存在和大小，没有检查其记录内容，不能断言里面是否有真实数据。`.gitignore` 只能阻止今后误加入，不能撤掉已跟踪文件或清除 Git 历史副本。用户已确认删除并已从本地工作区移除这三份文件。2026-10-08 已通过 GitHub API 在公开仓库默认分支 `main` 提交删除 `backend/dragon_reserve_local.db`（提交 `974ee843b890ad11dd615ad99237ec383994b894`），并核验该路径在 `main` 返回 404。当前版本已移除，但既有 Git 历史中的副本仍未清理。
- **处理状态（2026-10-08）**：部分已处理，待确认。已增加 `*.db`、`*.db-*`、`*.sqlite*` 忽略规则；按用户确认，从本地工作区删除三份数据库，并在公开仓库默认分支 `main` 提交删除 `backend/dragon_reserve_local.db`（commit `974ee843b890ad11dd615ad99237ec383994b894`）。已验证该文件在 `main` 当前版本不存在。两个原未跟踪数据库从未由本次操作推送；Git 历史未改写，因此历史提交中的数据库副本仍可能被访问。

- **位置**
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/dragon_reserve_local.db`：已被 git 跟踪，含 1 个真实格式的微信 openid。
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/dragon_reserve_local_test_runtime.db`：未跟踪但也没被忽略，含 16 个用户、openid 和密码哈希。
  - 根目录 `.gitignore` 里没有 `*.db` 规则。
  - 远端 `liqqi7/dragonReserveSystem` 已用 `gh repo view` 确认为 **PUBLIC**。
- **场景**：任何人都能克隆仓库拿到 openid。另一份 db 只要有人执行一次 `git add -A` 就会被公开。
- **推荐方案**
  1. 根目录 `.gitignore` 加上 `*.db`、`*.sqlite*`。然后执行 `git rm --cached backend/dragon_reserve_local.db`。
  2. 历史里已经有的文件，用 `git filter-repo --path backend/dragon_reserve_local.db --invert-paths` 清除并强推（需要所有协作者重新克隆）。或者权衡后把仓库改为 Private。
  3. 同时评估问题 36 里的 README 服务器信息。

### 9. 流局判定规则的问题

- **处理状态（2026-10-08）**：暂不处理。按用户判断，已有每 5 分钟运行的状态同步定时任务，本条延迟同步风险暂不作为问题处理；此前第 9 项的流局判断改动已回滚，保留原逻辑。另按用户要求，新建/编辑活动的人数上限最低设为 3（不限人数仍可保持不限），这属于表单规则，不代表第 9 项流局逻辑已整改。

- **位置**
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/activity_service.py:36,66-88`
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/schemas/activity_v2.py:80`
- **问题**
  1. 规则是 `participant_count <= FLOW_CANCEL_MIN_PARTICIPANTS (=2)`，即开始时 ≤2 人就流局；测试 `backend/tests/test_activities.py:60-69` 印证这是有意为之。但 `max_participants` 允许 `ge=1`，所以**容量设为 1 或 2 的活动即使报满也必然流局**。
  2. `if end_time <= now` 排在人数判断之前。如果开始到结束之间一次同步都没跑（短活动、服务或定时器停机、无人访问），≤2 人的活动会直接变成「已结束」，参与者全部被计为鸽子。
  3. 常量名叫 MIN，实际含义却是「仍会流局的最大人数」。
  4. 第 77 行的内层 `elif activity.start_time <= now` 恒为真，所以 79-80 行是死代码；81-82 行和外层条件重复，也走不到。
- **推荐方案**
  1. 产品上先确认规则。建议改成「开始时人数 < min(3, max_participants)」，或在创建时校验 `max_participants >= 3`，前端同步限制。
  2. 判定顺序改为：只要 `start_time <= now` 且尚未做过流局判定，就先按人数判断，再考虑是否已结束。可以增加 `flow_checked_at` 字段，或者在已结束时也补做一次人数判定。
  3. 常量改名为 `FLOW_CANCEL_MAX_PARTICIPANTS`（或改成 `MIN_PARTICIPANTS_TO_RUN = 3` 并用 `<`），同时删除死分支。
  4. 补边界测试：开始时恰好 3 人、容量为 2 且报满、从未同步就已过结束时间。

### 11. 生产环境可能静默使用开发 JWT 密钥

- **处理状态（2026-10-10）**：已本地修复，待部署。除显式测试环境外，非 SQLite 数据库连接强制执行生产安全校验，即使 APP_ENV 空值或误设为 development 也不能跳过；API 文档路由使用相同判定。

- **位置**
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/core/config.py:39,85`
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/.env.example:3`
- **问题**：生产校验（拒绝 SQLite、拒绝默认密钥、拒绝空邀请码）只在 `APP_ENV=production` 时运行，而 `.env.example` 里写的是 `APP_ENV=development`。如果服务器的 `.env` 是照着示例复制的，`jwt_secret_key` 就会回落到 `"dev-only-change-me"`，邀请码也可能为空，而且启动时没有任何报错。
- **场景**：攻击者用这个公开的默认密钥自己签发 `sub=<admin id>` 的 token，就能完全接管系统。**这一点需要你登录服务器确认**，我看不到线上 `.env`。
- **推荐方案**
  1. 立即检查服务器上的 `APP_ENV`，以及 JWT 密钥是否为默认值（只做比较，不要打印出来）。
  2. 把校验改为「默认拒绝」：不管什么环境，只要 `jwt_secret_key` 是默认值，并且数据库 URL 不是 sqlite，就拒绝启动。或者在 systemd unit 里显式设置 `Environment=APP_ENV=production`。

### 12. 首页漏掉「进行中（未报名）」和「已取消」活动

- **位置**：`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/miniprogram/pages/activity_list/activity_list.js:1679-1704`
- **问题**：分组规则如下：
  - `joined`：已报名，且不是终态。
  - `accepting` 和 `notStarted`：都要求 `status === "未开始"`。
  - `ended`：只收 `["已结束","已流局"]`。

  因此，没报名的「进行中」活动和所有「已取消」活动不属于任何一组。
- **场景**
  - 管理员没报名某个正在进行的活动，从首页找不到它，没法去补签或代签到。
  - 用户报名的活动被取消后直接从首页消失，没有任何提示。这和 1860 行注释「终态保留在首页历史区域」不一致。
- **推荐方案**
  1. 增加一个「进行中」分组，或把它并入 `notStarted` 并改名为「即将/正在进行」。
  2. `ended` 的条件改为 `["已结束","已流局","已取消"]`，卡片上显示状态角标。
  3. 补一条测试：断言每种状态的活动都至少落入一个分组，即分组的并集等于输入列表。

### 13. token 在使用过程中失效后没有重新登录路径

- **处理状态（更新于 2026-10-09）**：后续处理。用户已确认延后修复 token 失效后的重新登录路径，尚未排期或实施。

- **位置**
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/miniprogram/services/request.js`：没有 401 钩子。
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/miniprogram/app.js:389-457`：401 只在启动时和 `ensureUserReady` 里处理，而 `ensureUserReady` 在 `sessionValidated=true` 之后就会跳过。
- **场景**：token 过期（30 天），或被重置或吊销后，小程序仍在后台存活。用户接下来的每个操作都提示「Invalid or expired token」，没有登录引导，只能彻底关掉小程序重开。
- **推荐方案**
  1. 在 `request.js` 里统一拦截 401：清掉 token，把 `sessionValidated` 置为 false，调用 `app.relogin()` 静默重新走 `wx.login`，成功后重放原请求一次；失败时再提示「登录已过期」。
  2. 用一个单例 Promise 保证多个并发请求只触发一次重新登录。

### 14. 签到页定位授权被拒后无路可走

- **位置**：`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/miniprogram/pages/checkin_map/checkin_map.js:101-119`
- **问题**
  - `wx.getLocation` 只在 `onLoad` 时调用一次，失败后只显示「未获取到当前位置…」。
  - 没有 `wx.openSetting` 引导，也没有重试或刷新按钮。
  - 微信在用户拒绝一次之后不会再弹授权框。
- **场景**
  - 用户第一次误点「拒绝」，此后再也签不了到，除非自己找到右上角设置。
  - 即使授权了，用户走进签到范围后，距离也不会刷新，只能退出页面再进来。
- **推荐方案**
  1. 失败时先用 `wx.getSetting` 判断 `scope.userLocation` 是否为 false。如果是，弹 Modal 引导用户调用 `wx.openSetting`，并在 `onShow` 里重新定位。
  2. 加一个「刷新位置」按钮。也可以在页面可见时用 `wx.onLocationChange` 或每 10 秒轮询一次。

### 15. 诊断日志接口可以刷爆磁盘

- **处理状态（更新于 2026-10-09）**：后续处理。用户已确认后续单独起版本，目标为清理线上及本地已存储日志，并移除会产生日志的逻辑；尚未排期或实施。当前工作区此前已有的本地防护改动保留，不代表该清理计划已完成。
- **本地处理**：
  - 登录态和匿名诊断写入均设 128 KiB 请求体上限；各接口独立按进程限流，每分钟最多 30 个请求。
  - 客户端诊断日志从通用应用日志分离到 `logs/client-diagnostics.log`（相对进程工作目录；当前 systemd 工作目录下为 `backend/logs/client-diagnostics.log`）。单文件 10 MiB，保留 5 个轮转文件，最多约 60 MiB；管理员读取接口合并读取轮转文件和当前文件。
  - 原匿名事件类型/批次大小校验继续保留；诊断字段继续做敏感键过滤、字符串限长和递归深度限制。
  - 局限：限流和标准 `RotatingFileHandler` 均为进程内实现。当前 systemd 启动单个 Uvicorn worker 时适用；若启用多 worker，额度会按 worker 倍增，多个进程并发写同一轮转文件也没有并发安全保证，应改用集中式日志/限流方案。
- **日志来源与存储梳理（基于仓库配置；线上现状未实时核查）**：
  1. **后端应用日志**：FastAPI/Python `logging`、请求完成记录、异常/天气/图片传输诊断等写入标准输出/错误；systemd unit 配置将两者追加到服务器 `backend/logs/application.log`。通用应用日志未配置应用内大小上限，依赖 logrotate。
  2. **客户端诊断日志**：小程序客户端上报到 `/diagnostics/client-logs*` 或匿名批量接口；本次修改后进入独立的 `backend/logs/client-diagnostics.log` 及 `.1`–`.5` 轮转文件，不再进入 application.log。接口管理员可读取最近事件。客户端也有本地有界 outbox，供离线重试；它不是服务器日志。
  3. **Caddy 图片请求关联日志**：仓库运维配置指向 `/var/log/caddy/cover-diagnostics.jsonl`，记录封面/玻璃图请求相关数据；是否仍启用、当前大小和保留周期需登录服务器核实。
  4. **systemd journal**：仓库 README 提供 `journalctl` 排障命令，但当前 unit 显式把服务 stdout/stderr 写文件；不能据此认定 journal 保存了完整应用日志。
  5. **脚本/本地启动输出**：脚本的 stdout/stderr 由调用终端或启动器决定去向；Windows 本地启动脚本使用 `uvicorn.stdout.log` 与 `uvicorn.stderr.log`。具体文件仅在对应启动方式下产生。
  6. **已存储文件**：当前本地工作区可见 `logs/client-diagnostics.log`，14 行、14,333 字节，时间为 2026-10-08；这是本地运行/测试留下的诊断样本，不是生产数据。仓库配置未发现受跟踪的 `backend/logs/application.log`。审查报告开头所记生产 `application.log` 约 62 MB、23,808 行客户端诊断，以及 Caddy 日志等，均为 **2026-10-08 的历史只读快照**，不能代表当前线上状态；本轮未连接服务器，无法确认它们此刻是否存在、大小或内容。
- **原风险与解决**：旧配置下，登录态接口无限制，匿名接口为每 worker 每分钟 60 次/128 KiB；每天检查一次的 logrotate 无法防止短时增长。现在请求和存储均有本地上限，但生产防护要等部署后才生效。

---

## P2：近期排期

### 17. 天气刷新会把旧地点的天气写回快照

- **处理状态（2026-10-08）**：已在本地修复并通过定向测试，尚未部署。写回改为带 `activity_id + location_key + target_date` 条件的原子更新；若上游请求期间地点或日期已变化，旧结果及失败状态都会被丢弃。回归测试模拟了请求期间地点变更。

- **位置**：`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/activity_weather_service.py:230-234`
- **问题**：刷新任务的流程是：读出待刷新的快照 → 提交 → 逐个发起 HTTP 请求（每个最长 8 秒）→ 最后统一提交。session 设置了 `expire_on_commit=False`，持有的是内存中的旧对象。
- **场景**：任务正在请求 A 地点的天气时，用户把活动改到 B 地点，`invalidate_weather_snapshot` 已经把快照重置为 pending 并写入 B 的 location_key。任务结束时会把 A 地点的天气、`status="available"` 和 6 到 12 小时后的下次刷新时间写回去。结果是新地点在接下来半天里显示的都是错的天气。
- **推荐方案**
  1. 写回时用条件更新：`WHERE id=? AND location_key=? AND target_date=?`。如果更新了 0 行，就丢弃这次结果。
  2. 每个快照单独提交，避免一个异常导致整批结果丢失（`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/scripts/refresh_activity_weather.py` 目前是最后一次性提交）。

### 18. 签到、代签到、取消活动没有加锁；`update_activity` 先检查后加锁

- **处理状态（2026-10-08）**：已在本地修复并完成定向回归测试，尚未部署。
- **本地修复**：普通签到、管理员代签到、管理员取消签到都先锁定活动及其参与者记录，再读取/校验当前状态并提交；活动编辑也改为拿锁后复查终态。管理员补签仅允许活动“进行中”或“已结束”，避免未开始、流局或已取消活动补签。

- **位置**：`/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/activity_service.py`
  - `checkin_activity:535-584`
  - `admin_checkin_participant:455-494`
  - `admin_cancel_checkin_participant:497-532`
  - `cancel_activity:295-307`
  - `update_activity:227-231`
- **场景**
  - 签到和取消活动同时提交，会在已取消的活动上留下签到记录。
  - 签到和「移除参与者」并发时，UPDATE 匹配 0 行，SQLAlchemy 抛 `StaleDataError`，返回 500。
  - 管理员代签到和取消签到之间是后写覆盖先写。
  - `update_activity` 在 227 行检查终态，230 行才加锁，加锁后不再复查：管理员刚取消，创建者的 PATCH 拿到锁后仍能编辑已取消的活动。
  - 代签到只拒绝「已取消」（`:471`），对「未开始」和「已流局」也允许代签。
  - 已排除：「取消活动」和「报名」的竞态。报名持有 `FOR UPDATE` 锁，取消的 UPDATE 会被阻塞，两者自然串行。
- **推荐方案**
  1. 这四个函数一开头都调用 `lock_activity(db, activity_id)`，然后在锁内重新读取状态和参与者再校验。
  2. `update_activity` 把终态检查移到 `lock_activity` 之后。
  3. 代签到改为只允许「进行中」和「已结束」，和普通签到的时间窗口保持一致。

---

## P3：有空时清理

### 35. 前端冗余代码和无效预取

**处理结论（更新于 2026-10-10）：代码清理已完成，用户反馈测试无问题、验收通过，待发布。**

当前没有从本条旧清单确认出的待编码删除项：日历和旧表单弹层、死代码/状态、未使用导出、46 个无引用图片、已确认的死 WXSS 与重复工具均已处理；首页列表比较也已改为结构比较，卡片只保留事件所需数据。原始候选清单保留作审查依据，不能再逐条当作尚未处理。用户于 2026-10-10 反馈测试无问题，本条按用户验收通过记录，剩余为随版本发布；此记录不代表 Codex 自行完成了全设备测试。

- 已删除：日历页及注册、日历预取、专用缓存与测试；旧 `activity-form-sheet` 组件及首页/详情页的弹层状态、回调和模板。独立新建页 `activity_create`、编辑页 `activity_edit` 及现有导航保留。
- 已清理：首页无 UI 的搜索/筛选、无调用方法、个人页不可达分支、详情/排行榜等仅写不读的状态；未使用的服务方法、缓存文件和工具导出。日志模块仅收窄无外部调用的导出，没有移除日志链路。
- 已删除 46 个无运行时引用图片（含日历专用图片），保留 `app.json` Tab 图标；清理首页及相关页面/组件的无引用 WXSS，保留动态使用的类。
- 首页改为导入共享 `activityEnrich` 的基础适配与样式函数；保留首页专属展示加工及按当前用户 ID 重算报名状态。导航卡片改为只传 `data-id`，据此进入详情页；其他卡片媒体事件所需的 dataset 保留。
- **追加处理（2026-10-09，已逐项确认）**：删除 `activity_create` 内部编辑兼容模式，包括编辑参数解析、活动读取与预填、编辑专用状态、更新请求和“保存修改”文案。旧编辑参数现在仍打开空白新建表单，提交只走创建请求并触发 `activityCreated`；独立 `activity_edit` 页面及详情页编辑入口保持不变。
- **公共工具追加处理（2026-10-09，已逐项确认）**：将两个组件重复的 `getRpxPerPx` 提取到 `utils/safeArea`，保留原窗口读取顺序和 390px 兜底；将详情页与个人页重复的 `isTemporaryAvatarUrl` 提取到 `utils/profileUtils`，保持临时头像上传和已有头像复用流程不变。新建页的 `normalizeSubItems` 活动上限下限由 1 改为 3，与编辑页统一后提取到 `utils/activityForm`；单个子项目仍允许 1 人。
- **提示弹窗样式追加处理（2026-10-09，已逐项确认）**：新增 `styles/centeredDialog.wxss`，通过两处局部 `@import` 合并通用提示弹窗与个人页权限弹窗的遮罩布局、尺寸、字体、按钮基础样式和入场动画；保留原类名和组件样式隔离，不改 WXML 或业务 JavaScript。通用弹窗的 1500 层级、点击处理、两种特殊遮罩，以及权限弹窗的 1100 层级、输入框、危险按钮白字和禁用状态均留在原文件；动画数值不变，仅统一内部动画名称。其他抽屉、日期/封面选择器及骨架屏未改动。
- **验证记录**：删除编辑兼容模式时前端全量测试 491 项通过，JavaScript 语法和补丁检查通过，新建页 WXSS 的 Skyline CLI 检查为 0 错误。公共工具合并后新增 8 项回归用例，全量测试 499 项通过，覆盖屏宽换算与异常兜底、两页头像上传/复用、活动人数下限及子项目名额边界；本轮未修改 WXML/WXSS。尚未进行微信开发者工具或真机验证；仅本地修改，未提交或部署。
- **提示弹窗验证记录**：新增 5 项样式回归用例，关联测试改为读取展开局部导入后的样式；全量前端测试 504 项通过。公共样式及两个引用文件的 Skyline CLI WXSS 检查为 0 错误；未进行开发者工具/真机渲染验收，不能以静态检查代替视觉结论。仅本地修改，未提交或部署。
- **首页列表比较追加处理（2026-10-09，已逐项确认）**：将 `_commitHomeList` 的两处 `JSON.stringify` 比较替换为 `utils/homeViewData` 的直接结构比较。同值/同引用立即返回，发现差异即停止；比较全部自有字段及嵌套数组/对象，不用固定字段白名单，字段增删或新字段不会被忽略，对象键的插入顺序不再触发冗余更新。保留原有按活动 ID 判断顺序、单卡/整组更新、焦点、分组、分页和完成回调策略；未改 WXML/WXSS、网络响应签名或媒体标识。
- **首页列表验证记录**：新增 22 项回归用例，全量前端测试 526 项通过，首页与比较工具的语法检查、补丁格式检查通过。覆盖不变数据不调用 `setData`、单卡字段/嵌套数据变化、增删/重排/分组切换、焦点与回调保留，并确认提交更新时不再序列化整张卡片或页面状态。本次核实原展示加工已剥离完整参与者数组、完整头像列表和封面对象，优化针对剩余展示数据；不扩大为重写加工流程。
- **本机微基准（非真机结论）**：Node v24.14.0，用现有适配器生成 50 张模拟展示卡片，每组 10000 次比较、预热后取 3 次中位数。旧字符串比较/新直接比较分别为：相同数据副本 59.80/26.25ms，共用嵌套数据 59.22/16.11ms，单卡名称变化 57.02/21.44ms，单卡嵌套字段变化 53.85/25.02ms；四组逐卡判断结果一致。未测微信开发者工具或真机帧率、耗时，不能据此宣称整体页面提升倍数。仅本地修改，未提交或部署。
- **后续完成（2026-10-10）**：用户授权的抽屉基础样式、浅色骨架屏、滑动判定、数值夹取和日期辅助函数已本地合并，详见 R1～R5。一级/二级抽屉差异已备注并保留，其他不同语义函数不强行合并；未把完整首页展示流程强行替换为详情页加工流程。
- **用户启动日志追加修复（2026-10-09）**：针对 `objectWithoutPropertiesLoose.js is not defined`，将首页卡片加工和日期选择器的两处对象剩余解构替换为浅拷贝后删除指定字段。保留卡片裁剪、参与人数、头像与原对象不被修改的行为，选择器仍不向 `setData` 写入被 observer 监听的 `mode`。本地开发者工具附带的 helper 源码确认依赖关系，Babel AST 对照确认两处对象剩余解构均由 1 处变为 0；新增两项源码回归保护，相关运行时单元测试通过。未修改编译开关、渲染模式、WXML/WXSS；未实际执行开发者工具 GUI 重新编译或真机验收。

以下保留原审查清单及定位，描述的是清理前状态；当前结果以上述处理结论为准。

以下路径均相对于 `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/miniprogram/`。删除风险分三级：
- **L1**：引用数为 0，可直接删除。
- **L2**：生产路径已经走不到，但是否保留需要产品决定。
- **L3**：重复实现的合并，属于重构，需要做回归。

#### 35.1 整页或整组件不可达（L2）

- **日历页 `pages/activity_calendar`**（约 1750 行：js 912、wxml 170、wxss 529、md 133）
  - 只在 app.json 中注册，没有任何导航入口。
  - 首页 `activity_list.js:828` 仍通过 `utils/calendarWarmup.js`（60 行）每 45 秒预取一次 `/activities/me/signed-up`，这些请求白白浪费。
  - 连带可删：`myActivitiesCache` 中日历专用部分、`images/calendar-event-*.svg` ×12。
  - 需同步的测试：
    - 整个文件删除：calendarWarmup、calendarSkylineBehavior、calendarSkylineMigration。
    - 删除其中的日历用例：responsiveUnits、tabPagesSkylineMigration、customTabBar、ranking、safeArea。
- **组件 `components/activity-form-sheet`**（1474 行）
  - 首页 `activity_list.wxml:575-600` 的 page-container 依赖 `createFormContainerRendered`，这个变量从来不会被设为 true。新建活动实际走的是 `activity_list.js:1718` 的 navigateTo。
  - 详情页 `activity_detail.wxml:335-363` 只在 `wx.navigateTo` 不存在时才渲染（`activity_detail.js:884`）。实际编辑走的是 `activity_edit` 页面。
  - 连带死代码：
    - 首页：`closeCreateForm`、`onCreateFormBeforeLeave`、`_scheduleCreateFormCloseCompletion`、`onCreateFormAfterLeave`、`submitCreateActivity`（`:1832`），以及 `showCreateForm`、`createFormContainerRendered` 两个状态。
    - 详情页：`closeActivityForm`、`onActivityFormBeforeLeave`、`onActivityFormAfterLeave`、`submitActivityForm`、`cancelActivityFromForm`（`:895-950`），以及 `openAdminEdit` 的回退分支。
  - 需同步的测试：activityFormSheet、activityCoverPicker、activityDetail、homeCardPresentation、nativeSheetDismissal、tabBarRecovery、skylineSheet。
- `activity_create` 页面里的编辑模式没有被使用（编辑走的是 `activity_edit` 页面）；已按确认删除，见上方追加处理。

#### 35.2 死方法和死状态（L1）

- **首页 `activity_list.js`**
  - 搜索和筛选整条链路都没有对应的 UI，只有 `homeCardPresentation.test.js:905-921` 在用：
    - `onSearchInput`（`:1631`）、`onFilterChange`（`:1636`）、`computeFilteredList`（`:1642`）、`filterActivities`（`:1662`）
    - `_filteredList`：只写不读
    - `data.searchKeyword`、`data.selectedFilter`
  - `cancelActivityFromCard`（`:1861`）：没有绑定到任何元素。
  - `_rememberFocusedActivity`（`:620`）：没有调用方。
  - `data.navBarHeight`、`data.locationDisabled`：从未被读取。
- **其他文件**
  - `pages/activity_edit/activity_edit.js:243` 的 `toggleSignup`。
  - activity-form-sheet 的 `onSwitchChange`：WXML 只用了 `onSwitchTap`。
  - custom-tab-bar 的 `setGlassTuning`：只有测试在用。
  - `app.js:231` 的 `clearAuthState`。
  - `profile.js:131-160`：`_pendingAutoLoginAndEditProfile` 和 `_pendingForceProfileForSignup` 从来没被设置过，两个分支都不可达。
  - `profile.js:112` 读取的 `globalData.userProfile.role` 从来没有赋值，好在有兜底，不会出错。
- **setData 了但从未被读取的字段**
  - activity_detail：`navBarHeight`、`participantPreview`
  - history：`pigeonRanking`（WXML 只用 `pigeonLeader`、`pigeonPodium`、`pigeonRest`）
  - profile：`user.userIdShort`
  - participants-drawer：`bodyMaxHeightRpx`
  - activity-form-sheet：`defaultMaxParticipants`

#### 35.3 未使用的导出（L1）

- **没有任何调用方**
  - `services/auth.js`：`login`、`register`。可以和 #2 下线接口一起处理。
  - `services/stats.js`：`getHistoryStats`、`getHistorySummary`
  - `services/activity.js:55`：`getActivitySharePreview`
  - `utils/activityEnrich.js:456-473`：`formatDetailTimeRange`、`formatLocationLine`
  - `utils/historyStatsCache.js`（37 行）：只在 `services/activity.js` 中调用过 `clear()`，从来没被读取。可以整个文件删除。
- **只在模块内部使用，去掉 export 即可**
  - activityWeatherCache：`clearActivityWeather`、`_prune`
  - logger：`reportTransportFailToWechatAnalytics`、`getClientDiagnosticSessionId`
  - request：`resolveApiBaseUrl`
  - dateTimePicker：`parseDateValue`、`parseTimeValue`
  - safeArea：`isAndroidDevice`、`resolveBottomSafeAreaRpx`
  - participants-drawer/logic：`DEFAULT_MAX_HEIGHT_RPX`

#### 35.4 未引用的资源（L1）

共 46 个文件，约 33KB（资源总量 873KB）。

- **tab 图标**
  - `*-material-rounded-states.svg` ×5
  - `tab-calendar-*`
  - `tab-*-lucide*`
  - `tab-profile.png`、`tab-profile-active.png`、`tab-create.png`
- **其他图标**
  - `icon-detail-{time,location,people,intro}.png`
  - `icon-location.png`、`icon-people.png`
  - `activity-detail-chevron-{up,down}.svg`
  - `icon-profile-{edit,login,logout}.svg`
  - `icon-image-plus.svg`、`icon-tools-widgets.svg`、`icon-expand.svg`、`icon-check.svg`、`icon-chevron-down-light.svg`
- **日历专用**：`calendar-event-*.svg` ×12，跟随日历页的处理决定。
- **不能删除**：app.json 中 `tabBar.list` 引用的 iconPath。使用 custom tabBar 时这些字段仍然是必填项。

#### 35.5 死 WXSS（L1）

改动前按 AGENTS.md 先加载 skyline skill，改完跑 `skyline-cli wxss check`。

| 文件 | 未使用的样式 |
|---|---|
| `activity_list.wxss` | 193 个 class 中有 83 个未使用，约 578/1484 行，主要在 28-695 行。包括旧版卡片、filter-tabs、empty-state、modal/edit-modal、form-item、participant-*、btn.primary/danger、status-badge 等 |
| `app.wxss` | guest-mode、guest-empty-*，约 30 行 |
| `activity_detail.wxss` | navbar-title、bottom-icon-button-disabled、signup-profile-close-btn、signup-profile-modal-handle |
| `profile.wxss` | profile-navbar-title |
| activity-cover-picker-sheet | cover-artist-avatar*、cover-skeleton-avatar、cover-skeleton-name |
| activity-form-sheet | deadline-card、deadline-grid |

#### 35.6 重复实现（L3）

- **首页与 `utils/activityEnrich.js`**：`activity_list.js` 第 14-360 行与这个 util 重复。
  - 完全相同：`buildTypeStyleMap`、`formatDateTime`、`normalizeActivityTypeByMap`、`normalizeTypeKey`、`resolveStyleByTypeAndKey`。
  - **已经产生差异**：
    - enrich 版的 `adaptParticipant` 多了 `checkedInAtRaw`、`checkinLocationName`、`checkinAddress`。
    - enrich 版的 `adaptActivity` 多了 `sharePreviewImageUrl`、`weather`。
  - 改为引用 util 版本，约可减少 300 行。替换后首页卡片会拿到这几个多出来的字段，需要回归首页卡片。
- **样式重复**
  - `components/create-access-dialog/index.wxss:12-119` 与 `pages/profile/profile.wxss:174-317` 约有 100 行几乎相同。区别只有 z-index（1500 / 1100）和按钮类名（`--confirm` / `--primary`）。
  - activity-form-sheet 中 `--create` 与 `--edit` 两版的 stepper、participant-limit 块重复。如果整个组件被删除，这一项自然消失。
  - sheet 头部、关闭按钮、遮罩的样式在 cover-picker、date-time-picker、participants-drawer、form-sheet 之间重复，每组 20-38 行。
  - 骨架屏 shimmer 在 cover-picker 和 activity_detail 之间重复。
- **同名工具函数多处定义**
  - 完全相同：
    - `normalizeSubItems`：create 页和 edit 页
    - `getRpxPerPx`：subitems-editor 和 participants-drawer
  - 各有一份：`isTemporaryAvatarUrl`（detail 和 profile）。
  - 另有 `clamp`、`pad`、`formatDate`、`formatDateLabel`、`finiteNumber`、`getSwipeSettledState`。
  - **注意**：`profile.js:23` 版的 `normalizeAvatarUrl` 对空值返回 `""`，其他版本返回默认头像，所以不能直接合并。
- **不建议合并**：`activity_create` 和 `activity_edit` 两个页面实际差异很大，wxss 共用 0/307 行，js 共用 70/234 行。

#### 35.7 性能隐患

每个首页卡片的 `data-activity="{{item}}"` 会把整份参与者数组序列化到 dataset 里，`_commitHomeList` 还会对每张卡片做 `JSON.stringify` 比较。在 Skyline 下这是性能隐患。

#### 推荐方案

1. 先删 L1 项，同步修改测试，然后跑 `node --test tests/*.test.js` 和 `skyline-cli wxss check`。部分测试是对源码文本做正则断言，必须同步修改。
2. L2 项：日历页和 activity-form-sheet 是删除还是恢复入口，由产品决定。决定后各自单独提交，方便回滚。
3. 卡片只传 `data-id`，需要时再从页面数据里查找对应的活动。
4. L3 的合并放到最后做，每一项单独提交。

### 36. 仓库卫生

**处理结论（2026-10-09）：部分已处理。**
- 已核实并删除五个空重复目录：`backend 2`、`miniprogram 2`、`prototype 2`、`research 2`、`.git 2`；删除逐字节相同的 `backend/app/api/v1/weather 2.py`。
- `backend/README.md` 的 SSH 连接示例改为 `<deploy-user>@<server-host>`；数据库忽略规则此前已补齐，本轮核验仍有效。
- **媒体域名已处理**：前端 18 个内置样式图片链接统一用 `config.js` / `config.js.template` 的 `getMediaUrl`，跟随 API 站点；生产默认链接保持原样。后端 v1 样式只保留资源路径，复用 `PUBLIC_BASE_URL`、`MEDIA_URL_PREFIX`；接口在公开地址未配置时回退请求站点，内部玻璃图片生成仍支持本地媒体路径，已有外部图片链接保持不变。该 v1 后端样式服务后续已随 2026-10-10 的旧活动接口清理删除，前端媒体配置和现行 v2 封面服务保留。
- **环境切换已同步**：PowerShell/Bash 测试启动脚本从生产模板替换地址与环境标识，保留公共函数；修复 Bash 退出恢复未接入、复用隧道时未注册清理的问题。本地独立真机脚本已有模板机制，无需修改。Bash 脚本原有 Git `assume-unchanged` 标记已解除，使修复可被差异检查发现。
- **本次验收**：小程序全量 **538 passed，0 failed，0 skipped**；后端全量 **216 passed，0 failed，82 warnings**（现有 `utcnow` 弃用警告）。新增测试覆盖生产/局域网/HTTPS 测试地址、请求地址回退、自定义媒体前缀、外链与空视频兼容、配置副本隔离及本地玻璃源；隔离执行三类启动脚本的配置生成片段，验证公共函数保留和 Bash 配置恢复。PowerShell/Bash 语法、JavaScript 语法及 `git diff --check` 通过。
- **边界**：未迁移或替换媒体资源、未改写数据库及私有环境文件、未启动 SSH/部署服务；生产部署需在环境配置中明确对外 HTTPS 的 `PUBLIC_BASE_URL`，测试环境需自行具备同名旧样式资源。未进行微信开发者工具或真机图片加载验收。
- **保留项**：生产 SSH/fail2ban 配置未核查或修改。本条不能标记为全部完成。

以下为原审查问题及建议，已处理部分以上述结论为准。

- **问题**
  - 存在 Finder 复制出来的重复目录：`backend 2`、`miniprogram 2`、`prototype 2`、`research 2`、`.git 2`。
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/api/v1/weather 2.py` 和原文件逐字节相同，并且因为文件名带空格，无法被导入。
  - `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/README.md:92` 在公开仓库里写有 `ssh ubuntu@<服务器 IP>`。
  - 生产域名在 `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/app/services/activity_type_style_service.py:22` 和小程序约 15 处媒体 URL 中被硬编码。
  - 测试数据库 `backend/dragon_reserve_local_test_runtime.db` 和 `backend/dragon_reserve_test.db` 没有被 git 跟踪，但也没有加入 `.gitignore`，容易被误提交（参见 #7）。
- **推荐方案**
  1. 确认重复目录里没有独有的改动后删除它们。删除前先用 `diff -rq` 比较一下。
     - 2026-10-08 复查：`backend 2`、`miniprogram 2`、`prototype 2`、`research 2`、`.git 2` 都是空目录，可以直接删除。
  2. 从 README 中删掉服务器 IP，改为引用私有运维文档。
  3. 确认服务器 SSH 只允许密钥登录（`PasswordAuthentication no`），并启用 fail2ban。
  4. 媒体 URL 统一从 `config.js` 的 `MEDIA_BASE` 拼接。
  5. 在 `.gitignore` 中加入 `backend/*.db`。

### 38. 后端冗余代码

**处理结论（更新至 2026-10-10）：部分已处理。**
- **38.1 已处理**：删除无引用的 `qweather_service.py`、`schemas/common.py`，清理未使用/重复导入、无调用配置项及其 `.env.example` 项；移除两个管理员签到函数的死参数、统计中的「已删除」状态和 v2 多余空值分支。
- 原 `_sync_activity_status` 中的重复条件现位于 `_calculate_activity_status`，已按等价逻辑简化，并覆盖开始/结束边界、2/3 人边界及终态不变的测试；没有新增状态同步机制或改变流局规则。移除参与者接口仍实际使用 `allow_activity_owner`，因此保留该函数的参数。
- **38.2 部分已处理**：按用户授权删除近 30 天无请求、当前前端无引用的 `GET /api/v1/stats/history`、`GET /api/v1/stats/history-summary`、`GET /api/v1/weather/activity`、`POST /api/v1/diagnostics/client-logs`。同时删除天气路由文件、旧统计专属查询函数/schema、按位置和日期查询天气的兼容函数；批量诊断仍使用 `ClientDiagnosticLogRequest`，保留该数据结构。
- **38.2 当前状态**：旧活动及 client-config 接口和专属依赖已按 2026-10-10 用户逐项确认的范围删除；signup_deadline 的前后端链路及模型已清理，三个废弃列的删除已新增迁移，真实库待备份后发布执行，历史迁移保留。列出的资源及脚本已核查：BGG、旧封面构建、WebP/Q92 已删除，现行 Q88、分享图补全与联调启动工具保留。批量诊断、管理员读取日志等现行功能保持可用；#15 整体日志清理仍为后续独立版本。
- **本次验收**：后端 `pytest backend/tests -q`，**210 passed，0 failed，84 warnings**。同步旧接口兼容测试，核验已删接口不在 OpenAPI 且 HTTP 请求返回 404（单条诊断 POST 返回 405，同路径 GET 保留）；现行排行榜、天气快照/刷新、批量诊断与其余后端用例均通过。引用检索及 `git diff --check` 通过。本次仅本地修改，未部署。
- **38.3 本轮候选项已本地处理（2026-10-10）**：业务时间统一到现有 `app/utils/app_time.py`；分享图文件名差异按不同职责保留并补测；v1 专属媒体 URL 与校验重复已随旧接口删除。状态常量、参与者查询、诊断拼装、媒体根目录已按 R6～R9 合并；不同事务职责保留，不为减少行数统一事务流程。

以下保留原审查清单及定位，当前结果以上述处理结论为准。

以下路径都相对于 `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/`，风险分级与 #35 相同。

#### 38.1 可直接删除（L1，约 70 行）

- `app/services/qweather_service.py`：整个文件没有任何引用。
- `app/schemas/common.py` 中的 `ErrorResponse`：没有任何引用。
- `app/middleware.py:9`：导入了 `from starlette.responses import Response`，但没有使用。
- `config.py` 中从未被读取的配置项，`.env.example:24,30` 中的对应项一起删除：
  - `bgg_api_token`、`bgg_api_base_url`（`:50-51`）
  - `qweather_cache_seconds`（`:58`）
  - `qweather_refresh_max_concurrency`（`:64`）
- `activity_service.py` 中 `_sync_activity_status` 的第 77-84 行：内层 elif 恒为真，导致外层第二个 elif 永远走不到。
- `admin_checkin_participant` 和 `admin_cancel_checkin_participant` 的 `allow_activity_owner` 参数（`:461,469,503,507`）：从来没有被传入。
- `stats_service.py:226,277`：状态元组中的 `"已删除"`。
- `app/api/v2/activities.py:309-311`：多余的 `participant is None` 分支。

#### 38.2 需要确认后再删除（L2，约 1800 行）

**2026-10-09 复核纠正**：仅当前活动服务显式使用 v2；`request.js` 只在传入 `apiVersion` 时替换基础 URL，登录、用户、排行榜等仍使用 v1。上方生产应用请求日志显示：以下部分旧接口近 7 天无记录，但活动、client-config 近 30 天仍有调用。用户已明确本项目只支持当前小程序，不要求兼容旧客户端；不再以旧客户端兼容为保留依据，但仍不能删除现行功能使用的整个 `/api/v1`。活动及 client-config 的具体删除范围已于 2026-10-10 分别获用户确认并实施；上述流量数据是 2026-10-09 的历史复核，本次未重新读取生产日志。

- **已处理：v1 活动路由及专属依赖（2026-10-10）**：
  - 删除 `app/api/v1/activities.py` 及路由注册，共 17 个 HTTP 接口操作；包含旧活动读写、报名/取消、签到、分享图、类型样式列表、样式签名和类型玻璃图片入口。没有添加重定向、兼容别名或回退接口。
  - 删除 `create_activity`、`cancel_signup`、`get_activity_style_signature`、`_resolve_style_key_implicit`；移除共用 `update_activity` 中的 type/style 分支，并将入参类型修正为现行 `ActivityUpdateV2Request`。
  - 删除整个 `activity_type_style_service.py`；玻璃图片服务只删 `get_or_create_activity_card_glass` 和旧样式导入，保留 v2 封面入口、渲染器、缓存及源图片加载。
  - 从共用 `schemas/activity.py` 删除六个 v1 专属请求/响应类及专属校验，保留参与人、子项目、报名、签到、天气、分享图及共用文本校验。
  - 活动清理时保留其他 v1 登录、用户、排行榜、诊断、健康检查及 `client-config`；后者随后按下述独立确认范围删除。不修改数据库模型、字段、历史迁移、图片资源或前端样式/缓存兜底；种子脚本的历史类型字段不在本次范围。现行 v2 天气、分享图与封面/CDN 逻辑保留。
  - 将活动读写、权限、签到、天气、分享图、时区、空值边界、参与人位置返回等业务测试迁到 v2；终态物理删除测试改为 ORM 准备终态数据，不通过 v2 请求指定状态。旧样式专属测试删除；玻璃图片渲染与缓存测试迁到封面入口；独立截止字段测试继续验证现行协议及保留数据库列。
  - 新增 `test_activity_api_removal.py`，覆盖全部 17 个旧操作返回 404、OpenAPI 与专属模块删除、现行接口保留、开始前手动关闭报名仍可取消、开始后普通用户不能取消、管理员仍可移除报名。
  - **验收**：后端全量 `pytest tests -q -p no:cacheprovider` **222 passed，0 failed，68 warnings**（现有 `utcnow` 弃用警告）；前端全量 **549 passed，0 failed，0 skipped**。独立截止字段测试追加断言，复验 **10 passed**：v2 编辑保留数据库中的旧截止时间、活动类型和样式值，响应不暴露旧字段。80 个应用/测试模块 AST 解析及 `git diff --check` 通过。测试数量变化来自清理旧样式专属测试和 v1 参数化副本，现行业务断言保留在 v2。首轮回归发现并修正三个测试文件的动态 v1 地址遗漏后，完整重跑通过；禁用缓存插件只为避开本机已有 pytest 缓存目录不可写问题。
  - 本次仅本地代码和测试修改，测试使用临时 SQLite；没有连接生产数据库、执行迁移、提交、部署或微信开发者工具/真机验收。其他待确认项目不随本次自动删除。
- **已处理：v1 的 `/stats/history` 和 `history-summary`**，连同 `get_pigeon_stats`、`get_ended_activity_count` 以及对应 schema 已删除。
- **已处理：v1 的 `/weather/activity`**，路由文件、注册和独占快照查询函数已删除。
- **已处理：`/client-config` 及专属缓存版本配置（2026-10-10，用户单独确认）**
  - 当前小程序没有请求或读取该接口的代码；版本号只在路由、专属响应类和配置字段中使用。活动列表缓存按 API 站点隔离，并在业务写入后失效；图片磁盘缓存按 URL、本地索引、容量和有效期管理，不依赖服务器缓存版本号。
  - 删除 `app/api/v1/client_config.py`、路由导入/注册、`schemas/client_config.py` 和 `Settings.client_cache_version`（`CLIENT_CACHE_VERSION` 别名）。不添加替代接口、兼容别名或新的全局清缓存逻辑；私有环境文件、部署配置、数据库及小程序缓存实现均未修改。
  - 移除旧活动清理测试中“client-config 仍存在”的断言；新增 `test_client_config_removal.py`，验证匿名及认证请求均返回 404，OpenAPI、响应结构、专属模块和配置字段已移除，健康检查与现行 v2 活动接口仍可使用。
  - **验收**：后端全量 `pytest tests -q -p no:cacheprovider` **225 passed，0 failed，68 warnings**（现有 `utcnow` 弃用警告）；前端全量 **549 passed，0 failed，0 skipped**。79 个应用/测试模块 AST 解析、引用检索和 `git diff --check` 通过。本轮未改小程序源码、缓存数据、私有环境文件、数据库或资源；未提交、部署、读取生产日志或执行开发者工具/真机验收。
- **已处理：单条上报的 `POST /diagnostics/client-logs`** 已删除；批量接口和管理员 GET 查询保留。
- **已处理：`signup_deadline` 前后端链路（2026-10-09，用户确认不保留旧客户端协议；数据库迁移另行确认）**
  - 删除 v1/v2 请求、响应、继承的详情响应中的旧字段和专属日期校验；OpenAPI 不再声明该字段。移除创建时专属排除、写空及更新时丢弃输入/清空存量列的处理。v2 按既有 `extra="forbid"` 拒绝含旧字段的请求；v1 保留原有通用未知字段忽略策略，不增加专属兼容代码。
  - 前端删除 `signupDeadline`、`signupDeadlinePassed`、未使用的截止日周几标签和重复刷新边界；详情取消报名使用已有 `activityStarted`。报名开关和开始时间继续共同控制报名，手动关闭报名并不阻止已报名者在开始前取消。
  - **旧缓存差异已修复**：曾在当前 12:00、开始 18:00、旧缓存截止 10:00 的内存场景复现缓存关闭而接口开放。现在从 `startTimeRaw`（缺失时使用展示开始时间）重算缓存状态和报名状态，丢弃旧展示字段；开始时间含秒时保留精度，同一响应在准确开始秒重新加工。
  - 同步移除正常请求测试中的旧字段及过时的时区断言；种子脚本移除独立截止参数、赋值，将误导的“测试报名截止局”改为“测试次日开放局”，保持九个场景数量。该脚本仅解析语法，没有执行。保留存量数据库列和历史迁移，正常编辑不再专门改写历史截止值；新增 API 测试验证该列保持原值且响应不再暴露它。
  - **验收**：前端全量 **549 passed，0 failed，0 skipped**（含启动 helper 修复）；后端全量 **231 passed，0 failed，82 warnings**（现有 `utcnow` 弃用警告）。新增测试覆盖八个 schema、OpenAPI、v1/v2 实际创建/列表/详情/更新响应、v2 未知字段拒绝、存量列不变，以及缓存早/晚/缺失旧值、秒级边界、终态、手动关闭与取消报名的区别。JavaScript/种子脚本语法和补丁检查通过；未改数据库结构、未连接生产数据库、未部署，未进行开发者工具 GUI 或真机验收。
- **一次性脚本**
  - **已删除（2026-10-10，用户确认不再使用）**：`backend/scripts/fetch_bgg_top50_dataset.py`。仓库内没有业务、测试、部署或其他脚本调用它；仅删除抓取工具，保留 `research/bgg-top-50-2026-08-30/` 下已有数据、原始响应、封面和研究说明。没有执行抓取、迁移数据、清理私有环境变量或扩展删除其他脚本。
    验证：后端健康检查和接口移除冒烟测试 **4 passed**；代码/配置中未检出脚本或专属 BGG 变量引用；`research/` 无 Git 差异，`git diff --check` 通过。本轮未重跑全量测试，未提交或部署。
  - **后续已删除研究数据（2026-10-10，用户另行明确授权）**：删除 `research/bgg-top-50-2026-08-30/`，共 59 个文件、45,346,658 字节，包含 JSON/CSV 数据、原始 XML、封面、元数据和研究说明。前述“保留数据”是上一轮仅删除脚本时的状态，此轮不再保留该数据目录。删除前核对目录内无链接、无未提交修改，仓库中该目录之外的路径引用仅为本报告；原型中的 BGG 文案与评分设计保留，未修改原型文件、应用图片或数据库。
    验证：自动断言 59 个删除项全部位于授权目录，数据目录已不存在、父目录 `research/` 保留；除报告历史记录外，未检出数据路径/文件名引用；后端启动与接口冒烟测试 **4 passed**，`git diff --check` 通过。本轮未重跑全量测试，未提交或部署。
  - **已删除旧封面构建脚本（2026-10-10，用户确认）**：`backend/scripts/build_activity_cover_assets.py`。仓库中无调用方；脚本依赖本机不存在的 `.local-assets/activity-cover-inbox/`，仅支持固定 8 位作者，且执行时先清空整个封面输出目录，不适用于现行 19 位作者、44 件作品的目录。本轮只删除脚本，未运行构建；现行 `catalog.json`、作者头像、封面、玻璃图片、发布资源及 manifest 均保留。
    验证：封面目录、封面玻璃图片及 JPEG 发布资源相关测试 **26 passed，0 failed，12 warnings**（现有 `utcnow` 弃用警告）；未检出残留调用，现行封面资源及其他资源脚本无 Git 差异，`git diff --check` 通过。本轮未重跑全量测试，未提交、部署或进行真机验收。
  - **已核查并保留分享图补全脚本（2026-10-10，用户确认）**：`backfill_activity_share_previews.py` 仍可用于活动缺图及分享图引用缺失的人工修复；默认只检查，显式 `--apply` 才写入。其用途不依赖旧客户端，现有测试覆盖默认只读、补全和重复执行。本轮未运行该运维脚本。
  - **已删除 WebP/Q92 试验方案（2026-10-10，用户确认）**：删除 `build_cover_webp.py`、WebP 开关读取函数及两处取图回退分支、`webp-q90-manifest.json`、`jpeg-q92-manifest.json`，以及两个独立试验目录中的 134 张图片（17,735,436 字节）。Q92 无业务读取入口；WebP 不再作为候选交付格式。原图、现行 `catalog.json`、GIF、JPEG Q88 交付件/清单/构建脚本及分享图补全脚本保留。更新压缩说明，历史 ops 记录标明方案退役且未清理服务器，避免继续指引启用已删除方案。
    验证：封面/玻璃图/Q88/分享图专项测试 **42 passed，0 failed，17 warnings**；后端全量 `pytest tests -q -p no:cacheprovider` **226 passed，0 failed，68 warnings**（现有 `utcnow` 弃用警告）。新增断言覆盖残留 WebP 环境开关无效、试验资源已删除、所有 catalog 原始路径仍存在；现有 Q88 测试继续验证 67 组原件/交付件哈希、解码、尺寸及体积。删除范围自检确认仅有 134 张试验图片和 2 份清单，其他封面资源及保留脚本无 Git 差异；引用检索与 `git diff --check` 通过。头像上传接受 WebP 格式属于独立功能，未删除。本轮未改小程序源码，未重跑前端测试或进行真机验收；没有重建或转码图片、修改业务数据库、提交、部署或清理服务器文件。
  - **已核查并保留联调启动脚本（2026-10-10，用户确认）**：`start_backend_test.sh` 是 Linux/macOS 的联调入口，与 Windows PowerShell 版本对应，仍被配置生成/恢复测试引用；不是一次性脚本，也不是 pytest 的前置步骤。本轮未修改脚本或执行真实联调，隔离片段测试 **7 passed，0 failed，0 skipped**，没有启动 SSH 隧道或连接服务器测试库。

#### 38.3 重复实现（L3，按现状逐项复核）

- **已合并业务时间（2026-10-10，用户确认）**：在现有 `app/utils/app_time.py` 增加 `app_now()`；活动和天气共用时钟，排行榜共用时钟与 `to_app_naive()`，分享图文字/文件名也使用同一时间转换。活动模块保留 `_app_now` 导入别名，已有调用与测试替换点不变，没有额外包一层重复实现。上海时区只定义一处，依赖项目已声明的 tzdata；移除排行榜单独的时区兜底，不改变应用原有的时区数据依赖。登录凭证等安全时间、文件清理 UTC 时钟、数据库字段与历史数据均不变。
- **已统一状态常量（2026-10-10）**：模型默认值、v2 创建、活动服务、天气和排行榜引用 `app/utils/activity_status.py`；未改变流局、终态、签到及统计规则。
- **已复核，不合并不同事务职责**：原“生成分享图 → commit → 失败 rollback 写了三遍”已不符合当前代码。现在在线后台任务先关闭读取事务再渲染、条件发布引用；人工补全脚本则逐条加锁、提交、回滚，失败时丢弃本次新生成文件。两者共用渲染函数，不为减少行数强行合并事务流程。
- **随旧 v1 活动清理消除**：旧 `_absolute_media_url` 和 share-preview 路由已删除，现行 v2 实现保留。
- **随旧 v1 活动清理部分消除**：v1 专属 validator 已删除；共用文本校验与 v2 创建/更新绑定保留，不为减少绑定数量另造抽象。
- 重复次数较多的代码：
  - **已合并参与者单条查询**：移除、普通签到、管理员签到/取消签到共用 `_find_participant`，始终带活动范围；锁、权限、错误优先级和提交仍由调用方控制。报名继续读取已加锁加载的参与者集合，不增加查询。
  - **已合并诊断 record 拼装**：认证/匿名批量共用 `_build_record`，使用规范化字段，身份仅由服务端赋值；保留鉴权、匿名白名单、容量限制及清洗链路，不扩大 #15 日志清理。
  - **已合并媒体根目录解析**：主程序、玻璃图、分享图和头像上传共用 `resolve_media_root`；缓存子目录、模块级变量与路径安全校验不变，公共函数不创建目录。
- **已纠正并补测文件名差异（2026-10-10）**：当前分享图生成/读取严格使用 24 位哈希，离线清理保留 24～32 位扫描范围，不扩大接口接受范围，也不收窄历史文件清理范围。脚本提取 `prune()` 与 `main()` 以隔离测试，CLI 参数、默认 dry-run/14 天、最低 7 天、引用过滤及删除前二次查库保持不变。没有执行真实清理或核查生产存量；不能由“无旧客户端”推断“无历史文件”。
- **本轮验收**：新增 31 项测试，覆盖公共时钟与跨年转换、UTC/其他偏移输入、活动开始/结束边界、排行榜跨日拆分、等价时间的分享图文件名/文字一致，以及文件名长度/非法路径、dry-run、引用保护、近期文件、保留期边界、CLI 和删除前二次查询。专项 **83 passed，13 warnings**；后端全量 **257 passed，0 failed，70 warnings**（现有 `utcnow` 弃用警告，新增临时活动用例也触发同类警告）；启动脚本隔离测试 **7 passed，0 failed，0 skipped**。本轮未改小程序源码，未重跑前端全量或做开发者工具/真机验收。数据库/迁移、保留的补全脚本、资源未修改；没有提交、部署或运行真实补全/清理脚本。

#### 批次清单（2026-10-10，#35/#36/#38）

用户本轮明确授权实施 R1～R10，排除 R11。以下记录实际落地边界；本地完成不等同于上线或真机验收。

| 编号 | 原条目 | 剩余事项 | 状态与边界 |
|---|---|---|---|
| R1 | #35 | 封面选择器、日期选择器、参与者抽屉的头部/关闭按钮/遮罩样式 | 本地完成；`styles/sheet.wxss` 仅提取相同声明，并注明封面/时间是二级抽屉、参与者是一级抽屉。各自标题尺寸、布局、遮罩颜色、动画及原生行为保留，不统一层级设计 |
| R2 | #35 | 封面选择器与详情页骨架屏 shimmer 样式 | 本地完成；共用浅色声明和 1800ms 动画，保留详情深色变体；其他页面的不同骨架屏不强行合并 |
| R3 | #35 | 两个组件的 `getSwipeSettledState` | 本地完成；共用纯函数和 25%/15% 阈值，各组件保留操作区宽度和默认参数 |
| R4 | #35 | `clamp` 等数值工具 | 本地完成；共用数值夹取，选择器保留上下界倒置时优先上界的既有导出语义；严格/可转换数值校验仍分开 |
| R5 | #35 | `pad`、日期/时间格式化辅助函数 | 本地完成；共用补零和日期/时分基础函数，保持各业务展示分隔符、秒数、空值及无效日期兜底 |
| R6 | #38 | 活动状态常量与散落字面量 | 本地完成；统一五种标签及状态组，不改业务判断 |
| R7 | #38 | 多处参与者查询 | 本地完成；只提取四处相同单条查询，保留活动隔离、锁和错误语义 |
| R8 | #38 / #15 | 认证/匿名诊断记录拼装 | 本地完成；本轮仅合并拼装，不删除日志链路或历史日志，#15 仍独立延后 |
| R9 | #38 | 媒体根目录解析 | 本地完成；主程序、玻璃图、分享图及头像上传共用函数，不改变目录配置或安全校验 |
| R10 | #38 | 废弃数据库字段及迁移策略 | 代码完成、真实库待发布执行；移除模型/构造器废弃引用，新增 `20261010_0022` 删除三列，不改历史迁移。临时库验证数据/索引/外键保留；删列值不可恢复，downgrade 明确拒绝，部署前必须备份 |
| R11 | #36 | 生产 SSH/root 登录策略与 fail2ban | 用户本轮明确排除，未访问或修改服务器；历史证据不等于现状核验 |

**本轮验收（R1～R10）**：新增 7 项小程序测试、9 项后端测试。小程序全量 **556 passed，0 failed，0 skipped**；后端全量含迁移测试 **266 passed，0 failed，5 skipped，71 warnings**（现有 `utcnow` 弃用警告）。5 项真实 MySQL 迁移测试因未配置独立测试服务而跳过，不能视为通过；新增迁移已在外键开启的临时 SQLite 库验证其他表数据、活动保留列、索引、外键不变，另校验 MySQL 三条 DROP COLUMN 的离线 SQL 及拒绝假回退。抽屉/骨架屏 20 条原规则的完整声明逐项对照通过；六个相关 WXSS 文件的 Skyline CLI 检查 **0 errors**，`git diff --check` 通过。未执行真实业务库迁移、资源重建、日志清理、生产操作、提交或部署；未进行开发者工具/真机渲染验收。

**R10 白话说明**：这次迁移只删除 `activities` 表里已不再使用的 `signup_deadline`（旧报名截止时间）、`activity_type`（旧活动类型）和 `activity_style_key`（旧样式编号）三列。当前系统用活动开始时间作为报名截止边界，用 `activity_cover_id` 选封面，因此新代码不再读取这三列。执行后这三列里原有的值会永久消失；其他活动字段、索引和外键按临时库测试保持不变。要执行它，需先备份并确认备份可恢复，再停写、迁移和验收；目前只完成迁移代码与临时库验证，没有动真实业务库。

收尾仍待：#35 用户已反馈验收通过；其他前端改动按各条记录确认验收范围。确认后提交/发布本地改动、配置对外 HTTPS 地址并验收线上接口/图片。服务器上的旧资源和日志本轮未清理，不能将仓库删除等同于线上删除。

不再列为待办：已删除项目；已确认保留的联调、分享图补全和 Q88 工具；职责不同的分享图事务；头像空值策略、严格/可转换数值校验等差异实现。`finiteNumber` 在 safeArea 中只接受有限 number，在封面预览中允许 `Number()` 转换，不能直接合并；头像归一化的空值返回值也不同。

#### 本批次之外的原报告待办

以下按报告记录列出，不代表本轮已实时核验生产，也不随本轮授权实施：

- **#3，已本地修复，待部署**：敏感 HTTP 请求日志已关闭并通过测试；用户确认保留现有微信/高德密钥，历史日志清理按 #15 延后。
- **#7，部分完成**：当前受跟踪数据库已移除并加入忽略规则；Git 历史副本是否清理仍待确认，本轮 `git ls-files` 未发现数据库文件。
- **#11，已本地修复，待部署**：非 SQLite 数据库连接强制生产安全校验（显式测试环境除外）；部署时核验实际配置。
- **#13，已明确延后**：运行中 token 失效后的重新登录路径。
- **#14，待确认**：签到定位拒绝授权后的设置引导与重试/刷新。
- **#15，已明确延后**：线上/本地历史日志及产生日志链路的独立版本清理；现有防护不等于清理完成。
- **#37，待运维复核**：生产 logrotate 的 CRLF 故障、部署换行与版本可追踪性；SSH/fail2ban 与 R11 重叠，不重复计数。

#9 流局规则、#12 首页分组已按用户意见保留，不作为未完成整改。#17/#18 等已本地修复但未上线的问题归入发布验收，不重复列为待编码事项。

#### 推荐方案

1. 先删 38.1。#34 修好测试环境后，跑 pytest 做回归。
2. 38.2 按 access log 的结果，分批单独提交。
3. 38.3 做重构时，每一项都先补测试。

---

## 核实后排除的疑点

以下是审查过程中怀疑过、但核实后不成立的问题，列出来供参考，以免重复排查：

| 疑点 | 结论 |
|---|---|
| 报名容量的竞态 | `signup_activity` 先 `lock_activity`（`FOR UPDATE`），之后才检查总容量和子项目容量，在 MySQL 上是串行的。SQLite 会忽略 `FOR UPDATE`，所以只影响测试环境。 |
| 越权修改或删除他人活动 | v2 的 PATCH 和取消走 `_require_activity_manager`，删除仅限 admin，移除参与者要求本人、创建者或 admin，签到仅限本人。唯一的越权问题是问题 6 中坐标对匿名用户可见。 |
| GET 写库导致死锁 | SQLAlchemy 2.0 按主键排序执行 UPDATE，普通读不加锁，不会形成锁环。 |
| v2 创建活动未自动报名创建者 | 有子项目时不自动报名是有意为之，测试 `test_activity_sub_items.py:31` 明确断言了这一点。 |
| v2 代签到只允许 admin | 和前端的 `isAdmin` 判断一致。service 层的 `allow_activity_owner` 参数从来没有被传入，属于死参数，可以删除。 |
| 封面 `cover_id` 路径穿越，以及卡片玻璃效果的 SSRF | `cover_id` 必须和目录中的 ID 完全匹配，路径经过 `relative_to(ASSET_ROOT)` 校验；`_resolve_local_media_path` 和远程拉取的输入都来自硬编码常量，HTTP 请求无法控制。但如果将来这些 URL 改为从数据库读取，就要重新评估。 |
| 头像上传同源执行 HTML/SVG | 文件名是 uuid 加白名单扩展名，响应带 `nosniff`，不成立。 |
| 诊断数据泄露 token | token、password、secret、cookie、authorization 这些键，以及 Bearer 值和 URL query 都会被清洗掉。 |
| 前端 v1→v2 的正则改写 URL | 正则锚定在 base URL 末尾，不会误改路径。 |
| `uploadAvatar` 缺少鉴权头 | 实际上带了 Bearer 头。 |
| iOS 下 `new Date("YYYY-MM-DD HH:mm")` 解析失败 | 所有带字符串参数的 `new Date` 调用都使用 `T` 分隔符，没有这个问题。 |
| 签到半径前后端不一致 | 前后端都用 haversine 公式、半径 1000 m、R=6371 km、GCJ-02 坐标，结果一致。 |
| 按钮重复点击 | 报名、签到、编辑、创建、资料保存都有 submitting 锁或 loading mask。 |
| `application_log_file` 配置从未生效 | 默认路径 `logs/application.log` 正好就是 systemd 的输出路径，在生产环境能正常工作。 |
| 和风天气 Key 泄露 | 和风天气用 Header JWT 传密钥，日志中只记录异常类名，不会泄露。 |

---

## 补充：线上运维问题（核查中新发现）

### 37. [P1] logrotate 配置是 CRLF 换行，从 8 月 11 日起轮转一直失效

- **位置**：服务器上的 `/etc/logrotate.d/dragonreserve-backend`。用 `cat -A` 查看，每一行末尾都有 `^M`。仓库里的 `/Users/liubingyi/Desktop/Project/dragonReserveSystem/小程序本体/backend/deploy/dragonreserve-backend.logrotate` 是 LF 换行，说明是部署过程中被转成了 CRLF。
- **问题**：`journalctl -u logrotate` 每天都报错 `lines must begin with a keyword ... skipping`。`application.log` 从 8 月 10 日到现在一直没有被轮转过，已经到 62 MB。日志里还包含 #3 泄露的密钥。
- **推荐方案**
  1. `sudo sed -i 's/\r$//' /etc/logrotate.d/dragonreserve-backend`，然后用 `sudo logrotate -d /etc/logrotate.d/dragonreserve-backend` 确认语法检查通过。
  2. 旧日志处理按 #15 延后，现有微信/高德密钥按用户决定保留。
  3. 查清服务器整棵代码树为什么变成了 CRLF（`git status` 显示全部文件被修改）。很可能是在 Windows 或某个工具里设置了 `core.autocrlf`，或者通过 SFTP 上传时做了换行转换。之后统一用 `git pull`、rsync 或 CI 部署，并在仓库里加 `.gitattributes`（`* text=auto eol=lf`）。
  4. 加 `PermitRootLogin no`（或者 `prohibit-password`），并启用 fail2ban。

## 建议的修复顺序

1. **今天**
   - 问题 3：本地已抬高 httpx/httpcore 日志级别，待部署；现有微信/高德密钥保留，旧日志清理按 #15 延后。
   - 问题 37：修复 logrotate 配置的 CRLF。
   - 问题 11：部署本地生产安全校验修复，并确认启动校验通过。
   - 问题 1、2：下线 register 和 login 接口，给角色接口加限流，把邀请码换成更长的随机串。
2. **本周**
   - 问题 7：清理仓库里的 db 文件，补充 `.gitignore`。
   - 问题 4：只修正迁移写法即可，已确认生产数据没有受影响。
   - 问题 6：签到坐标的脱敏。
   - 问题 5：删除按昵称匹配报名的逻辑。
3. **本迭代**
   - 问题 8、9、10、18：活动状态和并发相关的一组修复，建议放在同一个 PR 里，配套补测试。
   - 问题 12、13、14、24：前端主流程中会把用户卡住的几个问题。
   - 问题 15：限流和日志隔离。
4. **之后**
   - P2 和 P3 按模块分批处理。
   - 冗余代码（#35、#38）按 L1 → L2 → L3 的顺序清理。

修复开始前，建议先把后端测试跑起来（装好 cairo 和 CairoSVG），作为回归基线。问题 4、9、10、19 都适合先写一个失败的测试，再动手修复。

---

## 小程序复审清理（2026-10-10）

用户在小程序冗余与可读性复审后授权“全部处理”。本节 M1～M14 对应此次复审，不替代前文原报告编号或 R1～R11；生产 SSH/root/fail2ban 仍排除。以下均已本地实现，未提交或部署。

| 编号 | 复审问题 | 实际处理 |
|---|---|---|
| M1 | 旧会话校验响应在注销后重新写入用户 | 会话代次隔离校验、注销和登录；过期响应不再写状态、注销新账号或弹出过期提示。登录中的校验等待同一登录结果，避免重复 `/me` 与新旧 token 混用 |
| M2 | 活动写操作未使在途列表读取失效 | 八类成功写操作统一失效列表缓存和请求代次；旧调用转向当前读取，已完成的新结果也可复用，普通新读取仍请求网络 |
| M3 | 编辑通知与返回详情重复刷新 | 删除重复 `activityUpdated` 通知，以详情 `onShow` 为唯一返回刷新入口；编辑预填后跳过后备 GET；详情增加请求序号、卸载和初始加载失败保护 |
| M4 | 首页滚动触发无消费的几何测量 | 删除滚动绑定及相关无效采样；保留有消费者的可见性、图片加载和诊断测量 |
| M5 | 旧活动类型、背景样式及头像拼贴系统 | 删除旧类型映射、不可达视频/头像拼贴和专用排序；改为当前封面与明确缺图兜底。保留 GIF 图片、玻璃图、参与人头像与抽屉排序 |
| M6 | 首页和详情重复活动适配 | 共用 `enrichSingleActivity(rawItem, myUserId, now)`；首页只追加卡片时间文案。已处理列表缓存改为版本 2，旧形状不再读取，不清除图片磁盘缓存 |
| M7 | 日期选择器旧入口及失真的测试 | 删除无绑定 `onPickerChange`；月末、闰年测试改走真实 `onFlatColumnChange` |
| M8 | 个人页不可达的报名资料模式 | 删除 `forceProfileForSignup` 及专属校验、状态、模板和样式；详情页实际使用的报名资料补全保留 |
| M9 | 封面分类分组头像死链路 | 删除永远为空的分组头像加载/重试；保留作品预览作者头像 |
| M10 | 无消费或重复的视图数据 | 删除详情本地头像预览列表、新建页重复 `columns`、参与者 `availableActions` 和组件行 `actionOpen`；保留共享滑动算法内部状态与动作权限 |
| M11 | 封面预览样式和模板归属错位 | 预览模板、样式归回预览页，删除抽屉对整页预览的包含和重复覆盖；一级参与人抽屉与二级封面/时间抽屉设计不变 |
| M12 | 无消费者的状态和工具 API | 删除 app 的 `userInfo/userDocId/setAuthState`、TabBar 的 `modalMaskOpacity/isAdmin` 及页面残留传值，删除 `applyStartDateTime/buildSafeAreaDiagnostic`；测试保留真实表单和安全区入口覆盖 |
| M13 | 正常诊断日志分类条件重复 | logger 与 outbox 共用 `diagnosticPolicy.isNormalHomeDiagnostic`；正常事件合并写盘、异常立即持久化的行为不变，不删除有效日志链路或历史日志 |
| M14 | 五个无引用导出 SVG | 删除三个带颜色后缀的损坏副本与 `icon-chevron-down.svg`、`icon-chevron-right-600.svg`；有效对应图标与原始设计资产保留 |

### 本轮验证

- 小程序全量：`node --test miniprogram/tests/*.test.js`，**599 passed，0 failed，0 skipped**。
- 新增及更新覆盖：注销/换账号后的迟到响应、登录与校验并发、登录超时、八类活动写操作、同轮 GET/PATCH 完成、晚到旧读取复用新结果、编辑保存/取消返回、详情乱序/卸载、月末/闰年、当前 GIF/玻璃图/参与人头像、安全区与日志分类。
- Skyline CLI：本轮相关 7 个页面/组件 WXSS 加 4 个共享依赖，**0 errors**。初次命令缺少共享弹窗依赖，补齐后重跑通过。
- 样式迁移对照：60 条抽屉规则、27 条预览规则的属性一致；展开后的预览 WXML 一致。`git diff --check` 通过，仅有仓库现存 LF/CRLF 转换提示。
- 未运行微信开发者工具或 iOS/Android 真机渲染验收。静态检查与模拟生命周期测试不等同于原生渲染结论，编辑预填时序及抽屉视觉仍需发布前设备验收。
- 本轮没有改后端、访问生产服务器、执行数据库迁移、删除线上资源或历史日志。之前工作区改动保留，未创建提交或部署。

---

## 线上全部接口流量复核（2026-10-10 18:01:53，北京时间）

- 通过生产 SSH 只读获取当前运行服务的 OpenAPI，逐项匹配应用 `request_completed` 日志，共 64 个方法/路径组合。未调用业务写接口，未删除或部署。
- 固定截止：2026-10-10 18:01:53.532534；日志覆盖：2026-08-10 12:50:01 至 2026-10-10 18:00:01，共 97,292 条完成请求记录。近 7 天从 2026-10-03 18:01:53 起，近 30 天从 2026-09-10 18:01:53 起；计数包含成功和失败状态。
- 计数仅覆盖已写入该应用日志的请求，不包含未到达应用或未形成完成记录的请求；零记录本身不证明接口可以删除。线上实际仍挂载旧接口，与当前本地清理结果不同。

### 关键结论

| 功能或接口 | 判断 |
|---|---|
| 日历数据：v2 `GET /activities/me/signed-up` | 近 7 天 280、近 30 天 1,621。用户已决定废弃日历，本地已删除日历及预取；线上旧首页仍预取此接口，流量不能证明有人主动使用日历。新版前端发布后再核实调用消失，作为后端删除条件 |
| 独立分享图：v2 `GET /activities/{activity_id}/share-preview` | 近 7 天 0、近 30 天 1,486，最后 9 月 25 日。线上旧详情仍存在调用链，本地新版从活动响应取图；核对新版发布后的流量再下线 |
| 删除整个活动：v1/v2 `DELETE /activities/{activity_id}` | 两个版本在全部可读日志中均为 0；线上操作脚本与定时任务未发现调用，列为清理候选。移除参与者、撤销签到是其他 DELETE 接口，有流量 |
| 旧 v1 活动组 | 大多数已无近期流量，但 v1 活动列表近 7 天仍有 2 次成功请求（10 月 10 日 00:00:41），来源未确认，不能称整组零流量。其他旧活动读取接口最后主要在 9 月 13 日，独立分享图最后在 9 月 25 日 |
| 旧账号密码登录、历史统计、天气、单条诊断、client-config | 近 7 天均 0；各自完整记录见下表。密码登录/注册全部可读日志为 0；client-config 近 30 天仍有 9 次。单条诊断与仍在使用的批量诊断分别判断；日志整体清理按用户决定另起版本处理 |
| 用户资料、角色、管理员签到 | 部分近 7 天为 0，但近 30 天有请求，属于低频正常操作，不能据此删除 |
| 桌游录入预览重试、库存单条详情 | 全部可读日志为 0；当前分支存在明确调用：重试由用户对失败预览主动操作触发，单条库存详情仅在版本更新冲突（409）后读取以刷新数据。属于低频恢复路径，不能因零流量删除 |

### 64 个接口明细

以下路径均为当前线上 OpenAPI 路径；参数使用模板展示，不输出实际用户或活动 ID。“调用位置”按当前合并分支核对；线上旧版残留、本地已删除的调用会明确标注。

| 方法 | 路径 | 近 7 天 | 近 30 天 | 全部可读日志 | 最后请求（北京时间） | 调用位置 | 触发场景 | 功能说明 |
|---|---|---:|---:|---:|---|---|---|---|
| GET | `/api/v1/activities` | 2 | 16 | 3,541 | 2026-10-10 00:00:41 | 当前分支：无旧版调用；线上 v1 残留 | 旧版首页加载活动列表 | 读取活动列表；当前首页通过 v2 同路径接口读取。 |
| POST | `/api/v1/activities` | 0 | 0 | 12 | 2026-09-07 14:22:03 | 当前分支：无 v1 调用；线上旧版接口 | 旧版用户提交新建活动表单 | 创建活动；当前新建页通过 v2 同路径接口提交。 |
| GET | `/api/v1/activities/me/signed-up` | 0 | 10 | 2,046 | 2026-09-13 23:50:24 | 当前分支：日历及预取已删除；线上 v1 残留 | 旧版日历或首页预取报名列表 | 读取当前用户报名活动；流量不等于用户主动打开日历。 |
| GET | `/api/v1/activities/mine` | 0 | 0 | 0 | 无记录 | 当前分支：无 v1 调用；线上旧版接口 | 旧版读取本人创建活动列表 | 读取当前用户创建的活动。 |
| GET | `/api/v1/activities/style-signature` | 0 | 8 | 1,797 | 2026-09-13 23:50:23 | 当前分支：无 v1 调用；线上旧版接口 | 旧版客户端校验活动样式缓存 | 返回活动样式签名。 |
| GET | `/api/v1/activities/type-styles` | 0 | 3 | 2,215 | 2026-09-13 23:40:00 | 当前分支：无调用；现行封面走 activity-covers | 旧版新建/编辑页载入类型样式 | 读取旧活动类型的封面样式配置。 |
| GET | `/api/v1/activities/type-styles/{activity_type}/{style_key}/glass-image` | 0 | 3 | 156 | 2026-09-13 23:40:04 | 当前分支：无调用；现行封面走 activity-covers | 旧版封面加载毛玻璃图 | 读取旧样式对应毛玻璃图片。 |
| DELETE | `/api/v1/activities/{activity_id}` | 0 | 0 | 0 | 无记录 | 当前分支：无 v1 调用；线上旧版接口 | 旧版授权管理端删除整场活动 | 删除整场活动；零流量不单独证明可删除。 |
| GET | `/api/v1/activities/{activity_id}` | 0 | 0 | 1,854 | 2026-09-08 10:43:04 | 当前分支：无 v1 调用；线上旧版接口 | 旧版从列表或分享打开活动详情 | 读取单个活动详情。 |
| PATCH | `/api/v1/activities/{activity_id}` | 0 | 0 | 18 | 2026-09-06 04:52:38 | 当前分支：无 v1 调用；线上旧版接口 | 旧版活动创建者保存编辑 | 更新活动资料。 |
| POST | `/api/v1/activities/{activity_id}/checkin` | 0 | 0 | 28 | 2026-08-29 15:14:23 | 当前分支：无 v1 调用；线上旧版接口 | 旧版用户提交签到 | 登记活动签到。 |
| DELETE | `/api/v1/activities/{activity_id}/participants/{participant_id}` | 0 | 0 | 23 | 2026-09-07 14:43:25 | 当前分支：无 v1 调用；线上旧版接口 | 旧版管理员移除参与者 | 删除指定参与者的活动报名。 |
| DELETE | `/api/v1/activities/{activity_id}/participants/{participant_id}/admin-checkin` | 0 | 0 | 3 | 2026-08-22 18:24:49 | 当前分支：无 v1 调用；线上旧版接口 | 旧版管理员撤销补签 | 撤销指定参与者的管理员签到。 |
| POST | `/api/v1/activities/{activity_id}/participants/{participant_id}/admin-checkin` | 0 | 0 | 7 | 2026-08-30 12:33:35 | 当前分支：无 v1 调用；线上旧版接口 | 旧版管理员补签参与者 | 创建管理员签到记录。 |
| GET | `/api/v1/activities/{activity_id}/share-preview` | 0 | 57 | 1,898 | 2026-09-25 15:56:28 | 当前分支：无独立请求；线上旧详情仍可能调用 | 旧版活动详情准备分享卡片 | 读取活动分享预览图；当前详情响应直接带分享图地址。 |
| DELETE | `/api/v1/activities/{activity_id}/signup` | 0 | 0 | 0 | 无记录 | 当前分支：无 v1 调用；线上旧版接口 | 旧版用户取消报名 | 删除活动报名。 |
| POST | `/api/v1/activities/{activity_id}/signup` | 0 | 0 | 77 | 2026-09-07 19:38:32 | 当前分支：无 v1 调用；线上旧版接口 | 旧版用户报名活动 | 创建活动报名。 |
| POST | `/api/v1/auth/login` | 0 | 0 | 0 | 无记录 | 当前分支：无调用（仅保留微信登录） | 旧版账号密码登录 | 账号密码登录接口。 |
| POST | `/api/v1/auth/register` | 0 | 0 | 0 | 无记录 | 当前分支：无调用（仅保留微信登录） | 旧版账号注册 | 账号密码注册接口。 |
| POST | `/api/v1/auth/wechat-login` | 22 | 87 | 262 | 2026-10-10 15:43:27 | miniprogram/services/auth.js:32 | 用户通过微信授权登录或重新登录 | 使用 wx.login code 换取应用访问令牌。 |
| GET | `/api/v1/bgg/search` | 80 | 84 | 84 | 2026-10-10 17:13:36 | miniprogram/pages/boardgame_intake/controller.js:68 | 录入页搜索关键词或翻页 | 代理搜索 BGG 桌游目录。 |
| POST | `/api/v1/boardgame-intake-previews` | 62 | 62 | 62 | 2026-10-10 17:13:37 | miniprogram/pages/boardgame_intake/controller.js:81 | 选择候选并开始导入解析 | 创建异步桌游资料预览任务。 |
| GET | `/api/v1/boardgame-intake-previews/{preview_id}` | 86 | 86 | 86 | 2026-10-10 17:13:39 | miniprogram/pages/boardgame_intake/controller.js:109 | 录入处理中轮询预览状态 | 读取解析任务状态及结果。 |
| GET | `/api/v1/boardgame-intake-previews/{preview_id}/items/{item_id}` | 116 | 116 | 116 | 2026-10-10 17:13:39 | miniprogram/pages/boardgame_intake/controller.js:153 | 查看导入候选详情 | 读取候选资料、版本和拥有者信息。 |
| POST | `/api/v1/boardgame-intake-previews/{preview_id}/retry` | 0 | 0 | 0 | 无记录 | miniprogram/pages/boardgame_intake/controller.js:116 | 用户对失败的预览主动点击重试 | 按预览版本重新排队处理，属于低频异常恢复入口。 |
| POST | `/api/v1/boardgame-intakes` | 29 | 32 | 32 | 2026-10-10 17:13:43 | miniprogram/pages/boardgame_intake/controller.js:231 | 用户确认并提交导入结果 | 保存桌游资料及用户持有版本。 |
| GET | `/api/v1/boardgame-inventory` | 90 | 90 | 90 | 2026-10-10 17:10:12 | miniprogram/pages/boardgame_detail/boardgame_detail.js:62 | 打开详情加载持有版本或翻页 | 分页读取该桌游的用户持有版本。 |
| GET | `/api/v1/boardgame-inventory/{inventory_id}` | 0 | 0 | 0 | 无记录 | miniprogram/pages/boardgame_detail/boardgame_detail.js:107 | 版本更新冲突（409）后刷新最新记录 | 读取单条库存记录用于冲突恢复。 |
| PUT | `/api/v1/boardgame-inventory/{inventory_id}/version` | 3 | 3 | 3 | 2026-10-10 00:44:23 | miniprogram/pages/boardgame_detail/boardgame_detail.js:99 | 用户修改自己持有的桌游版本 | 更新库存记录关联的版本。 |
| GET | `/api/v1/boardgames` | 304 | 324 | 324 | 2026-10-10 17:59:52 | miniprogram/pages/boardgame_library/boardgame_library.js:126 | 打开桌游库、筛选或翻页 | 查询桌游目录列表。 |
| GET | `/api/v1/boardgames/recent-arrivals` | 202 | 202 | 202 | 2026-10-10 17:59:54 | miniprogram/pages/boardgame_library/boardgame_library.js:77 | 打开桌游库首页 | 读取最近新增桌游。 |
| GET | `/api/v1/boardgames/{game_id}` | 90 | 90 | 90 | 2026-10-10 17:10:12 | miniprogram/pages/boardgame_detail/boardgame_detail.js:37 | 打开桌游详情 | 读取桌游基础资料。 |
| GET | `/api/v1/boardgames/{game_id}/images` | 87 | 87 | 87 | 2026-10-10 17:10:12 | miniprogram/pages/boardgame_detail/boardgame_detail.js:52 | 打开详情并加载图片列表 | 读取桌游图片资源。 |
| GET | `/api/v1/client-config` | 0 | 9 | 1,797 | 2026-09-27 09:35:08 | 当前分支：无调用 | 旧版小程序启动时拉取远端配置 | 下发客户端配置；当前配置由本地版本管理。 |
| POST | `/api/v1/diagnostics/anonymous-client-logs/batch` | 30 | 279 | 339 | 2026-10-10 15:43:13 | miniprogram/services/diagnosticOutbox.js:114 | 未登录客户端 outbox 批量发送诊断事件 | 接收匿名客户端诊断日志批次。 |
| GET | `/api/v1/diagnostics/client-logs` | 0 | 0 | 2 | 2026-08-26 23:52:49 | 当前分支：无小程序调用 | 旧诊断工具查询日志 | 查询已存储的客户端诊断日志。 |
| POST | `/api/v1/diagnostics/client-logs` | 0 | 0 | 14 | 2026-08-21 23:23:14 | 当前分支：无单条上传调用；使用 batch outbox | 旧版客户端逐条上传诊断日志 | 单条日志写入接口；当前客户端使用批量上报。 |
| POST | `/api/v1/diagnostics/client-logs/batch` | 837 | 4,396 | 10,900 | 2026-10-10 17:59:55 | miniprogram/services/diagnosticOutbox.js:114 | 登录客户端 outbox 批量发送诊断事件 | 接收已登录客户端诊断日志批次。 |
| GET | `/api/v1/health` | 1,013 | 4,351 | 8,906 | 2026-10-10 18:00:01 | 外部服务探测；非小程序业务页 | 探测后端是否可用 | 返回服务健康状态；请求量包含监控/探测，不代表用户访问。 |
| GET | `/api/v1/stats/history` | 0 | 0 | 76 | 2026-08-21 23:23:14 | 当前分支：无调用 | 旧统计页面查看历史趋势 | 读取历史统计序列。 |
| GET | `/api/v1/stats/history-summary` | 0 | 0 | 16 | 2026-08-19 15:07:30 | 当前分支：无调用 | 旧统计页面读取历史汇总 | 读取历史统计摘要。 |
| GET | `/api/v1/stats/ranking/activity` | 59 | 212 | 956 | 2026-10-10 17:08:18 | miniprogram/services/stats.js:10；排行榜页 | 进入或刷新活动排行榜 | 读取活动排行数据。 |
| GET | `/api/v1/stats/ranking/pigeon` | 49 | 186 | 718 | 2026-10-10 17:08:18 | miniprogram/services/stats.js:22；排行榜页 | 进入或刷新鸽子排行榜 | 读取鸽子排行数据。 |
| GET | `/api/v1/users/me` | 355 | 1,768 | 4,401 | 2026-10-10 17:59:49 | miniprogram/services/user.js:5；登录后及 app 会话校验 | 登录完成、应用启动校验或刷新个人信息 | 读取当前用户资料及角色。 |
| PATCH | `/api/v1/users/me` | 0 | 1 | 6 | 2026-09-11 12:30:34 | miniprogram/services/user.js:9；个人页/活动资料补全 | 用户保存昵称等资料 | 更新当前用户资料。 |
| POST | `/api/v1/users/me/avatar` | 0 | 1 | 5 | 2026-09-11 12:30:34 | miniprogram/services/user.js:28；个人页/活动资料补全 | 用户选择并确认头像 | 上传头像并更新头像地址。 |
| DELETE | `/api/v1/users/me/role` | 0 | 4 | 28 | 2026-09-29 18:51:17 | miniprogram/services/user.js:84 | 用户主动退出角色 | 清除当前用户角色。 |
| POST | `/api/v1/users/me/role` | 0 | 7 | 52 | 2026-09-29 18:51:21 | miniprogram/services/user.js:76 | 用户提交邀请码加入角色 | 设置当前用户角色。 |
| GET | `/api/v1/weather/activity` | 0 | 0 | 864 | 2026-09-04 18:52:29 | 当前分支：无单独请求；详情响应含天气 | 旧版活动详情单独获取天气 | 读取活动天气；当前天气在活动详情响应中。 |
| GET | `/api/v2/activities` | 610 | 3,317 | 4,745 | 2026-10-10 17:59:49 | miniprogram/services/activity.js:24；首页活动列表 | 进入或刷新首页活动列表 | 读取活动列表。 |
| POST | `/api/v2/activities` | 4 | 18 | 22 | 2026-10-10 11:21:27 | miniprogram/services/activity.js:50；新建活动页 | 提交新建活动表单 | 创建活动。 |
| GET | `/api/v2/activities/me/signed-up` | 280 | 1,621 | 2,261 | 2026-10-10 17:59:50 | 当前分支：日历和预取已删除；仅线上旧版残留 | 线上旧首页预取报名列表，不等于用户打开日历 | 读取当前用户已报名活动。 |
| DELETE | `/api/v2/activities/{activity_id}` | 0 | 0 | 0 | 无记录 | 当前分支：未发现前端调用 | 若管理端获授权删除整场活动 | 删除整场活动；零流量仍需结合产品需求判断。 |
| GET | `/api/v2/activities/{activity_id}` | 383 | 2,374 | 3,187 | 2026-10-10 17:47:56 | miniprogram/services/activity.js:45；详情/编辑页 | 打开或刷新活动详情、编辑页预填 | 读取活动详情及关联展示信息。 |
| PATCH | `/api/v2/activities/{activity_id}` | 3 | 37 | 51 | 2026-10-09 15:11:30 | miniprogram/services/activity.js:61；编辑页 | 活动创建者保存修改 | 更新活动资料。 |
| POST | `/api/v2/activities/{activity_id}/cancel` | 2 | 14 | 14 | 2026-10-08 15:28:08 | miniprogram/services/activity.js:83；详情/编辑页 | 用户主动取消活动 | 取消活动并更新状态。 |
| POST | `/api/v2/activities/{activity_id}/checkin` | 6 | 69 | 69 | 2026-10-05 16:37:12 | miniprogram/services/activity.js:103；签到地图/详情 | 用户完成签到 | 登记活动签到信息。 |
| DELETE | `/api/v2/activities/{activity_id}/participants/{participant_id}` | 6 | 25 | 51 | 2026-10-10 13:44:45 | miniprogram/services/activity.js:93；活动管理 | 创建者/管理员移除参与者 | 移除指定参与者报名。 |
| DELETE | `/api/v2/activities/{activity_id}/participants/{participant_id}/admin-checkin` | 0 | 3 | 3 | 2026-09-30 23:36:34 | miniprogram/services/activity.js:123；参与者管理 | 管理员撤销补签 | 撤销指定参与者管理员签到。 |
| POST | `/api/v2/activities/{activity_id}/participants/{participant_id}/admin-checkin` | 0 | 7 | 15 | 2026-09-26 18:05:49 | miniprogram/services/activity.js:113；参与者管理 | 管理员补签参与者 | 创建管理员签到记录。 |
| GET | `/api/v2/activities/{activity_id}/share-preview` | 0 | 1,486 | 2,275 | 2026-09-25 18:11:56 | 当前分支：无独立请求；新版详情使用响应字段 | 线上旧版详情准备分享内容 | 旧接口单独读取分享图；新版发布后再核实线上流量。 |
| POST | `/api/v2/activities/{activity_id}/signup` | 16 | 84 | 144 | 2026-10-10 13:44:48 | miniprogram/services/activity.js:72；活动详情 | 用户提交报名 | 创建报名及子项目选择记录。 |
| GET | `/api/v2/activity-covers` | 13 | 300 | 341 | 2026-10-10 11:19:50 | miniprogram/services/activity.js:40；封面选择组件 | 新建/编辑活动时打开封面选择器 | 读取可供活动选择的封面目录。 |
| GET | `/api/v2/activity-covers/{cover_id}/glass-image` | 12 | 39 | 1,126 | 2026-10-10 14:55:56 | miniprogram/utils/activityEnrich.js:92；活动卡图片加载器使用返回的 URL | 大卡活动封面加载毛玻璃图时 | 返回预渲染的大卡毛玻璃图片。 |

## #3、#11、#35 本轮核验（2026-10-10）

- #3/#11：本地修复已完成，尚未部署；用户确认保留现有微信 AppSecret 与高德 Key，历史日志清理按 #15 延后。
- #35：代码清理已完成；用户于 2026-10-10 反馈测试无问题，记为用户验收通过，待发布。未新增批量删除。
- 后端全量：268 passed，0 failed，73 warnings；小程序全量：597 passed，4 skipped，0 failed。后端使用 DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib 加载本机 Cairo；警告主要为既有依赖与 utcnow 弃用提示。
- R10：2026-10-10 已通过 SSH 只读核验，可连接服务器且 Alembic 可用。真实 MySQL 当前版本为 `20261007_0021`（线上脚本 `20261007_0021_boardgame_library.py`）；本地删列迁移 `20261010_0022` 依赖 `20261009_0021`，迁移链与线上不一致，且服务器尚无本地 R10 脚本。执行前须核对并对齐迁移链、配套新版后端、备份恢复验证，再安排迁移。未执行真实库迁移、提交或部署，保留工作区已有修改。

## 全量冗余代码与功能复查（2026-10-10）

本轮只做静态代码、引用关系、资源清单和本地存储检查，未删除文件、未修改业务代码、未访问线上流量数据。结论中的“可精简”表示已经有本地证据支持，执行前仍需按项目规则逐项确认删除范围。

### A. 已确认没有当前消费者、可以列入清理

| 编号 | 位置 | 发现 | 建议 | 状态 |
|---|---|---|---|---|
| N1 | `backend/app/api/participant_privacy.py` | `filter_participant_locations`、相关 Protocol、TypeVar 和字段常量只有定义，没有导入或调用。该模块仍保留旧的签到位置可见性限制，与当前“所有用户都能看到签到位置”的决定不一致。 | 删除整个未使用模块，不新增权限过滤。 | 待执行 |
| N2 | `backend/app/core/security.py`、`backend/requirements.txt` | `verify_password` 没有生产调用；`get_password_hash` 仅被测试和测试数据脚本使用。旧密码依赖 `passlib[bcrypt]`、`bcrypt` 与当前仅保留微信登录的链路无关。 | 删除生产密码校验链路和无效依赖；测试 fixture、测试数据改为 `password_hash=None`。`users.username/password_hash` 数据库历史字段另行评估，不在这里直接删列。 | 待执行 |
| N3 | `miniprogram/pages/activity_list/activity_list.wxss` | 首页残留旧弹层、旧表单、旧按钮、旧元信息和羽毛球/桌游/其他类型背景样式；当前首页 WXML/JS 没有对应 class 使用。 | 删除这组首页死样式和无使用的动画；详情页 `.navbar-title`、共享样式 `.dragon-watermark--fixed` 也没有消费者，可一起精简。保留其他页面同名且仍在使用的样式，以及当前动态拼接的 class。 | 待执行 |
| N4 | `miniprogram/pages/history/history.js`、`miniprogram/pages/chwazi/chwazi.js`、`miniprogram/components/activity-subitems-editor/index.js` | `history.onAvatarError` 没有 WXML 绑定；`chunkHeatmap` 返回的 `durationHours` 和排行榜视图字段 `riskDescription` 没有消费者；chwazi 的 `innerLeftRpx/innerTopRpx` 及专属常量没有生产消费者；子项目编辑器的两个删除动画时长常量只有测试导出，运行逻辑使用 WXSS 中的固定时长。 | 删除死回调和无消费者字段；chwazi 删除对应无效测量输出及常量；子项目编辑器同步清理无效常量和仅验证它们的测试断言，保留真实动画行为。 | 待执行 |
| N5 | `miniprogram/images/icon-participants-more.png`、`backend/app/assets/activity-covers/categories/派对/avatar.jpg` | 两个图片文件均未发现代码、清单、测试或原型引用。有效封面资源共 197 张，其中 196 张被 catalog/manifest 引用且全部存在；不能把其他源图、Q88 交付图或原始设计素材误判为冗余。 | 删除前再做一次当前分支引用确认后删除这两张文件。 | 待执行 |
| N6 | `backend/app/services/activity_share_preview_service.py:170` | `discard_prepared_preview(file_name, created)` 是空操作，唯一调用来自分享图补全脚本的异常路径；当前行为是失败后保留文件，由后续保留期清理，避免并发引用竞争。 | 删除空函数、调用和无效参数传递；保留补全脚本及保留期清理策略，不恢复失败即删除文件。 | 待执行 |
| N7 | `backend/app/services/activity_card_glass_service.py:143` | 毛玻璃源图加载器仍包含 `httpx` 远程 URL 分支，但当前唯一生产调用链先取得并校验本地封面路径，远程分支没有生产输入。 | 按本地封面文件简化加载逻辑，保留预制毛玻璃图读取和本地生成兜底。 | 待执行 |

### B. 当前前端没有调用，但不能直接判定为线上无用

以下接口目前未在小程序 JS 中找到调用，但可能被后台、脚本、历史客户端或外部调用；本轮没有线上访问日志，因此不执行删除：

- `backend/app/api/v2/activities.py:138`：`GET /api/v2/activities/me/signed-up`，旧日历预热删除后没有当前前端调用。
- `backend/app/api/v2/activities.py:207`：`DELETE /api/v2/activities/{activity_id}`，当前前端没有删除活动入口，但后端管理能力和测试仍覆盖。
- `backend/app/api/v2/activities.py:252`：`GET /api/v2/activities/{activity_id}/share-preview`，当前前端直接使用活动响应中的 `share_preview_image_url`，没有单独请求该接口。

处理这三项前，需要先查线上访问记录并确认后台、运维脚本和历史版本没有依赖。不能用之前“v1 活动接口近 7 天无流量”的结论代替 v2 流量核验。

### C. 兼容残留和本地产物

- `backend/app/schemas/auth.py` 的 `WeChatProfilePayload` 及登录请求 `profile` 字段仍是旧客户端兼容字段；服务端忽略它，当前前端只发送 `code`。可在确认不再需要旧客户端兼容后收缩模型，但不是当前必须删除的功能。
- 项目根 `storage/` 和 `backend/storage/` 共 672 个 PNG，约 236 MiB，其中分享图 650 张、头像 22 张。22 张头像已经确认是测试上传产生的 12 字节假 PNG；分享图集中在活动 ID 1、2，整体疑似本地测试产物，但还没有逐张证明不存在业务用途。建议先确认本地配置和数据库引用，再清理，并把测试默认媒体目录统一到临时目录，避免测试继续增长。
- `backend/logs/client-diagnostics.log` 仍属于 #15 的延后范围，本轮不清理历史日志或产生日志逻辑。

### 本轮静态核验结果

- 小程序生产 JS 共 52 个文件，全部可从 app 入口、页面声明、组件或自定义 TabBar 到达；未发现缺失 `require`。
- 10 个页面和 5 个声明组件的 WXML 事件处理函数均能在对应 JS 中找到；未发现可直接判定为整页或整组件死模块的对象。
- 后端 app、scripts、tests、ops、migration_tests 共 98 个 Python 文件全部通过 AST 解析；对至少 6 行的函数进行 AST 函数体对照，未发现完全相同的实现。
- 封面目录中的有效资源引用已核对完整；只确认上述 1 张分类头像和 1 张前端图标没有引用。
- 本轮没有运行全量测试，因为没有改业务代码；静态检查不能替代真机渲染验收，也不能替代线上接口流量确认。

## 线上接口流量复核（2026-10-10）

本次通过 SSH 对生产实例 `ubuntu@124.156.228.148` 做只读核验，没有修改服务器、数据库、日志或部署配置。生产 Caddy 将站点除 `/static/*` 和 `/test-api/*` 外的请求反向代理到后端 `127.0.0.1:8000`；后端 `RequestContextMiddleware` 会为每个进入应用的请求写入 `request_completed`。因此，以下结果来自应用实际收到的请求，不是只看当前小程序源码的推测。

核验日志：`/home/ubuntu/apps/dragonReserveSystem/backend/logs/application.log`。日志从 **2026-08-10 12:50:01** 连续覆盖到 **2026-10-10 18:00:01**，共解析 **97,292** 条 `request_completed`，解析失败 0 条，覆盖期间每天都有记录。统计窗口按北京时间计算：近 7 天为 **2026-10-03 18:01:53 至 2026-10-10 18:01:53**，近 30 天为 **2026-09-10 18:01:53 至 2026-10-10 18:01:53**。

| 接口 | 全部日志窗口 | 近 30 天 | 近 7 天 | 最近请求 | 结论 |
|---|---:|---:|---:|---|---|
| `GET /api/v2/activities/me/signed-up` | 2,261 次，全部 200 | 1,621 次 | 280 次 | 2026-10-10 17:59:50 | **仍在使用，保留**。当前线上前端的日历预热也仍调用它。 |
| `GET /api/v2/activities/{id}/share-preview` | 2,275 次，全部 200 | 1,486 次 | 0 次 | 2026-09-25 18:11:56 | **不能确认废弃，保留**。近 30 天仍有真实流量，当前线上详情页仍保留调用链；近 7 天无流量不足以证明可以删除。 |
| `DELETE /api/v2/activities/{id}`（删除活动根路由） | 0 次 | 0 次 | 0 次 | 无 | **当前线上无流量，可列为下线候选**。当前小程序没有删除活动入口，生产应用日志覆盖期间也没有请求。 |

补充核验：`DELETE /api/v2/activities/{activity_id}/participants/{participant_id}` 及管理员签到相关 DELETE 子接口仍有线上请求，不能因为删除活动根路由没有流量而删除整个活动 DELETE 路由组。当前日志中 v2 参与者相关 DELETE 有 **54 次**，全部是子路径。

### 流量复核后的调整

- **N/A 原接口清单中的“我的已报名活动”**：从“待流量核验”调整为“确认仍在使用”，不删除。
- **N/A 原接口清单中的“单独获取分享图”**：从“待流量核验”调整为“近 7 天无流量、近 30 天仍有流量，继续保留并观察”，不删除。当前线上源码仍有 `activity_detail.js -> getActivitySharePreview()` 调用链。
- **N/A 原接口清单中的“删除活动”**：确认在当前生产日志覆盖窗口内无请求，可进入下线处理，但删除前仍需按代码清理范围移除路由、服务引用和对应测试；不要删除仍有流量的参与者删除接口。

这次核验能证明“当前生产实例在日志覆盖窗口内是否收到请求”。它不能证明未来永远不会有人工脚本或旧客户端调用，因此删除“删除活动”根路由后，应同步确认没有保留中的后台入口或外部客户端；目前仓库和生产部署目录中也没有找到该根路由的前端调用。
