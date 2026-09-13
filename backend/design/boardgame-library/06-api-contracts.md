# 详细接口对象与交互契约

> 此文保留 v3.1 基线设计/样例。当前已实施 v3.2，原生选人使用 user_id，统计定义版本5；记分纸计算、个人收藏/成本、历史发布及离线补传以 [当前实施契约](12-v3.2-implementation-contract.md) 和 [运行OpenAPI](openapi.json) 为准。旧版样例仅用于基线回归，不直接当作当前完整请求。

最新实施细则见 [3.1 实施契约](09-implementation-contract.md)。

属于 [完整技术方案](../../boardgame-library-technical-solution.md)。版本 3.1，2026-09-13。完整路径与权限见 [03 接口目录](03-api-and-bgg.md)，字段存储见 [02 数据字典](02-data-model.md)。本文件定义 DTO 与交互，示例 ID/分数均为虚构。完整可执行字段以 app/schemas/boardgame*.py 与运行时 OpenAPI 为准；3.1 变更集中见 09。

## 1. 通用类型、校验和分页

| 类型 | 约定 |
| --- | --- |
| LocalId | 正整数；不得将 BGG ID、文件内引用或昵称作为本地主键 |
| Revision | 修改时 expected_revision≥1；自然唯一的首次提名/关系为 0 |
| DecimalScore | 可空十进制字符串，最多 9 位整数/3 位小数，可负；禁止 NaN、Infinity 和公式；DTO 使用 Decimal 校验 |
| LocalDate / LocalTime | YYYY-MM-DD / ISO 8601 带时区；API 统一输出 +08:00；需要实际日期时不得用当前日期补未知历史 |
| Text | trim 后校验长度；必填名称/原因不能纯空白；输出来源文本时不执行 HTML |
| Page | items、next_cursor 可空、has_more；limit 默认 20/最大 100 |
| Permissions | 只返回当前调用者可执行的 can_edit/can_record/can_nominate 等，不作为服务端鉴权依据 |
| Error | code、message、request_id、details 可选；details 仅含调用者有权知道的冲突信息 |

新写 DTO extra=forbid，拒绝客户端写 origin、publication_status、created_by、comparison_key、original_activity_id 等派生字段。PATCH 用实际提供字段集合区分未出现与 null；数组出现表示完整目标集合，空数组表示清空；按既有 id 差异更新以保留引用，不能删除重插。对局玩家/队伍/扩展禁止重复 ID，数量上限见 03。

cursor 包含排序字段、最后一行完整排序元组、筛选摘要、版本；编码后由服务校验格式/边界/摘要，参数化构造查询。cursor 不承载额外权限，也不能从 cursor 读取用户身份。分页中修改数据可能重排，回传 generated_at，刷新应重置游标。所有分页最终按 ID 稳定排序，不使用不受限 offset 拉取大批数据。

统计排行在过滤集合先计算名次，再分页；稳定次序字段不加入 RANK 的并列依据。筛选改变时旧 cursor 返回 422 `cursor_filter_mismatch`。总览/趋势没有游标，排行有 total_items。

## 2. 游戏资料 DTO

### GameCreate / GamePatch

| 字段 | 新建 | 修改与校验 |
| --- | --- | --- |
| name / game_type | 手填必填；BGG 成功候选可从来源取得 | 通过 set_overrides 更新；类型改变检查所有历史角色引用 |
| bgg_id | 可选正整数，须已取得标准 Thing 快照 | 普通 PATCH 不接收；管理员走 bgg-binding |
| set_overrides | 可选对象 | 名称、别名、类型、独立可玩、封面、简介、人数、时长、年龄、年份；值按 02 校验 |
| clear_overrides | 新建通常为空 | 移除人工键，重新合成来源值；不能和 set 同名 |
| default_rules | 可选，默认 {} | competition_mode、score_direction、variant_key、rules_version；无 AI 自动推断 |
| is_visible / sort_order | 默认 true / 0 | 共享资料由管理员修改；排序允许整数 |
| expected_revision | 不接受 | 修改必填 |

