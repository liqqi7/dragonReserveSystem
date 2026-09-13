# 桌游库与对局管理完整技术方案

版本：3.3；更新：2026-09-13；本地分支：`codex/bgg-sync`。本方案按已确认的 D01–D14、R01–R19 及 [E01–E16](design/boardgame-library/11-expanded-scope.md) 实施。当前交付包含后端、34 张领域表及三份增量迁移、来源 worker、12 个真实小程序页面、缺失原型和本地验证；实际验证结果及设备限制见 [验证报告](design/boardgame-library/verification.md)。尚未部署、未导入用户真实数据。

## 1. 契约入口

| 文档 | 职责 |
| --- | --- |
| [需求及已确认决定](boardgame-library-scope.md) | 原始业务范围、确认记录和索引 |
| [3.2 范围](design/boardgame-library/11-expanded-scope.md) | v3.2新增及明确排除项 |
| [基础实施契约](design/boardgame-library/12-v3.2-implementation-contract.md) | 当前字段、逻辑、接口、权限、统计和来源语义 |
| [数据模型](design/boardgame-library/02-data-model.md) | 34 表职责、关系和生命周期 |
| [逐列字典](design/boardgame-library/database-columns.md) / [MySQL DDL](design/boardgame-library/database-schema.sql) | 从当前 SQLAlchemy metadata 生成的列、NULL、默认、FK、CHECK 和索引 |
| [运行接口 OpenAPI](design/boardgame-library/openapi.json) | 从 FastAPI 路由生成的路径、请求模型、类型和验证限制 |
| [持续导入说明](boardgame-import-runbook.md) | BGG/BG Stats 数据集、人工匹配、去重、恢复和受控发布 |
| [真实小程序页面](design/boardgame-library/10-mini-program-pages.md) | 入口、页面职责、接口和状态 |
| [名称搜索与确认录入](design/boardgame-library/14-name-intake.md) | v3.3已实现：名称→BGG候选→选择版本→原子入库；含迁移与恢复机制 |
| [一期功能收尾](design/boardgame-library/15-phase-one-closeout.md) | 管理入口、扩展展示、分局导入、展示字段与UI验收范围 |
| [后续OCR设计](design/boardgame-library/13-photo-recognition.md) | 图片识别出搜索词后复用名称流程；图片与模型调用尚未实施 |
| [原型说明](../prototype/boardgame-library/README.md) | 可编辑补全画布、关键交互、截图及视觉检查 |
| [实施记录](design/boardgame-library/implementation-status.md) / [验证报告](design/boardgame-library/verification.md) | 完成范围、实测结果、部署与回滚边界 |

03/06/08/09 保留 v3.1 基线推导和样例；出现差异时以 12、14、15 和运行 OpenAPI 为准。统计定义版本从 4 升为 5，来源解析版本为 3。

## 2. 业务设计

资料和实物分开：一款游戏共用作品资料，每盒实物单独记录归属、版本、状态、购入日期、价格、币种、排序和活动可用性。用户提到的“库存一张表”由 `boardgame_inventory` 实现；多对多扩展、活动提名和历史对局不能塞进同一行。

BGG 可选。手动录入本地名称、别名及资料即可使用；BGG 完整响应与人工覆盖分开保留，刷新不能覆盖用户手填中文名。BG Stats 的 BGG ID 作为身份线索，不冒充已抓取的 Thing 详情。分类、机制和未识别字段保留原始来源，一期不翻译或展示映射。

一场活动可有多个计划游戏，一款本体可选择若干扩展及模块，计划与实际游玩分别记录。活动创建者/已报名成员可提名，开始前可改；“最想开”累计跨活动提名人次，不跨场去重，同时返回活动数。延期后按新开始时间重开仍符合资格的提名；已撤回提名不自动恢复。

签到参与者可以替其他桌录局，记录人不必参局，统计以实际玩家为准。原生日常人类选小程序用户，导入历史保留来源人物，之后单独人工匹配。公开对局在登录小程序范围内可读；历史默认 held，核对后明确发布。

成绩区分未填写、0、摆烂、没开完、掀桌。摆烂保留参局并计已知未获胜；个人没开完/掀桌不自动判负，整局未完成不计完成局。支持个人/团队/合作/单人/不记胜负、只指定赢家和同分决胜。详见 12 的状态表。

## 3. 工程和数据库

