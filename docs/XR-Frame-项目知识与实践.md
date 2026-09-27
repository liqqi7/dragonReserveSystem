# XR-Frame 项目知识与实践

> 更新：2026-09-27。适用项目：龙城小程序。本文是 XR-Frame 的**独立使用手册与排障记录**；实现范围以当前仓库代码为准，官方能力与项目已实现能力严格区分。骰子产品计划见[3D 骰子 Demo 技术方案与实施计划](./骰子3D小程序-Demo技术方案与实施计划.md)。
>
> **证据层级**：标注“官方”是截至更新日核对过的微信开放文档；标注“项目”是本仓库当前代码；标注“用户真机反馈”是用户实际使用报告，不代表所有机型已验收。单元测试/静态检查不能代替真机渲染、物理和手势验收。

## 1. 一页速览：如何使用当前 Demo

1. 从小程序**工具页 → 骰子实验室**进入；等待状态由“正在初始化 XR-Frame”变为可投掷。
2. 当前只能选择 **D6，数量 1–4**。D8、D10、D12、D20 只是阶段性占位，尚不可投掷。
3. 点击“投掷”，或在 3D 场景里按住骰子、拖动、松手。页面会显示最近的各骰面数和总和。
4. 在**骰子以外的空白区域**单指滑动，尝试绕投掷台旋转视角。按住骰子时暂时关闭相机绕转，松开后恢复。页面不会用手机陀螺仪控制投掷。
5. 遇到初始化失败，可看错误码并点“重新初始化”；此操作先卸载旧场景再挂载新场景，不等于根因已修复。

**状态边界**：用户真机反馈已经看到骰子投掷，但还反馈过“空中笨重”和“靠墙卡住”；2026-09-27 已相应调整初速、阻尼、台面和视角控制。最新手感、空白区旋转与抓骰子时的事件优先级尚未由我们在真机独立验收。不要把页面可打开、自动化通过或用户称赞等同于各平台闭环稳定。

## 2. XR-Frame 是什么、能做什么

