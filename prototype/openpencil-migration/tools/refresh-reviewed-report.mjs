import fs from 'node:fs';
const p='tools/build-acceptance-report.mjs';let s=fs.readFileSync(p,'utf8');
s=s.replace('字重、文字换行与抗锯齿、图片采样、阴影和背景模糊仍存在差异；部分探索页有重叠内容绘制差异。','字重、文字换行与抗锯齿、图片采样、阴影和背景模糊仍存在差异。');
s=s.replace("{kind:'填充',title:'21 处非等比径向渐变使用单半径近似',detail:'源格式记录椭圆双轴尺寸，当前目标格式的径向渐变只有一个 radius。原始参数和节点 ID 留在转换审查记录中，尚未获得完全相同的渐变。'}", "{kind:'填充编辑',title:'部分渐变采用可编辑网格兼容',detail:'已将椭圆径向和非默认方向、尺寸的线性渐变转换为网格填充，修复先前的几何差异；源参数保存在填充 explain 中。网格仍有离散采样误差，后续编辑也不同于原来的双轴渐变控件。'}");
s=s.replace("{kind:'格式语义',title:'兼容包装增加 327 个节点',detail:'9 个派生组件、3 个特殊尺寸实例、94 个字体图标、94 个路径视口，以及 127 个透明背景使用了可编辑包装或路径。原 9,808 个节点 ID（含替换内容）均保留，但两种格式的节点类型与属性不完全相同；数值后缀尺寸也作了兼容转换。'}", "{kind:'格式语义',title:'兼容包装增加 200 个节点',detail:'9 个派生组件、3 个特殊尺寸实例、94 个字体图标、94 个路径视口使用可编辑包装或路径。已移除先前 127 个背景辅助节点，半透明填充现在直接随容器伸缩。原 9,808 个节点 ID（含替换内容）均保留，但节点类型、数值后缀尺寸和填充编辑属性不完全相同。'},\n {kind:'图层顺序',title:'2 个重叠布局使用镜像顺序兼容',detail:'Wqvlc 与 HT6ol 通过反转子节点顺序并双重镜像保留原稿的视觉排列及遮挡关系，仍保留垂直 Auto Layout。此处图层树插入顺序与源稿不同，不能据此宣称所有编辑行为一致。'}");
const old="saveRoundtripValidation:{compared:roundtrip.compared";const updated="editingProbeValidation:read('audit/resize-probe-validation.json'),visibilityProbeValidation:read('audit/visibility-edit-probe-validation.json'),saveRoundtripValidation:{compared:roundtrip.compared";
if(!s.includes(old))throw Error('Missing report insertion point');s=s.replace(old,updated);
fs.writeFileSync(p,s);
console.log('Report generator now matches reviewed candidate and records remaining editing limitations.');