采用现有 FastAPI、SQLAlchemy、Alembic、MySQL、Bearer JWT 和微信小程序组件。API 按资料/对局/统计/收藏/导入/同步分路由；服务层共享身份、权限、版本、结果和筛选逻辑。SQLAlchemy metadata 同时支撑 SQLite 回归和 MySQL 迁移。

| 表组 | 内容 |
| --- | --- |
| 资料与实物（4） | boardgames、inventory、inventory_sources、expansion_links |
| 活动（5） | activity_game_settings、nominations、nomination_expansions、plans、plan_expansions |
| 对局与人物（9） | plays、play_expansions、play_teams、play_players、play_observers、play_sources、play_reports、people、locations |
| 规则与记分（4） | rulesets、scoresheet_templates、play_scoresheets、scoresheet_cells |
| 收藏与筛选（6） | preferences、prior_plays、tags、game_tags、play_tags、saved_filters |
| 来源与事务（6） | import_jobs、import_items、import_mappings、request_keys、audit_events、sync_operations |

除 activities 相关前缀及 boardgames 外，表名以 boardgame_ 开头。完整精确表名见数据字典。原 26 表由 `20260913_0013` 建立；`20260913_0014` 增加8表及扩展列；`20260913_0015` 为库存增加独立的所选版次快照JSON。既有 users/activities/activity_participants 保持原业务主键；已有用户回填独立 Person。

ID 使用有符号 INT，与旧表一致；来源身份/请求键有唯一约束。分数 DECIMAL(12,3)，成本 DECIMAL(14,2)，API 使用字符串。时间沿用上海本地 DATETIME(6)，输出带 +08:00；只有日期的历史不捏造精确开始时间。

外键与 CHECK 保证身份互斥、同局队伍/单元格引用、状态与数值范围；跨行的活动权限、兼容性、结果一致性由服务校验。参考 DDL 目标语法为 MySQL 8.0.16+；本轮本地实测版本和目标环境试迁移要求见验证报告。

## 4. 接口与事务

全部接口位于 `/api/v1`。OpenAPI 中当前有97条路径、121个操作，动态统计路径可对应多种白名单指标。通用列表返回 items/has_more/next_cursor，默认20、最多100；所有统计带定义版本和筛选回显。

写操作检查当前账号、资源权限、expected_revision，锁账号和聚合后落库；POST 创建及批量应用使用 UUID Idempotency-Key，重发同一次请求沿用原键。客户端改过正文后须新键。同局玩家/队伍/计分纸/最终成绩在一个事务更新，保留稳定子行 ID。409 返回可识别原因，前端保留填写内容供核对。

旧活动接入 get_activity_by_id/list_activities/list_my_activities 的生命周期挂钩，在活动状态/报名/角色变化时更新提名资格；删除活动前保留历史对局活动快照和 original_activity_id。对局引用活动/计划为 SET NULL，提名/计划可级联删除。游戏、实物及人物历史引用受保护，对局作废而非物理删除。用户已有提前签到逻辑和日程原生渲染不在本次改动范围。

接口族包括：资料/扩展/实物；活动提名/安排；对局结果预览/保存/更正/计时/报错；记分纸/模板；公开统计及钻取；个人偏好/成本/标签/保存筛选；私有导入核对与发布；离线补传。基础路径、权限、字段在 12 中列出；名称录入与本轮增量分别见14、15。

## 5. 记分纸和统计

通用 v2 记分纸支持数值、单选、勾选、文本、辅助项、重复行和小计；支持安全四则括号，保留原输入。按累计总分、最佳一轮、赢得轮数或仅记分计算，不执行任意代码；未知值不转0。模板按游戏/扩展/变体/人数选择并保存版本快照，旧局不随模板更新。

统计以公开有效对局为基础，共用日期、活动、我的/全体、人物组合、规则组、扩展、环境、地点、角色、初玩、先手、标签及排除条件。个人/团队/共享分数采用各自样本单位，不重复计算共享成绩；胜率不混游戏，一局有效结果可上榜。

覆盖最想开、开的最多、玩家成绩、游玩日/H-index、日期/活动趋势、人数/环境分布、伙伴/地点/扩展、当前和最长连胜、先手/初玩胜率、平局/决胜、轮数、分差、胜者均分、最高落败分、得分曲线、角色/变体组合、按胜负的计分分项。每个指标展示有效/缺失样本和可复现的钻取条件。连胜接口拒绝会提前剔除输局的结果筛选。