成员本人资料一旦被其他人的库存、提名、计划或对局引用即视为共享；事务内检查。新建时顶层名称/类型与 set_overrides 同名值冲突则拒绝。手录字段统一成为覆盖，之后绑定 BGG 不覆盖中文名称。

GameListItem 返回 id、bgg_id、name、game_type、is_standalone、cover_url、人数/时长、inventory_summary、archived_at、revision；不带 description 的大文本和来源树。GameDetail 再返回 aliases、description、field_sources、default_rules、兼容摘要、同步时间、projection_warnings、permissions、canonical_id 可选。

GameBinding 请求 expected_revision、bgg_id（null 表示解绑）；GameMerge 请求 target_id、source_revision、target_revision、preview_hash、reason。归档请求 expected_revision、reason，恢复请求 expected_revision。相关接口不接受批量重写真实库存或对局。

## 3. 库存、封面与成员 DTO

InventoryCreate 使用扁平字段：game_id、owner_type、owner_user_id?、owner_label?、status、available_for_activity、purchased_on?、edition_name?、language?、storage_location?、photo_url?、remark?、sort_order、quantity。quantity 默认 1，范围 1–20；状态默认 unverified，活动可用默认 false。source_* 和 entry_source 仅导入服务维护。

owner_type=member 必有 owner_user_id 且 owner_label 为空；external 必有非空 owner_label 且用户为空；club 两者均为空。普通成员 owner_user_id 必为当前用户；PATCH 不接受 quantity/game_id/source_*，以免实物历史改挂其他游戏。管理员纠正作品关联走 game-correction-preview / game-correction，校验 preview_hash 和 expected_revision，不改历史对局游戏。

```json
{
  "game_id": 10,
  "owner_type": "member",
  "owner_user_id": 7,
  "status": "available",
  "available_for_activity": true,
  "purchased_on": "2026-08-01",
  "edition_name": "中文版",
  "quantity": 2,
  "sort_order": 0
}
```

InventoryDetail 公共字段为 id、game_id、owner（type/id/display_name）、status、available_for_activity、edition_name、language、photo_url、sort_order、revision、permissions；所有者/管理员才附 internal 对象（purchased_on、storage_location、remark）。完整来源走受限 source 接口，响应不得靠前端隐藏私有字段。

MediaUpload：multipart file、purpose=cover/inventory；返回 url、width、height、mime_type。MemberOption：id、nickname、avatar_url；activity_id 模式可带 checked_in 标志供选人界面提示，但不返回坐标/打卡方式/登录字段。公开玩家展示使用昵称和头像，不沿用 User 模型直接序列化。

## 4. 提名、扩展和计划 DTO

ExpansionSelection 公共字段：game_id（对应 expansion_game_id）、modules_note?、compatibility_note?、sort_order 默认数组下标；计划/对局允许 inventory_id?。计划还可带 bring_user_id? 或 bring_label?；提名不接收实物/携带人。

NominationUpsert：expected_revision、note?、expansions 默认 []；用户身份取当前登录用户，主游戏取 URL。首次 0；已撤回后恢复仍需当前 revision。返回 nomination 的 id/state/revision/note/expansions 及对应 group_summary；同正文的有效提名重复 PUT 返回同资源。

ActivityBoardgamesResponse：

```json
{
  "activity_id": 81,
  "nomination_state": {
    "editable": true,
    "cutoff_at": "2026-09-12T14:00:00+08:00",
    "frozen_at": null,
    "revision": 1
  },
  "nominations": [
    {
      "game": {"id": 10, "name": "示例桌游"},
      "nomination_count": 3,
      "mine": {"id": 301, "revision": 2, "state": "active"},
      "expansion_demands": [{"game_id": 11, "nomination_count": 2}]
    }
  ],
  "plans": [],
  "play_summary": {"completed_count": 0, "abandoned_count": 0},
  "permissions": {"can_nominate": true, "can_manage_plans": false, "can_record": false}
}
```

summary 中的对局计数执行公开与状态过滤；不返回其他人的草稿/held 数量。人员名单独立分页。扩展人数不能与主游戏人数相加；一人选择两个扩展仍是主游戏一票。

