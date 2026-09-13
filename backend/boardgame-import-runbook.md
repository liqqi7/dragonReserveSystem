# BGG / BG Stats 持续导入操作说明

更新：2026-09-14。适用于后续新开的 Codex 对话；不依赖旧对话记忆。另一台电脑从零启动环境见 [本地启动与导入交接](../docs/LOCAL_BOARDGAME_HANDOFF.md)。

用户要求：可以继续在小程序、BGG、BG Stats 任意一处记局；以后通过接口追加新桌游、实物和对局。旧数据不重复新增，来源修改不作为新局，跨来源的同一局只保留一条本地对局。

**当前已在用户授权的独立本地测试库导入 BGG / BG Stats，未上线。** 数据库、原件、来源数据集和人工映射不随 Git 分发，另一设备需重新导入或转移完整本地备份。执行时先核对当前代码、运行环境和接口版本，不据此假设其他环境已导入。技术背景见 [完整方案](boardgame-library-technical-solution.md)、[历史导入设计](design/boardgame-library/05-history-import.md)、[真实文件格式核验](design/boardgame-library/07-bgstats-real-export.md)。

2026-09-13 的 [真实来源联调](design/boardgame-library/16-live-integration.md) 是此前只读/合成写入验证。随后本地真实导入完成，4 局结果冲突继续留待核对，历史来源玩家尚未与小程序用户人工匹配；最新范围见 [验证记录](design/boardgame-library/verification.md)。

## 1. 新对话从这里开始

用户可以给新对话这段要求：

> 阅读 backend/boardgame-import-runbook.md，按本文处理我提供的 BGG 账号或 BG Stats 导出。复用已有来源数据集和身份映射，先检查重复，再追加已确认的新桌游和对局。相同来源复用，跨来源同局关联，修改已有记录先比较差异。身份不明、疑似重复和数据冲突保留待处理，其余已授权且无冲突的记录继续处理。最后给出新增、复用、关联、更新和待处理清单。不得擅自连接生产或公开尚未发布的历史记录。

执行前获取或从已授权上下文确认：目标环境、API 基地址、当前登录用户、数据所有者、BGG 账号或本次文件，以及该 BG Stats 数据集以前是否导入过。缺少目标环境时先做只读检查，不从仓库里的生产地址推断授权。

- 读取当前 `AGENTS.md`。本地开发项目与线上运维项目职责分开。
- 通过已配置的认证方式访问 API；令牌只在运行时使用，不写入本文、示例、提交或导入回执。
- 核实目标环境已应用桌游迁移、启用功能和 worker。404/503 不能解释为“没有历史数据”。
- 普通成员导入本人数据；管理员可以代导。导入任务及原件按发起人隔离，管理员不能直接读取另一发起人的私有任务。
- 换电脑或新开 Codex 对话不等于创建新来源身份。优先使用同一小程序账号及以前的 `source_dataset`。更换导入操作者可能触发 `source_owned_elsewhere`，不要换数据集绕过。
- 当前历史策略仍是 `held`：规范化入库后不公开、不入榜。小程序已存在的公开对局可以关联外部来源，关联不改变其原有公开状态。

## 2. 三类数据分别去重

### 名称展示与来源保留

