# main 与 feature/memory 合并验证（2026-10-27）

## 合并范围

- 本地分支：`feature/memory`，原 HEAD：`1f98d1ee0ede92acb218b596859a61c01c59dadf`。
- 合入远端 main：`f1afa51e438ff2f2cfc4128a9bc3fcd8d555d8fe`。
- 保留 memory 分支现有记忆、上传、权限和精简修复；接入 main 的桌游扩展、拥有者筛选、对局记录和记分纸。
- 仅本地合并和测试，没有推送、发布或操作正式数据库。

## 冲突与修复

1. 合并桌游目录服务、录入流程、页面注册及库页状态。保留现有直接确认版本的录入流程，接入扩展选项；注册 18 个现行页面。
2. 修复两个 Alembic head：增加合并节点 `20261027_0026`，两条父链为 `20261011_0024` 和 `20261025_0025`。恢复 0021 历史表定义，新增字段由 0025 增量补齐。
3. 对 0020、0021、0022、memory head、main head 五种起点验证升级。验证用户、活动、子项目、桌游、已有记忆/媒体/容量以及已有对局/分数保留，检查外键。
4. 修复记分纸并发加载对局和扩展时的请求代次互相失效；补测两种响应顺序、离开页面后的响应、保存并发和计算器。
5. 修复删除对局后刷新列表导致删除状态一直锁定；补测连续删除、删除中切换筛选。
6. 两个新页面沿用现有安全区策略，Skyline 使用 CSS 安全区，WebView 补算底部间距。
7. main 的批量提交带回已退休的 v1 接口、旧桌游页面/服务及对应测试。这些代码依赖已删除的数据模型，且与 memory 的退休契约冲突，未重新启用。原文件逐项保存在工作区外的合并归档，保留现行对局及扩展实现并增加有效路径回归。
8. 保留 memory 已验证的首页 logo 与游客头像导出及资源清单，避免 main 的资源替换破坏质量/尺寸约束。
9. 主原型 `prototype/龙城小程序.pen` 保留 memory 原始内容；main 有效原型完整保存在 `prototype/龙城小程序.main-20261027.pen`。未修改画布节点，未宣称完成视觉合并。main 的一份历史备份自带冲突标记、不是有效 JSON，已原样归档。

## 验证记录

- 前端全量 Node 回归：1048 passed，0 skipped；使用微信原生 WCC，包含记忆页编译绑定和页面弹层检查。
- 后端最终全量：485 passed，6 skipped，72 warnings；已启用本机 FFmpeg/FFprobe，三项真实视频编码测试通过。6 项跳过均因缺少专用一次性 MySQL 服务。
- 补充专项：92 passed，覆盖记忆、真实视频转码、对局扩展、拥有者筛选、两分支迁移。
- 图片资源：4 passed，验证原始/导出 SHA256、尺寸、透明通道、颜色管理及质量。
- Skyline WXSS：0 errors，0 diagnostics。
- 原生 WXML/WXS：34 个文件整体编译通过；WXSS：40 个文件逐个带全部 import 依赖编译通过。
- JavaScript/CJS：176 个文件语法通过；小程序 JSON 全部可解析；18 个注册页面的四件套完整，29 个自定义组件引用完整；运行代码无冲突标记。
- 按 project.config.json 排除 tests 和 .md 后，源文件合计 1,965,472 字节；此值是静态源文件统计，不是开发者工具最终上传包大小。

## 验证边界

- 未配置一次性 MySQL 迁移服务，MySQL 实际执行回归仍待专用环境；隔离 SQLite 升级、MySQL DDL 编译已覆盖。
- 未做开发者工具 GUI / iOS / Android 真机交互、视觉、登录网络联调；原生编译与模拟 API 测试不能替代这些验收。
- 原型文件仅完整保留两个版本并检查可解析性，未做全画布截图、视觉合并或视觉验收。
- pytest 现有弃用警告保留，测试无失败。

## 原始本地改动与归档

用户原有两处修改保持原始字节，留在工作区未暂存，不纳入合并提交：

- `miniprogram/pages/activity_detail/activity_detail.wxss`
- `miniprogram/tests/activityDetail.test.js`

归档目录：`D:/VibeCoding Project/.codex-tmp/main-memory-merge-20261027`。内含原始两处修改、冲突两侧图片与原型、退休文件、不可解析的历史原型及测试日志。未推送。

### 未恢复的退休路径

