# 桌游库集成说明

本次以 `liqqi7/dragonReserveSystem` main 为基线，从开发副本提取桌游库最小业务范围，入口为“工具 → 桌游库”。范围包括桌游库首页、近期馆藏、搜索与 BGG 资料确认、版本选择、桌游详情、馆藏版本和拥有者列表。

明确不包含对局、统计、活动桌游计划/提名、历史导入、BG Stats 或 collection 导入、个人评分偏好和离线同步。BGG 评分、综合排名和重度属于桌游资料字段，随资料快照保存。

## 后端

新增六张表：`boardgames`、`boardgame_inventory`、`boardgame_preview_jobs`、`boardgame_preview_items`、`boardgame_audit_events`、`boardgame_request_keys`，迁移为 `20261007_0021_boardgame_library`，父迁移是 main 的 `20260924_0020`。

接口覆盖：

- 桌游库列表、当前用户近期馆藏（最多 50 款，按馆藏录入时间，不依赖购入日期）、筛选和分页。
- BGG 名称搜索及私有预览任务。预览 worker 请求 BGG Thing 的 `stats=1&versions=1`，保存评分、排名、重度、中文名称、机制、版本和原始快照。
- 确认录入使用幂等键；同一用户同一桌游由数据库唯一约束和事务校验阻止重复录入。
- 详情返回完整版本选项、本人版本和拥有者数量；拥有者列表支持分页。本人版本更换校验本人权限、版本归属和 revision。
- 桌游实体预览从 BGG website gallery API 获取，限制数量、超时和图片域名，并使用短期缓存与过期回退。

功能开关默认关闭：`BOARDGAME_ENABLED`、`BOARDGAME_PREVIEW_WORKER_ENABLED`、`BGG_ENABLED`。启用前需要完成迁移、配置 BGG 凭据并由进程管理器启动 `scripts/run_boardgame_preview_worker.py`。

## 前端

新增 `boardgame_library`、`boardgame_intake`、`boardgame_detail` 三页以及共享版本抽屉。页面以 Skyline 为目标渲染，配置 `glassEaselWebview: true` 作为回退渲染配置。工具页只增加桌游库导航，原有登录失效弹窗、活动、统计、分享和其他工具行为保持不变。

录入页保留输入内容、搜索骨架、首个可用结果自动选择、版本抽屉、重复拥有只读状态、返回录入方式页和拍照识别提示“子奇正在加班，别催”。详情页包含中文标题、BGG 资料、人数/时长、玩法机制、实体预览、我的版本、拥有者和底部简介；拥有者和实体图片加载失败不会阻断主详情。

## 验证记录

在集成分支执行：

```sh
# 后端完整回归（含 main 现有测试）
# 在 backend 目录、已安装 requirements.txt 依赖的环境运行
PYTHONPATH=. python -m pytest tests -q
# 前端行为与既有页面测试
node --test miniprogram/tests/*.test.js
# Skyline WXSS 静态检查
skyline wxss check --json --miniprogram-root miniprogram --files \
  pages/boardgame_library/boardgame_library.wxss \
  pages/boardgame_intake/boardgame_intake.wxss \
  pages/boardgame_detail/boardgame_detail.wxss \
  components/boardgame-sheet/index.wxss styles/boardgame-name.wxss
```

结果：后端完整回归 161 passed，前端 540 passed，Skyline 检查 0 diagnostics。WCC 对三个页面、共享模板和 WXS 编译成功。

另用真实 BGG token 做了一次隔离 SQLite 端到端 smoke（不使用 research 本地 top50 数据）：伯明翰搜索约 0.97 秒，预览约 5.7 秒，得到评分 8.56、综合排名 1、重度 3.9、38 个版本选项和 12 张官网实体预览图；中文版本保存为“中文”。token 未写入仓库或输出日志。

未覆盖真实 MySQL 执行、微信真机渲染和生产服务。开发者工具在隔离副本核验了首页、详情、搜索结果、已拥有只读版本、拥有者、筛选和详情版本修改抽屉；修复了 Skyline 下候选卡横排、搜索框文字偏移、内容最小高度挤出底部按钮及只读版本文字被原生按钮淡化的问题。临时 UI fixture 只覆盖桌游库，活动和诊断接口的 404／响应结构错误不作为主业务验收结果，主业务由完整 main 回归测试覆盖。一次封面请求出现 CDN connection reset，已观察到“暂无封面”兜底；这不能保证真实设备所在网络的图片可达性。

## 部署与回滚

本次只合并代码，未连接生产服务器或执行生产数据库迁移。部署前先备份并执行新迁移（`20261007_0021`），再配置开关、BGG 凭据和预览 worker；确认一次真实搜索和录入后再开放入口。回滚顺序为关闭桌游库开关、停止 worker、回滚应用提交。迁移 downgrade 会删除六张新表及其数据，只能在已备份且明确允许丢弃桌游库数据时执行。

小程序需要确认图片域名 `cf.geekdo-images.com` 的访问配置。实体照片使用 BGG 网站 gallery API，该非 XMLAPI2 接口可能变化；它的错误或延迟不阻断主详情及录入。回退 WebView 和 iOS/Android 真机尚未做渲染验收。旧开发目录里的桌游数据库不属于 main 的迁移链，本次不自动搬运这些数据。
