# 日志规范与读取方法

## 日志概览

本文说明当前工作区的日志实现，线上行为以实际部署版本为准。

前端日志只有一个上报出口：`miniprogram/services/logger.js` 调用 `wx.getRealtimeLogManager()`。开发版或开发者工具额外镜像同一份已脱敏记录到 Console，正式版不打印业务日志副本。后端和网关保留必要日志，不能直接调用小程序端的微信实时日志 API；本项目是自建 FastAPI，不是微信云函数。

## 前端日志

| 事件 | 级别 | 场景、位置与用途 |
|---|---|---|
| `request_fail` | error | `services/request.js` 收到非 2xx 或传输失败；`services/user.js` 头像上传的解析、HTTP、传输失败。记录方法、去参数路径、状态、耗时和请求 ID，区分业务拒绝、后端异常和网络问题 |
| `request_slow` | warn | 通用请求成功但前端等待达到 2000ms。记录路径、耗时、状态、响应大小估算；该大小是序列化字符数估算，不是实际网络字节数 |
| `page_error` | error | `app.js` 的全局 JS 错误、未处理 Promise 拒绝、恢复缓存失败；活动详情/新建/编辑、资料和签到结果处理的局部异常；`services/auth.js` 登录失败。记录操作名、摘要及有限堆栈，不打印整个错误对象 |
| `home_presentation_snapshot` | warn | `utils/homePresentationDiagnostics.js` 在列表、媒体准备、检查点、滑动、网络和恢复场景产生的必要状态证据。记录 pending、阶段、卡片和缓存摘要，帮助排查卡住的骨架屏与图片 |
| `home_media_attempt` | warn | 同一首页诊断器的媒体失败、超时、重试耗尽、慢尝试、异常后恢复等证据，保留下载 requestId 与数值阶段信息 |

首页上报异常、慢尝试和异常后的恢复证据，正常完成摘要及普通成功尝试不上传。慢媒体阈值约为准备达到 8 秒，与接口的 2 秒阈值不同。恢复证据不等于新的失败；`pending=0` 不证明手机已经绘制了像素。

页面 `operation` 使用稳定英文名，如 `load_activity_detail`、`save_activity_edit`、`signup_activity`、`save_profile`、`handle_checkin_result`、`wechat_login`。日志失败不应中断业务流程。

## 统一字段与保护

| 字段 | 怎么读 |
|---|---|
| `event` / `level` / `operation` / `summary` | 哪类问题、严重程度、具体操作及原因；先看这些 |
| `timestamp` | UTC ISO 时间，显示含 `Z`；北京时间/香港时间加 8 小时，设备时钟不一定准确 |
| `page` | 记录时所在页面路由；异步回调可能在离开页面后触发，操作名更能反映原始场景 |
| `sessionId` | 当前小程序进程会话标识，不是用户 ID，重新启动会变化 |
| `traceId` / `requestId` | 前端关联 ID 与后端回显 ID，经 `X-Request-Id` 关联。首页 view ID 与单次媒体下载 hm- ID 不同；后者可在 `evidence.requestId` 或卡片阶段字段里查 |
| `statusCode` / `duration` | HTTP 状态和前端等待毫秒数；0 表示未得到 HTTP 响应，不是服务器返回了状态 0 |
| `appVersion` / `releaseEnv` | `wx.getAccountInfoSync().miniProgram` 提供的小程序版本和 develop/trial/release 环境；缺失时为空或 unknown |
| `wechatVersion` / `baseLibVersion` | 微信客户端版本与基础库版本，不是小程序版本 |
| `platform` / `model` / `system` / `networkType` | 设备与网络类型背景，网络变化由进程级监听更新，不为每次失败额外等待网络查询 |
| `truncated` | 内容超过项目预算，部分字段或数组后缀被丢弃；不得把缺失证据当作事件未发生 |

保护规则：

- 不记录 token、Authorization、Cookie、密码、密钥、openid、昵称、头像、电话、坐标、完整请求头/体和文件路径等敏感键；正文中常见 `Bearer`、密钥赋值及 URL 参数也作脱敏。脱敏不保证能识别所有自由文本中的个人信息，调用方不得传入原始资料或响应体。
- 绝对 URL 及路径字段去掉 query/fragment；去掉 URL 中的用户名密码。对象最多 6 层、数组最多 8 项、对象最多 32 键，普通字符串最多 300 字符；元信息限制更短，循环引用安全处理。
- 单次发送的 JSON 内容按 **UTF-8 字节数不超过 4096 字节** 控制，优先保留请求关联和错误摘要。较大的卡片数组只留能容纳的前缀，超大的普通字段舍弃。
- 同一事件、页面、关联 ID、操作、原因等组成的重复记录在 2 秒内限频；签名表最多 200 项。不同请求 ID 不会合并。相同错误对象被请求层记录后，页面、登录和全局处理不重复记录；新发生的页面异常仍记录。
- 日志 API 缺失或抛错不影响业务流程；实时日志不保证每条送达。

