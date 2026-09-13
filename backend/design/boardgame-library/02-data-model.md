# 数据模型与一致性

当前 v3.2 实施细则见 [当前实施契约](12-v3.2-implementation-contract.md)。34张领域表由 `20260913_0013`（26表）及 `20260913_0014`（8表与扩展字段）承载，保留3.1迁移基线。部署环境尚未应用。

[逐列数据字典](database-columns.md) 与 [MySQL参考DDL](database-schema.sql) 从当前metadata生成，覆盖下文基线以及3.2扩展列；具体运行请求类型见 [OpenAPI](openapi.json)。下文2–15节保留原模型推导，有增量差异时以16节和生成字典为准。

## 1. 表的职责和通用约定

共 34 张新增表，覆盖资料、实物及来源关联、活动提名与计划、对局和计分、导入与审计。**实物库存只有 `boardgame_inventory` 一张**；其余表解决作品复用、多对多和历史记录。v2 将导入任务命名改为 boardgame_import_*，复用同一队列处理 BGG 和 BG Stats。

| 表 | 一行代表什么 | 核心关联 |
| --- | --- | --- |
| `boardgames` | 一款本体或扩展的资料 | 可选 BGG ID |
| `boardgame_inventory` | 一盒实物 | 游戏、所有者 |
| `boardgame_expansion_links` | 一个作品与一个兼容扩展的关系 | 游戏↔游戏 |
| `activity_game_settings` | 一场活动的提名截止状态 | 活动 1:1 |
| `activity_game_nominations` | 一个人在一场活动对一款游戏的意愿 | 活动、游戏、用户 |
| `activity_game_nomination_expansions` | 此人的提名希望使用的一个扩展 | 提名、扩展 |
| `activity_game_plans` | 活动的一桌/一段计划游戏 | 活动、游戏、可选实物 |
| `activity_game_plan_expansions` | 计划使用的一个扩展 | 计划、扩展、可选实物 |
| `boardgame_plays` | 一次实际对局 | 游戏、可选活动/计划/实物 |
| `boardgame_play_expansions` | 此局实际使用的一个扩展 | 对局、扩展、可选实物 |
| `boardgame_play_teams` | 此局的一支队伍 | 对局 |
| `boardgame_play_players` | 此局的一位实际玩家 | 对局、可选具名玩家/队伍 |
| `boardgame_play_sources` | 一项外部来源的一个分局与本地对局的关联 | 来源身份→对局，可多来源对应同一局 |
| `boardgame_play_reports` | 一条成绩/参局信息报错 | 对局、报告者、处理者 |
| `boardgame_audit_events` | 一次有意义的业务变更 | 聚合类型、ID、版本、操作者 |
| `boardgame_import_jobs` | 一次来源抓取/导入任务 | 发起人、参数、租约、进度 |
| `boardgame_import_items` | 一项来源记录及人工匹配结果 | 任务、来源 ID、目标资料/实物 |
| `boardgame_import_mappings` | 已人工确认的一个外部游戏/玩家身份映射 | 外部 UUID/账号→本地 ID |
| `boardgame_request_keys` | 一次幂等写请求 | 操作者、操作类型、请求键 |
| `boardgame_people` | 一位具名玩家，可未注册 | 可空且唯一的 users.id |
| `boardgame_locations` | 一个游玩地点 | 对局地点 ID 与名称快照 |
| `boardgame_play_scoresheets` | 一局当前采用的计分表 | 对局唯一、可选来源项 |
| `boardgame_scoresheet_cells` | 计分项与一个主体的单元格 | 同局玩家/队伍/共享主体，复合 FK |
| `boardgame_inventory_sources` | 一个来源收藏项中的一盒与实物关联 | provider/namespace/source_id/copy_index 唯一 |
| `boardgame_rulesets` | 一份稳定规则配置 | 游戏+配置哈希唯一 |
| `boardgame_scoresheet_templates` | 一份已审核计分模板 | 游戏+结构哈希唯一 |
| `boardgame_play_observers` | 一位讲解员/主持人 | 对局、人物或局内匿名身份 |
| `boardgame_preferences` | 用户对一款游戏的偏好 | 用户+游戏唯一 |
| `boardgame_prior_plays` | 没有明细的既往游玩说明 | 用户+游戏唯一 |
| `boardgame_tags` | 一个个人标签 | 用户+名称唯一 |
| `boardgame_game_tags` | 游戏与个人标签的关联 | 游戏+标签 |
| `boardgame_play_tags` | 对局与个人标签的关联 | 对局+标签 |
| `boardgame_saved_filters` | 一个保存的组合筛选 | 用户+名称唯一 |
| `boardgame_sync_operations` | 一次客户端补传操作结果 | 用户+客户端+操作UUID唯一 |

通用约定：