PlanCreate：game_id、inventory_id?、table_label?、bring_user_id?/bring_label?、note?、sort_order、expansions；PlanPatch 带 expected_revision。PlanDetail 返回以上字段、revision、game 摘要及 warnings（库存当前不可用/同时被其他活动选择）；扩展各自返回可用性。库存并非同款或跨活动 plan_id 为 422；当前实物不可用为 409，可清空实物继续保存。

GamePlanOrder 请求 items:[{id,expected_revision,sort_order}]，覆盖当前活动全部计划；任一新增/缺失/版本变化整批 409，不部分排序。DELETE 计划的 expected_revision 放查询参数，不依赖 DELETE 正文。

## 5. 对局 DTO 与模式矩阵

PlayCreate：game_id 必填；activity_id、plan_id、inventory_id、played_on、started_at、duration_minutes、location_label、location_id、note 可空；play_environment 默认 unknown；status 为 draft/completed/abandoned（默认 draft）；competition_mode 默认 unscored、score_direction 默认 none、result_status 默认 unknown、tie_policy 默认 shared_win；rules_snapshot 默认 {}；players/teams/expansions 默认 []；shared_score、cooperative_result 可空；duplicate_ack_ids 默认 []。

PlayPatch 接受相同业务字段加 expected_revision 和 reason，不接受 origin/publication_status/stats_exclusion；已有完成/未完成局变化必须填写原因。作废只能通过 void；恢复只能通过 restore。更换活动需要目标记录权限并更新当前关联、original_activity_id 和活动快照，旧关联保留在审计；硬删除导致 activity_id 清空不改 original_activity_id。

PlayerInput：优先提交小程序 user_id，也兼容 person_id 或 guest_key(UUID)，三者恰有一个；匿名 display_name 必填，具名姓名/头像由服务写快照。seat_order≥1 同局唯一；score、score_status、rank、outcome、team_key、is_start_player、role_label、is_new_to_player 可选。PATCH 数组中的既有参局行带 id，必须属于本局，新增行不带 id；保留未变 id。同局 person 唯一，匿名复制新局时重建 guest_key；普通选人列表直接提供 user_id，服务在事务内转为 person_id。score_status 与数值字段分离，见 09。

TeamInput：id?（仅 PATCH 的既有本局队伍）、client_key、name、score?、rank?、outcome?、sort_order。client_key 仅在请求内映射真实 team_id；players.team_key 必须指向同请求队伍。修改 team 模式时同时提供完整 teams 和 players，以便原子替换；不接收来自其他局的队伍 id。

| 模式 | completed/abandoned 玩家条件 | 结果字段 |
| --- | --- | --- |
| unscored | 至少 1 人；abandoned 只要求实际有人参与 | score/rank/outcome、团队、共享结果均空；result_status=unknown |
| individual | completed 至少 2 人 | 玩家 score/rank/outcome；team/shared 字段空 |
| team | completed 至少 2 支非空队，每人恰一队 | 队伍 score/rank/outcome；个人对应字段空 |
| cooperative | 至少 1 人 | shared_score/cooperative_result；个人竞争字段和 teams 空 |
| solo | 恰 1 人 | shared_score/cooperative_result，与合作分开统计 |

abandoned 一律不解释已完成胜负，result_status=unknown、outcome/cooperative_result 清空；已记的真实分数可保留，但不入完成成绩榜。时间/日期必填范围及团队结构仍按可保存的实际记录校验，不造空队。draft 允许不完整，仍禁止跨局引用、重复玩家及非法数值。

PlayDetail：主记录、game/活动快照、expansions、players、teams、revision、created_by（安全身份摘要）、permissions、statistics_eligibility（counts_as_play、counts_for_win_rate、comparison_key、reasons）和 open_report_count。展示 published 的 voided 单局时明确已作废；默认列表只列 completed/abandoned，不混入草稿或作废项。

recorded_by=me 可额外查本人手录草稿，不扩大到外部来源 held；管理员也从导入任务 items 读取 held 规范化预览，普通 PlayDetail 无历史发布开关。

ResultPreview 使用与保存一致的模式校验器，返回 suggested_players/teams、requires_tie_decision、issues；用户确认前不写数据库。DuplicatePreview 返回 candidates:[{id,game,played_on,player_names,revision}] 和 fingerprint；create 再次查询，不信任客户端提交的旧候选集合。未确认新增候选则 409 `duplicate_confirmation_required`。

