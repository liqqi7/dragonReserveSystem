# BG Stats 展示与统计扩展契约 v3.1

> 此文保留 v3.1 基线设计/样例。当前已实施 v3.2，原生选人使用 user_id，统计定义版本5；记分纸计算、个人收藏/成本、历史发布及离线补传以 [当前实施契约](12-v3.2-implementation-contract.md) 和 [运行OpenAPI](openapi.json) 为准。旧版样例仅用于基线回归，不直接当作当前完整请求。

最新实施细则见 [3.1 实施契约](09-implementation-contract.md)。

日期：2026-09-13。用户已要求将此前缺少的展示字段与统计接口加入技术方案；本文件现为 [完整技术方案 v3.1](../../boardgame-library-technical-solution.md) 的正式开发契约，替代 v2.1 的能力评估和候选方案。数据字典、26 表 DDL、路由、DTO、公式及验收已同步；业务 API、实际导入、迁移和小程序尚未实现。

## 1. 本版交付范围

一期增加：具名未注册玩家的跨局身份与成绩、地点及线上属性、初玩记录、游玩天数/H-index/次数里程碑、人数/星期分布、共同参局和角色分析、团队/合作/单人专用统计对象、计分表展示及同规则分项统计。既有提名、库存、扩展、活动和普通对局规则继续适用。