- 主键使用与当前 `users.id`、`activities.id` 一致的有符号 `INT`；FK 两侧类型和字符排序规则一致。`?` 表示允许 NULL。业务状态用 `VARCHAR` + Pydantic/服务层枚举；MySQL 版本支持并实际执行 CHECK 时再加同等约束，不能只依赖可能被忽略的 CHECK。
- 有生命周期的聚合使用 `created_by INT`、`updated_by INT`、`created_at DATETIME(6)`、`updated_at DATETIME(6)`、`revision INT DEFAULT 1`，操作者引用 `users` 并 RESTRICT。关联明细的修改由父聚合审计、版本控制。
- 现有活动以 Asia/Shanghai 本地无时区时间存库。为避免混用，本模块时间也按此约定落库，API 输出带 `+08:00` 的 ISO 8601。日期型 `played_on`、`purchased_on` 不做 UTC 日偏移；不顺便重构旧活动时区。
- JSON 只保存来源树、覆盖集合、快照或规则配置；参与者/提名/实物关联用列和关系表。分页查询不加载大的来源 XML/JSON。
- 没有业务记录不伪造 0 分、0 分钟或购入日期。实际计数的 0 和元数据未知的 NULL 明确区分。

## 2. `boardgames`：资料与 BGG 原始信息

| 字段 | 类型/默认 | 含义 |
| --- | --- | --- |
| `id` | INT PK | 稳定本地身份 |
| `bgg_id` | INT? UNIQUE | 一份本地资料最多绑定一个 BGG 条目；多条 NULL 合法 |
| `name` | VARCHAR(255)，非空 | 当前有效显示名，可手填中文 |
| `aliases` | JSON，默认 `[]` | 当前有效别名；源名称仍保留在 BGG 树 |
| `game_type` | VARCHAR(16) | `base` / `expansion` |
| `is_standalone` | BOOL，false | 扩展是否允许作为一局主游戏 |
| `cover_url`、`description` | VARCHAR(1024)?、TEXT? | 当前有效封面和简介 |
| `min_players`、`max_players` | INT? | 正整数，有两值时 min ≤ max |
| `min_playtime_minutes`、`max_playtime_minutes` | INT? | 正整数，有两值时 min ≤ max |
| `min_age`、`year_published` | INT? | 年龄非负；年份允许历史年份，未知为空 |
| `local_overrides` | JSON，默认 `{}` | 人工覆盖值，规则如下 |
| `search_text` | TEXT | 有效名称、别名和 BGG 名称的派生搜索文本 |
| `default_rules` | JSON，默认 `{}` | 默认比赛模式、计分方式、规则版本；不从 BGG 评分推断 |
| `is_visible`、`sort_order` | BOOL true、INT 0 | 普通库列表可见性及排序 |
| `archived_at`、`merged_into_id` | DATETIME?、INT? 自引用 FK | 归档；重复资料合并后的跳转目标，RESTRICT，禁止自身或循环跳转 |
| `bgg_payload` | JSON? | 请求元信息、响应根属性及完整 item 节点树 |
| `bgg_raw_xml` | LONGTEXT? | item 原始 XML 片段（含所有返回字段）；根属性另存于 payload |
| `bgg_request_params`、`bgg_synced_at` | JSON?、DATETIME? | 最近成功的标准详情请求及同步时间 |
| `bgg_parser_version`、`bgg_content_hash` | VARCHAR(32)?、CHAR(64)? | 解析器版本、来源内容哈希 |
| `projection_warnings` | JSON，默认 `[]` | 来源已完整保留，但某展示字段超限或与现有关联冲突的提示 |
| 通用审计/版本字段 | 见第 1 节 | — |

`local_overrides` 的键只接受上述可显示字段和 `game_type/is_standalone`。键不存在表示使用 BGG 派生值；键存在且值为 NULL 表示明确清空可空字段；移除键表示恢复使用 BGG。`name/game_type` 的最终值必须非空，不能通过清空覆盖破坏身份。PUT/PATCH 语义见接口文档。

上表可查询列是“BGG 派生值 + local_overrides”的事务内物化结果，不是第二份独立人工输入。所有写入口和同步都走同一个合成函数；`is_visible/sort_order/default_rules` 纯本地维护。未绑定的手动资料也把输入写进 overrides，后续绑定不覆盖它。BGG 的推荐人数投票与本地 min/max 玩家数不混为一列。

解绑 BGG 时将当前有效展示值固定为本地覆盖，再释放 bgg_id；历史来源快照仍保留但标为已解绑，不再参与自动更新。BGG 新返回的类型若会破坏已有主游戏/扩展引用，原始数据照存、有效类型暂保留旧值，并写 projection_warnings 等待管理员明确处理；不能在普通同步中批量破坏历史关联。

索引：`UNIQUE(bgg_id)`、`(is_visible, archived_at, sort_order, id)`、`(game_type, archived_at)`。一期小规模名称检索使用参数化的 name/alias 搜索文本匹配，不承诺 SQLite 与 MySQL 的中文全文分词一致；达到数据量瓶颈后再扩展专用检索。

## 3. `boardgame_inventory`：每盒库存