Complete 请求 expected_revision 及可选完整业务表单；Abandon 请求 expected_revision、played_on、reason 及必要实际玩家；Void 请求 expected_revision、reason；Restore 请求 expected_revision、target_status、reason；Copy 请求目标 activity_id 可空，返回新 draft。前述动作由服务决定 publication_status，held 没有发布接口。

ReportCreate 请求 message；ReportPatch 请求 expected_revision、status=resolved/dismissed、resolution。ReportDetail 含 id、play_id、message、status、报告者/处理者安全摘要及 revision。只有报告人/能处理者可见，不因对局公开暴露所有问题正文。

## 6. 统计筛选和响应

本节与第 9 节共同定义 v3.1 完整统计 DTO，定义版本为 4；共用筛选和样本语义见 [08](08-bgstats-statistics-coverage.md)。

共同参数：scope=all/mine（默认 all）、activity_ids（重复 query 参数，最多 50 个）、period、year、month、quarter、from、to、game_id?、origin?；特定统计增加 mode、player_count、comparison_key、sort。公开对局列表可按 user_id 筛实际玩家，scope=mine 时不同于当前用户的 user_id 返回 422；不通过该参数扩张可见性。不能在同一个 period 同时提交月份与季度。

| period | 必填参数 | 实际日期范围 |
| --- | --- | --- |
| all | 无 | 不限制日期 |
| month | year、month=1–12 | 该自然月第一天至最后一天 |
| quarter | year、quarter=1–4 | 该自然季度第一天至最后一天 |
| year | year | 1 月 1 日至 12 月 31 日 |
| custom | from、to | 两端均包含；from≤to |

示例请求：GET `/boardgame-stats/most-played?scope=mine&activity_ids=81&activity_ids=82&period=quarter&year=2026&quarter=3&limit=20`。

```json
{
  "definition_version": "4",
  "scope": "mine",
  "filters": {
    "activity_ids": [81, 82],
    "period": "quarter",
    "year": 2026,
    "quarter": 3,
    "from": "2026-07-01",
    "to": "2026-09-30"
  },
  "generated_at": "2026-09-13T10:00:00+08:00",
  "data_start_date": "2026-09-05",
  "items": [{
    "rank": 1,
    "game": {"id": 10, "name": "示例桌游", "cover_url": null},
    "completed_play_count": 3,
    "registered_player_count": 4,
    "last_played_on": "2026-09-10",
    "drilldown": {
      "path": "/boardgame-plays",
      "query": {"scope": "mine", "game_id": 10, "activity_ids": [81, 82], "period": "quarter", "year": 2026, "quarter": 3, "status": "completed"}
    }
  }],
  "total_items": 1,
  "next_cursor": null,
  "has_more": false,
  "excluded_summary": {"abandoned_count": 1, "unknown_result_count": 2}
}
```

data_start_date 为过滤范围内可见对局/提名的最早实际日期，空集合 null；generated_at 为查询时间。excluded_summary 只描述调用者已可见的记录，不能返回 hidden/held 记录数。不同指标排除原因可不同，字段命名必须指明含义。

WantedRow：rank、game、nomination_count、activity_count、my_activity_count（mine 时）及 drilldown。PlayerStatsRow 使用第 9 节的 v3 嵌套模式对象，不再输出容易混淆个人/团队/共享分数的旧顶层字段。

Overview 基础字段返回 completed_play_count、game_count、player_participation_count、registered_player_count、known_duration_minutes、duration_known_count、duration_missing_count、abandoned_count。Trends 返回 bucket、filters、series:[{bucket_start/bucket_activity,completed_play_count,player_participation_count,known_duration_minutes,duration_missing_count}]。无局桶局数为 0，有局但时长全未知为 null，不伪造游玩时长。

GET `/boardgame-stats/activity-options`：q?、from/to?、分页；返回当前或历史快照中的 id、name、start_date、is_deleted。只枚举当前可见活动或公开对局引用的历史活动；不能从 held 记录生成公开筛选项。

## 7. 导入任务、映射与应用 DTO

