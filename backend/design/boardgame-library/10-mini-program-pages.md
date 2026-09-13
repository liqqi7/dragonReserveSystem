# 小程序真实页面与原型对照

更新：2026-09-13。以下12个页面已经注册在 app.json，并调用本分支真实API；展示层不依赖流程原型中的样例数组。自动化联调通过本地 TestClient 连接真实路由和临时数据库，微信编译与真机验收分开记录。

| 页面（pages 下同名目录/文件） | 入口和职责 | 接口族 |
| --- | --- | --- |
| boardgames | 小工具桌游库入口；馆藏搜索、录入入口、拥有/玩过/偏好/人数时长复杂度/标签筛选与分页 | boardgames、saved-filters |
| boardgame_entry | 名称查BGG、候选详情、版本选择、归属与购入信息、确认及重试恢复、手工后备 | bgg/search、boardgame-intake-previews、boardgame-intakes |
| boardgame_detail | 游戏详情、扩展、管理员兼容关系、每盒归属/状态/价格/日期、偏好与既往游玩 | boardgames、expansions、inventory、my-preference、my-prior-plays |
| boardgame_activity | 活动详情“这次玩什么”；提名/名单、游戏计划、扩展模块/实物、排序、记录入口 | activities/{id}/boardgames、nominations、game-plans、game-plan-order |
| boardgame_play | 用户选人、个人/团队/合作等模式、特殊成绩、赢家/决胜、日期时间/环境/地点、实物扩展、旁观身份、计时轮数、排除统计、保存/更正/冲突、审计历史、作废恢复、再来一局和反馈 | options、result-preview、duplicate-preview、plays、timer、私有held详情 |
| boardgame_scoresheet | 普通/轮次、类型化分项、算式、单选/勾选/辅助/重复/小计、预览回填、模板版本、管理员保存模板/审核可比较结构、移除记分纸 | scoresheet、preview、score-templates、from-template |
| boardgame_history | 全体/我的对局、自己的草稿、组合筛选、分页、记录详情和统计钻取 | boardgame-plays、saved-filters |
| boardgame_stats | 概览、提名/次数/玩家/趋势等14个菜单；单款规则组、详细成绩、曲线、分项及钻取 | boardgame-stats 下各指标 |
| boardgame_collection | 收藏覆盖、拥有未玩、玩过未拥有、每盒/币种成本、个人标签、保存筛选更名/删除 | collection/overview、costs、tags、saved-filters |
| boardgame_imports | 选择BGG或BG Stats文件、数据集续导、条目/问题、游戏/人物/地点匹配、held更正、版本差异、来源候选、报告、逐局拆分核对和受控公开 | 私有 boardgame-imports 路由 |
| boardgame_manage | 对局反馈处理、资料/实物归档恢复、游戏/人物合并预览、实物误绑纠正、人物账号绑定和地点维护 | boardgame-management/resources、play-reports、archive/restore、merge-preview/merge、game-correction、account-binding |
| boardgame_offline | 账号隔离待同步、错误/版本冲突、本机与服务器值核对、放弃或重新提交 | boardgame-sync、目标资源读取 |

## 状态与交互

UI 以现有龙城小程序正式方案为基准，具体见 [页面参照与复用要求](../../../prototype/design-system/miniprogram-ui-reference.md)：桌游库沿用正式馆藏卡，活动提名沿用详情信息卡与参与人名单，录局沿用分组表单，统计沿用排行卡与列表。本轮已完成12页共享样式迁移、双列封面卡、详情分区、录局折叠表单、头像名单、统计首页层级和管理入口；布局按320/390px核对，设备验收单独记录。

名称录入已按用户要求完成，实际流程与接口见 [v3.3 名称录入](14-name-intake.md)。新页面沿用橙色主操作、白卡灰底和现有日期选择器；图片/OCR 仍是后续输入扩展，见 [方案](13-photo-recognition.md)。

- 入口使用现有登录/会员体系，具体写权限由服务返回和校验；详情只读时禁用编辑，不以客户端权限代替后端检查。
- 各列表有加载、空态、错误、重试和游标分页；结果切换清理旧游标，异步请求避免旧结果覆盖新筛选。
- 0分显示“0”，空白显示“未填写”；摆烂显示“摆烂 · 未获胜”，没开完/掀桌保持未知。特殊状态不能再输入数值，非个人比赛的成绩录在队伍/共享区。
- 数值表单、个人偏好、原生录局及标签实际写入接口；成功回读服务结果。409和网络错误保留本地输入；重试沿用操作身份，不自动覆盖别人的更正。
- 日常选人来自小程序用户；导入匹配使用来源槽位和私有映射版本。held不从公开历史列表进入，来源记分纸在核对界面保留原件可读状态。
- 共享一级抽屉已按 [统一规范](../../../prototype/design-system/README.md) 使用灰底、关闭入口、76px标题区及360/558/720px三档；表单扣除80px固定操作栏。日期选择沿用独立组件。封面/头像加载失败回到文字占位或隐藏图片，保留业务内容。
- 不提供BGG/平台回写、照片上传或数据导出入口。BGA/Yucata按后端真实能力状态展示未接通原因。

## 验证与剩余范围

自动化入口：`backend/tests/test_boardgame_frontend_contract.py` 启动实际HTTP桥接，`miniprogram/tests/integration/boardgameApiFlow.cjs` 加载11个页面控制器并执行库、库存、活动、计分、导入等流程；不是静态HTML冒充真实页面。Node测试覆盖请求幂等、离线账号隔离、输入转换和原入口；新增录入控制器由 test_boardgame_intake_frontend.py 单独桥接真实API与worker。微信WCC/WCSC检查整个项目模板与样式；12页另用真实WCC树及WXSS核对320/390px布局；状态来自真实控制器回读及明确的合成边界变体。

运行项目需按现有 `services/config.template.js` 生成本机 `services/config.js` 并指向本地后端；该配置文件不入版本库，测试桥接只用本机地址。没有将线上配置复制为开发配置。

当前Mac会话锁定，开发者工具无法完成可见界面操作；微信开发者工具渲染、iOS/Android真机、原生滚轮和键盘遮挡、微信文件选择/域名白名单及真实弱网恢复仍待真实设备验收。小程序控制器联调和编译通过不能替代这些结论。

管理端归并、报错处理、归档恢复、误绑纠正和来源segments现已接入真实页面，详见 [一期收尾契约](15-phase-one-closeout.md)。来源复杂记分规则不自动编辑为通用模板；需核对并用已支持的显式结构修正，不能无提示丢弃来源字段。

[补全原型和视觉检查](../../../prototype/boardgame-library/README.md) 与真实页面配套。主原型保持已合入内容，补全画布采用独立文件，便于审阅本次新增范围。