| 字段 | 类型/默认 | 含义 |
| --- | --- | --- |
| `id`、`game_id` | INT PK、INT FK | 实物及对应资料 |
| `owner_type` | VARCHAR(16) | `club` / `member` / `external` |
| `owner_user_id`、`owner_label` | INT? FK、VARCHAR(64)? | member 必有本地用户；external 必有称呼；club 不需要用户 |
| `status` | VARCHAR(16)，`unverified` | 待核实 `unverified` / 可用 `available` / 借出 `borrowed` / 停用 `unavailable` / 已出库 `retired` |
| `available_for_activity` | BOOL，false | 明确允许活动使用；不等于当前一定有空 |
| `purchased_on` | DATE? | 真实购入日期，不接受未来日期，不以收藏修改时间预填 |
| `storage_location` | VARCHAR(255)? | 内部存放位置 |
| `edition_name`、`language` | VARCHAR(255)?、VARCHAR(64)? | 本地版次和语言 |
| `bgg_version_id` | INT? | 仅来源版本 ID，不能代替 game_id |
| `photo_url`、`remark` | VARCHAR(1024)?、TEXT? | 实物照片及内部备注 |
| `sort_order` | INT，0 | 同款内实物顺序 |
| `entry_source` | VARCHAR(16) | `manual` / `bgg_collection` / `bgstats` |
| `source_username`、`source_collection_id` | VARCHAR(64)?、VARCHAR(64)? | 原始收藏的稳定来源，不证明本地归属 |
| `source_snapshot`、`source_synced_at` | JSON?、DATETIME? | 完整个人收藏 item 与来源时间；不公开个人评论 |
| `archived_at` | DATETIME? | 归档隐藏；历史引用保留 |
| 通用审计/版本字段 | — | — |

约束：member 时 user_id 非空且 label 为空；external 时 user_id 空且 label 非空；club 时两者空。`UNIQUE(source_username, source_collection_id)`：来源用户名使用确认后的规范大小写形式；两字段一起空或一起非空；这两个旧投影字段不再作为新导入主键；新来源统一通过 boardgame_inventory_sources 按 copy_index 对应每盒，多来源可关联同盒。

可用盒数谓词：`archived_at IS NULL AND status='available' AND available_for_activity=true`。在库总数排除 `retired` 和已归档；可用数、在库数分别展示。状态变化不修改旧对局；所有者转移仅管理员操作，保留前后快照。

索引：`(game_id, status, available_for_activity)`、`(owner_user_id, archived_at, id)`、上述来源唯一键。游戏/所有者 FK 为 RESTRICT；业务不提供直接物理删游戏或库存接口。

## 4. 扩展兼容关系

`boardgame_expansion_links`：`base_game_id INT` + `expansion_game_id INT` 联合 PK；`bgg_suggested BOOL=false`、`manual_decision VARCHAR(16)='inherit'`（inherit/allow/block）、`note VARCHAR(500)?`、`updated_by/updated_at/revision`。

有效关系是 manual=allow，或 manual=inherit 且 bgg_suggested=true；manual=block 永远阻止 BGG 下次同步重新启用。不能自关联；扩展必须是 expansion，左侧可为本体或可继续挂扩展的作品。兼容链允许扩展依赖已选中的其他扩展，服务端防止闭环。

来源指向尚未本地创建的作品时只保留在 `bgg_payload`，不自动递归导入全球图谱；目标两端已有本地 ID 时投影为关系。手动本体/扩展不需要 BGG。版本兼容性和“需先选另一个扩展”用关系链/备注提醒；缺失关系时用户可在本次计划/对局填写 `compatibility_note` 作为明确例外，只有管理员可把例外提升为全局兼容关系。

## 5. 活动提名和计划

### 5.1 设置与提名

`activity_game_settings`：`activity_id INT PK/FK`、`frozen_at DATETIME?`、`cutoff_snapshot DATETIME?`、`revision INT`。截止始终为活动当前 start_time，不存在用户可修改的提前锁定字段。

自动结算保存 frozen_at 与生效的 cutoff_snapshot。活动延期到未来时清除冻结状态并重新检查资格：仍有资格的 frozen 提名恢复 active，资格已失去则 ineligible；不恢复 withdrawn/removed/ineligible。后台冻结审计的 actor 可为空，action=system_freeze；改活动时间导致重开则记录实际操作者和前后时间。

`activity_game_nominations`：`id INT PK`、`activity_id/game_id/user_id INT FK`、`state VARCHAR(16)`（active/frozen/withdrawn/ineligible/removed）、`frozen_at DATETIME?`、`note VARCHAR(500)?`、通用审计/版本字段。`UNIQUE(activity_id, game_id, user_id)`，再次提名更新同一行；创建时间保留，变更时间和审计记录反映撤回/再提名过程。

`activity_game_nomination_expansions`：`nomination_id INT`、`expansion_game_id INT` 联合 PK，`sort_order INT=0`、`modules_note VARCHAR(500)?`、`compatibility_note VARCHAR(500)?`。不用库存 ID，意愿无需落实到实物。

有效提名为未取消/流局/删除活动下的 active 或 frozen；active 还需实时具备创建者/报名者资格。到截止时将仍有资格的 active 置 frozen，其他置 ineligible。退报名、移出、角色清除等操作之前调用相同的冻结/失效服务，按旧时间及旧身份决定；冻结后移出不抹历史。取消活动保留行但统计过滤；恢复取消状态不自动恢复取消前 active 提名，须管理员明确处理，frozen 历史可随活动恢复计入。

并发：提名、截止结算、改活动时间、退报名均锁活动行，再锁设置/提名；锁顺序固定。后台可每分钟结算到期活动，所有相关写入口也结算，不能依赖后台永远准时。涉及角色变更时先锁用户，再按活动 ID 升序锁相关活动；投票写入口采用用户→活动顺序。将开始时间改到过去时立即冻结；延期到未来时按上述规则重开，事务内同时更新开始时间、设置和提名状态。

