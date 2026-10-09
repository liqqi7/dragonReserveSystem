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
- **#3 维持 P0，并且需要立即轮换密钥**：先在微信公众平台重置 AppSecret，再到高德控制台重置 Key，然后清理或销毁 `application.log`。
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

| # | 级别 | 模块 | 问题 | 结论 / 处理状态（更新于 2026-10-09） |
|---|---|---|---|---|
| 3 | P0 | 后端/安全 | httpx 的 INFO 日志把微信 `secret`、高德 `key` 原样写进 application.log | 待确认 |
| 7 | P1 | 仓库/隐私 | 公开 GitHub 仓库跟踪含真实 openid 的数据库，另一份数据库含用户资料/密码哈希 | 部分处理：增加数据库忽略规则；已跟踪文件和历史未清理 |
| 11 | P1 | 后端/安全 | 生产环境可能静默使用开发 JWT 密钥 | 待确认 |
| 12 | P1 | 前端 | 首页分组漏掉「进行中（未报名）」和「已取消」活动 | 不处理：按用户确认属刻意设计 |
| 13 | P1 | 前端 | 使用过程中 token 失效后没有重新登录路径 | 后续处理：token 失效后的重新登录 |
| 14 | P1 | 前端 | 签到页拒绝定位授权后无引导、无重试 | 待确认 |
| 15 | P1 | 后端/运维 | 诊断日志接口可被匿名或注册用户刷爆磁盘 | 后续处理：单独版本清理历史日志及日志生成逻辑；日志盘点见详细说明 |
| 35 | P3 | 前端 | 不可达页面/组件、死代码和无用资源 | 部分已处理：删除日历/旧表单弹层、死代码及 46 个图片；复用适配工具、导航卡片只传 ID；其余保留项见详情 |
| 36 | P3 | 仓库 | Finder 重复文件、README 服务器信息 | 部分已处理：删除空重复目录与重复文件、README 地址改占位符；媒体域名集中配置及线上 SSH 配置保留 |
| 38 | P3 | 后端 | 冗余代码及 v1 遗留清理 | 部分已处理：38.1 已清理；删除近 30 天无请求的旧历史统计、天气及单条诊断接口和专属依赖；旧活动/client-config、脚本及跨模块重构保留 |

---

## P0：立即处理

### 3. 微信 AppSecret 和高德 Key 被写进应用日志

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
  2. 上线后在服务器执行 `grep -c 'secret=' logs/application.log*`，确认历史日志是否已经包含密钥。如果有，**在微信公众平台重置 AppSecret**，同时轮换高德 Key，并清理或加密归档旧日志。
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

**处理结论（2026-10-09）：部分已处理。**
- 已删除：日历页及注册、日历预取、专用缓存与测试；旧 `activity-form-sheet` 组件及首页/详情页的弹层状态、回调和模板。独立新建页 `activity_create`、编辑页 `activity_edit` 及现有导航保留。
- 已清理：首页无 UI 的搜索/筛选、无调用方法、个人页不可达分支、详情/排行榜等仅写不读的状态；未使用的服务方法、缓存文件和工具导出。日志模块仅收窄无外部调用的导出，没有移除日志链路。
- 已删除 46 个无运行时引用图片（含日历专用图片），保留 `app.json` Tab 图标；清理首页及相关页面/组件的无引用 WXSS，保留动态使用的类。
- 首页改为导入共享 `activityEnrich` 的基础适配与样式函数；保留首页专属展示加工及按当前用户 ID 重算报名状态。导航卡片改为只传 `data-id`，据此进入详情页；其他卡片媒体事件所需的 dataset 保留。
- **保留项**：新建页内部的编辑兼容模式、跨页面样式/小工具函数的进一步合并，以及 `_commitHomeList` 的 JSON 比较。它们不属于已完成的安全删除范围；未把完整首页展示流程强行替换为详情页加工流程。

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
- `activity_create` 页面里的编辑模式没有被使用（编辑走的是 `activity_edit` 页面）。

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
- **保留项**：媒体域名仍位于前端共享适配工具和后端 v1 样式配置中，尚未统一到环境配置；生产 SSH/fail2ban 配置未核查或修改。本条不能标记为全部完成。

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