AI/OCR/翻译、分类机制中英文映射、标签/保存的筛选、挑战管理、购入成本分析不在本版新增范围。BG Stats 官方功能仅作参考，本系统按下述明示口径统计，不承诺数字或页面逐项复制。[官方 Insights](https://www.bgstatsapp.com/explanations/insights/)、[Power Expansion](https://www.bgstatsapp.com/expansions/power-expansion/)

D08 继续生效：导入生成 held 数据；提供管理预览，不进入公开详情、筛选项或全体/我的统计。设计统计接口不等于启用历史发布，本版不提供 publish/unpublish 路由。普通手录已发布记录可使用新增字段和统计。

真实文件基线：215 条主局、69 款实际主游戏、562 个玩家槽位、45 条扩展关联、20 份计分表。125 局明确线上，其余 90 局未知；62 局有正时长、153 局时长未知；匿名占位出现 69 次。原始游戏字典有 226 项，不能都算玩过；扩展关联不能把 215 局加成 260 局。更多核验见 [07](07-bgstats-real-export.md)。

## 2. 稳定玩家与地点

### 2.1 身份模型及权限

`boardgame_people` 的 person_id 是具名玩家身份；user_id 可空且唯一，只有绑定账号后才有“我的”关联。未注册朋友也用 person_id；真正匿名的槽位仍用局内 guest_key。people 不参与登录、打卡资格、实物所有权或修改权限授予，这些仍使用 users.id。

参局行 person_id 与 guest_key 恰有一个，具名玩家同局唯一。匿名占位同局重复必须拆成独立槽位，不能建立 people 或全局匿名映射。按 person_id 统计跨局人数；匿名只统计人次，不计入 named_player_count 或玩家榜。registered_player_count 是具名玩家中当前绑定账号者的去重数量。

成员可新增手录的具名玩家/地点，服务置 is_visible=true；管理员可编辑、归档、绑定账号及合并玩家。绑定账号必须明确指定用户，不从昵称、userInfo.meRefId 或 BGG 用户名自动完成。创建供成员目录选择的已注册玩家时也由受控服务建立 people，不允许通用 PlayerInput 创建任意账号关系。

首次实施迁移为现有 user/admin 成员幂等建立绑定账号的 people；以后成为成员的角色变更事务也调用同一 provision 服务，唯一 user_id 防重复，GET 目录不创建数据。其他绑定操作仍走显式管理员流程。

导入新建 people/locations 默认 is_visible=false，只在该任务发起管理员的管理上下文中可读；重用已有公开身份不降低其可见性。公共选项/详情仅返回 is_visible=true 的记录；归档身份保留统计和历史详情，默认录入选项不展示。所有历史发布前须核对关联身份/地点的公开名称；当前没有将 internal 改为 public 的通用 PATCH 开关。记录公开手录局时不可引用 internal 身份或地点来绕过导入限制。

单局展示用保存时的名字快照，玩家分析用当前安全显示名。改名不修改历史快照。对已有账号的绑定、解除绑定和合并都需管理员、版本、原因和审计；解除不删 people/成绩。绑定同一 user 已有 people 时返回 409，先走合并预览。同名不自动合并。

### 2.2 合并与并发

合并预览给出双方 revision、受影响局及重复参局冲突；同一局已有两个 person 时拒绝自动合并，不丢弃任何一份成绩。先纠正各局身份后重新预览。合并不合并 play、不累计复制分数；迁移参局外键和导入映射，源 people 归档并 merged_into_id 指向目标；源账号如需转移，先清空源再绑定目标，最终唯一。

锁顺序沿用用户→活动→游戏；身份/地点按 ID 升序在对局聚合锁之前锁定。合并先确定受影响集合，再锁相关用户/活动/游戏/people/plays，锁后重查集合，变化则重试。普通写入也锁其 person，避免合并过程中新增旧身份引用。资料合并、身份变更和对局更正都在提交后失效统计缓存。

`scope=mine` 始终是 EXISTS(play_players JOIN people ON person_id，people.user_id=当前账号)。代记不算参局，未确认的来源“本人”不算绑定。person 与账号关联改变后，“我的”基于最新确认关系重新查询，且 held 仍被排除。

### 2.3 地点、线上属性和初玩

plays.location_id 可空，location_label 是安全展示名快照。非空 location_id 由服务从可读地点复制名字；手录仅填 label 时可作为未归类地点保存，不能按同名自动生成/合并地点，统计落 unknown 组。地点归档保留 FK；无物理删除入口。内部地址、来源备注不进入公开 DTO。

play_environment=online/offline/unknown，默认 unknown。仅明确 isOnlinePlay=1/true 映射 online；本文件其余 90 局未知。其他来源明确的线下信息须适配器验证或人工确认后写 offline，不能用 origin 或地点名推断。界面同时提供“未知”，避免被默认线下筛选吞掉。

play_players.is_new_to_player 是 nullable boolean，明确 newPlayer=true/false 才映射相应值，缺失为 null。来源初玩和 first_recorded_on（本系统可见历史的首个日期）分开返回；不能把后者显示成人生首次。first_recorded_on 从全部可见完成局按 person+game 求最早日期，不先限定查询月份；同日多局不擅自选择哪局是首次。

## 3. 共用过滤契约

所有对局统计与钻取复用一个唯一 play_id 集合：published、completed、stats_exclusion!=all；abandoned 另用相同筛选计数。范围、时间、活动仍见 04。新增过滤只适用于对局统计，wanted 不接受这些参数，传入返回 422。

| 参数 | 规则 |
| --- | --- |
| environment | all（默认）/online/offline/unknown |
| location_ids | 重复 query 参数，去重后最多 50；OR；与其他维度 AND |
| location_missing | true 仅 location_id 为空；不能与 location_ids 同传；不传不限制 |
| person_ids + person_match | 最多 50；match=any（默认）/all/exactly；any 至少命中一人，all 包含全体所选人，exactly 实际玩家集合恰为所选且没有匿名槽位 |
| player_counts | 最多 100 个 1–100 的整数，OR；取实际参局行数，包含匿名，不取游戏建议人数 |
| expansion_ids + expansion_match | 最多 50；any/all/exactly，仅匹配附属扩展；exactly 不含额外扩展 |
| without_expansions | true 只取无附属扩展；与 expansion_ids 互斥 |
| new_to_person_id | 在筛选出的局中，此人的 is_new_to_player=true；不等价于“该人曾在别的局第一次玩过这款” |
| user_id | 兼容单个已注册玩家查询，服务解析为 person；与 person_ids 同传拒绝；在 mine 下若指向另一用户拒绝；已注册但还没有 person 时返回空集合 |

没有 ids 不允许传对应 match，空数组拒绝；不支持的过滤返回 422。location/person 是 internal 或不存在时统一 404；公开但无匹配结果时 200 空集合。独立分析其他 person 不改变公开范围；mine 与 person_ids 可组合表示“本人和这些人一起参与”。筛选范围与趋势 bucket 独立，所有响应回显完整 filters；游标绑定规范化排序后的过滤条件，改变条件须重新分页。

分数统计仍需 comparison_key，不能用单纯 location/player 筛选代替规则可比性。player_count 单值旧参数兼容为 player_counts 的一个值，同时传入拒绝。

## 4. 新增指标与分母

| 指标 | 定义 |
| --- | --- |
| played_day_count | 完成基础集合 DISTINCT played_on |
| h_index | 将主游戏局数降序排列，最大的 h 满足至少 h 款各玩 ≥h 局；空集合 0，服务端在完整过滤集合计算后再分页 |
| play_milestones | 固定阈值 5、10、25、100，各自计满足局数≥阈值的主游戏款数；档位可重叠 |
| named_player_count | 基础集合中非空 person_id 去重，含未注册具名朋友 |
| new_to_player_game_count | 必须指定 subject_person_id 或 scope=mine；按该人明确初玩标记为 true 的过滤内完成局去重主游戏；无主体则 null，并返回 reason=subject_required |
| average_duration_minutes | 已知时长总和/已知时长局数；全未知为 null，不把缺失当 0 |
| 星期/人数/地点/环境分布 | 每局只计一次，分别返回局数、已知分钟、已知/缺失样本；无局桶时长 0，有局全未知时长 null |
| 共同参局 | 主体参与的过滤内完成局中，按其他 person_id 计不同 play_id；排除主体和匿名。不同伙伴次数相加可大于总局数；合作/同队仍是共同参局，不自动构造对战胜负 |
| 角色分析 | 单款、单模式、comparison_key 内按 role_label 精确分组，空白合为 null 未知组；同局多人同角色是多个人次，同时另回 play_count |

`results_by_mode` 固定包含 individual/team/cooperative/solo 四个对象。all 范围的 individual 分母为全部具名/匿名玩家的 resolved 结果样本，team 分母为 resolved 队伍样本，cooperative/solo 分母为 resolved 对局；scope=mine 或明确 subject_person_id 时分别筛主体玩家、本队、本人参加的局。每对象回传 sample_unit=player_result/team_result/play、eligible_samples、unknown_result_play_count，避免混用。

individual/team 返回 wins/draws/losses，cooperative/solo 返回 successes/failures；忽略胜负的局不进以上分母。仅 game_id 已指定时返回对应 win_rate/success_rate，未指定时 rate=null、rate_reason=game_required，防止跨游戏混排。胜率 wins/eligible_samples，合作或单人成功率 successes/eligible_samples，分母 0 则 null。并列胜出按原规则各算胜场，不能通过总榜加总胜者数推算局数。

单款 PlayerStatsRow 以 person 为主体；individual 的个人得分、team 的“所在队成绩”、cooperative/solo 的共享成绩用 result.kind 和 score.sample_unit 区分。团队不产生个人得分排名。comparison_key 缺失时分数对象为 null，mode 不允许混传；竞技按 rate 排名，合作/单人按 success_rate 排名均显示样本，unknown 不伪装 0%。跨游戏玩家榜仅按参局数。

## 5. 计分表、分项与一致性

### 5.1 存储和解析

`boardgame_play_scoresheets` 每局一个当前采用版本，display_data 是用于渲染的结构化快照，原始字符串及所有其他来源仍在 import_items。`boardgame_scoresheet_cells` 为可重建投影，跨局统计直接聚合这些数值列，不在每个请求扫描原始导入 JSON。26 表包含这张分项表，不另建可手改的排行榜汇总表。

适配 groups[].rows[] 与 rounds[].rows[] 两种结构；scoreUuid 通过 source_slot 对应本地参局行 id。row_key 在整张表内唯一，包含必要的分组/轮次路径；只有模板行语义和轮次定义明确相同时才跨局同组比较。缺失单元格也为该行/适用主体生成 value_number=null 投影，以便准确计缺失样本。0、负数有效；非数字保留 value_text 并计缺失数，不执行公式。

subject_kind 为 player/team/shared；subject_key 由服务生成为 p:参局行ID、t:队伍ID 或 shared，数据库用复合 FK 保证主体与 sheet 属于同局。个人模式按玩家，团队按队伍，合作/单人按共享主体；未知源团队或计分归属保持 partial/unsupported，不把成员分自动加成队伍分。总计/小计行 is_aggregate=true，默认分项统计不含这些行。

schema_version 是 DTO 格式版本；projection_version 是解析规则版本；play_revision 是创建本投影时的父局版本。parse_status=parsed/partial/unsupported。只有 parsed、所有 cells.projection_version 等于 sheet.projection_version、sheet.play_revision 等于 play.revision 且比较键非空才进跨局分项统计；部分可读表仍能展示，响应列明 warnings。

### 5.2 同规则比较及分项占比

sheet_comparison_key=SHA256(对局 comparison_key + 已审核模板的规范行定义 + 主体粒度 + 计分语义版本)。单纯源模板 ID 或中文行名相同不算兼容；没有可靠模板语义时 key=null，只读展示，不将其降格混入标准模板。只有声明分项可相加且选择了完整有效加项行的模板才支持 contribution_rate；否则 null、reason=non_additive_or_unknown_template。

每组、每行按适用主体样本返回 sample_count、numeric_samples、missing_samples、average/min/max。min/max 表示数值极值，不默认叫最佳成绩。占比使用同一组完整样本的该项数值合计/全部加项合计：缺一项的主体从整个占比计算排除，分母 0 返回 null，不取“各局百分比的平均”。负项允许负占比，明确这是计分贡献，不绘制不能表示负数的饼图。返回 contribution_samples 和原因；不覆盖来源最终总分。

### 5.3 写入、更正、读取

公开单局计分表 GET 与 PlayDetail 相同权限，held 统一 404；导入任务 item 提供规范化管理预览。公开响应只有渲染白名单，不返回原文件路径、源内部备注或完整 metadata。

手录计分表 PUT 使用 schema_version=1 的规范 DTO；不要求能填写任意 BG Stats 公式或下载模板，成员只能在自己有权编辑的对局上填写数值/文本并显式录入总分。已完成局须 reason 和 expected_revision；服务校验各引用、数值精度、大小和模板。模板未审核仍可保存、显示，但无跨局分项分析。scoresheet 模板审核接口仅管理员可用。

改参局名单时保留未变玩家的行 id；PlayerInput.patch 可带该局既有 id，新行无 id。不能用全量删除重插令 scoreUuid 关联失效。删除被计分表引用的玩家/队伍，或更换游戏/规则/扩展/模式时，须在同一事务提供更新后的 sheet 或明确 clear_scoresheet=true（与 sheet 互斥），否则 409 scoresheet_update_required。清除当前表先追加审计，源原件仍保留；分项随 sheet 删除。

普通父局变更如备注/日期也更新 sheet.play_revision；影响比较的变更重算比较键/重建投影。只有通过验证的同一事务才更新全部父/子版本，失败回滚。导入重试、来源关联、手录更正不产生第二份 active sheet；跨来源冲突须明确选择，绝不因为关联第二个来源而复制单元格。

## 6. 路由和展示结构

完整路径/权限收录在 [03](03-api-and-bgg.md)，请求响应示例在 [06](06-api-contracts.md)。新增 `/boardgame-people`、`/boardgame-locations` 管理安全身份及筛选项；统计增加 `/breakdowns`、`/partners`、`/locations`、`/games/{id}/roles`、`/games/{id}/scoresheet-groups`、`/games/{id}/scoresheets`，并扩充 overview、players、trends。

所有普通统计返回 definition_version="3"、scope、filters、generated_at、data_start_date、excluded_summary。分页排行还含 total_items、next_cursor、has_more；每行回稳定 drilldown。角色和分项的钻取除局过滤外含 role_label/row_key/sheet_comparison_key，可从 `/boardgame-plays` 筛出同一批局；NULL 角色使用 role_missing=true，不能用字符串“未知”冒充真实角色。

统计页新增概览卡、时间/热力图、分布图、伙伴表、角色表、地点表；单局详情可打开计分表，游戏详情先选可比计分组再显示分项。空集合、无已知时长、无有效结果、模板不可比各给真实空态和样本说明。宽计分表横向滚动，行列标题保持可辨；不将超宽表缩成无法阅读的小字号。

## 7. 实施、限制及验收

I1 建完整 26 表和身份/地点维护；I2 导入适配和源映射；I3 原提名/计划；I4 对局/身份引用/计分表事务；I5 统一过滤、各模式统计、分项分析和小程序联调。当前无业务迁移，实施时直接按新基线建表；若某开发环境已应用旧草案，应另建增量迁移及数据核对，不重写已应用迁移。

旧草案 user_id 玩家行迁为 people；仅有名字的历史 guest 不自动跨局合并，须依可靠来源映射或人工确认。DDL 新增字段默认 unknown/null，原数据不补造线下/初玩。回滚优先关闭功能、保留新表；不回滚至仍按 user_id 直接查询 player 表的应用版本。

真实文件可证明格式可读，不能证明全部模板具有可比语义；同样，没有实际团队/合作源样本不能声称这两个源适配器已验证。新验收 A26–A35 见 [04](04-statistics-and-acceptance.md)，离线公式及本机参考结构的实际结果见 [验证记录](verification.md)。

## 8. 主体过滤与身份管理补充

person_ids 始终筛选“哪些局”，不直接删掉这些局中的其他参局者。overview/partners/roles/scoresheet-groups/scoresheets 另接受 subject_person_id 指定“分析谁”；不传时 all 分析全部主体，mine 的角色/分项分析只分析本人。partners 必有主体，默认本人，未绑定则空。分项个人主体取其玩家行，团队取其所在队，共享模式取其所参局共享主体；all 返回完整主体集合，不因 team 有多人而复制 cell。

内部人物的后续账号绑定/合并使用 03 的导入任务限定路由，同一验证器和事务，不能为了绑定账号先公开历史人物。迁移和角色变更自动 provision 的账号人物如果与已导入朋友重复，须经过无冲突合并后建立统一身份；不改游戏次数。合并公开和内部 person 仅迁移身份引用，公开名称保持目标公开名，导入原件和 held 仍受原权限限制。