索引：提名 `(game_id, state, user_id, activity_id)`、`(user_id, state, activity_id)`；活动原有 start_time 索引用于日期范围。关联表 FK：父提名 CASCADE、游戏 RESTRICT。

### 5.2 计划及扩展

`activity_game_plans` 字段：`id INT PK`、`activity_id INT FK`、`game_id INT FK`、`inventory_id INT? FK`、`table_label VARCHAR(64)?`、`bring_user_id INT? FK`、`bring_label VARCHAR(64)?`、`note VARCHAR(1000)?`、`sort_order INT=0`、通用审计/版本字段。用户携带人和外部携带称呼互斥；携带人不自动等于持有者。游戏必须可作为主游戏。

`activity_game_plan_expansions` 字段：`plan_id` + `expansion_game_id` 联合 PK、`inventory_id INT? FK`、`bring_user_id INT? FK`、`bring_label VARCHAR(64)?`、`modules_note/compatibility_note VARCHAR(500)?`、`sort_order INT=0`。

同活动同游戏可以多条计划，不建 `(activity_id, game_id)` 唯一键。同一条目扩展去重；每个 inventory_id 必须对应本行 game_id/expansion_game_id，服务层事务内校验，不能只检查库存 ID 存在。同一扩展只选一份实物；需要混用多盒时用备注，不产生额外开局。

索引：计划 `(activity_id, sort_order, id)`、`(inventory_id, activity_id)`；扩展 `(inventory_id, plan_id)`。父活动 CASCADE；其余游戏、库存 FK RESTRICT；携带人 RESTRICT。修改条目及其扩展用一个事务、一个父 revision。

## 6. 实际对局、队伍和玩家

### 6.1 `boardgame_plays`

| 字段 | 类型/默认 | 含义 |
| --- | --- | --- |
| `id`、`game_id` | INT PK、INT FK | 一次对局和主游戏 |
| `activity_id`、`plan_id`、`inventory_id` | INT? FK | 可无活动/计划/实物；计划必须属于所选活动 |
| `origin` | VARCHAR(16)，manual | `manual` / `bgg` / `bgstats`；来源不代表可见性 |
| `publication_status` | VARCHAR(16)，held | `published` / `held`；手录完成后 published，历史导入 held，用户后续再定展示 |
| `stats_exclusion` | VARCHAR(16)，none | `none` / `wins` / `all`；保留来源忽略统计/不计胜率语义 |
| `original_activity_id` | INT?，不设 FK | 服务端维护的历史活动关联 ID；硬删除后保留，更正活动关联时审计更新；不能由客户端伪造 |
| `status` | VARCHAR(16)，draft | `draft` / `completed` / `abandoned` / `voided` |
| `played_on` | DATE? | 实际日期；completed/abandoned 必填且不能未来 |
| `started_at` | DATETIME? | 精确开始时间可未知；提供时日期须与 played_on 一致 |
| `duration_minutes` | INT? | 实际分钟数，已填写则 ≥1；不用活动时长或 BGG 时长代填 |
| `location_label` | VARCHAR(255)? | 安全地点名称快照；未归类文字地点按 unknown 组统计 |
| `location_id` | INT? FK RESTRICT | 稳定地点，允许未知 |
| `play_environment` | VARCHAR(16)，unknown | online/offline/unknown，不从 origin 推断 |
| `competition_mode` | VARCHAR(16)，unscored | `unscored` / `individual` / `team` / `cooperative` / `solo` |
| `score_direction` | VARCHAR(16)，none | `high` / `low` / `manual` / `none` |
| `result_status` | VARCHAR(16)，unknown | `unknown` / `resolved`；整体结果状态，个人 gave_up 的已知未获胜可独立存在 |
| `shared_score_status` | VARCHAR(16)，unrecorded | 共享成绩状态，值与个人 score_status 一致 |
| `end_reason` | VARCHAR(16)? | unfinished/table_flip，仅 abandoned/voided 可填写 |
| `tie_policy` | VARCHAR(16)，shared_win | `shared_win` / `draw`，当局确认后的规则 |
| `shared_score` | DECIMAL(12,3)? | 合作/单人的共同得分 |
| `cooperative_result` | VARCHAR(16)? | `success` / `failure`；未知 NULL |
| `rules_snapshot` | JSON，默认 `{}` | 变体键、计分规则版本及人工说明 |
| `comparison_key` | CHAR(64)? | 服务端派生的分数可比组，不接收客户端随意写值 |
| `game_snapshot`、`activity_snapshot` | JSON、JSON? | 名称/封面/BGG ID，以及活动名/日期/created_by 等当时资料 |
| `note`、`change_reason` | TEXT?、VARCHAR(500)? | 备注、最近一次更正/作废原因 |
| 通用审计/版本字段 | — | created_by 是记录者，不代表参局 |

### 6.2 明细

`boardgame_play_expansions`：`play_id` + `expansion_game_id` 联合 PK、`inventory_id INT? FK`、`modules_note/compatibility_note VARCHAR(500)?`、`game_snapshot JSON`、`sort_order INT=0`。主游戏不能同时作为自己的扩展；与计划选择互相独立。库存当前不可用不阻止历史补录，但必须对应正确作品。

