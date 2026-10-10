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

## 本地开发者工具预览

导入仓库根目录（包含 `project.config.json`），不要只导入 `miniprogram` 子目录。

`miniprogram/services/config.js` 被 Git 忽略，新检出目录需要从同目录 `config.js.template` 复制并配置。仅在本机后端已启动的情况下，将 `API_BASE_URL` 设置为 `http://127.0.0.1:8001/api/v1`、`API_ENVIRONMENT` 设置为 `test`；不要误连生产接口。该地址用于开发者工具，手机真机不能用它访问电脑后端。

项目配置 `setting.useGlassEaselForWxml` 必须为 `true`。本地 `project.private.config.json` 的同名设置会覆盖共享配置，也需保持为 `true`。否则可能报 `No any glass-easel component configs found in space`，并连带出现页面路由错误。

2026-10-08 本地修复后，开发者工具 2.02.2609182 Nightly / 基础库 3.17.3 已显示首页和桌游库，活动、桌游列表及近期馆藏请求成功，原启动错误消失。仍有自定义导航、低版本 WebView 回退及 `glassEaselWebview` 校验警告；当前 Nightly 校验器与运行时对该字段的提示不一致，保留页面回退配置，不通过删除配置掩盖警告。此次未验证真机或切换后的 WebView 回退渲染。

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

## 2026-10-08 详情页状态与本地接口修复

详情页只有在 `my_versions` 非空时显示“我的版本”，未录入用户不再看到空模块或录入入口。实体图片有数据时直接展示，移除“实体预览”标题、加载/错误/空占位；请求失败和重新加载都会清除旧图片。简介折叠时为 3 行，展开使用不带 `max-lines`/`overflow` 的独立文本节点，避免 Skyline 对 `max-lines=0` 的处理差异。

详情接口的拥有者数量按有效馆藏的用户 ID 去重，排除已归档和 `retired` 的实物；没有有效拥有者时返回 404，与桌游库列表范围一致。前端头像和拥有者抽屉同样按用户去重，兼容旧开发接口省略 `my_versions`/`owner_count` 的情况。详情请求失败会清除旧资料，避免已移出桌游库的游戏残留在页面。

本轮缺少图片和“0 位拥有者”的实际原因是环境不一致：main 前端请求了 `/Users/yuean/Desktop/dragonReserveSystem/backend` 启动的旧本地 API（127.0.0.1:8001），其详情没有返回上述字段，`/boardgames/6/images` 也返回 404。已在该本地开发 API 补齐兼容字段和图片路由，并重启本地 API；未连接线上，未改数据库记录，未重启搜索 worker。兼容改动仅在旧开发副本的 `backend/app/api/v1/boardgames.py`、`backend/app/services/boardgame_images.py` 和相关测试，不属于 main 补丁；正式运行须配套使用 main 的前后端。

对实际本地伯明翰（game 6 / BGG 224517）的只读检查返回：详情 200、1 位去重拥有者、8 条既有本人馆藏、最新版本 523778；图片接口 200、12 张真实 BGG gallery 图片。重复旧馆藏未删除。开发者工具 Skyline 已看到中文版（2020）、1 位拥有者和真实图片；拥有者抽屉只显示该用户一次及其中文版。临时页面测试状态验证了本人版本为空/图片为空时模块完全隐藏；测试入口已移除。通过临时驱动调用页面原有简介处理函数，运行时测量正文高度为折叠 63px → 展开 861px → 再折叠 63px，与截图一致。

验证：后端完整用例 162 项均已覆盖通过（首次全量 161 passed，诊断桥接测试因 Node 不在 PATH 失败；修正测试 PATH 后单独重跑该项通过），最终详情关联回归 16 passed；前端完整回归 545 passed；旧本地 API 兼容回归 1 passed。详情 WXSS Skyline 检查通过，WCC 对详情 WXML、共享名称模板及 WXS 编译通过。未验证手机真机或生产环境。

本次详情修复没有数据库迁移，回滚该修复提交即可恢复上一版 main 的详情表现。若部署此次前端，需要同时部署相匹配的 main 后端；不要继续接旧开发 API。

## 部署与回滚

本次只合并代码，未连接生产服务器或执行生产数据库迁移。部署前先备份并执行新迁移（`20261007_0021`），再配置开关、BGG 凭据和预览 worker；确认一次真实搜索和录入后再开放入口。回滚顺序为关闭桌游库开关、停止 worker、回滚应用提交。迁移 downgrade 会删除六张新表及其数据，只能在已备份且明确允许丢弃桌游库数据时执行。

小程序需要确认图片域名 `cf.geekdo-images.com` 的访问配置。实体照片使用 BGG 网站 gallery API，该非 XMLAPI2 接口可能变化；它的错误或延迟不阻断主详情及录入。回退 WebView 和 iOS/Android 真机尚未做渲染验收。旧开发目录里的桌游数据库不属于 main 的迁移链，本次不自动搬运这些数据。