## 微信后台怎么读

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)，选择对应小程序，使用有权限的账号进入开发/运维相关的“实时日志”入口；菜单与筛选项以当前后台为准。
2. 先缩小到复现时间、版本和设备附近，再按后台提供的页面等条件筛选。记录复现时使用的是开发版、体验版还是正式版。
3. 过滤关键字可用 `request_fail`、`request_slow`、`page_error`、`home_presentation_snapshot`、`home_media_attempt` 或页面路由。统一封装通过 `setFilterMsg` / `addFilterMsg` 设置这些标签。请求 ID 在正文里读，未承诺任意 traceId 都能作为过滤关键字检索。
4. 展开日志，先读 event/operation/summary，再看 statusCode、duration、版本和网络；需要后端证据时，用 requestId 对照服务器记录。
5. 首页问题看 reason、pending、cards、cover/glass 阶段与缓存摘要。摘要是累计值，不跨快照直接相加；ASGI 已发送也不等于客户端收到或渲染成功。

确认日志送达时，可通过开发者工具或体验版触发一个受控错误和慢请求，记录时间，再核对后台展示、筛选和关联字段。不可把 Console 有输出当作微信已收到；不要为了核验故意破坏线上活动或用户资料。

## 容量与留存边界

官方实时日志每次调用参数总大小不超过约 **5KB**，客户端会聚合缓存后上报，缓存超限会丢弃；基础库还会补充结构化信息。因此项目使用 4KiB 内容预算留余量，但这不等于获得独占缓存，也不能保证无丢失。`setFilterMsg` 关键字上限约 1KB，项目只传短路由与固定事件名。参见 [微信官方 RealtimeLogManager API 定义](https://github.com/wechat-miniprogram/api-typings/blob/master/types/wx/lib.wx.api.d.ts)。

每日额度、保存期限、查询范围、是否收费等以当前小程序账号后台为准，**不能保证永久保存或完整查询 30 天**。`getCurrentState()` 可观测当前客户端日志缓存状态，但不是账号总容量或后台历史存储空间。

只读查看后台日志不会修改业务数据。实际生成和上传仍消耗序列化、网络与平台资源，所以仅保留必要事件，真实性能与送达仍需设备验收。微信实时日志用于排错，不用于财务审计、精确人数统计或全量 7/30 天接口计数。

## 服务端日志

| 事件/来源 | 内容与用途 |
|---|---|
| `request_completed` / `backend/app/middleware.py` | method、path、status、duration_ms、trace_id；用于全量完成请求计数、状态和耗时分析，不记录 query/body/Authorization |
| `app_error`、`validation_error`、`http_error`、`unhandled_error` / `main.py` | 业务拒绝、参数错误、HTTP 异常与未捕获异常；后者保留堆栈，访问应受限 |
| `role_invite_request` / `api/v1/users.py` | 身份变更安全审计的内部 user_id、结果、角色和 trace_id，不记录邀请码及 IP |
| `optional_user_lookup_failed` / `api/deps.py` | 用户查询失败的异常类型，不打印 token、用户资料或数据库错误原文 |
| `share_preview_*` / `activity_share_preview_service.py` | 分享源、存储、渲染失败或文件丢失，记录活动 ID 与必要异常 |
| `weather_*` / `activity_weather_service.py` | 天气/空气质量刷新和初始化失败；后台任务没有执行中的小程序可代为上报 |
| `amap_reverse_geocode_unavailable` / `amap_service.py` | 只记录异常类型，不记录查询密钥、经纬度或完整 URL |
| 配置警告 / `core/config.py` | 测试环境文件为空时提示配置未生效；仅异常配置产生，不是请求流水 |
| `image_transfer` / `image_transfer_diagnostics.py` | 合法 hm- 请求的图片传输及下载关联证据；仅证明交付 ASGI，不证明手机接收 |
| Caddy 图片访问 / `backend/ops/image-access-logging.md` | 网关状态、字节、耗时和受限请求 ID，用于核对图片访问与传输 |

生产应用文件：`/home/ubuntu/apps/dragonReserveSystem/backend/logs/application.log`。网关图片文件：`/var/log/caddy/cover-diagnostics.jsonl`。本地默认终端输出；联调脚本可通过 `TEST_REQUEST_LOG_FILE` 额外写入测试请求日志。第三方 HTTP 库维持 WARNING，避免 INFO 泄露带密钥的 URL。

服务器只读查看示例：

```bash
grep 'request_completed ' /home/ubuntu/apps/dragonReserveSystem/backend/logs/application.log | tail -n 50
grep -F 'req-REPLACE_WITH_ACTUAL_ID' /home/ubuntu/apps/dragonReserveSystem/backend/logs/application.log | tail -n 50
```

服务端异常堆栈可能含内部实现，勿直接对外分享未经检查的原文。必要访问日志仍包含成功请求，这是服务端完整统计所需，不等于把成功请求也全量上报微信。