`boardgame_play_teams`：`id INT PK`、`play_id INT FK`、`name VARCHAR(64)`、`score DECIMAL(12,3)?`、`rank INT?`、`outcome VARCHAR(16)?`（win/loss/draw）、`sort_order INT`。`UNIQUE(play_id, id)` 支持玩家的复合 FK；队名不作为跨局队伍身份。

`boardgame_play_players`：`id INT PK`、`play_id INT FK`、`person_id INT? FK → boardgame_people`、`guest_key CHAR(36)?`、`display_name_snapshot VARCHAR(64)`、`avatar_snapshot VARCHAR(1024)?`、`team_id INT?`、`score DECIMAL(12,3)?`、`rank INT?`、`outcome VARCHAR(16)?`、`seat_order INT`、`is_start_player BOOL=false`、`role_label VARCHAR(100)?`、`is_new_to_player BOOL?`。初玩缺失为 NULL。

唯一键：`(play_id,person_id)`、`(play_id,guest_key)`、`(play_id,seat_order)`、`(play_id,id)`。person_id 与 guest_key 恰有一个；未注册具名朋友使用 person，匿名槽位使用局内 UUID。`(play_id,team_id)` 复合 FK 只允许本局队伍。跨局按 person_id，“我的”经 people.user_id 关联账号；历史名字快照保留。玩家行 ID 在修改中稳定保留，计分表引用不能因删除重插失效，见 08。

### 6.3 保存结果的完整性

- completed：至少一名实际玩家；individual 至少两人；team 至少两支非空队，所有玩家且仅属于一队；solo 恰一人。abandoned 也须日期及至少一名实际玩家，result_status=unknown，胜负/合作结果为空；真实已录分数可保留但不入完成榜。游戏人数建议不作硬限制，避免特殊变体不能记录。
- unscored：分数、名次、胜负全空，result_status 必须 unknown；individual：队伍和 shared_score 为空；team：个人 score/rank/outcome 为空，以队伍结果查询；cooperative/solo：个人及队伍竞争结果为空，使用 shared_score/cooperative_result。非合作/单人模式的 cooperative_result 必须为空。
- unknown 可保留部分数值，但不录入未确定的名次或胜负；完成局 gave_up 的 outcome=loss 是明确例外，可独立进入该人的结果分母。resolved 对非摆烂的竞技主体计算完整、合法名次，摆烂者 rank=NULL；高/低分需其余主体齐分，manual 需完整名次。shared_win 并列第一为 win，draw 并列第一为 draw；合作/单人成功结果独立处理，见 09。来源 rank=0 转 NULL，不补造名次。
- 自动名次仅在全体成绩齐全且选择 high/low 时生成建议；存在同分必须明确采用哪种规则。手动破同分允许分数相等而名次不同，但必须记录原因和规则快照。名次总是 1、1、3 型，不能出现 0、负数、超出玩家/队伍数或 1、1、2。
- comparison_key = 哈希（主游戏本地 ID、competition_mode、score_direction、rules_snapshot 中的稳定规则/变体版本、实际玩家数、排序去重的扩展 ID 集）。自由备注、日期、库存和持有人不进入键；自由模块说明不决定统计分组，具体变体使用稳定规则配置。团队成绩再加队伍人数构成，防止 2v2 和 3v1 混比。
- 一次编辑将对局、玩家、队伍、扩展、审计和父 revision 一起提交。已完成记录更正立即重算，不同时保留两份有效对局。状态不完整或冲突时全事务回滚。

首次创建/完成手录活动局时，普通成员须存在本活动的报名记录且 checked_in_at 非空；可代记，不要求本人列在 players 中。创建者/管理员保留管理权限。历史导入走本人任务入口（管理员可代导），不要求为过去的局补造活动签到；后续打卡撤销不抹去已有对局。published 记录在小程序内公开可读，编辑仍按记录者/活动创建者/管理员校验。

索引：plays `(publication_status, status, played_on, id)`、`(game_id, publication_status, status, played_on)`、`(original_activity_id, played_on, status)`、`(origin, publication_status)`、`(comparison_key, status)`、`(created_by, status, id)`；players `(person_id, play_id)`、`(play_id, team_id)`；expansions `(expansion_game_id, play_id)`。保留 activity_id 的 FK SET NULL；更正活动关联时须管理权限、目标记录资格和原因，同事务更新 original_activity_id/快照并保留旧关联审计；仅因活动硬删除而清空 activity_id 时保留 original_activity_id。

## 7. 报错、审计与幂等

`boardgame_play_reports`：`id INT PK`、`play_id INT FK RESTRICT`、`reported_by INT FK`、`message VARCHAR(1000)`、`status VARCHAR(16)`（open/resolved/dismissed）、`resolution VARCHAR(1000)?`、`resolved_by INT?`、`created_at/updated_at`、`revision`。索引 `(status, play_id)`、`(reported_by, created_at)`。报错不直接改成绩或让记录退出榜单；只有有编辑权者可处理。公开展示必要的更正结果，处理列表仅报告人和有处理权限者读取。

`boardgame_audit_events`：`id INT PK`、`entity_type VARCHAR(32)`、`entity_id VARCHAR(64)`、`entity_revision INT`、`action VARCHAR(32)`、`actor_user_id INT? FK RESTRICT`、`before_data/after_data JSON?`、`reason VARCHAR(1000)?`、`request_id VARCHAR(64)?`、`created_at DATETIME`。entity_id 容纳整数业务 ID 或任务 UUID。仅后台系统事件允许 actor 为空并标记系统 action；用户操作必有 actor。索引 `(entity_type, entity_id, id)`。追加写，不修改旧事件；before/after 不含令牌、请求 Authorization、无关用户数据或大份原始来源。普通历史接口只输出可公开的对局更正摘要，不附带 held 原件或库存内部信息。