成本按明确使用的每盒实物计算，人民币/其他币种分开，不换汇；分母为使用该盒的有效完成局、已知时长、人次、人时。没有实物引用、价格或时长时明确缺失。个人评分、愿望单、预订、长期想玩与活动提名独立。无明细“以前玩过/约N次”仅补收藏覆盖，不虚构日期/对手或进入月份/胜率分母。

## 6. 来源、隐私与恢复

BGG 查询用官方来源，只存服务端令牌。Search 有短缓存；Thing/Collection/Plays 用持久任务，worker 租约、上游串行锁和退避重试控制重复及限速。BG Stats 本地文件解析不依赖 BGG 开关。实际外部连接状态由 capabilities 返回。

导入文件写到 `BOARDGAME_IMPORT_ROOT`，位于 `MEDIA_ROOT 外`，不走公开静态目录，按哈希寻址；完整 XML/JSON、未知字段、来源参数、哈希和解析版本保留。20 MiB、128层、50,000局等限制在解析前后检查；不访问来源文件里的本机路径。

同源按 UUID/来源键复用，来源改动先核对；RefId 只在单份 BG Stats 文件内定位，跨文件优先 UUID。显示名不自动匹配。跨来源同局由候选提示加明确关联建立多来源对一个 play_id；同一天玩两局仍可分别录入。导入 quantity>1 要逐局确认分数/日期，不复制合并值。分局编辑器按账号保存本机草稿，提交segments及segment_player_slots；worker按已确认来源槽位匹配人物，每局单独保存，任一分局失败则整条来源回滚。来源删除不删除本地历史。

核对接口返回旧来源/新来源差异、当前本地记录及本地更改标志，报告区分实际新增/复用/关联/更新/跳过。held 发布检查 job/play/mapping 版本和 review_token，并要求实际公开确认。原件、任务和映射只有发起人可读，管理员代导也不能读取别人发起的私有任务。未知来源记分规则保留原件并要求人工确认，不将“全部保存”宣称为“所有版本都自动计算”。

离线补传按账号、client_id、operation_id、输入哈希去重，每项独立事务，版本冲突显示服务器当前值。支持对局/记分纸/偏好/既往游玩/实物/标签变更；计时不进入离线队列。BGA/Yucata 尚缺经核实的官方外部历史读取能力/账号，状态明确 unavailable，不伪造接入成功。

## 7. 小程序和原型

小工具页进入桌游库，活动详情进入本次桌游安排；12个真实页面覆盖资料、库存偏好、活动、录局、记分纸、历史、统计、收藏、私有导入和离线冲突及管理维护。复用原有导航与日期选择组件，新增统一信息/表单抽屉及筛选组件。加载、空态、失败、保存、只读权限和409冲突保留状态。

保留已合入的主原型，新增补全画布：3个一级组件分类、30个业务页面/状态，分模块分行排列。提供同一节点数据生成的可检查预览与互动流程稿。浏览器预览和微信编译/控制器联调不等于微信真机渲染验收。

## 8. 部署、性能和回滚

新开关 BOARDGAME_ENABLED、BOARDGAME_IMPORT_WORKER_ENABLED、BGG_ENABLED 默认 false。先在目标 MySQL 版本用备份副本试迁移，确认0013/0014/0015、用户回填、目录权限和 worker，再上线后端及小程序入口。参考 DDL 只供审阅；部署用 Alembic。用户真实文件在功能验收后再单独导入。

建议负载验收：1万款、5万盒、10万局/50万参局明细、20并发请求；列表p95≤500ms、写事务≤800ms、统计≤1s是目标而非本轮实测承诺。来源 worker 的租约恢复、批次进度、429/失败、磁盘余量和慢查询应纳入运行监控。日志不输出令牌、完整用户源文件或成绩表正文。

回滚先关闭入口与 worker，保留新增表和原件；有业务数据时迁移的降级保护会阻止删除。回退旧后端前须保留活动删除快照保护或暂时禁用硬删除活动。当前为未提交的本地变更，基线 HEAD 0d8e767 不是本轮功能提交；部署前应审阅并生成可部署提交。此次未执行生产连接、迁移、导入或部署。

本轮不开发图片上传、挑战/目标、数据导出/文件分享、平台回写、AI/OCR、翻译及分类中英映射。现有图片URL可展示并有失败占位，微信合法域名及真机加载仍需目标环境验收。

v3.3 已完成名称搜索、候选详情、版次选择、归属与购入信息的原子确认；复用现有 BGG worker，新增5条路径和库存版本快照列。OCR 后续只在搜索前提取并确认名称，再复用这条流程，见 [实际实现](design/boardgame-library/14-name-intake.md)。
