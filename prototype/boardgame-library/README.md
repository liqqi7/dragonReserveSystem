# 桌游库功能补全原型

更新：2026-09-13。补齐桌游库、活动选游、对局管理及BG Stats相关能力，配合本分支的12个真实小程序页面。所有预览数据均为示例。本地查看方式见 [UI评审说明](../../miniprogram/BOARDGAME_UI_REVIEW.md)。

- [可编辑 Pencil 补全画布](桌游库-功能补全.pen)：30个业务页面/状态，3个一级组件分区，共33个顶层节点、1060个源节点。
- [完整页面预览](canvas.html)：从同一份节点树生成，可选全画布、原尺寸、适应窗口。
- `flow.html`：对话内互动预览；入口包括桌游、活动、录局、统计、收藏、导入及离线冲突。
- [全画布几何检查](canvas-geometry.json)：全部顶层坐标/边界、碰撞和子节点越界结果。

既有 [主原型](../龙城小程序.pen) 保持合入分支内容，不覆盖其活动和桌游探索设计。2026-09-13 用户提供的新附件已用于更新 [统一规范](../design-system/README.md)，规范来源快照、设计值和 [桌游差异](../design-system/boardgame-comparison.md) 一并保存。补全画布和交互预览读取同一份 tokens；随后小程序12页的结构和样式也已完成统一，见 [一期收尾说明](../../backend/design/boardgame-library/15-phase-one-closeout.md)。

## 画布与页面检查

组件一级分类为基础规范、通用组件、业务组件，二级按色彩/字号/圆角/间距/阴影、导航/操作栏/表单/抽屉/选择器、桌游库/活动/对局/计分/统计职责分开。业务按7个模块分行：桌游与馆藏、活动与提名、录局与结果、计分表与模板、统计与钻取、收藏与筛选、导入与恢复。

手机页390×844，同一业务横向间距80，不同业务纵向间距156；三个组件分区各1360×1000、横向间距80，组件与业务区间距156。生成时检查全部顶层碰撞、子节点边界、引用目标、七档字号及本地图片。本轮33个顶层对象全部检查，7处图片引用均加载，文字盒子溢出数为0。

| 代表页面 | 截图 |
| --- | --- |
| 全画布排列 | [全画布](qa/full-canvas.jpg) |
| 统一规范 / 极限值 | [基础规范](qa/design-foundations.jpg)、[通用组件](qa/design-components.jpg)、[业务卡片](qa/design-business.jpg) |
| 桌游与活动 | [馆藏列表](qa/library-page.jpg)、[活动页面](qa/activity-page.jpg) |
| 录局 / 0与特殊状态 | [录局页](qa/record-page.jpg)、[成绩状态抽屉](qa/score-status-sheet.jpg) |
| 多字段实物表单 | [库存编辑](qa/inventory-form-sheet.jpg) |
| 计分纸与分项 | [计分页](qa/scoresheet-page.jpg) |
| 结果统计 | [详细统计](qa/detailed-stats-page.jpg) |
| 导入公开确认 | [公开表单](qa/publish-form-sheet.jpg) |

抽屉检查包含父手机容器、全屏遮罩、顶部圆角、拖拽条、标题、边距和底部操作栏。信息与表单采用统一灰底、38×4拖拽条、76高头部及32×32关闭入口，按360/558/720三档选择高度；信息无空操作栏，表单操作栏80高。0/空白/摆烂语义与当前接口一致；组件引用解析后的实例也纳入几何及文字检查。

## 互动检查

已操作验证：库→详情→录局；特殊成绩选择与禁用赢家；手动赢家及原因；计分纸四则优先级、缺失轮次保留未知；返回记录保留输入；导入公开需要双确认与说明，未确认保持私有。320像素容器下检查列表、录局、计分纸及弹层控件边界，没有横向溢出。统计基础页面的日期、全体/我的和钻取按示例数据更新；详细分析和成本页面明确标为固定示例，没有放置不会更新数字的筛选控件。

互动预览不访问业务接口，不导入或公开真实历史。小程序真实联调另见 [页面清单](../../backend/design/boardgame-library/10-mini-program-pages.md) 和 [验证报告](../../backend/design/boardgame-library/verification.md)。

本轮规范更新另验证了320px实际内容宽度下的列表、活动、记分、成绩状态和表单。实测信息抽屉360高/内容284，玩家表单558高/内容402/底栏80，关闭入口32；错误提示保留在滚动内容区，不覆盖标题和操作栏。核对“摆烂”后分数禁用、赢家不可选择，以及小陈的0分继续保留。验证方法与范围见 [本轮报告](../design-system/verification.md)。

## 复现

```sh
python3 prototype/boardgame-library/build_prototype.py
python3 prototype/boardgame-library/sync_preview.py
python3 -m http.server 62869 --bind 127.0.0.1 --directory prototype
```

浏览器打开 `/boardgame-library/canvas.html`。生成器同时输出.pen、几何结果和HTML预览，封面使用仓库现有本地素材。`flow.js` 和 `flow.css` 为互动预览源，`sync_preview.py` 从统一值重新生成并内嵌到flow.html；预览需重启读取该片段的本地服务。

当前环境未能调用Pencil渲染器，因此截图来自同一节点数据的浏览器预览，不能宣称Pencil应用实开验收通过。微信开发者工具/真机渲染也尚未验收；原型检查不替代原生组件与键盘、安全区的设备验证。
