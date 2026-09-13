# 3.1 实施契约与最新业务规则

> 此文保留 v3.1 基线设计/样例。当前已实施 v3.2，原生选人使用 user_id，统计定义版本5；记分纸计算、个人收藏/成本、历史发布及离线补传以 [当前实施契约](12-v3.2-implementation-contract.md) 和 [运行OpenAPI](openapi.json) 为准。旧版样例仅用于基线回归，不直接当作当前完整请求。

日期：2026-09-13。本文与主方案、数据字典共同描述本地实现。统计定义版本为 `4`，用于区分新增“摆烂计未获胜”口径；来源解析器仍独立版本管理。

本文保留 3.1 基线。用户后续授权的 3.2 范围见 [新增范围](11-expanded-scope.md)，包括真实小程序页面、完整记分纸等；本页“仅流程设计、没有历史发布接口”等只描述旧基线，不是最新交付范围。

## 1. 用户身份与成绩状态

日常小程序录局以小程序用户为主。`GET /boardgame-members` 返回分页用户列表，可按昵称、活动筛选，只有 `id/user_id/nickname/avatar_url/checked_in` 等业务字段。`PlayerInput.user_id` 是首选输入；服务在事务内解析/补齐唯一的 `boardgame_people.user_id` 关系。数据库参局记录仍引用稳定 person_id，因而不需要未来导入时迁移表结构。person_id、user_id、匿名 guest_key 三者必须恰好传一个；已有名单修改保留参局行 id。

导入保留来源玩家 ID/UUID、显示名和原始资料。姓名相同不自动关联账号。我们在真正导入时逐个确认映射；尚未匹配的身份只在导入任务内可见。匹配到现有 person 或提交明确 user_id，均复用同一个用户身份；禁止给匿名占位人物建立跨局全局映射。导入与普通录局共享数据结构，但导入对局始终 held。

个人、队伍、共享成绩各有独立状态：

| 值 | 小程序文案 | score | 对完成局的结果统计 |
| --- | --- | --- | --- |
| unrecorded | 未填写 | NULL | 结果仍未知，不补造输赢 |
| recorded | 已记分 | 十进制数字，包括 0/负数 | 按规则与结果判断 |
| gave_up | 摆烂不算分了 | NULL | 明确未获胜，计入分母，不增加获胜次数 |
| unfinished | 没开完 | NULL | 不据此自动判断输赢 |
| table_flip | 掀桌了 | NULL | 不据此自动判断输赢 |

`score_status` 位于玩家/队伍，`shared_score_status` 位于对局。未传状态时有数值推导 recorded，无数值推导 unrecorded；显式状态与分数矛盾返回 422。不得传字符串状态到 DECIMAL 分数字段。选项由 `GET /boardgame-plays/options` 返回。

`gave_up` 的结果不依赖其他人是否已填分：完成局中该人的 outcome=loss，rank 保持 NULL。即使整局 result_status=unknown，该人的已知未获胜仍可进入个人胜率分母。其余未知玩家不进入分母。高/低分排序时，摆烂者不参加数值排序；其余玩家齐分后可确定名次和赢家，包括负分获胜。分数均值仍只用数值样本。

团队的个人摆烂只覆盖该成员的个人胜负统计，不改变其他队员或整队结果。整队选择摆烂时该队未获胜；合作/单人共享成绩摆烂视为失败。全体合作/队伍统计仍按局/队伍取样，不因同队多人重复计数。不计分模式只保留参局，不产生胜率。

整局结束状态另用 `status=abandoned` 配合 `end_reason=unfinished/table_flip`，不通过某个人的状态自动改变整局。未完成对局在历史可见，进入 abandoned_count，不进入完成局榜和胜率。`voided` 同样不入统计。

## 2. 3.0 审查问题的处理

| 问题 | 实施结果 |
| --- | --- |
| RV01 暂存历史纠错 | 任务所有者可 PATCH /boardgame-imports/{job_id}/items/{item_id}/plays/{play_id}，带 item 与 play 双版本。来源改变可显式 update_play；已发布记录不能由导入覆盖 |
| RV02 数据集身份 | 上传返回 source_dataset；GET /boardgame-imports/datasets 可取回已使用的数据集；重导沿用同一来源身份 |
| RV03 钻取参数 | 公共筛选支持 weekdays、activity_missing、location_missing；图表给出可直接请求的 path/query；历史活动由 activity-options 提供 |
| RV04 参局行稳定 | 修改保留 player/team id；删改计分表引用的主体必须原子替换或清除计分表，不删除重插全部名单 |
| RV05 规则组合 | 新增 boardgame_rulesets；比较键含稳定规则、扩展 ID、人数、队伍人数结构和并列规则。自由 modules_note、携带/库存信息不进入比较键 |
| RV06 库存误绑游戏 | 管理员通过 game-correction-preview → game-correction，带预览哈希及 revision；清空计划中的错误实物选择、递增计划版本；已记录对局保留原游戏快照 |
| RV07 签到时间 | 用户明确不纳入本轮，不改变原有提前签到和补打卡规则 |