`boardgame_request_keys`：`id INT PK`、`actor_user_id INT FK`、`operation VARCHAR(64)`、`key CHAR(36)`、`request_hash CHAR(64)`、`resource_type VARCHAR(32)`、`resource_ids JSON`、`created_at DATETIME`；`UNIQUE(actor_user_id, operation, key)`。和业务写入同事务插入；相同键同内容返回原资源，相同键不同内容 409。应用本地创建类请求长期保留键，避免过期重试重复造局；BGG 拉取缓存过期与幂等键不是一件事。

## 8. BGG / BG Stats 导入与来源

`boardgame_import_jobs`：`id CHAR(36) PK`、`kind VARCHAR(32)`（bgg_thing/bgg_collection/bgg_plays/bgstats_file）、`requested_by INT FK`、`params JSON`、`state VARCHAR(32)`、`progress JSON`、`error_code/error_message VARCHAR(255)?`、`attempt_count INT`、`next_attempt_at DATETIME?`、`lease_owner VARCHAR(64)?`、`lease_expires_at DATETIME?`、`created_at/updated_at`、`revision`。params 含白名单参数、导入适配器版本、来源数据集标识、文件安全存储键/哈希，不存凭证；progress 含源条数、规范对局数、关联已有数、待补数和失败数。索引 `(state, next_attempt_at, lease_expires_at)`。

`boardgame_import_items`：`id INT PK`、`job_id CHAR(36) FK CASCADE`、`source_kind VARCHAR(32)`、`source_key VARCHAR(128)`、`bgg_id INT?`、`raw_xml LONGTEXT?`、`payload JSON`、`content_hash CHAR(64)`、`decision JSON?`、`target_game_id/target_inventory_id INT? FK RESTRICT`、`state VARCHAR(32)`、`error_code VARCHAR(64)?`、`created_at/updated_at`、`revision`。`UNIQUE(job_id, source_kind, source_key)`；key 用来源 ID/UUID 构造，不能用游戏名。BG Stats 全文件 JSON 原文保留在受控文件存储，payload 保存完整树，未知字段保留。decision 记录操作、映射、拆局/重复处理和目标 revision；一个来源拆成多局通过下表关联，不塞单个 target_play_id。

项状态固定为 pending/ready/needs_mapping/needs_review/applied/linked/skipped/failed；含义见 06。任务索引增加 `(requested_by,created_at)`，项索引 `(job_id,state,id)`。apply 的 selection 与 item revision 快照保存在 job.params.apply_selection，和任务 applying 状态/幂等请求同事务提交；实际应用由 worker 逐项执行。

每个成功响应另以 source_kind=response 保存完整响应 XML 和整棵根节点 JSON，source_key 取资源/页码/批次的稳定哈希；业务 item 的 payload 引用同任务 response_key。由此根级新增节点、混合文本、未被选中的其他 item 也不会丢失。游戏表保存的 item 快照只是便于读取的投影，不代替完整响应。任务及来源快照一期不自动清理；以后归档须保留仍被资料/库存引用的来源。

collection 的公开资料可用于预览，但任务及个人来源字段只对任务发起人可见。导入应用按每条原子提交，任务可部分成功并续跑；每条应同时写资料绑定/库存/来源映射/审计/幂等结果。重复 job 的原始项不是库存去重键，库存上的来源唯一键才是跨任务保证。

`boardgame_play_sources`：`id INT PK`、`play_id INT FK RESTRICT`、`provider VARCHAR(16)`（bgg/bgstats）、`source_namespace VARCHAR(128)`、`source_play_id VARCHAR(128)`、`segment_index INT>=1`、`source_item_id INT FK RESTRICT`、`content_hash CHAR(64)`、`source_modified_at VARCHAR(64)?`（原时间串）、`last_applied_play_revision INT`、`mapping_snapshot JSON`、`created_at/updated_at`。`UNIQUE(provider,source_namespace,source_play_id,segment_index)`，索引 `(play_id)`。BGG namespace 是规范账号，BG Stats 有 UUID 时 namespace=uuid，没有 UUID 时用 file:文件哈希，详见 05。多个来源经明确确认可指向同一 play_id；来源去重与 D01 提名跨场不去重是不同业务。

`boardgame_import_mappings`：`id INT PK`、`provider/source_namespace VARCHAR(16)/VARCHAR(128)`、`entity_type VARCHAR(16)`（game/player/location）、`external_id VARCHAR(128)`、`target_game_id/target_person_id/target_location_id INT? FK RESTRICT`、`confirmed_by INT FK`、`created_at/updated_at/revision`。`UNIQUE(provider,source_namespace,entity_type,external_id)`；每种类型恰有对应目标，另两个为空。匿名不得建全局映射；具名未注册者映射 people，昵称或来源本人标记不能自动绑定账号。数据集验证见 06，文件名和显示标签不是稳定身份。

