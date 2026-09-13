# 接口契约与 BGG 接入

> 此文保留 v3.1 基线设计/样例。当前已实施 v3.2，原生选人使用 user_id，统计定义版本5；记分纸计算、个人收藏/成本、历史发布及离线补传以 [当前实施契约](12-v3.2-implementation-contract.md) 和 [运行OpenAPI](openapi.json) 为准。旧版样例仅用于基线回归，不直接当作当前完整请求。

最新实施细则见 [3.1 实施契约](09-implementation-contract.md)。

属于 [桌游库 v3.1 设计](../../boardgame-library-scope.md)。路径均相对 `/api/v1`，尚未实现。沿用 FastAPI、Pydantic、SQLAlchemy、现有登录与角色体系；不新增另一套账号系统。

本文件为完整接口目录；各请求响应对象及异步应用细节见 [06 详细接口契约](06-api-contracts.md)。

v3.1 正式加入稳定玩家、地点、计分表和扩展统计路由（第 9 节），共用过滤、身份和计分表事务契约见 [08](08-bgstats-statistics-coverage.md)。本目录所有路由仍是待实现契约。

## 1. 通用接口规则

- 列表统一 `{items, next_cursor, has_more}`，`limit` 默认 20、最大 100。cursor 为服务端不透明值，包含排序指标/ID 和筛选摘要；不接受直接拼接 SQL 排序参数。所有排序都有稳定 ID 作为末级条件。
- ID 用本地整数；`bgg_id` 单独命名。时间输出 ISO 8601 带 `+08:00`，日期输出 `YYYY-MM-DD`。分数采用十进制字符串，例如 `"-2.500"`，避免前端浮点误差；比例为 0–1 的 JSON number，空分母返回 null。
- 日期过滤 from/to 均为包含边界；SQL 对时间戳使用 `[from 当日 00:00, to 次日 00:00)`，并验证 from ≤ to。缺省两端为空表示全部；不把 to 当成当天刚开始而漏掉整天。
- 新建资料、库存批量、对局、导入任务/应用、合并、报错须传 `Idempotency-Key` UUID；PUT 自然唯一的提名也需防并发，重复同内容返回同一 ID。写已有聚合带 `expected_revision`，不匹配返回 409。
- PATCH 未出现字段不改；可空普通字段显式 null 为清空。覆盖字段使用 `set_overrides` 和 `clear_overrides`，分别设置人工值、移除人工覆盖恢复 BGG。两集合不能出现同一键。扩展/玩家/队伍列表在出现时整体替换；未出现保留、`[]` 表示清空，完整性检查仍执行。
- 响应只返回调用者有权读取的字段；`scope=mine` 固定服务端当前 user_id，不能用参数冒充其他人。未发布导入/草稿无权读取时 404；对已可见资源无写权限返回 403。成员搜索只能返回 `id,nickname,avatar_url`，不复用含 OpenID 的当前用户 DTO。
- 成功创建为 201，任务接受为 202，查询/更新为 200，移除关联为 204。重放创建请求返回原资源并附 `Idempotency-Replayed: true`，不额外创建。集合全量写需在同一事务中校验。
- 现有错误格式 `{code,message,request_id}` 保留；新业务可增加可选 `details`，由异常处理器统一输出，用于 `reason/current_revision/conflicts`。code 沿用 AUTH_FAILED(401)、PERMISSION_DENIED(403)、NOT_FOUND(404)、CONFLICT(409)、VALIDATION_ERROR(422)、INTEGRATION_ERROR(502)。不要把上游原始错误页或凭证返回客户端。

请求内的名字、备注、URL 长度与 02 中字段上限一致；一次对局最多 100 位玩家、50 个扩展，一活动最多 100 个计划条目，一用户同活动最多提名 50 款，超限返回 422 并保留表单。以上是可配置的容量保护，不是 BGG 推荐人数限制。普通 JSON 请求上限 512 KiB；BGG 原始响应和图片走独立通道。创建资料同时提供顶层字段与同名 set_overrides 时，值不一致返回 422，不隐式择一。

并发冲突示例：

提名 PUT 在当前仍 active 且正文完全相同时可以直接返回当前资源而不增加 revision；涉及状态恢复或内容变化时严格检查 expected_revision。创建时的 0 不能覆盖后来已撤回/冻结的记录。所有幂等重放仍需检查当前调用者对原资源的读取权限，不返回已失去权限的私人信息。

```json
{"code":"CONFLICT","message":"记录已更新，请读取最新版本后重试","request_id":"request-example","details":{"reason":"revision_mismatch","current_revision":4}}
```

## 2. 资料、实物和成员选择