- `boardgames.name` 是小程序主标题，使用已核对的中文名；优先采用持有者在 BG Stats 中填写的名称，其次采用人工确认的 BGG 中文别名。保留用户选用的简繁体和版本限定；BGG 别名没有可靠语言标签，不能只按“含汉字”自动选取。
- 用现有 `PATCH /boardgames/{id}` 的 `set_overrides.name` 保存已确认名称（携带当前 `expected_revision` 和来源核对说明）。既有人工维护的中文名有冲突时先保留，不由文件上传或重复导入静默覆盖共享资料。中文名不能作为作品或实物的合并依据。
- 游戏摘要新增只读 `original_name`，从 BGG 原始投影提取，不需要数据库迁移。页面只在它与主标题不同时显示为副标题；无中文名时保留原名，无来源原名时不显示空白副标题。
- 搜索包含主标题、本地别名和 BGG 原名、别名。BGG 刷新继续尊重本地名称覆盖；原始 JSON/XML 保持原样。
- 对局接口新增当前资料 `game`，扩展条目也带 `game`；`game_snapshot` 仍是记录当时的快照。列表、计分表等展示优先读取 `game`，旧缓存兼容回退到快照。改中文名不修改历史成绩、规则、统计或对局版本。
- 已有中文介绍用 `set_overrides.description` 保存经人工核对的中文段落；原始多语言介绍继续保存在 `bgg_payload` / XML。录入候选的 `display_name`、`description` 优先使用已有本地覆盖，`name` / `original_name` 保留 BGG 作品原名。
- 库存摘要新增 `edition_label`、`language_label`，候选版次新增 `display_name`、`language_label`，用于常见版次与语言的中文展示；它们由已知词典生成，不覆写 `edition_name` / `language` 或版本 ID。版次筛选同时匹配中文标签与原始字段，未知术语原样返回。

| 对象 | 去重依据 | 操作规则 |
| --- | --- | --- |
| 桌游资料 | 已确认的 BGG ID、来源游戏身份映射、本地 game_id | 同一款作品复用资料；不能因中英文名称不同、换了导出文件或多了一盒实物就再建资料 |
| 一盒实物 | 来源收藏/副本身份及 copy_index → inventory_id | 同一来源副本重导不加盒；BGG 与 BG Stats 中描述同一盒时关联已有 inventory_id；确实拥有两盒才保留两盒 |
| 一局对局 | provider + 来源命名空间 + 来源对局 ID + segment_index → play_id | 同来源同记录复用；两家来源可关联同一个 play_id；同天同游戏确实玩两局仍保留两局 |

已有数据库约束：`boardgames.bgg_id` 唯一；`boardgame_inventory_sources` 的来源/副本序号唯一；`boardgame_play_sources` 的来源/对局/分段序号唯一。`boardgame_import_mappings` 保存确认过的游戏、玩家、地点对应关系。

`Idempotency-Key` 只防止同一次 HTTP 请求重试重复执行，不能替代跨任务、跨文件和跨来源去重。

### 同来源的持续导入

- BGG：沿用同一账号身份。对局用 BGG play ID，收藏用 collection ID。不要把用户名展示大小写变化当成新账号。
- BG Stats：后续导出复用首次返回的 `source_dataset`，但每份新文件建立新任务。文件名不是数据集标识，文件哈希不是跨文件的对局身份。
- BG Stats 有 UUID 的对局按来源 UUID 识别。游戏、玩家、地点优先用规范化UUID复用已确认映射，RefId只作为当前文件内引用保留；无UUID时映射隔离到文件哈希。BGG只有账号名才作为可复用身份，只有显示名时逐条核对。
- 没有稳定 UUID/来源 ID 时，只能生成重复候选，不能宣称自动判重完成。现适配器对无 UUID 的 BG Stats 对局使用文件哈希命名空间；文件改变后不会自动认出旧局，必须先核对历史。
- 保留所有未知来源字段。不能为了让导入“全成功”而丢掉不支持的计分表、扩展或玩家信息。

### 两家来源或小程序已经记过同一局

先查已有来源关联，再比较本地游戏、实际玩家、游玩日期/时间、扩展、地点、成绩和时长。可靠且已核实的外部对局关联可以用于确认；名称、日期、玩家一致只构成候选，因为同一晚可能连续玩数局。

已确认同局使用 `link_play`，为现有 play_id 增加来源关系；不得再 `create_play`。不能确定时保留该项待处理，不自动合并，也不自动新增。不能从 BG Stats 的 `bggId` 随意推断出 BGG play ID，0 及含义未核实的字段不作为可靠关联。

实物同理：同款游戏不等于同一盒。跨来源选择 `link_inventory` 前核对实际持有者、版本和副本；不要只按游戏名称合并库存。

## 3. 每次续导都执行的顺序