ImportCreate：kind=bgg_thing/bgg_collection/bgg_plays；thing 必有 ids（去重后最多 20 个），collection/plays 必有 username，plays 可有 from/to；互斥参数不混用。BG Stats 走 multipart file、source_dataset（1–64 字符显示标识）、source_dataset_id?、source_timezone（默认 Asia/Shanghai）。首次由服务生成 dataset UUID 写入 job.params；重导入携带已存在且归本发起人所有的 ID，不能凭任意标签/UUID 复用他人数据集。玩家/地点映射 namespace=owner:发起人ID:dataset:UUID，无实体 UUID 时 namespace=file:原件SHA256；显示标签不是身份。play_sources 仍按已确认的对局 UUID 去重，两种 namespace 职责不同。

ImportJob 返回 id/kind/state/revision、progress、next_retry_at、errors（安全摘要）、created_at。params 对外只投影来源账号、日期、显示文件名、所选时区和 adapter_version，不返回存储绝对路径。GET/items/source/apply 仅任务发起人且仍有对应角色者可用；其他管理员不能凭 ID 读取别人的备份原件。

任务领取、解析、逐项应用和状态变化递增 job revision；只有 ready/partial/applied 可以编辑决策，运行中界面轮询后使用新版本。item revision 只随该项的来源/决策/应用结果变更，GET 响应回传当前版本。

ItemPreview 返回 id、source_kind、source_key、revision、state、summary、issues、game_matches、player_matches、duplicate_candidates、decision、result。原件单独 source 路由读取，分页项不带完整文件树。全局来源键已存在但无权读原任务时只返回已存在/不可重复应用冲突，不泄露原件或玩家明细。

ItemPatch 的 decision 按来源类型校验，目标 ID/版本、映射和拆局都可审阅：

```json
{
  "expected_revision": 2,
  "decision": {
    "action": "create_play",
    "game_id": 10,
    "target_game_revision": 3,
    "players": [
      {"source_player_ref": "uuid:player-a", "person_id": 107},
      {"source_player_ref": "file-id:4", "person_id": 108}
    ],
    "segments": [{"segment_index": 1}],
    "expansions": [],
    "acknowledged_issues": []
  }
}
```

历史 action=create_play/link_play/update_play/skip；link_play 必有 target_play_id、target_play_revision 和 reason，且只增加来源关系。收藏 action=create_inventory/link_inventory/skip（资料项才接受 update_game）；create_inventory 提供明确归属，link_inventory 提供目标和版本。更新字段白名单不能让导入覆盖人工库存状态。错误引用、两名玩家映射同一 person、来源类型与 decision 不符均不能应用。

BG Stats 匿名占位重复出现时，players decision 还须含 source_slot（源数组一基位置），可附 source_score_uuid；不能只凭 source_player_ref 合并匿名参局者。匿名项默认独立 guest_label/guest_key，不允许对占位写全局 target_person_id 映射。每局来源槽位在 mapping_snapshot 留存，避免重导入后把匿名玩家折叠。

MappingsPut：expected_revision 指 job revision；items 每项含 provider、source_namespace、entity_type、external_id、mapping_revision（首次 0）、target_game_id/target_person_id/target_location_id 中与类型对应的唯一目标。服务根据 job 来源校验 namespace，不允许自由伪造另一来源身份；复用全局映射前需明确显示目标。批量任一冲突则整体 409，不能悄悄改动其他任务确认的映射；应用成功会递增 job revision。

ImportApply：expected_revision（job）、selection（items:[id,expected_revision]）；以 202 接受并持久化选择快照到 job.params.apply_selection，返回 job_id。请求只安排应用，不在 HTTP 内处理整个历史。worker 执行时再核对 item/目标 revision。ready/partial 可进入 applying，期间不能修改正在应用的项或映射；结果通过 GET job/items 读取。

```json
{
  "id": "00000000-0000-4000-8000-000000000081",
  "kind": "bgstats_file",
  "state": "applied",
  "revision": 8,
  "progress": {
    "source_count": 12,
    "created_play_count": 9,
    "linked_play_count": 1,
    "held_count": 9,
    "draft_count": 2,
    "skipped_count": 2,
    "failed_count": 0
  },
  "next_retry_at": null,
  "errors": []
}
```