**处理结论（2026-10-09）：部分已处理。**
- **38.1 已处理**：删除无引用的 `qweather_service.py`、`schemas/common.py`，清理未使用/重复导入、无调用配置项及其 `.env.example` 项；移除两个管理员签到函数的死参数、统计中的「已删除」状态和 v2 多余空值分支。
- 原 `_sync_activity_status` 中的重复条件现位于 `_calculate_activity_status`，已按等价逻辑简化，并覆盖开始/结束边界、2/3 人边界及终态不变的测试；没有新增状态同步机制或改变流局规则。移除参与者接口仍实际使用 `allow_activity_owner`，因此保留该函数的参数。
- **38.2 部分已处理**：按用户授权删除近 30 天无请求、当前前端无引用的 `GET /api/v1/stats/history`、`GET /api/v1/stats/history-summary`、`GET /api/v1/weather/activity`、`POST /api/v1/diagnostics/client-logs`。同时删除天气路由文件、旧统计专属查询函数/schema、按位置和日期查询天气的兼容函数；批量诊断仍使用 `ClientDiagnosticLogRequest`，保留该数据结构。
- **38.2 保留项**：活动与 client-config 近 30 天有成功调用，本轮保留；signup_deadline 兼容链路、一次性脚本及 manifest 使用范围尚未确认。批量诊断、管理员读取日志等现行功能保持可用；#15 整体日志清理仍为后续独立版本。
- **本次验收**：后端 `pytest backend/tests -q`，**210 passed，0 failed，84 warnings**。同步旧接口兼容测试，核验已删接口不在 OpenAPI 且 HTTP 请求返回 404（单条诊断 POST 返回 405，同路径 GET 保留）；现行排行榜、天气快照/刷新、批量诊断与其余后端用例均通过。引用检索及 `git diff --check` 通过。本次仅本地修改，未部署。
- **38.3 保留**：跨模块状态/时间/媒体 URL/校验与分享图文件名正则等重构没有在本轮统一实施，不能将原清单的疑点当作已修复。之前已完成的时区与分享图改造不等于这整项去重已完成。

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

**2026-10-09 复核纠正**：仅当前活动服务显式使用 v2；`request.js` 只在传入 `apiVersion` 时替换基础 URL，登录、用户、排行榜等仍使用 v1。上方生产应用请求日志显示：以下部分旧接口近 7 天无记录，但活动、client-config 近 30 天仍有调用；不能据此删除整个 `/api/v1`，也不能将短窗口零记录视作永久无人依赖。旧客户端及外部调用方仍需单独确认。

- **v1 活动路由**：`app/api/v1/activities.py`（299 行）。连同以下内容一起删除，合计约 920 行，并同步处理 `tests/test_v1_compatibility.py`：
  - `create_activity`、`cancel_signup`、`get_activity_style_signature`、`_resolve_style_key_implicit`
  - `update_activity` 中处理 type/style 的分支
  - `activity_type_style_service.py`（272 行）
  - card_glass 的 `get_or_create`
  - `schemas/activity.py` 中 v1 专用的类（约 170 行）
- **已处理：v1 的 `/stats/history` 和 `history-summary`**，连同 `get_pigeon_stats`、`get_ended_activity_count` 以及对应 schema 已删除。
- **已处理：v1 的 `/weather/activity`**，路由文件、注册和独占快照查询函数已删除。
- **`/client-config`**（`client_cache_version`）
- **已处理：单条上报的 `POST /diagnostics/client-logs`** 已删除；批量接口和管理员 GET 查询保留。
- **已废弃的 `signup_deadline` 链路**
- **一次性脚本**
  - `fetch_bgg_top50_dataset.py`（492 行）：建议移到 `research/`。
  - `build_activity_cover_assets.py`、`backfill_activity_share_previews.py`、`build_cover_webp.py`，以及 webp/q92 的 manifest。
  - `start_backend_test.sh`

#### 38.3 重复实现（L3，预计可减少 120-160 行）

- 获取当前时间和时区有 4 套写法：`ZoneInfo`、`_app_now`、`app_now`、`_now_local_naive`、`_to_local_naive`、`_wall_time`。建议统一到 `app/utils/time.py`，同时可以顺手解决 #10。
- 状态常量在 4 个地方分别定义，另外还有 14 处直接写了字面量。
- “生成分享图 → commit → 失败 rollback”这段流程写了 3 遍。
- `_absolute_media_url` 在 v1 和 v2 各有一份，share-preview 路由也有重复。
- v1 和 v2 的 validator 有重复，`validate_required_text` 共有 4 份。
- 重复次数较多的代码：
  - 查询 participant 的语句：5 次
  - 拼接诊断 record：3 次
  - 计算 `MEDIA_ROOT`：3 次
- **潜在 bug**：分享图文件名的正则在一处写成 `{24}`，另一处写成 `{24,32}`，两处不一致。合并时需要统一。

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
  2. 先轮换 #3 涉及的密钥，再处理旧日志。
  3. 查清服务器整棵代码树为什么变成了 CRLF（`git status` 显示全部文件被修改）。很可能是在 Windows 或某个工具里设置了 `core.autocrlf`，或者通过 SFTP 上传时做了换行转换。之后统一用 `git pull`、rsync 或 CI 部署，并在仓库里加 `.gitattributes`（`* text=auto eol=lf`）。
  4. 加 `PermitRootLogin no`（或者 `prohibit-password`），并启用 fail2ban。

## 建议的修复顺序

1. **今天**
   - 问题 3：抬高 httpx 的日志级别并重新部署，然后**轮换微信 AppSecret 和高德 Key**（已确认泄露到日志中），最后清理旧日志。
   - 问题 37：修复 logrotate 配置的 CRLF。
   - 问题 11：在 `.env` 中补上 `APP_ENV=production`，重启后确认生产校验能正常通过。
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