1. **恢复进度**：分页读取已有导入任务、数据集和历史应用结果，核对上次哪些成功、哪些未处理。未完成任务优先续跑，不重建来源身份。
2. **读取新来源**：BG Stats 优先提交完整新导出；BGG 可以全量重查，或使用明确的日期区间。不能只取“上次游玩日期之后”，否则会遗漏后来补记的旧日期对局和历史修正。
3. **解析并保留原件**：等待任务解析完成，分页读取全部非 archive 项，保留 source_key、content_hash、normalized 及 issues。不要只处理第一页。
4. **先统一资料和身份**：依次匹配游戏/扩展、玩家、地点。已有资料优先复用；本地游戏尚未绑定 BGG 时也先匹配，再走受控绑定，避免新增一份。玩家以后与小程序用户人工对应，不按昵称自动绑定。
5. **逐项分类**：确认新增、同来源复用、跨来源关联、已有来源内容变更、待匹配/疑似重复、明确跳过。只有已确认的记录进入 apply selection。
6. **应用并核对**：先应用资料，再应用实物和对局；每批均读取最新 revision。202 仅代表任务接受，不代表落库成功。
7. **续跑失败项**：只重试或重新审阅未成功项目。已成功项目依来源关系保持原 ID；不要为了消除错误修改源 UUID、来源账号或 dataset。
8. **保存回执**：记录真实新增的本地 ID、复用及关联 ID、更新差异和未解决项。新对话首先读取这些任务和回执。

源记录在新导出中消失、`deletedObjects` 出现对象、收藏取消拥有标记，都不能触发本地历史或实物的自动删除。

## 4. 当前代码中存在的接口

以下路径均以 `/api/v1` 为前缀。执行前对照目标环境 OpenAPI 和当前 [路由代码](app/api/v1/boardgame_imports.py)。本文没有提供可直接运行的生产地址或凭据。

| 方法与路径 | 用途 |
| --- | --- |
| POST `/boardgame-imports` | 创建 BGG Thing、收藏或对局抓取任务 |
| POST `/boardgame-imports/bgstats-file` | 上传 `.json` / `.bgsplay`；multipart 提交 file、source_dataset、source_timezone、owner_user_id |
| GET `/boardgame-imports/datasets` | 查当前发起人以前使用的数据集及所有者 |
| GET `/boardgame-imports` | 分页读取当前发起人的任务 |
| GET `/boardgame-imports/{job_id}` | 读取任务状态、参数、revision、进度与错误 |
| GET `/boardgame-imports/{job_id}/items` | 分页读取来源项、规范化预览、问题和应用结果；include_archive=true 可读本任务原始归档 |
| PATCH `/boardgame-imports/{job_id}/items/{item_id}` | 保存该项的创建、关联、更新或跳过决策 |
| PUT `/boardgame-imports/{job_id}/mappings` | 保存明确的游戏、玩家、地点映射 |
| POST `/boardgame-imports/{job_id}/apply` | 安排应用 selection，只处理所选的已审阅项目 |
| POST `/boardgame-imports/{job_id}/retry` | 重试抓取/解析或指定失败项 |
| PATCH `/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}` | 更正本人任务已经导入的 held 对局，需同时检查 item 与 play 版本 |
| GET `/boardgames` | 搜索已有本地资料 |
| GET `/boardgame-inventory` | 查已有实物，不把资料总数当库存盒数 |
| GET `/boardgame-people` | 查可读的稳定玩家身份，可用 registered_only=true 查已注册玩家 |
| GET `/boardgame-plays` | 查公开对局；held 历史必须从原任务 items 读取 |
| POST `/boardgame-plays/duplicate-preview` | 普通对局的重复候选辅助检查；当前不包含 held，也不是跨来源完整判重接口 |
| GET `/boardgame-imports/capabilities` | 当前来源开关和实际适配状态 |
| GET `/boardgame-imports/{job_id}/mappings` | 分页恢复确认映射及其revision |
| GET `/boardgame-imports/{job_id}/mappings/{mapping_id}/history` | 读取映射更改审计 |
| GET `/boardgame-imports/{job_id}/items/{item_id}/preview` | 同源关系、旧/新来源差异、本地变更标志、相似局和当前私有详情 |
| GET `/boardgame-imports/{job_id}/report` | 状态/错误、实际操作结果数量和公开状态 |
| GET `/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}` | 读取本任务应用或复用的私有历史 |
| GET `/boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}/scoresheet` | 读取来源计分纸，仍受任务权限限制 |
| POST `/boardgame-imports/{job_id}/publish` | 带review_token及公开确认逐局发布核对完成的held历史 |