source_count 数来源业务项，created_play_count 数分局后新建的局，draft_count 是新建局中的草稿子集，held_count 是新建局中 held 子集；linked_play_count 是本任务成功关联的不同本地局数。数量不能直接相加推导源项数，尤其 quantity>1/扩展子局。源项状态 applied/linked/skipped/failed 单独计数并校验完整处理进度。

项状态：pending→ready/needs_mapping/needs_review/failed；选择确认后可应用，成功为 applied/linked/skipped。某些无法规范化但明确允许保留为草稿的项，创建 held draft 后为 applied 并保留 issues，不冒充完整成绩。Retry 请求 expected_revision 与可选 item_ids，仅重试可恢复失败项；网络重抓不得覆盖已成功应用项的人工决定。

## 8. 错误、幂等与客户端恢复

| HTTP / code | details.reason 示例 | 客户端动作 |
| --- | --- | --- |
| 401 AUTH_FAILED | — | 保留表单，重新登录后再发；不在日志记录 token |
| 403 PERMISSION_DENIED | checkin_required / role_required | 展示权限原因，刷新活动/角色；不自动提交他人身份 |
| 404 NOT_FOUND | — | 资源不存在或当前不可读；不区分猜测的 held ID |
| 409 CONFLICT | revision_mismatch / mapping_conflict / source_changed | 展示最新可见版本和差异，用户修改后用新版本提交 |
| 409 CONFLICT | duplicate_confirmation_required | 查看疑似同局，明确继续后带候选确认集合 |
| 409 CONFLICT | idempotency_key_reused | 请求键对应不同意图；恢复原意图或为新意图生成新键 |
| 409 CONFLICT | nomination_closed / inventory_unavailable | 刷新当前状态，不能仅改请求时间绕过截止 |
| 422 REQUEST_VALIDATION_ERROR | invalid_field / cursor_filter_mismatch | 定位字段/重置游标；不立即重复同错请求 |
| 422 VALIDATION_ERROR | invalid_team / incompatible_expansion / invalid_date | 修正业务数据，保留其他输入 |
| 413 PAYLOAD_TOO_LARGE（新增） | file_too_large | 选择较小文件或按历史范围分批导出 |
| 503 FEATURE_UNAVAILABLE（新增） | worker_disabled / source_disabled | 手动业务可继续；停止盲轮询，保留原输入 |
| 502 INTEGRATION_ERROR | upstream_unavailable | 使用旧资料或手填；异步失败读取任务错误 |

创建幂等键按 actor+路由操作（含目标聚合 ID）+UUID 唯一，request_hash 为规范化业务请求内容哈希；同键异正文返回 409。文件上传哈希使用文件原始字节及语义参数，不依赖文件名。成功后存资源 ID 列表，重放检查当前权限并返回已有资源，附 Idempotency-Replayed:true；事务回滚不得残留“成功”键。

幂等应用任务的 selection 快照、job 状态和请求键在同一短事务提交；worker 通过 source 唯一键与 item 状态保证续跑不会再造局。expected_revision 解决更新冲突，Idempotency-Key 解决重复创建，两者不能互相替代。

同一条记录重放返回的是当前可读资源及当前 revision，不承诺字节级重放旧响应。全量数组替换失败必须回滚父表和全部明细；客户端不能因部分请求看似成功就移除原表单。

## 9. v3.1 扩展 DTO

### 9.1 人物、地点和导入映射

PersonOption：id、display_name、user:{id,nickname,avatar_url}|null、archived_at、revision。LocationOption：id、name、archived_at、revision。PersonDetail 再含 canonical_id、permissions；原件、来源身份、账号登录字段不返回。人物创建只有 display_name，地点创建只有 name，服务设置审计和公开状态。非空名称分别限 64/255 字符。

导入 decision 的具名 players 项为 source_player_ref、source_slot、source_score_uuid?，以及 person_id 或 create_person:{display_name} 二选一；后者与导入 source 映射在同一事务创建内部 person，重试复用。匿名项为 is_anonymous=true、source_slot、guest_label，不接受 person_id 或 create_person，不建全局映射。location 决策为 location_id、create_location:{name} 或 keep_unclassified:true 三选一。新建内部身份的公开名字可在本人导入任务 item 中修正，普通公共 PATCH 不可读写。

