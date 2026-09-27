const STORAGE_KEY = "xrDicePhysicsTuningV1";

// Only numbers in this whitelist are accepted from local storage or the editor.
const GROUPS = [
  { title: "下落与惯性", fields: [
    ["gravity", "重力强度", 14, 1, 30, "越大，下落越快"],
    ["mass", "骰子质量", 3, 0.1, 20, "影响受力与碰撞，不改变同初速自由落体"],
    ["linearDamping", "线性阻尼", 0.02, 0, 2, "越大，运动速度衰减越快"],
    ["angularDamping", "角阻尼", 0.36, 0, 5, "越大，旋转越快停止"]
  ] },
  { title: "接触与弹跳", fields: [
    ["diceBounce", "骰子弹性", 0.08, 0, 1, "0 几乎不弹；1 很弹"],
    ["diceStatic", "骰子静摩擦", 0.75, 0, 1, "停止前抵抗滑动"],
    ["diceDynamic", "骰子动摩擦", 0.58, 0, 1, "滑动时的摩擦"],
    ["groundBounce", "地面弹性", 0.05, 0, 1, "与骰子共同影响落地反弹"],
    ["groundStatic", "地面静摩擦", 0.8, 0, 1, "与骰子共同影响停稳"],
    ["groundDynamic", "地面动摩擦", 0.65, 0, 1, "与骰子共同影响滑行"],
    ["wallBounce", "墙面弹性", 0.05, 0, 1, "撞墙后的反弹"],
    ["wallStatic", "墙面静摩擦", 0.4, 0, 1, "过高可能增加卡墙风险"],
    ["wallDynamic", "墙面动摩擦", 0.3, 0, 1, "撞墙滑动阻力"]
  ] },
  { title: "按钮投掷", fields: [
    ["launchHeight", "起投中心高度", 0.7, -0.4, 3, "首颗骰子的世界 Y 坐标"],
    ["heightStep", "多骰高度差", 0.2, 0, 0.8, "后续每颗骰子的高度差"],
    ["upSpeed", "向上速度", 4.2, 0, 12, "初速度 Y 的基值"],
    ["upRandom", "向上随机量", 0.8, 0, 5, "Y 速度额外增加 0 到此值"],
    ["horizontalSpread", "水平散布", 5, 0, 16, "X/Z 初速度范围是 ±此值的一半"],
    ["spinX", "X 轴旋转速度", 5, 0, 20, "按钮投掷的基础角速度"],
    ["spinY", "Y 轴旋转速度", 4, 0, 20, "按钮投掷的基础角速度"],
    ["spinZ", "Z 轴旋转速度", 5, 0, 20, "按钮投掷的基础角速度（方向为负）"],
    ["spinRandom", "旋转随机量", 3, 0, 12, "每轴附加 0 到此值"]
  ] },
  { title: "手拖投掷与结算", fields: [
    ["dragUpSpeed", "松手向上速度", 3.5, 0, 12, "手拖释放的初速度 Y"],
    ["dragHorizontalMax", "甩动速度上限", 6, 0, 20, "手指甩出 X/Z 每轴上限"],
    ["dragSpinX", "松手 X 轴旋转", 6, 0, 20, "手拖释放角速度"],
    ["dragSpinY", "松手 Y 轴旋转", 5, 0, 20, "手拖释放角速度"],
    ["dragSpinZ", "松手 Z 轴旋转", 6, 0, 20, "手拖释放角速度（方向为负）"],
    ["restSpeed", "静止速度阈值", 0.08, 0.01, 1, "线速度和角速度低于此值才计为静止"],
    ["stableMs", "稳定确认毫秒", 400, 50, 3000, "持续静止多久才给出结果"]
  ] },
  { title: "卡墙脱困与超时", fields: [
    ["wallNudgeAfterMs", "卡墙等待毫秒", 900, 100, 5000, "悬停墙边多久后尝试脱困"],
    ["wallNudgeHorizontal", "脱困水平速度", 2, 0, 8, "向桌面中心推回"],
    ["wallNudgeUp", "脱困向上速度", 1.5, 0, 6, "让悬空骰子重新落下"],
    ["wallNudgeSpinX", "脱困 X 轴旋转", 3, 0, 20, "卡墙时再次旋转"],
    ["wallNudgeSpinY", "脱困 Y 轴旋转", 4, 0, 20, "卡墙时再次旋转"],
    ["wallNudgeSpinZ", "脱困 Z 轴旋转", 3, 0, 20, "卡墙时再次旋转（方向为负）"],
    ["rollTimeoutMs", "投掷超时毫秒", 15000, 5000, 30000, "超时允许重新投掷，不保证给出结果"]
  ] }
];
const FIELDS = GROUPS.flatMap(group => group.fields);
const DEFAULTS = Object.freeze(Object.fromEntries(FIELDS.map(([key, , value]) => [key, value])));

function validateConfig(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return { error: "参数格式错误" };
  const config = {};
  for (const [key, label, , min, max] of FIELDS) {
    const raw = candidate[key];
    if (raw === "" || (typeof raw === "string" && raw.trim() === "") || raw === null || raw === undefined || typeof raw === "boolean") return { error: `${label}不能为空` };
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) return { error: `${label}须在 ${min}～${max} 之间` };
    config[key] = value;
  }
  return { config };
}

function makeGroups(config) {
  return GROUPS.map(group => ({ title: group.title, fields: group.fields.map(([key, label, , min, max, hint]) => ({
    key, label, hint, range: `${min}～${max}`, value: String(config[key])
  })) }));
}

function sceneProps(config) {
  const interact = (bounce, stat, dynamic) => `collide: true; staticFriction: ${stat}; dynamicFriction: ${dynamic}; bounciness: ${bounce}`;
  return {
    gravityVector: `0 -${config.gravity} 0`,
    rigidbodyConfig: `disabled: true; mass: ${config.mass}`,
    diceInteract: interact(config.diceBounce, config.diceStatic, config.diceDynamic),
    groundInteract: interact(config.groundBounce, config.groundStatic, config.groundDynamic),
    wallInteract: interact(config.wallBounce, config.wallStatic, config.wallDynamic)
  };
}

module.exports = { STORAGE_KEY, DEFAULTS, GROUPS, validateConfig, makeGroups, sceneProps };