| 方法和路径 | 请求要点 | 响应与权限 |
| --- | --- | --- |
| GET `/boardgames` | q、game_type、inventory_scope=all/mine、available_for_activity、sort、分页 | 精简资料列表；不返回 bgg_payload；登录用户可读 |
| POST `/boardgames` | name/game_type 或确定的 bgg_id + 可选覆盖值 | 新资料详情；成员可手动建或按 BGG 候选新建，BGG ID 已存在返回 409 + canonical_id |
| GET `/boardgames/{id}` | — | 有效资料、field_sources、库存汇总、兼容项摘要、同步状态 |
| PATCH `/boardgames/{id}` | expected_revision、set/clear_overrides、sort_order、is_visible、default_rules | 本人未共享资料或管理员；修改类型不得破坏已有本体/扩展角色 |
| PUT `/boardgames/{id}/bgg-binding` | expected_revision、bgg_id 或 null | 管理员绑定/解绑既有资料；已被其他资料绑定则给出合并候选 |
| POST `/boardgames/{id}/archive` | expected_revision、reason | 管理员；未共享的本人资料也可归档，保留历史 |
| POST `/boardgames/{id}/restore` | expected_revision | 同归档权限；恢复普通选择，已合并源不可直接恢复 |
| GET `/boardgames/{id}/source` | — | 管理员读取完整来源及请求参数；普通详情只含必要展示数据 |
| GET `/boardgames/{id}/expansions` | include_suggestions、分页 | 本地有效关系和未入库的 BGG 提示分开；普通成员可读 |
| PUT `/boardgames/{id}/expansions/{expansion_id}` | manual_decision、note、expected_revision | 管理员维护全局关系；新关系 revision=0 |
| GET `/boardgames/{id}/merge-preview` | target_id | 管理员查看冲突、影响计数和两端 revision，不附带导入原件和 held 内容 |
| POST `/boardgames/{id}/merge` | target_id、source/target revision、preview_hash、reason | 管理员；源→目标，冲突或预览后有关联变化则 409 重做预览 |
| GET `/boardgame-inventory` | game_id、owner_scope=all/mine、status、分页 | 逐盒列表；敏感字段按所有者/管理员过滤 |
| POST `/boardgame-inventory` | game_id、owner、status、quantity(1–20)、其余库存字段 | 原子返回 `{items:[库存详情]}`；成员仅本人，管理员可其他归属 |
| GET/PATCH `/boardgame-inventory/{id}` | PATCH 带 expected_revision | 逐盒详情/维护；普通成员不能变更所有者或来源关联 |
| GET `/boardgame-inventory/{id}/source` | — | 所有者/管理员读取该盒来源快照；不连带返回整个导入文件 |
| POST `/boardgame-inventory/{id}/archive`、`/restore` | expected_revision、reason | 所有者或管理员；恢复不自动置 available |
| GET `/boardgame-members` | q(至少 1 字)、limit(≤20)、或 activity_id | 成员使用，活动候选优先报名者；只含展示身份；不提供通讯录敏感信息 |
| POST `/boardgame-media` | multipart `file`，purpose=cover/inventory | 成员上传，返回受控 URL 和尺寸；本地文件存储规则见第 7 节 |

创建无 BGG 资料示例：

```json
{"name":"自制推理桌游","game_type":"base","set_overrides":{"aliases":["周末剧场"],"min_players":4,"max_players":8,"cover_url":null}}
```

维护本地覆盖示例（清空简介、恢复 BGG 封面、保留中文名）：

```json
{"expected_revision":2,"set_overrides":{"name":"工业革命：伯明翰","description":null},"clear_overrides":["cover_url"]}
```

详情精简响应示例（数值只是契约示例，不代表实时 BGG 评分）：

```json
{"id":10,"bgg_id":224517,"name":"工业革命：伯明翰","game_type":"base","is_standalone":false,"cover_url":null,"min_players":2,"max_players":4,"field_sources":{"name":"local","min_players":"bgg","cover_url":"empty"},"inventory_summary":{"in_stock":2,"available_for_activity":1},"bgg_synced_at":"2026-09-13T00:36:55+08:00","revision":3}
```

## 3. 活动提名和计划接口

| 方法和路径 | 请求要点 | 响应与权限 |
| --- | --- | --- |
| GET `/activities/{id}/boardgames` | — | `{nomination_state,nominations,plans,play_summary,permissions}`；提名分组含人数、本人是否提名、希望使用的扩展分布 |
| PUT `/activities/{id}/nominations/{game_id}/me` | note、expansions、expected_revision（首次 0） | 创建者/已报名成员；创建或修改自己的唯一提名；返回提名及最新分组人数 |
| DELETE `/activities/{id}/nominations/{game_id}/me` | expected_revision 查询参数 | 冻结前本人撤回，重复撤回幂等；不存在仍 204 |
| GET `/activities/{id}/nominations/{game_id}/people` | 分页 | 成员可看该活动的有效提名者；guest 只看人数 |
| POST `/activities/{id}/nominations/{nomination_id}/remove` | expected_revision、reason | 管理员移除误录，留痕 |
| POST `/activities/{id}/game-plans` | game_id、inventory_id?、携带人、扩展、桌号、备注、sort_order | 创建者/管理员；允许无库存 |
| PATCH `/activities/{id}/game-plans/{plan_id}` | expected_revision、变更字段 | 创建者/管理员；检查 plan.activity_id |
| DELETE `/activities/{id}/game-plans/{plan_id}` | expected_revision | 创建者/管理员；已有关联局也只去掉计划关联 |
| PUT `/activities/{id}/game-plan-order` | `items:[{id,expected_revision,sort_order}]` | 创建者/管理员，必须覆盖该活动全部计划，单事务排序 |

