# BGG 综合排行榜前 50 名数据集

- 抓取时间（UTC）：`2026-08-30T06:24:28.970960+00:00`
- 排行榜：[BGG Board Game Rank](https://boardgamegeek.com/browse/boardgame)
- 范围：当时排名 1–50
- 详情来源：BGG XML API2 `thing`
- 详情请求：`stats=1` + `versions=1` + `videos=1`

## 文件

- `games.summary.csv`：便于浏览和导入表格的摘要。
- `games.normalized.json`：按产品使用场景整理的完整结构化数据。
- `games.full.json`：尽量保真地将 XML 节点转为 JSON，便于查找遗漏字段。
- `raw/thing-batch-*.xml`：BGG 原始响应，每批最多 20 款。
- `covers/`：50 款桌游的主封面。
- `dataset-metadata.json`：抓取范围、排除项和数量自检。

## 数量边界

保留了基础信息、简介、封面、投票建议、分类/机制/人员/出版商/关联项、
评分与排名统计、版本和视频元数据。为了保证总量可控，未请求评论、逐条评分、
市场售卖列表、论坛、用户收藏及游玩记录。

## 使用提示

这份数据适合内部产品研究和原型参考。上线页面需按 BGG 条款展示可点击的
`Powered by BGG`。排名和评分会随时间变化，使用时请保留抓取时间。
