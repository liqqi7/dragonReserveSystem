# 3D 骰子小程序 Demo 技术方案与实施计划

## 1. 文档目标

本文用于指导在龙城小程序中制作一个纯前端 3D 骰子 Demo。

XR-Frame 的独立接入、能力、项目实战、排障与官方文档索引见[XR-Frame 项目知识与实践](./XR-Frame-项目知识与实践.md)。Demo 的目标是验证以下技术闭环：

1. 从工具页进入骰子页面。
2. 配置不同面数的骰子以及每种骰子的数量。
3. 在手机上通过手指拖拽、甩动骰子；在开发者工具中使用鼠标模拟同样的操作。
4. 骰子具备重力、桌面碰撞、骰子之间碰撞、摩擦和弹跳效果。
5. 骰子停止后，系统根据 3D 姿态自动识别朝上的面并显示结果。
6. Demo 不连接后端，结果只保存在当前页面内，不作为正式游戏或活动结算依据。

本文只定义方案和验收标准。本轮不修改业务代码、不新增服务端接口。

## 2. 当前项目约束

当前小程序具备以下基础条件：

- 小程序页面入口包含 `pages/tools/tools`，可以从工具页增加 Demo 入口。
- 项目已经启用 Skyline：`project.config.json` 中 `skylineRenderEnable` 为 `true`。
- 项目使用 `glass-easel` 组件框架。
- `project.config.json` 当前 `libVersion` 为 `3.14.2`。
- 立项时 `miniprogram/app.json` 尚未注册骰子页面；截至 2026-09-27 已注册 `pages/dice_demo/dice_demo`，该条是历史基线，不是当前状态。
- 工作区存在其他未提交的原型素材变更，实施时不得使用 `git reset`、`git clean` 或覆盖无关改动。

开始编码前，必须先阅读并遵循：

- `skyline-overview`
- `skyline-components`
- `skyline-config`
- `skyline-wxss`
- 如使用 Skyline 手势或 Worklet，再阅读 `skyline-worklet`

## 3. 总体技术方案

### 3.1 首选架构

采用以下组合：

```text
微信小程序 Skyline 页面
        |
        +-- 原生 XR-Frame 3D 场景
        |       +-- GLB/glTF 骰子模型
        |       +-- PBR 材质
        |       +-- 摄像机、灯光、阴影
        |       +-- 刚体、碰撞体、重力
        |
        +-- 小程序 JS 控制层
                +-- 骰子配置
                +-- 鼠标/触摸拖拽
                +-- 投掷速度和旋转速度计算
                +-- 停止判定
                +-- 面法线读数识别
                +-- 结果汇总和展示
```

首选 XR-Frame 的原因：

- 它适合直接嵌入微信小程序，不需要额外部署 H5 页面。
- 可以使用 GLB/glTF 资源和 PBR 材质。
- 官方示例中包含 GLTF、PBR、阴影和物理场景，可作为实现参考。
- 能够把视觉模型、碰撞体和场景控制放在同一个小程序页面内。

### 3.2 备选架构

如果在当前项目的开发者工具、Android 真机或 iOS 真机上确认 XR-Frame 物理能力无法满足需求，再按以下顺序评估：

1. 小程序 Canvas + Three.js 适配层 + 物理引擎。
2. 独立 H5 页面通过 `web-view` 展示 3D 骰子。

不建议第一版直接使用 `web-view`，因为它会引入独立部署、通信、返回行为和资源缓存问题。只有当原生 XR-Frame 在目标设备上无法稳定运行时，才使用备选方案。

### 3.3 Demo 和正式产品的边界

本 Demo 使用本地随机数和本地物理过程，结果仅用于展示技术效果。它不具备防篡改能力，不能用于：

- 正式比赛结果；
- 奖励发放；
- 抽签或抽奖；
- 需要可信随机性的游戏结算。

未来如果骰子用于正式规则，应由可信随机逻辑先确定结果，前端只播放一个落到目标面的动画。

## 4. 页面和代码结构

### 4.1 页面入口

在 `pages/tools/tools` 增加一个“骰子实验室”入口，点击后跳转到独立页面：

```text
miniprogram/pages/dice_demo/dice_demo
```

工具页只负责入口和跳转，不把 3D 场景、物理和识别逻辑直接塞进现有工具页。

### 4.2 建议目录