创建任务、文件上传、publish和 apply 请求必须带新的 UUID `Idempotency-Key`。同一请求超时后重发，沿用原键和原请求正文；用户修改决策后属于新的请求，使用新键。PATCH/PUT/retry 按当前契约使用 revision，超时后先读回状态，不盲目重复修改。

轮询遵守 `next_attempt_at` 和来源 Retry-After。任务进行中正常等待，避免密集调用 retry。

## 5. 请求示例

以下账号、ID、UUID、日期和版本号均为虚构示例，实际操作从接口返回值取得。不要照抄示例 ID 写入业务库。

### BGG 抓取

校验模型：`ImportCreate`。

```json
{"kind":"bgg_plays","username":"example_account","from":"2026-08-01","to":"2026-09-13"}
```

查全部历史时同时省略 from/to；查收藏使用 kind=bgg_collection，查标准详情使用 kind=bgg_thing、ids=[BGG游戏ID]。Thing 的 ids 每批最多 20。收藏和历史记录里的公共信息不能冒充已取得完整 Thing。

BG Stats 第一次上传可省略 source_dataset，保存响应中的 source_dataset；下次上传传回同一值。可通过 datasets 接口找回，但存在多个数据集时要确认对应哪一份原始库，不能任选第一个。

### 确认玩家映射

校验模型：`MappingsPut`。

```json
{
  "expected_revision": 3,
  "items": [{
    "provider": "bgstats",
    "source_namespace": "u:7:r:7:dataset:11111111-1111-4111-8111-111111111111",
    "entity_type": "player",
    "external_id": "uuid:00000000-0000-4000-8000-000000000021",
    "mapping_revision": 0,
    "target_person_id": 501
  }]
}
```

source_namespace 必须取当前 job.params；external_id取normalized中的source_player_ref/game_ref/location_ref，不直接填原始整数RefId，并核对原始身份。首次 mapping_revision=0；修改既有映射须取得真实版本，不能一直提交 0。target_person_id 不是小程序 users.id，须查清两者对应。匿名占位不能映射为一个全局玩家；按各局槽位区分。

### 已确认是新的对局

校验模型：`ItemPatch`。

```json
{
  "expected_revision": 1,
  "decision": {
    "action": "create_play",
    "target_game_id": 101,
    "players": [
      {"source_player_ref":"uuid:00000000-0000-4000-8000-000000000021","source_slot":1,"person_id":501},
      {"source_player_ref":"uuid:00000000-0000-4000-8000-000000000022","source_slot":2,"person_id":502}
    ],
    "acknowledged_issues": []
  }
}
```

已存在且确认不变的来源身份可由服务复用，响应中会返回原 play_id。issues 必须逐项解释后处理，不能机械地把全部问题塞入 acknowledged_issues。已验证且自洽的赢家、团队/合作结果可投影；缺少赢家证据、名次/分数冲突等情况保持unknown并进入核对。未支持结构可用经过核验的完整decision.play修正，不能把“原件仍在”当成全部结果已正确写入。

### 已确认是已有的一局

校验模型：`ItemPatch`。

```json
{
  "expected_revision": 1,
  "decision": {
    "action": "link_play",
    "target_play_id": 801,
    "target_play_revision": 4,
    "reason": "已核对为同一局，只增加另一来源关联"
  }
}
```

link_play 不覆盖本地成绩。对局已关联到另一 ID 时出现冲突，应核对已有关系，不能重新创建绕过。

### 批量应用

校验模型：`Apply`。

```json
{
  "expected_revision": 6,
  "selection": [{"id": 301, "expected_revision": 2}]
}
```

