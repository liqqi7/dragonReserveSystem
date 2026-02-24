# 龙城俱乐部小程序

基于微信小程序 + 云开发的俱乐部活动管理工具，用于管理线下活动、签到、记账和成员信息。

## 功能概览

- **活动管理**
  - 创建/编辑/取消/删除活动（管理员）
  - 设置活动时间、地点、报名截止时间、备注等
  - 活动列表按状态展示：**我参与的 / 未开始 / 进行中 / 已结束 / 已取消 / 全部**
  - 活动详情弹窗：展示时间、地点、报名截止时间、参与人员及签到情况
  - 从详情页一键 **报名 / 签到 / 分享活动卡片到微信**

- **签到地图**
  - 为活动配置地点（经纬度）
  - 进入签到页展示地图和签到半径（默认 1km）
  - 计算当前定位与活动地点的距离，仅在范围内允许签到

- **记账功能**
  - 为活动记录费用明细
  - 按人员分摊和统计
  - 可配合活动记录进行结算查询（见 `pages/accounting`）

- **历史与排行**
  - 历史活动记录
  - 参与 / 签到等维度的排行展示（见 `pages/history`）

- **个人中心**
  - 个人信息与昵称管理
  - 公会/权限登记（区分管理员和普通用户）
  - 入口跳转到其他页面（如访问权限、清理数据等）

- **数据清理**
  - 提供清理数据相关入口（`pages/clear_data`），供管理员维护环境

## 技术栈

- **前端**：微信小程序（WXML / WXSS / JS）
- **云开发**：微信云函数（Cloud Functions）
  - `login`：登录与用户信息初始化
  - `signupActivity`：活动报名
  - `checkinActivity`：活动签到
  - `updateActivity`：活动信息更新（含时间迁移等）
  - `deleteActivity`：删除活动
  - `removeParticipant`：移除参与者并同步相关账单
- **数据库**：微信云开发数据库  
  主要集合：`activities`、`users` 等（根据云函数逻辑使用）

## 目录结构

```text
.
├── miniprogram/                 小程序前端代码
│   ├── app.js
│   ├── app.json
│   ├── app.wxss
│   ├── images/                  图标与空状态图
│   └── pages/
│       ├── welcome/             欢迎引导页
│       ├── activity_list/       活动管理主页面（列表 + 详情）
│       ├── checkin_map/         地图签到页
│       ├── accounting/          记账页面
│       ├── history/             历史记录与排行榜
│       ├── clear_data/          数据清理
│       └── profile/             个人中心
├── cloudfunctions/              云函数
│   ├── login/
│   ├── signupActivity/
│   ├── checkinActivity/
│   ├── updateActivity/
│   ├── deleteActivity/
│   └── removeParticipant/
├── project.config.json          微信开发者工具项目配置（miniprogramRoot 等）
├── project.private.config.json  本地开发配置
└── sitemap.json
```

## 本地开发与运行

1. **准备环境**
   - 安装并登录 **微信开发者工具**
   - 在「云开发」中创建环境，替换 `app.js` 中 `wx.cloud.init` 的 `env` 为你的环境 ID

2. **导入项目**
   - 在微信开发者工具中选择「导入项目」
   - 目录选择：本仓库根目录（包含 `project.config.json`）
   - AppID 使用你自己的小程序 AppID（或体验号）

3. **上传并部署云函数**
   - 在「云开发」面板中依次右键部署：
     - `login`
     - `signupActivity`
     - `checkinActivity`
     - `updateActivity`
     - `deleteActivity`
     - `removeParticipant`

4. **数据库初始化（简要建议）**
   - 在云开发控制台中创建集合，例如：
     - `activities`：存储活动信息与参与者列表
     - `users`：存储用户头像、昵称等
   - 可通过小程序界面创建活动进行初始化。

5. **运行与调试**
   - 在微信开发者工具中点击「编译」运行小程序
   - 默认 Tab 为「活动管理」中的「我参与的」筛选
   - 以管理员身份进入「我的」页面，完成权限登记后：
     - 新建活动
     - 设置时间、报名截止时间和地点
     - 通过活动卡片/详情弹窗进行报名、签到与分享