```text
miniprogram/pages/dice_demo/
├── dice_demo.js
├── dice_demo.json
├── dice_demo.wxml
├── dice_demo.wxss
├── dice_config.js       # 面数、数量和运行参数
├── dice_faces.js        # 各骰子面编号与局部法线
├── dice_physics.js      # 物理参数和投掷参数
├── dice_result.js       # 停止判定和结果识别
└── assets/
    ├── d6.glb
    ├── d8.glb
    ├── d10.glb
    ├── d12.glb
    └── d20.glb
```

如果模型较大，不要一次性加载全部模型。根据当前配置按需加载，并在后续版本中评估分包或资源懒加载。

### 4.3 运行时数据结构

骰子类型配置：

```js
{
  sides: 6,
  count: 2
}
```

完整配置示例：

```js
[
  { sides: 6, count: 2 },
  { sides: 8, count: 0 },
  { sides: 10, count: 1 },
  { sides: 12, count: 0 },
  { sides: 20, count: 0 }
]
```

单个骰子的运行时数据：

```js
{
  id: 'd6-0',
  sides: 6,
  modelPath: 'assets/d6.glb',
  body: null,
  visualNode: null,
  state: 'rolling',
  result: null,
  stableSince: null
}
```

## 5. 配置功能设计

### 5.1 支持的面数

第一版支持：

- D6
- D8
- D10
- D12
- D20

每个面数都可以单独设置数量，数量范围建议为 0～8。

### 5.2 总数量限制

Demo 第一版建议限制所有骰子总数不超过 8 个：

- 防止低端设备帧率明显下降；
- 防止多个 D20 的碰撞体造成过高计算量；
- 便于观察单个骰子的识别结果；
- 后续通过真机性能测试再决定是否放宽。

### 5.3 页面操作

建议提供：

- 每种骰子的数量加减按钮；
- 当前骰子总数；
- “投掷全部”；
- “清空骰子”；
- “重新投掷”；
- 可选材质选择；
- 可选调试信息开关。

数量为 0 的骰子不创建场景实体。数量发生变化时，可以在下一次投掷前重建实体，第一版不需要做运行中增删的复杂动画。

## 6. 3D 场景技术方案

### 6.1 场景组成

场景至少包含：

```text
Scene
├── Camera
├── AmbientLight
├── DirectionalLight
├── Table
│   └── 静态碰撞体
├── DiceGroup
│   ├── DiceVisual
│   └── DiceBody
└── 可选的调试辅助节点
```

第一版不制作复杂房间、桌面装饰和粒子特效。先保证骰子、桌面、光照、阴影和碰撞清楚可见。

### 6.2 模型和碰撞体分离

骰子的显示模型和物理碰撞模型必须分开：

- 显示模型：负责圆角、数字、纹理和材质。
- 碰撞模型：使用低面数几何体或凸包，负责碰撞计算。

不要直接用高面数视觉模型作为碰撞体，否则多骰子场景可能出现性能下降、穿透或不稳定抖动。

### 6.3 模型坐标规范

每个模型进入项目之前必须确认：

- 原点位于骰子几何中心；
- 模型尺寸统一；
- 旋转轴和世界向上方向明确；
- 法线方向正确；
- 每个面对应的数字明确；
- 数字没有被材质或透明度隐藏；
- 模型没有多余的骨骼、动画和隐藏高模节点。

## 7. 素材和许可证方案

### 7.1 素材获取优先级

按以下顺序选择：

1. CC0 模型和材质；
2. MIT、BSD、Apache 等允许商业使用的资源；
3. CC BY 资源，但必须保留署名；
4. 购买商业授权的模型。

不使用只有“免费下载”描述、没有明确许可证的模型。避免使用 CC BY-NC、Editorial 或明确禁止商业使用的资源。

### 7.2 推荐素材策略

采用“一套几何模型，多套 PBR 材质”：

```text
同一套 D6 几何
├── 普通材质
├── 木质材质
├── 石材材质
├── 玉石材质
└── 金属材质
```

这样可以避免分别维护“木质 D6”“石质 D6”“玉石 D6”等大量模型。

### 7.3 资源登记

每个外部模型和材质必须记录：

```text
资源名称
来源
作者
许可证
是否需要署名
是否允许商业使用
下载日期
修改内容
```

建议将资源许可说明放在 `miniprogram/pages/dice_demo/assets/LICENSES.md`，不要只依赖下载页面的临时说明。

### 7.4 参考资源