游戏/库存排序用各自 PATCH；活动内扩展顺序通过父条目中的扩展数组设置，三种排序互不覆盖。活动 summary 不把已取消计划当作真实完成局。

提名截止只根据当前活动 start_time，开始前一直可编辑，不提供提前锁定 API。活动被延期到未来时事务内重开仍符合资格的 frozen 提名；报名截止时间仅影响能否报名，不提前截断已有资格者的提名修改时间。

计划请求示例：

```json
{"game_id":10,"inventory_id":101,"table_label":"A桌","bring_user_id":7,"sort_order":10,"expansions":[{"game_id":11,"inventory_id":202,"bring_user_id":9,"sort_order":0,"modules_note":"只用新地图"}],"note":"本体和扩展分别携带"}
```

跨活动计划 ID、错误游戏的库存、主游戏重复进入扩展列表、重复扩展或互不兼容且没有明确例外说明，返回 422；计划中选择当前不可用库存返回 409，可改为空并标记待落实。无库存不阻断提名和记录。

## 4. 对局和报错接口

| 方法和路径 | 请求要点 | 响应与权限 |
| --- | --- | --- |
| GET `/boardgame-plays` | scope=all/mine、activity_ids、game_id、user_id、origin、status、period/year/month/quarter/from/to、分页 | all 返回小程序内已发布对局，mine 在相同集合按实际参局；user_id 仅过滤公开的实际玩家；管理视图 recorded_by=me 可查本人代记及草稿 |
| POST `/boardgame-plays/duplicate-preview` | game_id、activity_id?、played_on、players、started_at? | 返回调用者可见的疑似重复项及指纹；同日多局只提示 |
| POST `/boardgame-plays/result-preview` | competition_mode、score_direction、tie_policy、players/teams、规则 | 成员获取名次/胜负建议及同分待选择项；不保存，最终写入重复服务端校验 |
| POST `/boardgame-plays` | 对局、扩展、玩家/队伍；duplicate_ack_ids 可选 | 活动已打卡参与者可代记，创建者/管理员保留权限；同日同人多局只作重复提示；origin/publication_status 服务端赋值 |
| GET `/boardgame-plays/{id}` | — | 完整一局、统计资格、可编辑权限、未处理报错数 |
| PATCH `/boardgame-plays/{id}` | expected_revision、变更字段；已完成更正须 reason | 原子编辑主记录/明细、重算结果与统计资格 |
| POST `/boardgame-plays/{id}/complete` | expected_revision，可同时提交完整表单 | 草稿→完成；无分数也可完成，校验日期/玩家 |
| POST `/boardgame-plays/{id}/abandon` | expected_revision、played_on、reason | 标记中途结束，不计已完成榜 |
| POST `/boardgame-plays/{id}/void` | expected_revision、reason | 逻辑作废；无物理删除接口 |
| POST `/boardgame-plays/{id}/restore` | expected_revision、target_status、reason | 恢复并重验；可恢复到 draft/completed/abandoned |
| POST `/boardgame-plays/{id}/copy` | 新请求键，activity_id 可选 | 有读权限且对目标有创建资格；返回新草稿，清空结果和时间 |
| GET `/boardgame-plays/{id}/history` | 分页 | 可读原局者查看业务修改记录；仅输出公开更正摘要，原始导入内容走管理权限 |
| POST `/boardgame-plays/{id}/reports` | message | 实际参局者/记录者或俱乐部管理者报错 |
| GET `/boardgame-play-reports` | scope=actionable/reported_by_me、status、分页 | 待本人处理或本人提交的报错，只列本人发起或有权处理的报错 |
| PATCH `/boardgame-play-reports/{id}` | expected_revision、status、resolution | 有权编辑原局者处理 |

仅记录参与的最小已完成请求：

```json
{"activity_id":81,"plan_id":16,"game_id":10,"status":"completed","played_on":"2026-09-13","competition_mode":"unscored","score_direction":"none","result_status":"unknown","players":[{"person_id":107,"seat_order":1},{"person_id":109,"seat_order":2},{"guest_key":"00000000-0000-4000-8000-000000000003","display_name":"匿名玩家","seat_order":3}],"expansions":[{"game_id":11,"inventory_id":202,"modules_note":"只用新地图"}]}
```

补充个人成绩的请求片段：

```json
{"expected_revision":1,"reason":"补录本局成绩","competition_mode":"individual","score_direction":"high","result_status":"resolved","tie_policy":"shared_win","rules_snapshot":{"variant_key":"standard","rules_version":"1"},"players":[{"id":601,"person_id":107,"seat_order":1,"score":"85.000","rank":1,"outcome":"win"},{"id":602,"person_id":109,"seat_order":2,"score":"85.000","rank":1,"outcome":"win"},{"id":603,"guest_key":"00000000-0000-4000-8000-000000000003","display_name":"匿名玩家","seat_order":3,"score":"70.000","rank":3,"outcome":"loss"}]}
```

