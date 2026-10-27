# 历史对局导入与 BG Stats 调研

> 此文保留3.1基线推导/验收项；3.2增加记分纸计算、个人收藏/成本、受控历史发布及真实小程序页面。当前字段、行为与已测范围以[实施契约](12-v3.2-implementation-contract.md)及[验证报告](verification.md)为准。

最新实施细则见 [3.1 实施契约](09-implementation-contract.md)。

更新：2026-09-13，属于 [桌游库 v3.1 设计](../../boardgame-library-scope.md)。BGG 历史已由用户确认一期导入，展示策略后定；本节同时回答“BG Stats 历史能否导入”，并给出共用的实现契约。当前是调研、设计和离线格式验证，未导入用户真实历史。

现已取得 BG Stats 6.16.1 的真实导出，215 条对局、嵌套扩展及两种计分表结构均完成只读核验；新增适配细节见 [07 真实文件验证](07-bgstats-real-export.md)。团队/合作和其他版本仍不能由此推定兼容。

## 1. BG Stats：结论及官方证据

**可以通过导出文件导入本项目，优先完整 JSON 备份。** 官方在 Settings → Export, import and backup 提供手动 JSON 导出；图片有单独的备份/导入途径，不能假设 JSON 内含照片二进制。[官方备份说明](https://www.bgstatsapp.com/explanations/backup/)

也可在对局详情或多选对局后用 Share → Send play file，产生 `.bgsplay` 文件。官方说明其数据由游戏、玩家、地点、对局等集合组成，以文件内引用和 UUID 关联；UUID 是后续重导入识别身份的重要依据。[官方文件格式说明](https://www.bgstatsapp.com/explanations/importing-own-files-into-board-game-stats/)

查到的官方云同步读取 API 仍列在功能愿望清单中，因此本期不假设可以输入 BG Stats 账号就拉取全部历史；文档中的创建对局链接/二维码 API 是把数据送入 BG Stats，不能当作查询用户历史的 API。[官方愿望清单](https://www.bgstatsapp.com/board-game-stats/wishlist/)、[官方外部写入说明](https://www.bgstatsapp.com/support/push-plays-to-bg-stats-from-other-apps-or-websites/)

直接 JSON 导出优于“先全部同步 BGG 再拉回来”：官方说明 BGG 不能保存全部自定义对局信息和游戏设置；匿名化后发送至 BGG 的玩家/地点名称也无法从 BGG 还原。已经同步到 BGG 的记录仍可以走 BGG 导入，但不能声称与 BG Stats 原件等价。[官方迁移说明](https://www.bgstatsapp.com/explanations/moving-to-a-new-device/)

## 2. 实际查看的官方样例

已通过网页读取工具查看完整的 [官方 BGStatsExport.json 样例](https://www.bgstatsapp.com/help/BGStatsExport.json)。该样例时间为 2017 年，只有基础对局，不能用它宣称已覆盖最新版本所有扩展、团队和计分表结构。

样例包含 1 款游戏、1 个地点、1 次对局；玩家字典有 5 项（含 1 个匿名占位），实际对局引用其中 4 位。样例显示以下重要差别：

| 实际字段 | 本地处理 |
| --- | --- |
| `games[].id` / `plays[].gameRefId` | 文件内引用，通过映射找游戏；不能直接作本地 game_id |
| `games[].bggId` | 游戏的 BGG ID，正数时可作为资料匹配候选 |
| `plays[].bggId` | 位于对局对象，不能误当游戏 BGG ID；样例为 0，视为没有有效关联；非零关联语义仍应与新版实际文件核对 |
| `players[].id` / `playerScores[].playerRefId` | 文件内玩家关联；字典中未实际参局的人不生成 player 行 |
| `uuid`、`modificationDate` | 来源稳定身份和修改标记；先保留原文，不盲目覆盖本地更正 |
| `playDate`、`durationMin` | 实际日期时间、分钟；缺时区先按导入所选时区解释，保留原始字符串 |
| `playerScores[].score` | 字符串型分数；数值可解析时写 Decimal，空值及字符串 null 视为未知并保留原文；公式/其他非数值列为待处理，绝不执行表达式 |
| `winner`、`rank` | 样例胜者明确但所有 rank=0；0 转 NULL，胜负与名次分别保存，不生成“第 0 名” |
| `seatOrder` | 样例四个人都是 0；按源数组顺序生成 1–4 的本地展示序号，保留原字段；不是四个人争抢同一唯一座位 |
| `startPlayer`、`newPlayer` | 先手映射现有字段；初玩映射 nullable is_new_to_player，缺失 NULL，并保留来源 |
| `highestWins`、`noPoints`、`cooperative`、`usesTeams` | 提供计分模式线索；实际局的设置优先于游戏默认；未知枚举不猜测 |
| `ignored` | 原值保留；本项目默认 stats_exclusion=all，未来发布后也不会误进榜 |
| `userInfo.meRefId`、`bggUsername` | 本人和账号候选，不是本地账号认证；需人工确认身份映射 |
| `playImages` | 样例是字符串 `"[]"`，不是照片数据；不能据此宣称图片已导入 |

扩展、组队、角色、计分表、非参局人物和较新的字段：完整原件与未知 JSON 字段都保留；规范化适配器必须对照实际格式验证后才能映射，未知结构列明待处理且保持 held，不默默剥掉这些字段。对局所带“拥有”线索不自动生成真实库存。

## 3. 一期导入流程

1. 成员选择本人来源、管理员可代导并选择 BGG 账号抓取，或上传 BG Stats `.json` / `.bgsplay`；记录来源、文件哈希、适配器版本和所选来源时区。
2. 保存完整原件，检查文件/响应的格式、引用完整性和记录数量；生成任务项。预览页明确区分源记录数、分局数、重复数、待补数，不把玩家字典大小当参局人数。
3. 游戏：已有 BGG ID 优先复用；文件 UUID 通过已确认映射复用；无 BGG 的游戏可按文件名称建本地资料，不要求上游在线。BG Stats 导入的基础信息保存为本地来源值，bgg_synced_at 保持空，之后可补标准 BGG 详情。
4. 玩家：复用明确确认过的外部身份映射；同名仅给候选，不能自动合并。未注册具名者建立稳定 people，匿名按局内 guest_key 保留；绑定账号须明确确认。是否将“来源账号本人”加入实际玩家，由来源明细和人工确认决定，不能因为用户导出文件就默认他参加每一局。
5. 查看疑似重复、扩展子局与批量局的处理；选择新建、关联已有或跳过。关联已有时只新增来源关系，不覆盖已记录的成绩。
6. 应用：原子落下本地对局及 people/地点映射、玩家/扩展/来源关系和计分表投影，默认 publication_status=held。信息完整可为 completed；不足为 draft 并列问题。失败只影响对应项，成功项重试不重复创建。
7. 管理页面显示导入结果和问题项；小程序普通列表、搜索、详情钻取及全体/我的统计均不自动暴露 held。**导入能力一期完成，展示及统计开放另行决定。** 本轮不新增可绕过该决定的发布按钮。

BGG 网络抓取仍由受限上游通道执行；BG Stats 文件解析不需要 BGG 账号或云同步登录，已具备文件资料时不因 BGG 不可用而失败。禁止通过导入接口制造小程序活动、报名或打卡记录。

## 4. BGG 历史的规范化

| 情况 | 转换规则 |
| --- | --- |
| quantity=1，日期和玩家完整 | 建一局 held，按来源结果映射；不以收藏 numplays 代替 |
| quantity 为大于 1 的整数 | 管理员确认这是多局后拆 N 个 segment；只复用明确共用的日期/游戏信息，不能把一份汇总成绩或总时长复制 N 次；逐局成绩未知就留空/待补 |
| quantity 缺失、0、负数或非整数 | 原始值保留，不能截断取整；检查是否扩展子局；否则待人工决定，不虚构完成局 |
| 作为本体附属发布的扩展记录 | 可靠关联或人工确认后挂到主局的扩展及来源关系；不额外计一次开局 |
| 没有玩家或日期无效 | 原件先导入；可创建 held 草稿并提示补齐，不能自动填 liqqi、今天或活动全体 |
| incomplete=1 | 资料完整时 abandoned；不把不完整局计作完成 |
| nowinstats=1 | stats_exclusion=wins；保留已记录数据但不用于胜率 |
| 只有明确赢家、无完整名次 | 可保留全体明确胜负、rank 留空；没有赢家或全员 winner=0 时结果未知，不推断平局 |
| 非数字分数、备注中的规则/团队 | 原文保留；不执行公式、不仅凭自然语言猜阵营与胜负 |

BG Stats 官方自己也说明 BGG 的 quantity>1、无玩家、无日期以及扩展子局需要特殊处理；本项目采用以上自己的转换规则，不照搬来源软件对“忽略统计”的所有行为。[BG Stats 的 BGG 导入说明](https://www.bgstatsapp.com/explanations/importing-from-bgg/)

## 5. 幂等、修改和跨来源去重

- BGG 使用 `(provider=bgg, namespace=规范用户名, source_play_id, segment_index)` 作为来源键。
- BG Stats 有 play.uuid 时使用 `(provider=bgstats, namespace=uuid, source_play_id=uuid, segment_index=1)`。同文件重复上传、改名上传、同 UUID 的另一个导出文件不重复造局；共享文件带同 UUID 也识别为同一来源。
- 老文件没有 UUID 时用 `namespace=file:SHA256` + 文件内对局 ID/数组序号，保证同一文件重试幂等；不同文件之间只提示疑似重复，不能用日期+游戏硬合并。同一天真的玩两局必须保留两局。
- game.uuid 可用 uuid 命名空间；player/location 的 UUID 映射使用 owner:发起人ID:dataset:受控UUID（详见 06），缺 UUID 使用 file:原件SHA256。它们与 play_sources 的对局 UUID 命名空间职责不同，不直接复用。文件内整数 id 仅用来解引用，不能跨文件当全局身份。引用缺失或同局两个具名玩家映射同一本地 person时，阻止该项应用并给出冲突。isAnonymous=true 的占位可以同局多次引用，每次按父局身份+source_slot/scoreUuid 生成独立访客，不能把占位全局绑定成一个用户，详见 07。
- 同一 BGG 对局可能又出现在 BG Stats 文件中。仅当明确的外部关联和游戏/日期一致时给出同局链接；缺少 BGG 来源账号或字段语义未核实只能提示候选。管理员确认后多个来源指向一个 play_id，不能同时生成两次开局。
- 同 UUID 来源内容变更时比较 content_hash；原件保留新快照，出现差异给出预览。若本地 revision 已超出上次应用版本，返回冲突，不按 source modificationDate 强行覆盖本地修正；旧来源重复上传也不能回退新成绩。
- quantity 拆局的所有 segment 和来源关系同事务写入；后续 quantity 变小、来源消失或再次导出的局数减少，不自动删除已有对局，进入差异处理。
- BG Stats unknown/non-player/团队复杂信息在未验证适配前保持 held，并显示尚未规范化的字段列表；不将机器人/非参局人物直接计入成员参局榜。

## 6. 上传、预览和接口

复用 03 的 `/boardgame-imports` 任务、mappings、items、apply、retry；新增文件入口 `POST /boardgame-imports/bgstats-file`。普通 API 不接收客户端指定 publication_status=published 或 origin 值来伪装手录；外部来源 held 记录的 complete/restore 不改变发布状态。

上传最大 20 MiB，JSON 对象层数最多 128，单文件 50,000 局；超过容量返回明确错误，允许按对局范围导出多个文件。扩展名和 MIME 只作提示，实际解析验证 JSON 结构；`.bgsplay` 若实际文件采用不同封装，检测后提示当前适配器不支持，保留原件和错误，不能伪称已导入。压缩包和照片目录不是本期输入格式，不自动解压陌生文件或读取文件内本机路径。

文件存入独立 BOARDGAME_IMPORT_ROOT，使用随机存储键并记录 SHA256；真实路径必须位于公开 MEDIA_ROOT 之外，不能只在其下建名为 private/import 的目录。预览只返回按角色筛选的结构数据。原件可包含联系信息、详细地点、评论、图片引用及用户设置，不能因为已发布对局公开就把整个备份文件公开。尚未验证字段在来源树完整保留。

全文件 JSON 树在同任务的一个 response 存档项中保存；每个对局业务项只保存自己的完整 play 节点、文件内引用与 response_key，游戏/玩家/地点字典从同一存档读取。不把整个备份文件重复写入每一个对局项，避免大文件导入成倍膨胀。

主要响应：`source_count`、`created_play_count`、`linked_play_count`、`held_count`、`draft_count`、`skipped_count`、`failed_count`、逐项 `issues[]`、adapter_version；这些数量按明确的源项/分局定义，不用一个“导入成功数量”掩盖不同口径。

## 7. 验证范围与实施验收

调研证据：已读官方导出说明及基础 JSON 的完整结构；直接 Python HTTP 下载返回 403，随后使用网页工具完整内容重建语义等价 JSON 做本地检查，不声称取到了 HTTP 原始字节。未访问任何用户 BG Stats 云账号。

一期验收需覆盖：重复文件、同 UUID 内容变化、无 UUID、错误玩家引用、重复本地玩家映射、0 分/负分/空分/公式、rank=0、重复 seatOrder、无时区日期、BGG quantity 拆局及中途失败重试、扩展关联、多来源同局链接、来源忽略统计标志、held 不进入任何公共查询和榜单。

官方基础样例本身不能证明最新复杂格式。07 已补充当前用户 JSON 的嵌套扩展、匿名多人、计分表结构验证；其他 `.bgsplay` 版本、真实团队/合作和图片本体仍需单独验收，无法规范化的内容保留原件和待处理状态。没有引入 BG Stats 云历史自动同步或反向写回，图片备份另行讨论。