导入应用默认只产生 origin=bgg/bgstats、publication_status=held 的记录；即使 status=completed 也不进入普通列表或任何用户榜单。资料完整性、发布状态与统计排除标志分别保存。链接到已存在手录局时只新增来源关系，不把该局改成 held 或覆盖其已更正成绩。以后开放展示要显式发布，并重新验证必填字段及重复冲突；本轮不开放发布操作。

BG Stats 真实导出存在同局复用 isAnonymous=true 玩家占位：按 playerScores 的独立 source_slot 生成不同 guest_key，不写入全局用户映射；mapping_snapshot 保存源位置/scoreUuid 与本局访客的对应。durationMin=0、score 字符串 null、rank=0 均可表示未知；JSON 字符串、图片引用及 deletedObjects 全部保留来源；计分表另投影至 sheet/cells，详见 07、08。

## 9. 删除、合并与现有服务改动

| 对象/操作 | 处理 |
| --- | --- |
| 删除活动（当前为物理删除） | 先补齐所有关联局的活动快照和 original_activity_id；plays.activity_id 和 plan_id 为 ON DELETE SET NULL；提名、设置、计划 CASCADE。ORM 不能对 plays 配置 delete-orphan；所有状态的局及按原活动筛选能力保留 |
| 活动取消/流局/逻辑删除 | 排除其提名，active 提名置 ineligible；保留实际局。错误对局须另行作废，不能因活动状态删成绩 |
| 退报名/移出参与者 | 同事务先执行冻结或失效，不以 participant_id 作提名/参局 FK；对局玩家不受影响 |
| 清除用户角色 | 当前只改 role，不删账号；截止前该用户的 active 提名失效（包括创建者本人），冻结历史保留；停止新的写入 |
| 删除计划 | play.plan_id SET NULL，保留实际游戏及扩展快照 |
| 游戏/库存归档 | 隐藏新选择，历史 FK RESTRICT；统计保留已发生记录，详情显示“已归档” |
| 删除用户 | 当前不新增此接口。业务引用默认 RESTRICT，不能把成员库存改成无所有者或按昵称重绑；未来账号删除需要独立迁移/匿名化设计 |
| 合并重复游戏资料 | 预览后锁源和目标及关联；重定向库存/计划/对局；提名按活动+用户合并去重并保留审计，扩展子集去重；已存在目标有效提名优先，均失效则不复活；扩展角色冲突或主游戏变成自身扩展时拒绝合并并列出冲突；重算 comparison_key；源归档并设 merged_into_id |

合并不会合并“对局行”或“实物行”，同款的两盒/两局仍是两条。被合并资料的 BGG ID 转移与释放唯一键必须同事务，历史快照保留原文；公开 API 读旧 ID 时返回 canonical_id。资料合并可影响统计归组，执行后重新核对计数，错误合并通过审计生成专门逆向修复，不提供无校验的一键撤销。

服务接入点包括现有 `activity_service.delete_activity/cancel_signup/remove_participant/update_activity`、打卡撤销及 `user_service.clear_user_role`；get_activity_by_id/list_activities/list_my_activities 的状态同步也要接入。必须调整为单一事务边界，不能在旧方法已 commit 后才补提名失效；状态批处理改用完整循环，避免 any(generator) 短路；现有定时脚本走同一服务，详见完整技术方案第 3/6 节。

## 10. 二期兼容

分类/机制从完整 BGG link 树中提取，二期可新增 `bgg_terms(type,bgg_id,name_en,name_zh,translation_status,updated_by)`，联合唯一 `(type,bgg_id)`；一期不提前生成机器译文、标签表或展示入口。AI 识别候选先放任务结果，经用户选择再走现有创建/绑定接口，不让识别模型直接决定所有权或写真实库存。以上二期表不计入本期 26 张表。

从 link 提取的字典只覆盖已同步作品中出现的标签，不宣称已获得 BGG 全部分类/机制。未来补全其他词条采用可追溯的来源增量导入，不把抓取全站分类当作一期录入前置任务。

## 11. v3.1 新增四表字段

### 11.1 boardgame_people / boardgame_locations

两表都有通用审计版本字段。people：id INT PK、user_id INT? UNIQUE FK users RESTRICT、display_name VARCHAR(64) 非空、is_visible BOOL=false、archived_at DATETIME?、merged_into_id INT? 自引用 RESTRICT。locations：id INT PK、name VARCHAR(255) 非空、is_visible BOOL=false、archived_at DATETIME?。两表索引 `(is_visible,archived_at,id)`；名字不唯一，同名不代表同人/地点。

导入对象内部可见；手录服务显式置公开，普通 PATCH 不接受 is_visible。归档不删历史；people 合并禁止循环/自身/同局重复人物/双账号冲突，先预览，再迁移参局与映射引用并审计。公共选项默认公开未归档，历史统计保留公开归档身份。people 不替代权限和所有权使用的 users 外键。

plays 新增 `(location_id,publication_status,status,played_on)`、`(play_environment,publication_status,status,played_on)` 索引；空地点为 unknown 分组，原 label 保留。身份/地点的引用权限、归档和合并事务见 08。

### 11.2 boardgame_play_scoresheets