队伍用客户端稳定 `client_key` 在同次请求内关联，PATCH 的既有队伍带本局 id 以保持计分引用，新队伍无 id。例如 `teams:[{client_key:"red",name:"红队",score:"12",rank:1,outcome:"win"}]`、`players:[{person_id:107,team_key:"red",seat_order:1}]`；服务端创建 team_id 并回传。team_key 不存作跨局队伍身份；完整 team 模式请求至少两队，此例只是一个队伍片段。

报错不会自动撤销成绩。公开可读不等于所有人可改；编辑仍限记录者、关联活动创建者、管理员。手录 completed/abandoned 对局公开；导入记录服务端置 held，普通 PATCH、complete、restore、copy 均不能绕过 held 发布限制。completed/abandoned 之间纠错通过 PATCH + reason；voided 只能 restore。duplicate_ack_ids 对应服务端再次检查到的候选集合；未发布导入候选只在管理员导入界面提供。

普通活动录入权限为当前 activity_participants.user_id=actor 且 checked_in_at 非空；现场打卡和管理员补打卡均认可，不检查 actor 是否出现在本局 players 中。草稿首次完成时再次校验。既有管理员/创建者代记权限保留；修改为另一活动、复制到另一活动均需重新验证目标资格。导入入口仅管理员使用，无需虚构历史签到。

recorded_by=me 管理视图只额外包含有权读取的手录草稿；不能返回 held 的外部导入记录。普通详情/列表即使由管理员调用也不提供 held 历史，规范化导入预览通过任务 items 查看。已发布后作废的单局可显示作废状态和更正摘要，默认列表排除 voided。

## 5. 榜单和统计接口

| 方法和路径 | 参数 | 结果 |
| --- | --- | --- |
| GET `/boardgame-stats/wanted` | scope=all/mine、公共多维筛选、分页 | 累计提名人次、活动场数、本人活动数、排名；跨场不去重 |
| GET `/boardgame-stats/wanted/{game_id}/sources` | 同一筛选、分页 | 可见活动及计数依据；成员可查提名者，guest 仅汇总 |
| GET `/boardgame-stats/most-played` | scope、公共多维筛选、分页 | 已发布完成局的主游戏开局数、玩家人数、最近开局；mine 按实际参与 |
| GET `/boardgame-stats/players` | 公共多维筛选、game_id?、mode?、分页 | 公开具名玩家参局次数排行（含未注册朋友），不做跨游戏分数排名 |
| GET `/boardgame-stats/games/{id}/players` | scope、公共多维筛选、mode、player_count?、comparison_key?、sort | 单款玩家表；1 局有效结果即可进入胜率榜，始终显示样本数 |
| GET `/boardgame-stats/games/{id}/comparison-groups` | scope、公共多维筛选 | 可选规则、人数、扩展组合及样本数 |
| GET `/boardgame-stats/expansions` | scope、公共多维筛选、base_game_id?、分页 | 扩展使用局数，不与主游戏开局相加 |
| GET `/boardgame-stats/overview` | scope、公共多维筛选 | 总完成局、款数、人次、时长、缺失样本、未完成数 |
| GET `/boardgame-stats/trends` | scope、公共多维筛选、bucket=day/month/quarter/year/activity | 时间或活动分组趋势；无筛选缺省近 12 个月，回传实际范围 |

每个统计响应含 `definition_version:"4"`、`scope`、`filters`、`generated_at`、`data_start_date`、`total_items`（若分页）和 `excluded_summary`，行内回传样本数与稳定 `drilldown` 查询参数。空集合为 200；统计口径见 04。排行翻页期间数据变化允许刷新重排，响应携带 generated_at，不能误称强一致的历史快照。

公共多维筛选：`activity_ids` 可多选（最多 50 个、集合去重），与时间范围取交集；`period=all/month/quarter/year/custom`，month 带 year+month，quarter 带 year+quarter(1–4)，year 带 year，custom 带 from+to。其他粒度的互斥参数混用返回 422；不传 period 时有 from/to 可按 custom 兼容解析，否则 all。时间区间按上海自然月/自然季/自然年计算，第四季度结束在次年 1 月 1 日；不是过去 30/90/365 天。筛选与 bucket 分组互相独立，同一查询能“选两个活动、限第三季度、按月展示”。

提名按活动 start_time 日期；对局按 played_on 日期并以 original_activity_id 过滤活动，硬删除活动后仍可按快照活动 ID 选择。活动外的局在未选活动时可出现，选活动后不匹配。origin 可选 manual/bgg/bgstats；held 数据不能通过 origin=bgg 或 scope=mine 绕过发布限制。GET `/boardgame-stats/activity-options` 提供当前及历史快照活动的 ID/名称/日期供筛选。单款玩家表 mine 只返回当前用户在本人参局集中的结果；具名玩家公开记录按 person_ids 钻取，user_id 仅为已注册账号兼容筛选。recorded_by=me 是单独管理视图，不与 mine 实际参局过滤混用。

## 6. BGG 查询、导入与原始数据

### 6.1 与本地记录的区别