这里 expected_revision 是最新 job revision；selection 每项为该 item 保存决策后的最新 revision。一批上限 1000 项。apply 完成后逐项读取 state、error_code、applied_result 和 plays；任务有部分成功时，不能把整批再次当成新增导入。

## 6. 来源内容变更及中断恢复

- 来源 ID 相同、content_hash 相同：复用以前的本地资源；新增本地对局数为 0。
- 来源 ID 相同、content_hash 不同：表示已有记录发生变化，进入差异核对，不建立新对局。核对本地是否也改过，再决定保留本地、更新本地或暂不处理。
- 当前 `update_play` 只更新本人已导入的 held 对局，要求 target_play_id、目标最新版本和 reason。已公开记录不通过来源更新接口自动覆盖。
- 对局已有计分表时，名单、分数、规则和计分表必须一致。预览提供旧/新来源差异及当前本地值；不自动三方合并。更新来源记分纸须明确replace_scoresheet=true，原子替换并保留原件，有冲突时保留待处理。
- BGG quantity>1 时，每个分局必须单独审阅并提供 segments；不能把同一份总时长和成绩复制成多局。小程序已提供逐局编辑器，本机草稿按账号隔离；segment_player_slots 将分局参与者关联到本次核对的来源槽位，null表示另选的本地参与者。整条来源任一分局失败整体回滚。后续重导应复用同一来源分段关联，详见 [一期收尾契约](design/boardgame-library/15-phase-one-closeout.md)。
- 收藏来源 quantity 改变、无 UUID 的副本重排、来源对象删除，均作为库存变更处理；不自动补造实物或减掉已有实物。
- 409 revision_mismatch：重新读取最新记录、比较差异后再提交。409 source_changed/source_link_conflict/source_owned_elsewhere：解释来源冲突，不更换来源键绕开。
- 网络超时或 worker 重启：从 job/items 恢复，以已提交的每项应用结果为准；成功项目不重做。只对接口允许的失败任务/失败项使用 retry。

不得在未知数据库连接配置下直接运行 worker 脚本。已经确认本地隔离环境时，worker 入口为 [run_boardgame_import_worker.py](scripts/run_boardgame_import_worker.py)；`--once` 只处理一次可领取工作，不代表整个多页抓取或整批导入已完成。正常导入优先使用已部署环境的 worker。

## 7. 给后续对话保留什么

导入任务、来源关系和身份映射存数据库，作为权威进度。每次另留简洁回执，保存于该用户的私有导入记录位置，不提交真实回执到 Git：

- 目标环境标识、数据所有者、导入发起人、时间和所用接口版本；不含凭据。
- provider、BGG 账号或 source_dataset、文件哈希/抓取区间、job_id。
- 各 item 的原始来源身份、来源版本/哈希、处理动作、本地 ID 和处理后 revision。
- 新增桌游数、新增盒数、新增对局数；复用、关联、更新、跳过及待处理数分别列出。
- 需要人工匹配的玩家、疑似同局、冲突字段和尚不支持的结构。

不能只留“已导入 N 条”。新对话必须能够找到原 source_dataset、原 job 和原本地 ID，判断下一次是追加、关联还是更新。任务清单和数据集清单必须可分页/枚举恢复，不能把上次聊天文本当成唯一保存位置。

## 8. 当前实现和适配边界

| 能力 | 当前行为 |
| --- | --- |
| 数据集/映射/任务恢复 | 均有GET和游标分页，可跨对话读取版本，不依赖聊天记忆 |
| UUID及重复应用 | RefId重排但UUID不变时复用游戏和玩家；同源对局复用原ID；缺UUID时不继承跨文件身份 |
| 跨来源候选 | item preview返回同游戏/日期/已映射玩家候选，包含本人held及可读公开对局；须人工确认关联，不按粗略指纹自动合并 |
| 变更差异 | 返回旧来源/新来源差异、locally_modified和当前本地详情；不自动覆盖本地更正 |
| 处理报告 | application_outcomes区分created/reused/linked/updated/skipped；每组含items/games/inventory/plays，统计已成功操作快照；publication_counts按本任务涉及的不同play_id统计 |
| 新任务复用旧局 | 可继续通过新任务核对、读取、发布复用的私有历史，不篡改最早来源关联 |
| 受控公开 | selection包含item_id/play_id/expected_revision/review_token，另需job版本、原因、acknowledge_public；未绑定人物需acknowledge_unmatched_people |
| 发布后筛选 | 整批核对通过后，仅将已发布对局引用的人物、观察者和地点设为可见，保证排行下钻和筛选可用；不自动绑定小程序账号，未发布历史独有的身份仍私有 |
| 来源记分语义 | 已知团队/合作、日期/时区、轮数、变体、备注、价格、数值/安全算式可投影；已知v1个人数值/文本计分表可展示。未知规则或其他版本保留原件并留待核对 |
| BGA/Yucata | 尚未核实可用的官方外部历史接口和账号条件，capabilities如实报告unavailable；不把其他开发接口冒充历史接入 |