| 字段 | 类型/默认 | 用途 |
| --- | --- | --- |
| id / play_id | INT PK / INT FK UNIQUE RESTRICT | 每局一个当前版本；另 UNIQUE(id,play_id) 供复合 FK |
| source_item_id / source_sheet_id | INT? FK RESTRICT / VARCHAR(128)? | 手录可空；来源可追溯 |
| schema_version / projection_version | INT=1 / INT=1 | DTO 与解析规则版本，各≥1 |
| template_key / sheet_comparison_key | VARCHAR(128)? / CHAR(64)? | 模板标识及服务派生可比组；语义未知后者为空 |
| parse_status | VARCHAR(16)=partial | parsed/partial/unsupported |
| display_data / issues | JSON / JSON | 规范展示树、问题列表，服务显式写默认值 |
| content_hash | CHAR(64) | 当前采用内容的哈希，不代替原件哈希 |
| play_revision | INT≥1 | 投影对应父局版本；不一致不进统计 |
| 通用审计字段 | 同第 1 节 | sheet revision 独立；更正同步父局 revision |

索引 `(sheet_comparison_key,parse_status,play_id)`。模板规范及审核记录位于 display_data.template：semantic_version、rows、additive_row_keys、reviewed_by/reviewed_at；审核字段仅管理员审核服务可写。模板定义更改清除审核，普通请求不能伪造；本版不建设全局模板商店。

### 11.3 boardgame_scoresheet_cells

id INT PK；sheet_id/play_id INT NOT NULL；row_key/group_key VARCHAR(128) 区分大小写；row_label VARCHAR(255)；row_order INT=0；subject_kind VARCHAR(16) 显式为 player/team/shared；subject_key VARCHAR(64)；player_id/team_id INT?；value_number DECIMAL(18,6)?；value_text VARCHAR(1000)?；is_aggregate BOOL=false；projection_version INT≥1。

UNIQUE(sheet_id,row_key,subject_key)，索引(sheet_id,row_key,is_aggregate)。复合 FK `(sheet_id,play_id)`→sheet(id,play_id) CASCADE；`(play_id,player_id)`→players(play_id,id) 和 `(play_id,team_id)`→teams(play_id,id) RESTRICT。CHECK 限定对应主体引用与 p:ID/t:ID/shared 规范 key；shared 所属比赛模式由服务校验。

cells 只由计分表事务重建，不提供单元格独立 CRUD；display_data 与 cells 不分别维护成绩。删除被引用玩家前须同步修改/清除 sheet，失败整体回滚。缺失单元格投影为 NULL，0/负值有效；来源公式不执行，总分不自动重算。模板可比性、投影版本和分项占比见 08。

## 15. 3.1 新增来源、规则、模板与成绩字段

`boardgame_inventory_sources`：id INT PK、inventory_id FK、provider(bgg/bgstats)、source_namespace VARCHAR(128)、source_id VARCHAR(128)、copy_index INT≥1、source_item_id FK、content_hash CHAR(64)、created_at/updated_at。唯一(provider,source_namespace,source_id,copy_index)，inventory_id 非唯一。原始字段仍在来源项，不复制到公开实物 DTO。

`boardgame_rulesets`：id INT PK、game_id FK、name VARCHAR(255)、configuration JSON、configuration_hash CHAR(64)、is_visible、archived_at、通用审计版本字段。唯一(game_id,configuration_hash)。配置固定规则及 expansion_ids，不由任意自由备注生成比较键。

`boardgame_scoresheet_templates`：id INT PK、game_id FK、definition_hash CHAR(64)、semantic_version VARCHAR(64)、definition JSON、additive_row_keys JSON、reviewed_by FK、reviewed_at。唯一(game_id,definition_hash)；审核后同一结构不能静默改换加总语义。

`boardgame_play_players.score_status` 和 `boardgame_play_teams.score_status` 为 VARCHAR(16) NOT NULL DEFAULT unrecorded，枚举 unrecorded/recorded/gave_up/unfinished/table_flip。CHECK 强制 recorded 恰好对应 score 非 NULL，其他状态分数为空；对局共享分数同样受 shared_score_status 检查。`end_reason` 可空，仅整局 abandoned/voided 允许 unfinished/table_flip。API 的 user_id 是账号选择输入，不在 player 表新增重复账号列，事务内转换为稳定 person_id。

## 16. v3.2 增量与当前身份

- `boardgames.complexity` 保存1–5复杂度，未知NULL；BGG averageweight按已验证字段投影，原始精度仍在来源中。
- `boardgame_plays` 新增round_count、result_source/result_reason、tiebreak_applied、exclusion_reason及可恢复计时四字段。枚举、范围和计时状态一致性见生成DDL。
- `boardgame_play_players.participant_kind` 区分human/automa；原生API接收user_id并在事务内解析为Person，数据库参局FK仍person_id。observer单独存放，不进入玩家计数。
- `boardgame_inventory.purchase_price/purchase_currency` 成对有值或NULL，0元有效，不跨币种求和。
- `boardgame_scoresheet_templates` 增加name、template_family、version_number、selection、sheet_definition、is_active；版本定义不可变，旧局保留快照。
- 偏好、既往游玩、标签和保存筛选按用户私有。标签集合使用读取摘要防并发覆盖；离线操作按账号/客户端/操作唯一键与内容哈希复用成功结果。
- 导入映射优先使用UUID而非跨文件RefId；来源解析版本3，统计定义版本5。已确认的“摆烂为未获胜”、原生用户选人、受控held发布覆盖旧基线相关表述。