| 来源 | 能说明什么 | 不能推断什么 |
| --- | --- | --- |
| Search | 候选 BGG ID、名称、类型、年份等少量信息 | 完整详情、库存、个人拥有 |
| Thing（标准配置） | 公共桌游资料、统计、投票、关系和请求到的版本 | 谁拥有实物、购入日期、本地对局成绩 |
| Collection | 某 BGG 用户的收藏条目、拥有标志、个人评分/次数、选定版本、收藏图片等实际返回内容 | 本地账号归属证明、当前实物可用、收藏之外的完整库存 |
| Plays | 该 BGG 用户登记的历史记录及实际返回玩家/分数等 | 俱乐部全部对局；昵称相同也不等于本地用户 |

前次 liqqi owned 抓取时间为 2026-09-13 00:36:55 +08:00，结果 197 项（154 本体、43 扩展），是当时来源快照。以 BGG 224517 为例，公共条目为 Brass: Birmingham，收藏条目可显示中文名称、中文发行版本和另一张封面。来源导出里的精简 JSON 曾漏掉 description，因此**不能直接把该精简导出当“全字段”导入原件**；正式实现应读取原始 XML 并通过无损检查。

### 6.2 服务端调用契约

官方 API 使用不同资源区分 Search、Thing、Collection、Plays；Plays 有页码及日期筛选，Collection 可按拥有状态筛选。具体可选字段以请求参数及当次返回为准。[BGG XML API2](https://boardgamegeek.com/wiki/page/BGG_XML_API2)

建议的一期调用配置：

| 用途 | 上游路径/参数 |
| --- | --- |
| 查名字 | `search?query=...&type=boardgame,boardgameexpansion`，用户输入由 HTTP 客户端编码 |
| 标准公共详情 | `thing?id=...&stats=1&versions=1`，每批至多 20 个 ID，不自动带评论/视频等可选参数 |
| 拥有本体 | `collection?username=...&own=1&stats=1&version=1&excludesubtype=boardgameexpansion` |
| 拥有扩展 | `collection?username=...&own=1&stats=1&version=1&subtype=boardgameexpansion`，与本体响应按 collid 去重 |
| 历史对局导入来源 | `plays?username=...&page=N`，可带 mindate/maxdate，按每页 100 条及 total 迭代；扩展来源可按 subtype 另查并按 play ID 去重 |

Thing 批量上限是上游限制，不通过并发大量单条请求绕过。[BGG XML API 批量说明](https://boardgamegeek.com/wiki/page/XML%20API)

用户名是公开查询目标，应用 Bearer 凭证从服务端现有配置读取；不在小程序、任务参数、日志或导出里保存。用户名不等于账号绑定，不读取或要求用户提供 BGG 密码。

### 6.3 完整保存的定义和字段

完整保存的是**本次已调用接口的全部响应字段**，不是抓取整站、全部评论、个人评分分页或所有图片。标准 Thing 请求 includes_versions=true、includes_stats=true；未请求的 videos/comments/ratingcomments 等在同步清单标为 false，不能伪称已同步。额外配置的响应另存导入项，不能拿一个简略响应覆盖标准完整快照。

| 返回区域 | 保留内容（存在就全存，列表不限这些字段） |
| --- | --- |
| item 与响应根 | tag、全部属性，例如 id/type/totalitems/termsofuse；来源请求参数/时间另记 |
| name | 所有名称节点及 type、sortindex、value，不只主名 |
| thumbnail/image/description | 完整文本；保留源简介，展示另做安全处理 |
| 基本值 | yearpublished、minplayers/maxplayers、playingtime、minplaytime/maxplaytime、minage 等所有实际节点 |
| link | type、id、value、inbound 及未来新增属性；分类、机制、设计师、美术、出版商、系列、扩展等全部同类项 |
| poll / poll-summary | name/title/totalvotes、所有 results/result 层次和属性；推荐人数、年龄、语言依赖等 |
| statistics/ratings | usersrated、average、bayesaverage、ranks 全部层次、stddev、median、owned、trading、wanting、wishing、numcomments、numweights、averageweight 等 |
| versions | 所有返回版本子树及属性，图片、名称、语言、出版商、年份、尺寸等存在就保留 |
| Collection item | objectid/objecttype/subtype/collid 等属性；name/image/thumbnail/status/stats/numplays/version/comment 及其他节点 |
| Plays item | id/date/quantity/length/incomplete/nowinstats/location 等属性及 item/comments/players 全树；quantity 原值保存，不强制整数 |
| 未知字段 | 通用解析器原样保留，不因 DTO 尚未定义而丢弃 |

无损 JSON 使用统一节点结构：`{tag,attributes,text,tail,children:[]}`；attributes 的值保持字符串；children 始终数组且保持顺序，单个/多个节点不改变形状。说明文字中的 HTML 实体经过 XML 语义解析，原 XML 另存便于核验，不承诺重新序列化字节完全相同。

持久层在 boardgame_import_items 的 response 类型项中保留**整份响应**及完整根节点树；普通业务项和 game.bgg_payload 是该响应的投影并记录来源键。根节点上的额外子节点不能只因不是 item 就被裁掉。成功解析使用禁止 DTD/外部实体的安全 XML 解析器，配置大小、节点数和深度上限；超限明确标为未同步，不能截断后当完整成功。

解析上限建议为单响应 20 MiB、20 万节点、深度 128，可按真实样本调整。BGG 的外部数值与文本先原样保存；长度或数值超出本地展示列范围时，只将该投影标为不可用并记录解析提示，不截断原始树，也不以异常外部值覆盖有效本地资料。

```json
{"parser_version":"1","request":{"resource":"thing","params":{"stats":1,"versions":1}},"root_attributes":{"termsofuse":"source value"},"item":{"tag":"item","attributes":{"type":"boardgame","id":"224517"},"text":null,"tail":null,"children":[{"tag":"link","attributes":{"type":"boardgamemechanic","id":"2040","value":"Hand Management"},"text":null,"tail":null,"children":[]}]}}
```

这是**删减过的结构示例**，不是完整游戏响应；完整保存不能只写上述 children。将缺失数据解读为未知，BGG 的 `N/A`、`Not Ranked` 原文保留，派生展示列才转换为 null。

### 6.4 本地来源路由与持久导入任务

| 方法和路径 | 用途 |
| --- | --- |
| GET `/bgg/search` | 成员搜索公开候选；短缓存，返回 items、cached_at |
| POST `/boardgame-imports` | kind=bgg_thing/bgg_collection/bgg_plays，及 ids/username/from/to；202 返回 job_id。成员可查 bgg_thing，其余一期管理员使用 |
| POST `/boardgame-imports/bgstats-file` | multipart file（JSON 或 .bgsplay）及 source_dataset、source_timezone?；管理员上传，202 返回 job_id；格式未知只保留管理预览并报告适配问题 |
| GET `/boardgame-imports/{id}` | 发起者读取 state/progress/next_retry_at/errors；管理员不自动读取别人的私人任务 |
| GET `/boardgame-imports/{id}/items` | 分页预览完整性、匹配项、差异及失败原因 |
| PATCH `/boardgame-imports/{id}/items/{item_id}` | expected_revision、decision；收藏可新增/关联实物，历史可 create_play/link_play/skip、玩家映射、拆局及扩展关系，见 05 |
| PUT `/boardgame-imports/{id}/mappings` | expected_revision、明确的外部游戏/玩家→本地映射；仅管理员，目标身份逐项验证 |
| POST `/boardgame-imports/{id}/apply` | selection=[{id,expected_revision}]、expected_revision（job）；管理员发起，202 返回 job_id，持久化选择快照；worker 应用后由任务返回新增/关联/待补/失败数量；历史统一 held |
| POST `/boardgame-imports/{id}/retry` | 只重试可重试失败项；保留成功项和人工决定 |
| POST `/boardgames/{id}/bgg-refresh` | 管理员显式刷新，返回标准 thing 任务；未绑定 422 |

新建 BGG 资料需要已有成功详情快照；尚未获取时返回 409 `source_not_ready` 和 job_id，UI 继续查看任务或手填，不能在 Web 请求内循环睡眠等 BGG。thing 任务成功后，仅更新已存在且绑定同 ID 的资料标准来源；不自动创建未选择的作品。派生有效字段与原来源同事务更新，失败保留旧成功快照。

items 列表默认仅列业务项，不把 response 存档项当成可导入游戏；摘要不带大 XML。需要完整原件时使用 `GET /boardgame-imports/{id}/items/{item_id}/source`，权限与任务一致。ready 表示全部业务页/项抓取完成且通过解析；应用进度不能把 response 存档行也算作一盒。

任务状态：queued→fetching（文件用 parsing）→ready/partial/failed；网络失败可 retry_wait→fetching。收藏和历史从 ready/partial 经 applying→applied/partial。部分数据可预览并应用明确成功的项，必须显示“不完整”。历史导入成功是落下原件、规范对局和来源关系，绝不自动发布。

Thing 按请求 ID 集合核对返回的条目，漏 ID 记为失败项；Plays 按页码、total 和来源 ID 去重核对，抓取过程中 total 变化则标记来源变动，不能声称固定时点全量一致。应用每项前重新检查发起人的当前角色和目标权限，角色已降级则停止业务写入，保留已成功项与未应用预览。

持久工作进程以数据库任务表为队列和租约，不仅依靠 FastAPI 进程内 BackgroundTasks。领取任务后释放 DB 事务再调用 HTTP；HTTP 单次超时 30 秒，租约 90 秒并续租。上游通道默认串行、最小间隔 5 秒，参数可配置；202、429 和暂时 5xx 指数退避加抖动，尊重 Retry-After，每项最多 8 次且总等待不超过 15 分钟，超限保留可重试状态和具体失败项。401/403 停止盲重试并标记配置/上游拒绝；200 也必须检查 XML 是否错误内容，不用 HTTP 成功冒充资料已取全。

租约过期允许另一 worker 接管，领取使用原子条件更新或本地 MySQL 已验证支持的行锁方式；不能假设所有环境都支持 SKIP LOCKED。幂等项和内容哈希避免重复落库。客户端进度轮询从 2 秒退到 10 秒，离开页面停止轮询，回来按 job_id 恢复。

缓存建议：Search 24 小时、标准 Thing 7 天、Collection/Plays 15 分钟；这是本项目默认值，不是上游保证。缓存命中须带真实 fetched_at；BGG 失败允许继续展示旧快照及过期提示。日志只记 job_id、资源类型、脱敏错误、耗时和条数。

部署配置沿用已有 `BGG_API_TOKEN`、`BGG_API_BASE_URL`；新增建议键为 `BOARDGAME_ENABLED=false`、`BOARDGAME_IMPORT_WORKER_ENABLED=false`、`BGG_ENABLED=false`、`BOARDGAME_IMPORT_ROOT=storage-private/boardgame-imports`、`BGG_TIMEOUT_SECONDS=30`、`BGG_MIN_INTERVAL_SECONDS=5`、`BGG_MAX_ATTEMPTS=8`、`BGG_JOB_MAX_WAIT_SECONDS=900`。这些是设计中的默认值，尚未写入配置或启用。原件目录真实路径必须与 MEDIA_ROOT 分离；现有 main.py 会公开挂载整个 MEDIA_ROOT。BOARDGAME_ENABLED 关闭时旧功能照常，新路由返回 404。导入 worker 关闭不影响手动资料/库存/对局能力，导入入口返回明确不可用状态；BGG_ENABLED 单独控制网络查询/抓取，关闭 BGG 不阻止已启用 worker 解析和应用 BG Stats 文件。

### 6.5 导入合并和历史对局边界

标准详情按 bgg_id upsert，收藏按规范 username + collid 匹配实物；缺失 collid 的项不自动建盒，留在预览人工处理。同名已有手动资料给候选，只有选定后才绑定。绑定已有实物时核对同作品、所有者决定和版本差异；出现两个现有实物争抢来源唯一键返回冲突。版本封面只预填实物照片/版本，不覆盖全局游戏封面。

新条目默认 unverified + available_for_activity=false。后续同步只更新 source_snapshot/source_synced_at 和公共 BGG 来源，不改 owner/status/purchased_on/本地中文名/排序/备注。删除收藏、own 从 1 变 0、不完整响应或查询用户名变化均不自动删除本地库存。已应用的项目再应用返回原结果，不能把已人工维护的实物再次重置为待核实。

BGG 历史和 BG Stats 文件一期可导入本地，处理 quantity、玩家映射、UUID/来源 ID 幂等及扩展子局；不能只做到预览就称为已导入。具体格式、逐项转换、重复冲突和保留原件规则见 [05 历史导入](05-history-import.md)。导入记录默认 held，在用户决定展示前不计入全体或我的榜单；不可直接采用 BGG numplays 或历史 quantity 总和作为统计值。

## 7. 封面和上传

已有样本的 `cf.geekdo-images.com` HTTPS 图片曾返回 200 image/jpeg，可作为普通网络图展示；这只验证了该样本网络可达，未替代微信开发者工具和 iOS/Android 真机。实现采用库列表缩略图、详情原图，本地覆盖优先、来源图片其次、统一占位兜底。

手动上传扩展现有本地 media 存储：新增 `/media/boardgames/`，JPEG/PNG/WebP，最大 5 MiB，解码验证实际格式和像素上限 20MP，重编码清除 EXIF，随机文件名。只允许上传所得受控媒体 URL 或经服务端验证的 BGG 来源 URL，不提供任意 URL 抓取/代理接口。扫描本次上传但未引用文件时设 24 小时宽限，并检查所有资料、库存、对局快照引用后才清理。

小程序配置需实际核对用到的图片域名及 wx.downloadFile、canvas/分享等功能各自的要求，不能把“image 能加载”当作所有下载/分享已可用。若特定 BGG 图片不可用，一期先用手动图/占位；不将建图片镜像或绕过访问限制设为前置条件。BGG 资料详情显示来源链接；来源简介展示为安全纯文本或受限 rich-text，不执行来源 HTML/脚本。

## 8. 二期 AI、OCR 和翻译的接入点

2026-09-13 补充：[拍照识别方案](13-photo-recognition.md) 已细化视觉供应商候选、临时图片、识别任务、真实来源匹配、确认事务与成本。其中名称搜索、选版和确认部分已按 [v3.3实际接口](14-name-intake.md) 实施；图片/OCR部分仍为设计增补，未计入运行API。

现行录入要求：图片经多模态提取搜索词，或用户直接输入名称，两路统一查询 BGG → 界面显示真实候选资料 → 用户选定正确条目及版次 → 复用创建和登记服务。本地查重用于标记已收录和确认后的复用；图片识别不代替候选选择。模糊、多个盒子、多个相近版本必须可人工修改，未选定前不建立作品、兼容关系或所有权。图片上传与查询任务分开，名称输入不依赖识别服务。

分类/机制字典按 `(type,bgg_id)` 维护英文原词、中文译名、来源和人工确认标志；机器翻译不得覆盖人工修正。翻译可共用多模态供应商，也可用专用服务，稳定性依靠缓存、版本和人工兜底，不能保证模型每次一致。此处没有选择供应商或承诺调用费用。

Codex CLI 可留作本地整理数据的候选工具，正式服务接入单独评估无人值守、认证、费用和运行稳定性。此前本机 CLI 探测进程被终止，原因未查明；本轮不修复、不依赖其可运行，也不将其接到生产。AI 和翻译无配置时一期全部本地业务仍应通过验收。

## 9. v3.1 展示统计新增路由

以下正式纳入本期开发契约。读接口先做可见性检查，不能以管理员身份通过普通路由读 held 或内部来源身份。写权限取当前 users，不取 person；所有写操作遵守 revision/幂等和审计规则。

| 方法和路径 | 参数/响应 | 权限 |
| --- | --- | --- |
| GET `/boardgame-people` | q、registered_only?、分页；PersonOption | 成员目录，仅公开未归档；guest 不可枚举 |
| GET `/boardgame-people/{id}` | 安全身份、revision、permissions | 登录可读公开身份；内部统一 404 |
| POST `/boardgame-people` | display_name；返回新 person，不接受账号/可见性 | 成员创建手录具名朋友 |
| PATCH `/boardgame-people/{id}` | expected_revision、display_name、reason | 管理员维护公开身份 |
| POST `/boardgame-people/{id}/archive`、`/restore` | expected_revision、reason | 管理员；归档保留统计 |
| POST `/boardgame-people/{id}/account-binding` | expected_revision、user_id 可空、reason | 管理员，唯一账号冲突返回 409 |
| GET `/boardgame-people/{id}/merge-preview` | target_id；返回双方 revision、冲突、preview_hash | 管理员；仅可读双方 |
| POST `/boardgame-people/{id}/merge` | target_id、source_revision、target_revision、preview_hash、reason | 管理员，重查同局冲突后原子执行 |
| GET `/boardgame-locations` | q、分页；LocationOption | 成员，公开未归档；公共统计自带可见分组钻取 |
| POST `/boardgame-locations` | name | 成员新建手录地点 |
| PATCH `/boardgame-locations/{id}` | expected_revision、name、reason | 管理员 |
| POST `/boardgame-locations/{id}/archive`、`/restore` | expected_revision、reason | 管理员；不删历史 |
| GET `/boardgame-plays/{id}/scoresheet` | ScoresheetDetail | 与公开 PlayDetail 相同，无表为 404 |
| PUT `/boardgame-plays/{id}/scoresheet` | expected_revision（父局）、sheet_revision（首次 0）、reason?、sheet | 有权编辑该局者；原子更新父局/表/分项 |
| DELETE `/boardgame-plays/{id}/scoresheet` | query:expected_revision、sheet_revision、reason | 有权编辑者；清除当前表，保留审计与原件 |
| POST `/boardgame-plays/{id}/scoresheet/review-template` | expected_revision、sheet_revision、semantic_version、additive_row_keys、reason | 管理员；审核当前规范行定义，重算比较键并重建投影 |
| GET `/boardgame-stats/breakdowns` | 共用过滤；dimension=weekday/player_count/environment | 各组局数/时长/缺失样本及 drilldown |
| GET `/boardgame-stats/partners` | 共用过滤、subject_person_id 默认本人；分页 | 主体共同参局伙伴，匿名不合并进榜 |
| GET `/boardgame-stats/locations` | 共用过滤、分页 | 地点分组统计与 unknown 行 |
| GET `/boardgame-stats/games/{id}/roles` | 共用过滤、mode、comparison_key、分页 | 角色的人次、局数、分数与结果样本 |
| GET `/boardgame-stats/games/{id}/scoresheet-groups` | 共用过滤、分页 | 已审核兼容组及表/主体/有效数值样本 |
| GET `/boardgame-stats/games/{id}/scoresheets` | 共用过滤、sheet_comparison_key、subject_person_id?、分页 | 分项均值/极值/可解释占比及样本 |

现有 plays/overview/trends/players/most-played/expansions/comparison-groups 接受 08 的 environment/location/person/人数/扩展/初玩过滤；wanted 保持提名参数，其他参数明确 422。统计玩家表默认包含全部具名 person，可用 registered_only=true 过滤返回的玩家行，不改变基础局集合。person 过滤筛局，subject_person_id 指明分析主体，两者不替代；mine 的主体只能是本人，冲突 422。

plays 额外支持角色钻取 role_label 或 role_missing=true（互斥），及计分表钻取 sheet_comparison_key、row_key、sheet_sample=all/numeric/contribution。row_key 必带 sheet_comparison_key；sheet_sample 非 all 必带 row_key。结果按不同 play_id 返回，同局多个数值样本仅一个列表项，详情再定位匹配的单元格。

成员选项目录不得从内部导入数据补全；归档身份可由已公开对局中 person/location 摘要供历史筛选。来源中的新人物/地点由有权的导入 decision 创建内部对象，或映射到明确已有对象，不调用普通公开创建来绕过 D08。

导入后的内部人物账号关联与合并另走受限管理路由：POST `/boardgame-imports/{job_id}/people/{person_id}/account-binding`、GET 同前缀 `/merge-preview`、POST 同前缀 `/merge`。仅该任务发起人且仍为管理员可用；人物须能从此任务已确认映射/应用结果证明关联，不能只凭猜测 ID。请求/响应沿用公共管理 DTO，额外带 job_revision，原子校验目标人物版本；合并目标可为当前有权读取的内部或公开人物。已应用来源修正留审计，不改变 held 或公开身份状态，不能合并造成内部字段自动公开。