报告数量按成功来源项的动作及关联ID计算，不能将同一结果经不同来源引用理解为新增多条物理记录。分页items保留逐项本地ID和问题；实际完成后同时核对资源总数和来源关联。当前实现不是无人值守的模糊匹配系统。

发布操作需要真实用户的公开意图，并遵守授权的环境范围。仅获准本地测试时，只能在隔离的本地数据库展示真实历史；提交到代码库的样例测试只处理虚构记录。

如果旧版本已发布的历史仍引用不可见人物或地点，可在获准的目标环境备份后，用 `boardgame_import_review.publish_referenced_identities` 对这些已发布对局执行一次修复并提交事务。该函数拒绝未发布对局，保留账号绑定和归档状态，并记录可见性审计。此项无需表结构迁移。

## 9. “追加且不重复”的验收清单

使用完全虚构 fixture 与 mock BGG，不拿用户真实文件测试写入：

| 用例 | 必须得到的结果 |
| --- | --- |
| 同一文件连续上传两次 | 第二次桌游、库存盒、对局新增数全部为 0，原 ID 不变 |
| 新完整导出只多 2 局、1 款游戏 | 只增加对应的 2 局和缺少的 1 款资料；旧记录不动 |
| 旧日期后来补记 1 局 | 能被发现并追加，不因日期早于上次导入而漏掉 |
| 同 UUID 对局改分/改玩家 | 提示已有记录变更，不创建新局；更新保留 play_id |
| 同一局同时存在于 BGG、BG Stats、小程序 | 确认后只有 1 个 play_id，多份来源关联；只计 1 局 |
| 同天同游戏同玩家实际玩 2 局 | 两局都保留，不按粗略指纹合并 |
| 有疑似重复但证据不足 | 留待核对，不新增也不合并 |
| 两家来源记录同一盒 / 实际拥有两盒 | 前者关联 1 盒，后者保留 2 盒，不混用作品去重和实物去重 |
| 本地和来源分别改过同一局 | 显示差异，不静默覆盖或退回旧来源成绩 |
| worker 中途退出、请求超时、两个任务并发 | 续跑/重试不增加重复来源关系、对局、库存或计分项 |
| 来源 RefId 重排或缺少 UUID | 不发生错误身份映射，不把所有旧数据直接当新数据 |
| 新开对话后继续导入 | 可从 API 恢复 dataset、映射版本和处理结果，不依赖聊天记忆 |

回归入口：[导入测试](tests/test_boardgame_import.py)、[接口测试](tests/test_boardgame_api.py)、[离线测试](tests/test_boardgame_sync.py) 及 [前后端联调](tests/test_boardgame_frontend_contract.py)。已测范围包括重复导入、字典RefId重排/缺UUID隔离、私有读取/映射、版本与发布令牌冲突、来源更新、分局和mock BGG重试。完整测试结果见[验证报告](design/boardgame-library/verification.md)。真实文件写入、真实外部账号及大规模并发/断电故障演练未验收，上表仍是实际导入时的逐项核对清单。

本轮含0013/0014迁移和业务代码，不能按旧版“仅文档修改”部署。上线和回滚按[完整方案](boardgame-library-technical-solution.md)执行；关闭入口与worker保留数据，不对已有业务库直接downgrade。