[官方概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/)将它定义为微信小程序提供的 XR/3D 方案：用 XR 专用 XML 标签描述场景，提供渲染、资源、交互及扩展能力。**它不是从 npm 安装的独立前端库**；项目配置一个 `renderer: "xr-frame"` 的小程序自定义组件，由相应微信客户端/基础库运行时承载。[官方入门指南](https://developers.weixin.qq.com/miniprogram/dev/framework/xr-frame/)给出了组件 JSON、场景和页面嵌入方法。

| 领域 | 官方提供的能力 | 本项目目前的使用情况 |
| --- | --- | --- |
| 场景/生命周期 | `xr-scene`、节点、组件、系统、`ready`/`tick` 等事件 | 一个顶层场景；用 `ready` 获取实例，`tick` 检查物理与结算 |
| 几何/材质 | 内置几何、`xr-mesh`、光照、阴影、PBR、glTF 资源 | 内置 `cube`、标准材质、颜色、环境/方向光、阴影；**未接正式 GLB** |
| 相机 | 透视/正交、目标跟随、`camera-orbit-control` | 固定目标绕转；锁定平移和缩放；拖骰子时暂停绕转 |
| 物理 | 全局重力、刚体、形状、碰撞/重叠、摩擦、弹性、交互事件 | `xr-physics`、立方体碰撞形状、骰子/地面/围墙碰撞及投掷 |
| 输入 | 形状触摸、拖动、释放；场景与节点事件 | 拖骰子释放投掷；空白区域的相机手势由官方控制器处理 |
| 其他 | 官方文档还有动画、粒子、AR、渲染后处理、分享等章节 | **本骰子 Demo 未使用**；“XR”不意味着必须打开摄像头/AR |

物理文档在更新日仍把刚体和轮廓交互标为 **Beta**，需对不同设备、微信版本做实际验证；不承诺完全相同的帧率和碰撞手感。[官方物理](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)、[轮廓交互](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/interact.html)。

### 官方明确的结构和限制

- 一个 XR 组件只能有**一个顶层 `xr-scene`**；全局同一时刻只能有一个 XR-Frame 组件，否则可能异常。XR 场景内部不要与普通小程序 `<view>` 等传统标签混写。页面外层仍可以是正常的 Skyline 页面。[概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/)、[场景](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/scene.html)。
- `xr-physics` 必须放在 `xr-scene` **直接子级**。默认全局重力是 `(0,-9.8,0)`；如禁用物理则刚体不会有预期模拟。[刚体和全局物理](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)。
- 官方概述在本次查阅时列出最低微信客户端 iOS 8.0.29、Android 8.0.30，基础库 2.27.1；推荐基础库 2.32.0 及以上。**使用物理还要求基础库 2.32.1 及以上**。这些是文档当时的要求，后续以官方最新页与设备实测为准；`project.config.json` 的 `libVersion` 配置值不能证明手机实际运行版本。[概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/)、[物理](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)。
- 官方[真机调试说明](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/debug.html)针对“真机调试”要求最新 Nightly 工具、至少一个分包（空分包也可）及“真机调试 2.0”。当前 `miniprogram/app.json` 的 `subPackages: []` 不符合**该模式**的分包前提；它不能单独解释 PC 模拟器或普通真机预览为何失败。不要擅自把真机调试 2.0 条件推广到所有运行模式。

## 3. 本项目从配置到画面的接入方式

| 位置 | 职责 |
| --- | --- |
| `miniprogram/app.json` | 注册 `pages/dice_demo/dice_demo`，设置 `lazyCodeLoading: "requiredComponents"` 与 Skyline 全局选项 |
| `miniprogram/pages/tools/tools.*` | 工具页入口 |
| `miniprogram/pages/dice_demo/dice_demo.json` | 页面为 Skyline/glass-easel，注册 `xr-dice-scene` |
| `miniprogram/pages/dice_demo/dice_demo.wxml/.wxss/.js` | 配置数量、状态/结果 UI，测量场景尺寸，控制 XR 组件挂载与重试 |
| `miniprogram/components/xr-dice-scene/index.json` | 自定义组件：`"component": true, "renderer": "xr-frame"` |
| `miniprogram/components/xr-dice-scene/index.wxml` | 真实 XR 场景、骰子、物理地面/墙、相机、光照 |
| `miniprogram/components/xr-dice-scene/index.js` | 初始化、投掷、形状拖拽、脱困、姿态结算与错误状态 |
| `miniprogram/pages/dice_demo/dice_demo_logic.js` | D6 四元数朝上面读取，另含规划阶段的辅助函数；**不要把未调用函数误报为当前渲染流程** |
| `miniprogram/tests/diceDemo.test.js` | XR 组件逻辑的 Node 模拟测试，不执行微信原生物理引擎 |

最小结构示意（**示意，不要替换当前完整场景**）：

```json
// XR 自定义组件 index.json
{"component": true, "renderer": "xr-frame", "usingComponents": {}}
```

```xml
<!-- XR 组件 index.wxml；只允许一个顶层 xr-scene -->
<xr-scene bind:ready="handleReady" bind:tick="handleTick">
  <xr-assets><!-- 材质等资源 --></xr-assets>
  <xr-physics />
  <xr-node id="dice-mesh-0" rigidbody="disabled: true"
      cube-shape="size: 1.6 1.6 1.6" shape-interact="collide: true"
      bind:touch-shape="handleTouchShape" bind:drag-shape="handleDragShape"
      bind:untouch-shape="handleUntouchShape">
    <xr-mesh geometry="cube" scale="1.6 1.6 1.6" />
  </xr-node>
  <xr-node node-id="camera-target" position="0 -1 0" />
  <xr-camera position="0 12 17" target="camera-target"
      camera-orbit-control="rotateSpeed: 0.8; isLockMove: true; isLockZoom: true" />
</xr-scene>
```

父页面在布局完成后量 `.dice-stage` 宽高，给 XR 组件设置 CSS 显示尺寸和 `width`/`height` 渲染缓冲尺寸；缓冲像素比被限制到 `[1,2]`，避免无限放大。父页面实例带 `disable-scroll`；外层仍可使用 Skyline 的 `scroll-view type="custom"`。这些是**项目做法**，基础页面嵌入方式可参照[官方入门指南](https://developers.weixin.qq.com/miniprogram/dev/framework/xr-frame/)。

### 初始化不能只看 `ready`

官方[场景文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/scene.html)：`ready` 表示场景**第一次解析完毕**，`tick` 是一帧驱动开始，`ready` 的 `detail.value` 可拿到场景实例。项目的实际流程是：

1. `handleReady({detail})` 保存场景，调用 `wx.getXrFrameSystem()`，随后等待首帧 `tick`。
2. `_initialize()` 只查找**当前选中数量**的 `dice-mesh-*`，逐个取 `transform` 和 `rigidbody`；不因为未使用的另外几颗骰子未就绪就阻塞单骰。
3. 为刚体设阻尼、取相机控制器、重置骰子后才向父页面发 `ready`。从 1 扩到更多骰子时，再等待新增节点。
4. 初始化最多等待 12 秒，并上报 `phase=initialization`、`code=init-timeout`、`pending=scene-ready/first-tick/dice N/physics N`。这只是项目的诊断与超时策略，并非 XR 官方固定时限。
5. “重新初始化”先将 `sceneMounted` 设为 `false` 卸载旧 XR，再下一轮测量和挂载；符合“同一时刻一个 XR 组件”的约束。

**已有踩坑**：官方内置 `cube` 原点居中、尺寸为 `1×1×1`，网格 `scale=1.6` 才是显示出的骰子边长。旧代码错误地要求读取 `mesh.geometry.boundBox` 才算业务就绪，且测试伪造了不符官方定义的包围盒；现已去除此门槛，直接明确视觉网格、碰撞体及六面数字位置。不要重新引入“必须先拿到包围盒才能显示内置 cube”的条件。[内置几何](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/builtin/geometry.html)。

## 4. 物理、投掷、手势与读数的实际流程

### 地面、骰子、碰撞

- 视觉地面和 `cube-shape` 地面都为 `14×0.2×14`，中心 `(0,-2.2,0)`，顶面 `y=-2.1`；四墙位于 `x/z=±7.1`，形成约 `14×14` 的投掷区域。几何、拖拽范围、越界阈值要联动修改，不能只放大视觉贴图。
- 四颗预置 XR 节点各有 `1.6×1.6×1.6` 的盒形碰撞体与同尺寸可见立方体；未使用的节点在 `y=-20` 且刚体禁用。D6 六个数字是 `xr-text`，中心分别位于局部 `±0.81` 处。
- `shape-interact` 中 `collide: true` 必须在**双方**成立，才是实际碰撞；`collide: false` 属于重叠而非反弹。`staticFriction`、`dynamicFriction`、`bounciness` 范围在官方文档为 0–1；它们与模型视觉材质无关。[轮廓交互](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/interact.html)。
- 官方[轮廓](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/shape.html)解释 `cube-shape`、`sphere-shape`、`capsule-shape`、`mesh-shape`；形状不仅用于物理，也用于点中/拖动。高面数视觉模型不必照搬复杂碰撞网格；官方提示 MeshShape 顶点数小于 65535，超限可考虑 CubeShape+autoFit，但正式 D8/D20 必须验证其形状与结果公平性。

### 投掷和卡墙恢复（项目参数，不是官方默认）

- 点击按钮将活动骰子放在台面上方、设置随机旋转、启用刚体，给线速度（竖直约 `4.2–5`，水平各轴 `±2.5`）和角速度，然后 `wakeUp()`。手感参数见下表。固定初速度下，单纯加大质量**不会加快重力下落**；本轮通过全局重力和接触参数改变“沉下去、落地不乱弹”的感觉。
- 手指按中骰子时禁用该骰刚体并暂停相机控制；`drag-shape` 的射线与 `y=-0.2` 平面求交，限制 x/z 在 `±4.7`；松手依据最近位置样本算水平速度（每轴上限 `±6`），竖直初速 `3.5`，加入旋转、重启物理，并恢复相机。
- 侧墙扩大后，仍可能有骰子斜靠墙形成物理“楔子”。若某骰速度低但高度/姿态不支持结算，且靠近墙 `>5.2`，维持超过 `900ms`，尝试赋予朝中心的线速度与角速度并唤醒；若再次卡住可以再次尝试。最多等待 `15s` 后项目回到可重投状态，不保证所有极端姿态都有读数。不要把超时后的 `retry` 当成有效结果。
- 官方刚体支持质量、重力及 `wakeUp()` 等，[刚体说明](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html)；上述数值均是 Demo 手感调参，非官方推荐的普适参数。

#### 2026-09-27 “偏重、少飘”物理参数试调（待真机手感验收）

| 项目 | 调整前 | 本轮试调 | 目的 |
| --- | --- | --- | --- |
| 全局重力 y | `-9.8`（默认） | `-14` | 适度加快上升减速和下落；这是风格化手感而非地球物理单位标定 |
| 骰子质量 | 未显式设置 | `3` | 提升碰撞交互的质量设定；不宣称同初速下会更快自由下落 |
| 线性阻尼 | `0.08` | `0.02` | 不让阻尼抵消下坠的加速 |
| 角阻尼 | `0.22` | `0.36` | 落地后更快收敛旋转，保留一定翻滚 |
| 骰子弹性／静摩擦／动摩擦 | `0.3 / 0.65 / 0.5` | `0.08 / 0.75 / 0.58` | 减少弹跳与地面滑行 |
| 地面弹性／静摩擦／动摩擦 | `0.15 / 0.7 / 0.6` | `0.05 / 0.8 / 0.65` | 减少二次弹跳，让接触更扎实 |
| 墙面弹性／静摩擦／动摩擦 | `0.2 / 默认 / 默认` | `0.05 / 0.4 / 0.3` | 降低弹墙，不用高墙摩擦重现卡墙楔住 |

上一次手感调整（历史记录）**没有修改**按钮投掷起点、按钮/手拖释放初速度、角初速度和骰子视觉材质；目前这些运动参数已可在第 7 节的工具中调整，视觉材质仍未调整。上一次改动位于 `components/xr-dice-scene/index.wxml` 和 `index.js`。质量、摩擦对不同接触组合的实际手感要以微信真机验证；Node 测试只能锁定配置和业务逻辑，不能运行 XR 物理求解器。若真机出现“急坠”“不翻滚”或卡墙增加，应以这一组数值为基线，每轮只调整一个参数组并记录触地时间、反弹次数、停稳时长和失败率。[官方轮廓交互](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/interact.html)给出弹性/摩擦范围及双方碰撞条件。

### 相机与形状事件

[官方相机文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/render/camera.html)给出 `target` + `camera-orbit-control` 以绕目标旋转。当前目标 `(0,-1,0)`，相机初始 `(0,12,17)`，`rotateSpeed=0.8`，锁定平移/缩放。官方 [CameraOrbitControl API](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/classes/CameraOrbitControl.html)提供 `enable()` 和 `disable()`；项目用 `_pauseOrbit()`/`_resumeOrbit()` 包装，在拖骰子时暂停绕转。是否真的在所有真机上做到“拖骰子不转相机、空白处能转”，仍要用原生运行验证，不以模拟事件测试代替。

[官方轮廓文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/shape.html)明确：`touch-shape` 点中最上层轮廓，`drag-shape` 在已触摸且未松开时发生，`untouch-shape` 在松手时发生；项目使用这些 XR 事件，而不是往 XR 组件内部插 `<view>` 接管。XR WXML `bind:xxx` 的处理函数位于组件 `methods`，事件载荷从 `event.detail.value` 读取，[官方事件说明](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/event.html)。

### 什么叫真正落地并能出结果

- 每帧检查活动骰子的世界坐标没有非数/越界；将 `transform.worldQuaternion` 转换为六个局部面的世界朝上方向。选出向上分量最大的面，但只有点积 **≥0.98** 才认作有效朝上面。六面对应 1/6、3/4、5/2。
- 同时要求线速度和角速度模长都 `<0.08`，骰子中心高度 `≤-1.18`（地面顶面 -2.1 + 骰半高 0.8 + 容差 0.12），所有活动骰子连续满足至少 `400ms` 后才向页面发结果和总和。空中暂时静止、靠墙斜立或仍旋转时不强行读数。
- 这是**当前 D6 内置立方体的面法线映射**，不是“任何骰子模型自动识别”。正式 GLB / D8 / D20 必须对齐模型坐标系、每个面编号/法线、静止姿态容差，并做逐面测试；不能直接复用 D6 映射。
- 本 Demo 结果在客户端计算，可被篡改；**不用于公平性要求高的线上结算**。是否采用服务端可信随机数是未来产品/安全设计，不是当前 Demo 的实现。

## 5. 常见故障：先看证据，不堆补丁

| 现象/代码 | 先区分什么 | 项目中的检查路径 |
| --- | --- | --- |
| 显示“XR-Frame 不可用”或 `scene-ready` 超时 | 组件未开始解析、宿主/渲染器、运行模式、基础库版本；不能直接归因某个文字/颜色属性 | 记录 `phase/code/pending/message`，核对 `index.json` 的 `renderer`、顶层场景与实际设备；逐级缩为相机+立方体 |
| PC 模拟器报 `Skyline canvas` 不支持、真机正常 | **模拟器能力和真机能力分开判断** | 对照实际工具版本及模式；这类 PC 失败不能自动推断真机也失败，也不能声称所有 PC 版本必然不支持 |
| `Framework inner error (expect END descriptor ... FLOW_REPEAT)` | XR WXML 解析/渲染器内部错误，不等于网络请求失败 | 检查 XR 子节点语法与动态结构；用最小静态 XR 场景逐项恢复，不凭堆栈猜唯一根因；当前场景显式写四颗骰子，不用 `wx:for` 生成 XR 节点 |
| `request:fail ... ERR_CONNECTION_REFUSED` | API 后端连接错误，与 3D 场景初始化是不同链路 | 单独核对请求目标和服务器监听；不要用修复网络错误解释 XR 物理问题 |
| 一直“投掷中” | 帧回调是否运行、速度/高度/姿态能否稳定；是否卡墙或骰子飞出 | 看 `tick`、世界坐标和速度，确认 15 秒超时能转 `retry`；墙边低速无有效姿态时检查脱困策略 |
| 点骰子时视角也转/空白处不转 | 相机控制器是否取得、`touch-shape` 是否命中、`disable/enable` 调用时机 | 逐个手势验收；勿把模拟测试中的 mock 事件当成真实触控分发 |
| 扩大地面后画面裁切/穿墙 | 显示尺寸、碰撞体、墙位置、相机、越界阈值是否一致 | 同时检查 `index.wxml` 与 `index.js`；不要只改 CSS 或可见网格 |

**排查顺序**：记录设备型号、系统/微信/基础库/开发工具版本、普通预览还是“真机调试 2.0”；再记录原始 `phase/code/pending/message` 和场景日志。每轮只改一个变量：相机清屏 → cube 可见 → 地面/重力 → 单骰碰撞 → 投掷 → 姿态 → 多骰 → 相机拖拽。失败先回到刚才有效的最小场景；不要用遮挡、WebView 回退或静默吞错掩盖 XR 根因。官方调试入口见[调试文档](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/debug.html)。

**纠正过的误判**：`ready` ≠ 所有组件/物理已就绪；配置的 `libVersion` ≠ 手机实际加载值；`xr-text` 的 `color` 并非“官方不支持”，官方 [ITextData](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/interfaces/ITextData.html)列有该字段；内置 cube 的包围盒不应被当作强制初始化门槛；`subPackages: []` 是“官方真机调试 2.0”前提问题，不是全部模式失败的通用解释。

## 6. 资源、性能和后续扩展

- 视觉素材可以用有明确许可证的第三方 GLB/glTF 模型和木、石、玉纹理，**不必从零建模**，但必须记录作者、来源、许可、是否允许商用/再分发；模型好看不等于碰撞体和读数自动正确。官方有[glTF 使用说明入口](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/gltf/)和模型优化工具入口。
- 正式版应把**视觉网格、简化物理碰撞、面编号映射**分别设计，检查坐标原点、缩放、纹理内存和遮挡。D8/D10/D12/D20 的几何及逐面测试需单独实施；当前实现不具备这些面的读数和真实骰子模型。
- 性能先看帧率、首屏资源体积、低端设备、连续多次投掷的内存增长和 1–4 颗并发稳定性；只加载需要的资源，避免高模网格碰撞。官方概述提及资源缓存/工具链，不能直接推出本项目所有模型资源已缓存。
- 此 Demo 纯前端、无骰子服务端接口，也不以设备陀螺仪驱动投掷。未来若用于可信结算、多人同步，需要另行定义随机性、反作弊与服务端/联机协议；这不属于本页“已实现”。

## 7. 骰子实验室：自助物理调参（2026-09-27）

工具页 → 骰子实验室 → **物理调参** → 展开。现阶段仅供 D6、1–4 颗骰子的前端实验，不修改线上活动或服务端数据。36 个输入按「下落与惯性」「接触与弹跳」「按钮投掷」「手拖投掷与结算」「卡墙脱困与超时」分组，各项显示取值范围和提示。可直接输入小数，点击**应用并试投**：校验全组数值，先卸载旧 XR 场景，传入完整物理参数并重新挂载，场景报告 ready 后自动投掷；同时自动滚动到投掷台。若 XR 初始化失败则不会假称试投成功，可再改参数或点击重新初始化。

- **恢复默认**：重置到当前代码默认值、保存并按相同流程试投。**复制参数 JSON**：复制当前输入值（非法输入无法复制），可在反馈中粘贴供复现；当前版本没有导入 JSON 功能。
- 仅在「应用」或「恢复默认」时写入本机 wx storage（键 xrDicePhysicsTuningV1）；下次进入读取并校验，格式坏掉时回退默认。输入中不会重建场景，也不会上传数据。不同手机、清除微信缓存或重新安装后不会自动同步参数。
- XR gravity、rigidbody 质量、碰撞材料属性在场景创建时设定；这里**整场景卸载/重建**而非假设初始属性支持热更新。JS 的阻尼、投掷初速度、角速度与静止判定取同一份配置。默认值集中于 miniprogram/pages/dice_demo/dice_physics_config.js，原模型大小、相机及桌面尺寸不在本次调参范围。质量不等于自由落体加速度；重力、阻尼、弹性和摩擦的组合以真机手感为准。
- 页面用 scene epoch 忽略上一轮 XR 的滞后状态/结果事件；「场景 ready」只是自动触发试投的时机，不证明某台真机物理运行正确。请真机检查不同参数下可见的下落/碰撞/读数，并重点检查多骰与卡墙。

## 8. 验证命令与验收清单

从项目根目录执行（使用当前系统 Node 与已安装的 Skyline CLI；命令成功只说明其各自覆盖范围）：

```powershell
node --check miniprogram/components/xr-dice-scene/index.js
node --check miniprogram/pages/dice_demo/dice_demo.js
node --test miniprogram/tests/diceDemo.test.js miniprogram/tests/chwazi.test.js miniprogram/tests/toolsPrototype.test.js
skyline wxss check --miniprogram-root miniprogram --files pages/dice_demo/dice_demo.wxss --json
git diff --check
```

自助调参功能后，2026-09-27 本地小程序全量自动化 **556/556 测试通过**（其中骰子等聚焦测试 64/64）、Skyline WXSS **0 个错误**；后续改动必须重跑。`git diff --check` 不会检查未被 Git 跟踪的文件内容；不能以它证明全部新文件正确。WXSS 静态检查也不能编译 XR 原生渲染、观察手感或识别卡墙概率。

设备验收分别记录：

1. Android 和 iOS 的微信版本、基础库、页面进入模式；确认场景有画面，而不止是 UI 状态“ready”。
2. 单骰点击投掷与手拖释放：在空中明显移动/旋转，碰撞后落地，画面数字与结果一致；多次重复。
3. 1–4 颗骰子，靠墙、靠角、快速滑动、切后台再回来；不永久“投掷中”，失败时能恢复重投。
4. 空白区域旋转视角，抓住骰子时相机不跟转，释放后可以继续旋转；在不同屏幕大小检查台面不被裁切。
5. 性能与资源：低端机帧率、发热、内存、长时间重投；模型接入后再做一次全量测试。

## 9. 官方文档与项目资料索引

**官方总览与接入**：[XR-Frame 概述](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/overview/) · [入门指南](https://developers.weixin.qq.com/miniprogram/dev/framework/xr-frame/) · [场景](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/scene.html) · [元素与查找](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/element.html) · [事件](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/core/event.html) · [真机调试](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/tools/debug.html)。

**官方渲染与模型**：[相机](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/render/camera.html) · [CameraOrbitControl API](https://developers.weixin.qq.com/miniprogram/dev/api/xr-frame/classes/CameraOrbitControl.html) · [内置几何](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/builtin/geometry.html) · [glTF 目录](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/gltf/)。

**官方物理与交互**：[刚体/全局物理](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/rigidbody.html) · [轮廓](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/shape.html) · [碰撞与重叠](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/physics/interact.html)。

**参考示例，不是本项目验收证据**：[官方概述推荐的 xr-frame-demo](https://github.com/dtysky/xr-frame-demo)及其中[物理投掷示例](https://github.com/dtysky/xr-frame-demo/tree/master/miniprogram/components/xr-physics-throw)。示例只供对照 API 与设计，不要照搬其 AR 放置与当前桌面投掷逻辑。

**项目计划与历史**：[3D 骰子 Demo 技术方案与实施计划](./骰子3D小程序-Demo技术方案与实施计划.md)含阶段目标、此前问题与多次迭代记录；历史段落描述的是当时状态，阅读现状以本页第 1、3–8 节和当前代码为准。