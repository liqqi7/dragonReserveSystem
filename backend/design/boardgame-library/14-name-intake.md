# v3.3 名称搜索与确认录入

更新：2026-09-13。名称录入已实现；照片识别、上传及模型调用继续留在 [OCR 方案](13-photo-recognition.md)，本功能不依赖 AI。

## 验收流程

桌游库“＋录入” → 输入名称 → BGG 搜索结果 → 选择本体或扩展 → 核对语言/出版商/年份并选择版次 → 确认名称、归属、数量与购入信息 → 保存。新增 [boardgame_entry 页面](../../../miniprogram/pages/boardgame_entry/boardgame_entry.js)，原默认手工/BGG 双入口抽屉已移除，单款录入不再跳往批量导入页。

搜索结果每页 10 项，版本每页 20 项，可继续翻页和筛选。候选详情未就绪时保留名称及占位，不能选中入库；BGG Search 本身只有基本信息，封面、人数、时长及版次来自后台 Thing 抓取。作品年份和版本年份分别展示，不把作品封面冒充版本图。长名称换行，简介可展开，图片失败显示占位。

不默认选择首个条目或版本。有实物但无法核对版次时，必须明确选“版次未确定”；只收录作品资料时可关闭“同时登记实物”。BGG 无正确结果或不可用时，可手工填写，无 BGG 的游戏仍能登记。

本地已有相同 BGG ID 只提示已收录；确认时复用已有作品，不改写共享名称或来源。不同人的同款实物各有独立记录。归属必须明确选择；普通成员只能登记自己，管理员可选择俱乐部、成员或外部持有者。数量 1–20 按盒创建，价格 0 与未填写分开保存。

## 实际接口

均位于 /api/v1，受现有登录、会员角色及 BOARDGAME_ENABLED 控制。候选任务只对发起账号开放，跨账号返回 404。

| 方法及路径 | 输入 | 返回与用途 |
| --- | --- | --- |
| GET /bgg/search | q；offset≥0；limit 1–100，默认20 | items、total、next_offset、cached_at；基本候选 bgg_id/name/game_type/year_published |
| POST /boardgame-intake-previews | bgg_ids，1–20个，去重；UUID 幂等键 | 202，私有预览任务；复用现有 Thing worker |
| GET /boardgame-intake-previews/{id} | 任务 UUID | state/revision/error_code/retryable、已获取候选、missing_ids、已确认结果 |
| GET /boardgame-intake-previews/{id}/items/{item_id} | 可选 q、offset、limit（默认20） | game、versions、total、next_offset；筛选版本名称/年份/语言/出版商 |
| POST /boardgame-intake-previews/{id}/retry | expected_revision | 仅失败任务可重排，沿用任务 ID；乐观锁避免重复重排 |
| POST /boardgame-intakes | 下述确认对象；UUID 幂等键 | 201，game_id、inventory_ids、game 及 inventory 详情 |

创建预览和最终确认要求 UUID Idempotency-Key。同一键同一正文返回原结果，改正文必须换键。预览重试以任务 revision 控制，响应丢失后先读取任务状态，不能盲目再次重排。

候选字段：item_id、revision、bgg_id、name、aliases、game_type、year_published、cover_url、thumbnail_url、min_players、max_players、min_playtime_minutes、max_playtime_minutes、detail_state、version_count、local_game_id、local_game_name、source_url。详情另有安全纯文本 description 和 publishers。

版次字段：bgg_version_id、name、year_published、languages、publishers、cover_url、thumbnail_url。版次归属由所在候选和服务端原始 XML 验证，客户端不提交可信来源正文。

确认示例（合成 ID）：

```json
{
  "source": "bgg",
  "preview_id": "e17d1609-9a9b-49b1-a45d-622661c3e895",
  "item_id": 123,
  "expected_revision": 1,
  "bgg_version_id": 456,
  "version_unspecified": false,
  "display_name": "我确认的中文名",
  "inventory": {
    "owner_type": "member",
    "owner_user_id": 7,
    "quantity": 1,
    "status": "unverified",
    "available_for_activity": false,
    "purchased_on": "2026-01-02",
    "purchase_price": "0",
    "purchase_currency": "CNY"
  }
}
```

- BGG 分支必须带准备好的预览、候选及候选 revision，并在 bgg_version_id 与 version_unspecified=true 之间二选一；实际版次必须有 inventory。
- 库存字段沿用 InventoryFields，加 quantity；版次已选时 edition_name 和 language 由服务端写入，忽略客户端对这两个字段的推测。
- 只建作品：inventory=null、version_unspecified=true。版次未确定但登记实物：inventory 中允许手工 edition_name/language，bgg_version_id=null。
- 手工分支：source=manual、game=GameCreate、inventory 可空；不允许携带 BGG ID、预览或版次字段。
- 非法归属、价格/币种组合、未来日期、错误版次、旧 revision、不可用作品等均拒绝，整次事务回滚，不留下半个作品或部分实物。