ItemPreview 增加 location_matches、identity_issues、normalized_sheet（有表时，使用 ScoresheetDetail 的内容形状但本地 ID 可空）、parse_status 和 result_eligibility。明确本人账号仍经 account-binding，不从导入请求自动绑定。来源映射冲突与具名/匿名重复分别给 reason。

### 9.2 总览、模式与图表

Overview 在基础字段外增加 named_player_count、played_day_count、average_duration_minutes、h_index、play_milestones、new_to_player_game_count、subject_person_id、results_by_mode；新游戏无主体时为 null 并说明原因。共同参数、空桶和未知分母见 08。Trends 保留已有字段，增加 duration_known_count，前端可画数量或已知时长；按天画热力图须使用 day 桶。

结果对象示例（虚构单款主体数据；此处仅展开两个模式，实际响应包含四个）：

```json
{
  "definition_version": "4",
  "subject_person_id": 107,
  "h_index": 1,
  "played_day_count": 8,
  "play_milestones": [{"threshold": 5, "game_count": 1}, {"threshold": 10, "game_count": 0}, {"threshold": 25, "game_count": 0}, {"threshold": 100, "game_count": 0}],
  "results_by_mode": {
    "individual": {"sample_unit": "player_result", "eligible_samples": 4, "wins": 2, "draws": 1, "losses": 1, "win_rate": 0.5, "unknown_result_play_count": 1},
    "cooperative": {"sample_unit": "play", "eligible_samples": 2, "successes": 1, "failures": 1, "success_rate": 0.5, "unknown_result_play_count": 0}
  }
}
```

上例为已指定单款主体的响应片段；同一游戏跨模式统计，h_index 最多 1。完整响应还必须含 scope/filters/generated_at/data_start_date/excluded_summary，具体指标统一由同一过滤集合计算。

PlayerStatsRow v3 统一为 person、play_count、result、score、rank_summary、rank、drilldown。result.kind=individual/team/cooperative/solo，成员单款竞技结果字段兼容 eligible_games/wins/draws/losses/win_rate；合作/单人使用 eligible_games/successes/failures/success_rate。团队 result 取本人所在队而非复制队友样本。score={sample_unit:player/team/play, samples, average, best, direction}，未选 comparison_key 则 null；rank_summary={samples,average} 仅竞技同组有效，合作/单人 null。各模式不可在同一列混排，旧顶层 average_score 等字段不再输出。

BreakdownRow：key、label、completed_play_count、known_duration_minutes、duration_known_count、duration_missing_count、drilldown。weekday 固定 ISO 1–7，environment 固定 online/offline/unknown；player_count 返回有样本的桶。LocationStatsRow 加 location:{id,name}|null、game_count，unknown 也是一行。PartnerStatsRow：person、shared_play_count、game_count、last_played_on、drilldown；主体未绑定默认本人时空集合加 subject_unbound，不猜源本人。

RoleStatsRow：role_label|null、play_count、participant_sample_count、result_samples、result（与模式对应）、score_samples、average_score、min_score、max_score、drilldown。团队/合作的角色结果按该玩家所在队或所参局映射，标注 sample_unit=participant；分数只个人模式返回，团队/合作不伪造个人均分。

### 9.3 计分表写入和读取

ScoresheetInput 白名单结构如下，所有 ID/数值均为虚构。row_key 包含全表唯一路径；主体必须属于该局。value_number 是十进制字符串或 null，最多 12 位整数、6 位小数（总精度 18），不接受 Infinity/NaN/表达式；超出精度报 422，不能静默舍入。value_text 限 1000 字符，row_label 限 255；原件超限完整保留但应用表列问题。

```json
{
  "expected_revision": 3,
  "sheet_revision": 0,
  "reason": "补录分项",
  "sheet": {
    "schema_version": 1,
    "template_key": "sample-v1",
    "groups": [{"key": "round:1", "label": "第一轮", "kind": "round", "rows": [{"key": "round:1/cards", "label": "卡牌分", "is_aggregate": false}]}],
    "subjects": [{"key": "p:601", "kind": "player", "player_id": 601}],
    "cells": [{"row_key": "round:1/cards", "subject_key": "p:601", "value_number": "0", "value_text": null}],
    "recorded_totals": [{"subject_key": "p:601", "value_number": "0"}]
  }
}
```

