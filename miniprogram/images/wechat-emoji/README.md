# 微信表情资源

来源：微信官方 miniprogram-demo（MIT，许可证见本目录 LICENSE）。

- 映射：https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageExtend/components/emoji/emoji.js
- 图集坐标：https://github.com/wechat-miniprogram/miniprogram-demo/blob/master/miniprogram/packageExtend/components/emoji/emoji.wxss
- 原始图集：https://res.wx.qq.com/op_res/eROMsLpnNC10dC40vzF8qviz63ic7ATlbGg20lr5pYykOwHRbLZFUhgg23RtVorX

按各 style 的 background-position 从原图裁切 64 × 64 表情，再使用 Lanczos 缩至 32 × 32，再量化为 128 色透明 PNG，以官方 id 命名。只收录图集中有对应资源的表情；简体、繁体和英文名称映射见 ../../utils/wechatEmojiMap.json。未识别的代码保留原文，原生 Unicode emoji 交给系统字体显示。