## 存储与事务

复用 boardgame_import_jobs / boardgame_import_items，不再增加先前草案中的 boardgame_intake_jobs 表或第二套 BGG 队列。kind=bgg_thing、params.purpose=intake_preview 区分私有候选；普通导入任务列表不显示它们，通用 decision/apply 不能绕过专用确认。

worker 使用现有限速、数据库锁、租约和退避，调用 Thing 时带 stats=1、versions=1。完整 XML、无损 JSON、来源哈希与解析版本先进入导入暂存。查询过程中不创建 boardgames 或 boardgame_inventory；用户确认新作品时才保存正式完整来源。

任务沿用 queued/fetching/parsing/retry_wait/ready/failed；确认成功后变 applied，params 保存请求哈希和结果 ID。预览没有新增到期删除任务，当前沿用导入来源留存；未来 OCR 图片的短期清理策略不能直接用于这些确认记录。

确认事务按现有写入依赖锁账号，再锁预览/候选与作品，完成权限、revision、版本所属校验；创建或复用作品，原子创建 N 盒，写审计、请求结果和任务消费状态。相同预览只能成功确认一次；同一请求即使换幂等键，仍返回原结果。其他请求体返回 intake_already_confirmed。不同任务并发建同款由 BGG 唯一键兜底，冲突回滚后重试可复用已存在作品。

新增迁移 20260913_0015：为 boardgame_inventory 增加可空 JSON bgg_version_snapshot。仍为 34 张领域表。所选 bgg_version_id 已有列；快照保存版本投影、所属作品、完整版本子树、来源哈希和确认时间。它独立于 BGG/BG Stats 续导可能更新的 source_snapshot，资料刷新不会静默修改实物版次。

库存详情增加 bgg_version_id 和 bgg_version（版本名称、年份、语言、出版商、封面/缩略图）。完整原始版次不进入公共库存响应。后续用户明确修改版本名称或语言，会解除版本 ID 与当前快照的关联，原选择保留在审计；修改备注、购入信息等不影响版次。

## 客户端恢复

- 改词/切换候选使用请求代次，旧搜索或版本响应不能覆盖新选择；切换账号不再接收原账号结果。
- 页面进入后台停止轮询，恢复前台继续；搜索错误、预览创建失败、详情失败和后台抓取失败分别可重试。
- 预览创建响应丢失时复用原幂等键；确认发送前按账号保存请求体和幂等键到本机存储。
- 确认结果不明时保留原请求并冻结编辑，重试不生成新库存。关闭页面或小程序后重新进入，会恢复待确认操作；成功后清理缓存。
- 日常编辑可换请求键，但不能在结果不明时改正文绕过恢复。后端权限和一致性校验始终是最终约束。

## 验证与上线交接

实现及验证入口：

- [后端搜索/预览/选版测试](../../tests/test_boardgame_intake.py)：合成 XML、真实 worker、私有权限、错版次、旧 revision、原子回滚、已有作品复用、幂等、0价格和版本更正。
- [真实页面控制器与 API 联调](../../tests/test_boardgame_intake_frontend.py)：Node 页面 → 本机 HTTP → FastAPI → worker → 临时数据库，覆盖两盒入库、复用已有作品和无 BGG 的扩展录入。
- [客户端测试](../../../miniprogram/tests/boardgameEntry.test.js)：分页、旧响应、显式选择、账号隔离、返回修改、请求重试与重开恢复。
- [布局检查脚本](../../../miniprogram/tests/integration/renderBoardgameEntry.cjs)：由真实 WCC 模板和 WXSS 生成 320/390px 合成页面。浏览器替代控件只用于布局检查，不代表微信真机验收。

上线先执行 0013/0014/0015；已在0014的环境只需补0015。BGG_ENABLED 与服务端 BGG_API_TOKEN 配置好后，启用 BOARDGAME_IMPORT_WORKER_ENABLED 并运行现有来源 worker。没有新的 AI 密钥、图片目录或 OCR 开关。BGG 未开启不阻止手工后备录入。部署脚本不应把工作区的参考 DDL 当增量迁移执行。

回滚应用时关闭新增入口和相关任务执行，保留作品、库存、幂等记录及版本快照；存在快照时0015降级主动拒绝删除该列。当前仅本地验证，未连接生产、未实际导入用户数据、未提交或部署。真实 BGG 返回、微信图片加载、键盘/安全区与 iOS/Android 设备表现仍需目标环境验收，见 [验证记录](verification.md)。