- [微信小程序示例仓库](https://github.com/wechat-miniprogram/miniprogram-demo)：参考 XR-Frame、GLTF 和物理示例。
- [微信小程序 API 类型定义](https://github.com/wechat-miniprogram/api-typings)：确认当前基础库对应的 XR-Frame API 类型和命名。
- [dice-box](https://github.com/3d-dice/dice-box)：参考网页端骰子面映射、材质主题和物理参数组织方式，不能直接当作小程序代码使用。
- [Poly Haven](https://polyhaven.com/)：可用于查找 CC0 材质和环境资源。
- [Kenney](https://kenney.nl/support)：可用于查找许可清晰的游戏资源。

## 8. 投掷交互技术方案

### 8.1 不使用陀螺仪

交互只使用：

- XR-Frame 或页面可用的触摸事件；
- 开发者工具中的鼠标模拟事件；
- 页面 JS 记录位移和时间。

禁止调用 `wx.startDeviceMotionListening`，不读取手机陀螺仪或加速度计。

### 8.2 手势状态机

```text
idle
  ↓ 按下
tracking
  ↓ 移动
tracking
  ↓ 松手
launching
  ↓ 物理引擎接管
rolling
  ↓ 速度和角速度持续低于阈值
settling
  ↓ 结果计算完成
stopped
```

如果用户在骰子已经滚动时再次触摸，第一版建议忽略操作，等所有骰子停止后再允许下一次投掷。

### 8.3 投掷数据

手势期间至少记录：

```js
{
  startX,
  startY,
  lastX,
  lastY,
  startTime,
  lastTime,
  velocityX,
  velocityY
}
```

松手后根据最后一段移动速度计算：

- 初始线速度；
- 投掷方向；
- 初始角速度；
- 旋转轴；
- 小幅随机扰动。

速度必须做上下限裁剪，防止快速甩动使骰子飞出桌面。

## 9. 物理参数方案

### 9.1 第一轮调试参数

以下是第一轮起始值，不是最终标准值：

| 参数 | 起始值 | 调整目的 |
| --- | ---: | --- |
| 重力 | `-9.8` | 模拟自然下落 |
| 骰子摩擦力 | `0.45` | 控制骰子在桌面上的滑动距离 |
| 桌面摩擦力 | `0.55` | 让骰子逐渐停下 |
| 骰子弹性 | `0.25` | 控制骰子自身碰撞反弹 |
| 桌面弹性 | `0.15` | 控制落桌后的弹跳高度 |
| 线性阻尼 | `0.03～0.08` | 减少持续滑动 |
| 旋转阻尼 | `0.05～0.12` | 减少持续旋转 |
| 初始线速度 | `3～5` | 控制投掷力度 |
| 初始角速度 | `12～22` | 控制翻滚速度 |
| 随机扰动 | `±15%～25%` | 避免每次投掷轨迹完全相同 |

### 9.2 调参原则

- 骰子像冰块一样滑：提高摩擦或线性阻尼。
- 骰子落地后立刻停住：降低摩擦或提高初始速度。
- 骰子弹跳过高：降低弹性。
- 骰子像软块一样落地：提高弹性。
- 骰子只滚不翻：提高角速度和扭矩。
- 骰子翻转过快：降低角速度，避免看不清读数。
- 骰子经常穿透桌面：检查碰撞体尺寸、时间步长和初始位置，不要只提高摩擦。

所有参数集中放在 `dice_physics.js`，不允许分散写在页面事件中，方便后续真机调试。

### 9.3 物理稳定性

每个骰子的初始位置必须满足：

- 不与桌面重叠；
- 不与其他骰子重叠；
- 不贴近桌面边缘；
- 不超过摄像机可见区域。

多骰子投掷时，随机位置采用固定安全区域，必要时使用简单的重叠检测和重试。

## 10. 自动读数识别方案

### 10.1 识别定义

本 Demo 的“自动识别”指：

> 根据 3D 模型的最终姿态，计算哪个面朝向世界坐标的上方。

它不是摄像头 OCR，也不是截图后识别数字。这样可以避免光照、纹理、透视和字体导致的识别误差。

### 10.2 面元数据

每种骰子都要维护独立的面映射：

```js
const D6_FACES = [
  { value: 1, normal: [0, 1, 0] },
  { value: 2, normal: [0, -1, 0] },
  { value: 3, normal: [1, 0, 0] },
  { value: 4, normal: [-1, 0, 0] },
  { value: 5, normal: [0, 0, 1] },
  { value: 6, normal: [0, 0, -1] }
]
```

上面的数值只表示数据结构示例。实际法线和数字必须按照最终模型逐面确认，不能直接假设模型坐标与示例相同。

### 10.3 识别算法

停止后执行：

1. 读取骰子的最终旋转矩阵或四元数。
2. 将每个面的局部法线转换为世界坐标。
3. 与世界向上向量 `[0, 1, 0]` 做点积。
4. 选择点积最大的面。
5. 返回该面的数字。

伪代码：

```js
function getTopFace(diceRotation, faces) {
  const up = [0, 1, 0]
  let selected = null
  let bestDot = -Infinity

  for (const face of faces) {
    const worldNormal = transformNormal(face.normal, diceRotation)
    const score = dot(worldNormal, up)

    if (score > bestDot) {
      bestDot = score
      selected = face
    }
  }

  return selected
}
```

### 10.4 停止判定

不能只判断某一帧速度为 0。建议同时满足：

- 线速度低于阈值；
- 角速度低于阈值；
- 条件连续保持 300～500ms；
- 骰子没有明显离开桌面。

如果两个面与世界向上的夹角非常接近，说明骰子可能停在边缘，应继续等待或施加很小的扰动，不能立即显示结果。

### 10.5 D10 和 D20 的专项校验

D10、D20 的面数量和编号映射更复杂，必须为每个模型建立单独的校验表：

```text
模型文件
面编号
面局部法线
面对应数值
初始朝向
人工摆放后的预期结果
```

每种骰子至少要进行一次“人工固定姿态识别”测试，确认每一个面都能读出正确数字。

## 11. Demo 页面交互流程

```text
工具页
  ↓ 点击“骰子实验室”
骰子配置页
  ↓ 设置 D6/D8/D10/D12/D20 数量
3D 场景生成骰子
  ↓ 点击“投掷全部”或拖动骰子后松手
骰子滚动、碰撞、弹跳
  ↓ 所有骰子进入稳定状态
自动识别每个骰子的朝上面
  ↓
显示每个结果和总和
```

投掷期间：

- 禁止修改骰子数量；
- 禁止重复触发投掷；
- 显示“投掷中”状态；
- 结果区域显示占位状态，不提前显示结果。

停止后：

- 显示每个骰子的结果；
- 显示所有结果的总和；
- 允许重新投掷；
- 允许返回配置或重新调整数量。

## 12. 分阶段实施计划

### 阶段 0：兼容性验证

目标：确认当前 Skyline 项目可以运行最小 XR-Frame 页面。

工作内容：

- 阅读 Skyline 相关 Skill；
- 注册一个临时 XR-Frame 页面；
- 显示一个基础几何体；
- 在开发者工具运行；
- 在 Android 和 iOS 真机各验证一次；
- 记录基础库、开发者工具和真机结果。

通过标准：页面非空白、场景可渲染、页面返回正常、没有破坏现有工具页。

### 阶段 1：工具页入口和单 D6 场景

工作内容：

- 工具页增加“骰子实验室”；
- 新建独立 Demo 页面；
- 加载一个 D6 GLB；
- 添加桌面、摄像机、灯光和阴影；
- 添加桌面碰撞体；
- 骰子可以自然下落并停在桌面上。

通过标准：单 D6 能正确加载、落桌、显示阴影，不穿透桌面。

### 阶段 2：单 D6 投掷和自动读数

工作内容：

- 实现鼠标/触摸拖拽；
- 记录拖动速度；
- 松手后施加线速度、角速度和扭矩；
- 实现稳定状态判定；
- 实现 D6 面法线读数；
- 页面显示识别结果。

通过标准：连续投掷多次，骰子轨迹有变化，停止后显示的数字与朝上的面一致。

### 阶段 3：数量配置和多骰子

工作内容：

- 增加 D6、D8、D10、D12、D20 配置；
- 实现每种骰子的数量控制；
- 动态创建多个实体；
- 增加骰子之间的碰撞；
- 计算结果总和。

通过标准：至少同时投掷 1～8 个骰子，所有骰子均能停止并返回结果。

### 阶段 4：模型和识别校验

工作内容：

- 引入 D8、D10、D12、D20 模型；
- 为每种模型建立面法线映射；
- 完成每个面的人工姿态校验；
- 处理 D10 和 D20 的编号特殊情况；
- 增加结果识别单元测试。

通过标准：固定每一个面朝上时，识别结果都正确。

### 阶段 5：材质和视觉优化

工作内容：

- 增加普通、木质、石材或玉石材质；
- 优化灯光、环境光和阴影；
- 增加可选碰撞音效；
- 优化低端设备降级策略；
- 验证资源加载和缓存。

这一阶段不能反过来阻塞核心物理和读数功能。

## 13. 测试和验收

### 13.1 自动化检查

修改代码后至少执行：

- JavaScript 语法检查；
- 页面 JSON、WXML、WXSS 检查；
- Skyline WXSS 静态检查；
- 骰子配置逻辑单元测试；
- 停止判定单元测试；
- 面法线读数单元测试；
- `git diff --check`。

### 13.2 开发者工具检查

- 从工具页进入 Demo；
- 鼠标拖动和松手投掷；
- 改变每种骰子的数量；
- 投掷多个骰子；
- 骰子停止后显示结果；
- 返回工具页后再次进入状态正常。

### 13.3 真机检查

Android 和 iOS 都要检查：

- 页面是否白屏；
- GLB 是否完整显示；
- 阴影和材质是否正常；
- 触摸拖动是否能投掷；
- 骰子是否穿透桌面；
- 多骰子碰撞是否稳定；
- 连续投掷是否有明显内存增长；
- 低端机帧率是否可接受。

自动化测试通过不能代替开发者工具和真机视觉验收。

## 14. 主要风险和处理方式

| 风险 | 影响 | 处理方式 |
| --- | --- | --- |
| XR-Frame 在某些设备上兼容性不同 | 页面白屏或物理异常 | 阶段 0 先做开发者工具、Android、iOS 验证 |
| 模型面编号不清楚 | 读数错误 | 引入模型前建立面法线和数字映射表 |
| 高模碰撞导致性能下降 | 掉帧、穿透 | 视觉模型和碰撞模型分离 |
| 多骰子碰撞不稳定 | 骰子重叠或飞出场景 | 限制总数量、优化初始位置和碰撞体 |
| 外部模型许可证不清晰 | 商业使用风险 | 优先 CC0，记录许可证和作者 |
| GIF 或复杂材质资源过大 | 首屏慢、内存高 | 只加载当前配置模型，控制纹理尺寸 |
| 纯前端结果可被篡改 | 不能用于正式结算 | Demo 明确标注非正式结果，正式版使用可信随机逻辑 |

## 15. 交给执行模型的最小交付范围

第一轮不要一次完成全部内容，必须先交付以下闭环：

1. 工具页可以进入骰子 Demo。
2. Demo 可以显示单个 D6。
3. D6 可以受重力影响落到桌面。
4. 用户可以用鼠标或手指拖动并甩出 D6。
5. D6 能与桌面碰撞并停止。
6. 停止后根据姿态自动识别朝上的数字。
7. 页面显示识别结果。

单 D6 闭环在开发者工具、Android 真机和 iOS 真机都通过后，再继续扩展 D8、D10、D12、D20 和多骰子。

## 16. 参考资料

- [微信小程序官方示例仓库](https://github.com/wechat-miniprogram/miniprogram-demo)
- [微信小程序 API 类型定义](https://github.com/wechat-miniprogram/api-typings)
- [dice-box 开源项目](https://github.com/3d-dice/dice-box)
- [Poly Haven 资源库](https://polyhaven.com/)
- [Kenney 资源许可说明](https://kenney.nl/support)
## 17. 当前实现状态（2026-09-26）

验收补充（2026-09-27）：以下“已接入”仅代表代码已编写。用户仍报告 XR-Frame 初始化失败，单 D6 的显示、投掷、停止和读数闭环尚未通过实际运行验收；模拟测试不能代替原生运行结果。

本轮已按方案接入真实 XR-Frame，不使用 CSS 3D、Canvas 或 Three.js 替代：

- 新增 `miniprogram/components/xr-dice-scene/`，组件配置为 `renderer: "xr-frame"`。
- 在 `pages/dice_demo/dice_demo` 注册独立页面，并从工具页增加“骰子实验室”入口。
- 已接入 XR-Frame 场景、摄像机、灯光、阴影、`xr-physics`、桌面碰撞、骰子碰撞、摩擦和弹跳参数。
- 已接入触摸/鼠标拖拽事件、松手投掷、重力下落和 D6 姿态读数逻辑。
- XR-Frame 不是 npm 依赖，不能通过 `npm install` 安装；它由微信开发者工具和小程序基础库提供运行时，项目侧正确的“安装/接入”方式是使用 `renderer: "xr-frame"` 的自定义组件。

当前仍属于方案中的阶段 0/1 验证：仓库内没有可确认许可证和面编号的正式 D6 GLB，因此先使用 XR-Frame 内置立方体和六面 `xr-text` 标记验证 XR-Frame 物理闭环。正式 D6 GLB 资源接入前，当前 Demo 结果不得用于业务结算；接入正式模型时必须补齐模型来源、许可证、面编号映射和逐面姿态校验。

## 18. 官方文档与推荐示例核对（2026-09-27）

本轮只读核对文档与代码，不操作用户桌面、不更换 XR-Frame、不修改开发者工具设置。

- [官方概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/)：同一时刻全局只能有一个 XR 组件；组件只能有一个顶层 `xr-scene`，不能混写普通 `view`。
- [官方场景文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/scene.html)：`ready` 的 `detail.value` 是场景实例；`ready` 表示首次解析完成，`tick` 是每帧开始，均不能单独证明业务就绪。
- [官方物理文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/)及[刚体说明](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)：刚体与全局物理标注 Beta，物理能力要求基础库至少 2.32.1。
- [官方真机调试文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/debug.html)：要求最新 Nightly、至少一个分包（空分包也可）、真机调试 2.0。
- [官方概述推荐的示例仓库](https://github.com/dtysky/xr-frame-demo)及[投掷示例](https://github.com/dtysky/xr-frame-demo/tree/master/miniprogram/components/xr-physics-throw)：可参考创建物体、挂入场景、启用刚体、赋予速度，以及根据拖动样本计算释放速度的流程；其 AR 放置部分不适合桌面骰子。
- [推荐仓库文字示例](https://github.com/dtysky/xr-frame-demo/blob/master/miniprogram/components/template/xr-template-textEdit/index.wxml)：包含 `xr-text`、`size`、`anchor`，颜色使用 `uniforms` 的 `u_baseColorFactor`。

当前代码使用一个顶层场景、直接挂载 `xr-physics`，通过 `ready` 的 `detail.value` 获取场景，基本结构与文档一致。`project.config.json` 的基础库配置为 `3.14.2`，不等于设备实际加载版本。`miniprogram/app.json` 的 `subPackages` 是空数组，确定不满足官方真机调试的分包前提，但无法据此解释模拟器或普通预览的故障。[官方 ITextData](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/interfaces/ITextData.html) 明确支持 `color`，此前把数字颜色写法列为可能的不兼容是缺乏依据的猜测，不再将其作为故障假设。内置 `cube` 的官方尺寸是 1×1×1、中心在原点；不应要求真实运行时先读取 `mesh.geometry.boundBox` 才能显示立方体。示例和单元测试都未证明本项目 Skyline 宿主组合实际兼容。

后续按单变量排查：先读取现有诊断 `phase`、`pending`、`message` 并核对实际工具、基础库、运行模式；若是真机调试则核对官方前提。随后用单个立方体、地面和相机逐步验证 `ready`、`tick`、可见、重力、碰撞，再增加数字、按钮投掷、拖拽与读数。单 D6 闭环通过后才扩展四骰和材质。若原技术方案在实际宿主无法满足，应先出示证据向用户确认，不自行更换方案。开发者工具、Android、iOS 的实际运行结果应分别记录。

## 19. 官方文档全目录复核与本轮修正（2026-09-27）

按[XR-Frame 官方概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/)的目录复核了入门指南、核心、资源、渲染、glTF、AR、动画、物理、粒子、分享、内置资源、工具章节；与当前骰子闭环有关的[场景](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/scene.html)、[事件](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/event.html)、[形状](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/shape.html)、[刚体](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)、[轮廓交互](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/interact.html)、[网格](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/render/mesh.html)、[Transform API](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/classes/Transform.html)逐项核对。AR 追踪、粒子、分享不是当前桌面骰子主流程的依赖，不据此扩改。

- 文档明确 `ready` 只是场景首次解析完成，不能代表每个业务节点、碰撞组件及几何数据已就绪。此前默认单骰也强制探测 4 颗骰子是代码的明确错误；现在初始化仅等待当前数量，扩容时等待新增节点，未就绪时禁止投掷，超时显示具体 `pending`。
- 官方指南在父页面实例上使用 `disable-scroll`、物理世界的 `xr-physics` 位于 `xr-scene` 直接子级；现已对齐实例 `disable-scroll`，保留单顶层 `xr-scene` 和物理直接子级，不采用 `wx:for` 的 XR 子节点。
- 初始化失败可手动先卸载旧场景，再重新测量并挂载；这只是恢复入口，**不等于已经解决设备端解析/渲染失败**。
- 自动化覆盖单骰不依赖闲置节点、扩容等待与超时、投掷状态恢复、重建顺序及六面四元数读数；仍须分别验证开发者工具与真机的“场景可见 → 投掷位移/旋转 → 落地稳定 → 数字和结果一致”。本轮没有真实 XR 运行验收结果，不宣称主流程已调通。

## 20. 内置立方体与实际运行验收边界（2026-09-27）

复核[官方内置几何数据](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/builtin/geometry.html)：`cube` 的原点在中心，尺寸为 `1×1×1`；官方示例直接在 `xr-mesh` 上写 `scale`。旧测试却虚构 `2×2×2`、中心 `(0.5,0.5,0.5)` 的包围盒，旧组件又将网格包围盒可读列为初始化门槛，可能在真实环境里一直停在 `mesh dice-visual-0`。该轮地面写 `scale=8.8 0.2 8.8`（第 21 节已扩大为 `14 0.2 14`），四个骰子网格直接写 `scale=1.6 1.6 1.6`；数字仍在父节点 `±0.81`，对应半边长 0.8。组件只等待活动骰子的 transform 与 rigidbody，不再读取内置网格的包围盒；测试也不再伪造包围盒。

**验收标准与当前结论**：自动测试应覆盖默认单骰初始化、四骰扩容、投掷状态/超时恢复、姿态读数以及静态几何尺寸；这只能证明逻辑与官方定义一致。微信 CLI 的 `--help` 不提供无界面编译/运行命令，`preview` 会依赖/启动 IDE；遵守用户“不用 computer use”要求，本轮未打开开发者工具、未运行 XR 原生场景，因而**没有证据称“画面可见 → 运动 → 停止 → 数值显示”已在微信运行时调通**。下一步以实际运行输出的 `[dice-xr]` 错误码、`pending` 与场景画面逐阶段验收，不把单元测试当真机验收。

## 21. 投掷手感、宽投掷台与视角操控（2026-09-27）

本轮基于用户真机反馈调整 XR-Frame 阶段 0/1 Demo，不切换渲染技术，不改变 D6 以外面数尚未开放的边界。

- 投掷：按钮投掷的初始上抛速度由 2 调为 4.2–5，水平随机速度范围由 ±1.5 扩到 ±2.5，角速度提高；线性/角阻尼由 0.2/0.3 降至 0.08/0.22。手拖释放的上抛速度调为 3.5，水平速度上限 ±6。质量未作为唯一调节项，因为固定初速度下单纯减小质量不能可靠解决“空中笨重”。
- 台面与碰撞：视觉地面和物理地面同步由 8.8×8.8 扩至 14×14，四面墙平移到 ±7.1，接缝仍贴合地面；拖拽范围与越界判定同步扩大。相机后移升高以完整观察台面。若骰子在墙边速度接近 0、却仍没有有效落地姿态，持续 900ms 后赋予朝中心的速度和旋转（若再次卡住可再次脱困），尝试脱困；全程仍保留 15 秒超时恢复，不能承诺所有物理卡墙都绝不会发生。
- 视角：采用[官方相机控制器](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/render/camera.html) `camera-orbit-control` 绕固定目标旋转。锁定平移/缩放，在空白处手指滑动旋转视角；按住骰子时调用官方 `disable()` 停用相机控制，释放或恢复时调用 `enable()`，尽量避免两类拖拽同时响应。官方 [CameraOrbitControl API](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/classes/CameraOrbitControl.html) 提供上述方法；真机触摸事件优先级和手感仍需设备验收。

**验收**：自动测试检查投掷初速度、碰撞尺寸与墙坐标、墙边静止脱困和骰子拖拽时相机控制状态；Skyline 静态检查只验证 WXSS。真机需要分别确认空白处滑动能旋转、抓骰子时相机不跟转、骰子能落地读数，以及多次贴墙投掷不会长期卡住。自动化不等于真机效果已通过。