PUT 不接收审核信息、parse_status、comparison_key、content_hash 或 projection_version。recorded_totals 与父局已有最终分不同则 409 final_score_conflict；要改最终分须走 PlayPatch 同时提交 players/teams/shared_score 和 sheet。来源总分不因公式或分项加总自动覆盖。

ScoresheetDetail 返回 id、play_id、revision、play_revision、schema_version、projection_version、parse_status、template_key、sheet_comparison_key、template_review、groups、subjects（含安全显示名）、cells、recorded_totals、warnings、permissions。unsupported 返回规范空结构及原因；partial 展示已读部分但不进入分项聚合；原始字段仅受限来源接口可读。

审核请求定义 semantic_version（≤64 字符）、additive_row_keys（可空，须为当前非汇总行子集）、expected_revision、sheet_revision、reason；服务以当前完整行定义生成规范模板签名、记录操作者，并重建 projection。模板发生变化后重新审核；外部模板 ID 不足以证明可比。内部 held 的模板审核由发起管理员的 item decision.template_review 执行同一验证器，不能借公共审核接口读 held。

ScoresheetGroupRow：sheet_comparison_key、template_key、comparison_key、play_count、subject_samples、numeric_samples、drilldown。ScoreRow：row_key、row_label、sample_count、numeric_samples、missing_samples、average/min/max（十进制字符串或 null）、contribution_rate、contribution_samples、contribution_reason、drilldown；平均数最多 6 位小数，rate 最多 6 位小数但排序基于未舍入值。分项列表按 row_order,row_key 排序，默认排除 aggregate 行；样本定义见 08。

PlayPatch 增加 sheet? 和 clear_scoresheet?（互斥）；既有 sheet 更改须 sheet_revision。父局、表和 cells 同一事务验证/提交，无孤立的 cells CRUD。手录普通 JSON 仍限 512 KiB，单张表最多 100 组、500 行、100 主体、20,000 单元格；较大导入原件仍保留，无法投影项置 partial/needs_review，不静默截断后当成完整统计。

Overview 和 partners 允许 subject_person_id；mine 若另指定非本人主体为 422。有主体时先筛实际参局再计算总览，first_recorded_on 按该 person/game 的全部可见完成历史求值；单款 PlayerStatsRow 另回 first_recorded_on 与过滤内明确初玩次数。

计分分项 value_number 使用 DECIMAL(18,6)，recorded_totals 必须同时满足父局 DecimalScore 的 9 位整数/3 位小数范围。不得把更高精度分项合计静默舍入到父局。新局计分表流程为先保存 draft 取得稳定参局/队伍 ID，再通过 PlayPatch 同时提交最终分数和 sheet，最后 complete；失败保留草稿并可按幂等键续做，不先发布半张表。既有局独立 PUT 使用真实参局行 ID。

## 10. 3.1 新增交互入口

- GET /boardgame-plays/options：score_statuses、end_reasons、规则布尔值。
- GET /boardgame-members?q=&activity_id=&limit=&cursor=：小程序用户选人；活动内同时返回 checked_in。
- GET /boardgame-imports/datasets：返回本人历史上传的 source_dataset。
- PATCH /boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}：expected_revision 为 item 版本；play 为 PlayPatch（含自己的 expected_revision 和 reason），只改本任务关联的 held 局。
- GET /boardgame-inventory/{id}/game-correction-preview?target_game_id=；POST /boardgame-inventory/{id}/game-correction：expected_revision、target_game_id、preview_hash、reason。
- GET/POST /boardgames/{id}/rulesets：规则配置选择及创建；POST 仍需幂等键。
- BGG quantity>1：decision.segments 必须含 N 份完整 PlayCreate，segment_count=N；每份独立成绩/时长，禁止复制一个汇总数值。
- 详细状态语义、给分与未获胜判断以 09 为准；统计 definition_version=4。