- `backend/app/api/v1/activities.py`
- `backend/app/api/v1/boardgame_collection.py`
- `backend/app/api/v1/boardgame_imports.py`
- `backend/app/api/v1/boardgame_stats.py`
- `backend/app/api/v1/boardgame_sync.py`
- `backend/app/api/v1/client_config.py`
- `backend/app/api/v1/diagnostics.py`
- `backend/app/api/v1/weather.py`
- `backend/app/api/v1/weather 2.py`
- `backend/app/models/boardgame_extensions.py`
- `backend/app/schemas/boardgame_collection.py`
- `backend/app/schemas/boardgame_import.py`
- `backend/app/schemas/boardgame_stats.py`
- `backend/app/schemas/boardgame_sync.py`
- `backend/app/schemas/client_config.py`
- `backend/app/schemas/diagnostic.py`
- `backend/app/services/activity_type_style_service.py`
- `backend/app/services/boardgame_activity.py`
- `backend/app/services/boardgame_calculation.py`
- `backend/app/services/boardgame_collection.py`
- `backend/app/services/boardgame_costs.py`
- `backend/app/services/boardgame_detail_stats.py`
- `backend/app/services/boardgame_import.py`
- `backend/app/services/boardgame_import_review.py`
- `backend/app/services/boardgame_play.py`
- `backend/app/services/boardgame_results.py`
- `backend/app/services/boardgame_scoresheet.py`
- `backend/app/services/boardgame_source_semantics.py`
- `backend/app/services/boardgame_statistics.py`
- `backend/app/services/boardgame_sync.py`
- `backend/app/services/boardgame_templates.py`
- `backend/app/services/diagnostic_service.py`
- `backend/app/services/qweather_service.py`
- `backend/tests/test_boardgame_api.py`
- `backend/tests/test_boardgame_calculation.py`
- `backend/tests/test_boardgame_collection.py`
- `backend/tests/test_boardgame_detail_stats.py`
- `backend/tests/test_boardgame_frontend_contract.py`
- `backend/tests/test_boardgame_import.py`
- `backend/tests/test_boardgame_intake.py`
- `backend/tests/test_boardgame_intake_frontend.py`
- `backend/tests/test_boardgame_library.py`
- `backend/tests/test_boardgame_management.py`
- `backend/tests/test_boardgame_purchase_date_removal.py`
- `backend/tests/test_boardgame_sync.py`
- `backend/tests/test_diagnostics.py`
- `backend/tests/test_home_diagnostics_integration.py`
- `backend/tests/test_other_activity_background.py`
- `backend/tests/test_v1_compatibility.py`
- `miniprogram/pages/activity_calendar`
- `miniprogram/pages/welcome`
- `miniprogram/pages/boardgame_activity`
- `miniprogram/pages/boardgame_collection`
- `miniprogram/pages/boardgame_entry`
- `miniprogram/pages/boardgame_history`
- `miniprogram/pages/boardgame_imports`
- `miniprogram/pages/boardgame_manage`
- `miniprogram/pages/boardgame_offline`
- `miniprogram/pages/boardgame_play`
- `miniprogram/pages/boardgame_stats`
- `miniprogram/pages/boardgames`
- `miniprogram/components/activity-form-sheet`
- `miniprogram/components/boardgame-filters`
- `miniprogram/tests/activityFormSheet.test.js`
- `miniprogram/tests/boardgameActivity.test.js`
- `miniprogram/tests/boardgameEntry.test.js`
- `miniprogram/tests/boardgameFlow.test.js`
- `miniprogram/tests/calendarSkylineBehavior.test.js`
- `miniprogram/tests/calendarSkylineMigration.test.js`
- `miniprogram/tests/calendarWarmup.test.js`
- `miniprogram/tests/diagnosticOutbox.test.js`
- `miniprogram/tests/fixtures/homeDiagnosticBridge.js`
- `miniprogram/tests/helpers/boardgameEntryRuntime.cjs`
- `miniprogram/tests/integration/boardgameApiFlow.cjs`
- `miniprogram/tests/integration/boardgameEntryApiFlow.cjs`
- `miniprogram/tests/integration/boardgameEntryLiveFlow.cjs`
- `miniprogram/tests/integration/renderBoardgameEntry.cjs`
- `miniprogram/tests/integration/renderBoardgamePages.cjs`
- `miniprogram/utils/calendarWarmup.js`
- `miniprogram/services/diagnosticOutbox.js`
- `backend/app/assets/activity-covers/webp-q90-v1`
- `backend/app/assets/activity-covers/webp-q90-manifest.json`
- `backend/app/assets/activity-covers/jpeg-q92-v1`
- `backend/app/assets/activity-covers/jpeg-q92-manifest.json`
- `backend/scripts/build_cover_webp.py`