## 3. 两家来源与新增三表

在 3.0 的 23 表上增加三表，总计 26 表：

- `boardgame_inventory_sources`：一盒可关联 BGG、BG Stats 多份来源。provider+namespace+source_id+copy_index 唯一，跨任务去重；Quantity=2 建两盒和两条来源关系，不能用名称去重库存。
- `boardgame_rulesets`：游戏内不可变规则配置；同配置哈希唯一，显示名称变更不影响可比性。
- `boardgame_scoresheet_templates`：管理员审核模板语义、版本和可加总的行集合。未经审核的表可供单局查看，不参与跨局分项比较。

BGG Thing 保存完整响应 XML/节点树，标准化字段用于业务展示；Collection 与 Plays 分开保留个人来源信息。BG Stats 同样保存原文件及每项原始对象，copies、嵌套扩展、metadata、未知字段均保留。未支持的计分表保留来源及 unsupported 标记，不执行其中的公式。

`ImportDecision` 增加 `update_play`、`segments`。BGG quantity>1 必须提交 N 份明确 PlayCreate，并令 segment_count=N；不能将一份总时长/成绩克隆 N 次。单局来源更新只改任务本人持有的 held 记录，显式目标版本冲突时停止。多分局来源变化暂不自动覆盖，需要逐局整理后明确链接。

重复来源内容相同直接复用；改变的单盒来源可用 link_inventory 指向同一盒并明确最新 revision，更新来源快照，不覆盖人工状态和购入字段。来源数量变化不自动新建/删除既有实物，列为 source_changed 待处理。跨 BGG/BG Stats 的同盒/同局关联必须明确选择目标。

D09：普通成员可导入本人库存/对局，管理员可代导；任务原件和暂存明细仍仅任务发起人可读。D10：开发阶段只用虚构数据和 mock BGG，实际收藏与对局待后续共同导入。D11：本轮提供页面流程设计，原生小程序联调和真机渲染是后续页面实施验收。D12：不修改签到规则。

## 4. 当前 HTTP 行为

- 创建资源使用 actor+operation+UUID 幂等键；重试相同正文复用当前资源，修改正文返回 409。普通 JSON 在解析前限制 512 KiB，上传文件 20 MiB，multipart 总请求上限 21 MiB。
- 写请求重验当前角色并加锁；对象 expected_revision 过期返回 409。完整事务回滚后，MySQL 死锁/等待超时返回 retryable_transaction_conflict；客户端沿用原幂等键重试，不在 Web 请求中自动重复来源 I/O。
- 库存和游戏默认按 sort_order/id 排序，游标绑定排序和筛选；游戏 sort=recent 按资料创建时间倒序，不能称为真实“购入时间”。购入日期仅对实物所有者/管理员可见。
- 统计分页先计算全结果集排名；全体提名以人数为主，场数稳定次序；我的按本人提名活动数。未知数值不输出 0%。当前分数状态更正会立即反映到新查询。
- GET /boardgame-stats/activity-options 合并现有活动与公开历史快照活动。held 原件、联系人、详细来源地点及文件内容不进入公开统计。
- 导入任务租约 90 秒；抓取、解析、应用与重新领取递增 job revision。应用中不接受决策编辑，界面等任务回到 ready/partial 再用最新版本提交。
- BGG 网络通道使用共享 MySQL advisory lock，完成后保留默认 5 秒冷却；Search 缓存 5 分钟。worker 对 202/429/5xx 最多 8 次、15 分钟，遵守 Retry-After。BG Stats 不依赖 BGG 网络开关。
- 所有真实外部来源、线上域名和小程序真机仍需部署阶段验证。当前没有历史发布接口、AI/OCR、翻译或分类机制展示。

## 5. 部署与回滚

正式迁移文件为 `20260913_0013_boardgame_library.py`；验证脚本在独立数据目录和 Unix socket 启动临时 MySQL，不使用现有数据库。修复历史 0011 对全新安装重复重命名列的问题，仅在最终字段已存在时跳过，已迁移数据库不受影响。Alembic URL 对 `%` 进行配置转义，以支持合法密码/Unix socket URL。

部署先备份现有数据库与媒体，在目标版本 MySQL 演练 0012→0013，再启动应用与独立 worker；默认 BOARDGAME_ENABLED、BOARDGAME_IMPORT_WORKER_ENABLED、BGG_ENABLED 都为 false，按需分别开启。导入目录必须在 MEDIA_ROOT 外、由应用用户私有持有并纳入备份；来源令牌只由环境配置提供。

回滚首选关闭三个开关并停止 worker，保留新增表和原件。迁移 downgrade 仅接受无业务数据的新表（允许仅存在初次补齐的用户身份）；有业务数据时拒绝删表，不把降级当数据清理工具。当前变更未提交、未推送、未部署，既有用户 AGENTS.md 修改保留。
