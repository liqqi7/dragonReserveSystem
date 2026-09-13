# 龙城俱乐部小程序

微信小程序和 FastAPI 后端组成的活动管理系统。项目不使用微信云开发、云函数或云数据库；业务数据由后端和 MySQL 管理。

## 当前功能

- 活动创建、编辑、取消、删除、报名、取消报名和签到
- 日程、历史统计和排行榜
- 微信登录、角色管理、用户资料和用户自行上传头像
- 桌游库、实物库存、活动提名、对局和计分表、统计与历史导入（本分支已实现，需同分支后端启用）

账单、记账与云函数功能已移除。

## 新拉代码后查看小程序

在项目根运行一次本地配置初始化，再用微信开发者工具导入项目根目录：

```sh
node scripts/init_miniprogram_config.cjs
```

默认连接 `http://127.0.0.1:8001/api/v1`；可在命令末尾传入自己的 API 地址。命令不会覆盖已有配置。`miniprogram/services/config.js` 是必需的本地文件，Git 只保存模板和初始化命令；缺少此文件会导致页面模块加载失败。

桌游入口为“工具 → 桌游库”。浏览器原型、后端设置、成员登录和页面入口见 [UI评审说明](miniprogram/BOARDGAME_UI_REVIEW.md)。

另一台电脑从零启动本地环境、交给大模型接手，以及导入 BGG / BG Stats 的完整步骤见 [本地启动与导入交接](docs/LOCAL_BOARDGAME_HANDOFF.md)。包含可复制的接手任务、独立 MySQL、私有配置、worker、迁移、人员匹配和验收；该流程不使用下方的服务器测试库联调脚本。

## 目录和约定

- `miniprogram/`：微信小程序前端。
- `backend/`：FastAPI、数据库迁移、测试和维护脚本。
- 数据库结构变更必须通过 Alembic 迁移完成。
- 生产头像保存在服务器 `backend/storage/avatars/`；本地 `backend/storage/` 是空目录占位，不应覆盖服务器文件。
- 用户修改昵称或头像后，历史活动参与记录会同步显示最新资料。
- 服务器每 5 分钟同步一次活动状态，将到期活动标记为已结束。

## 测试与联调

Windows PowerShell 中运行本地测试：

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q
```

完整测试结果见 [验证记录](backend/design/boardgame-library/verification.md)。测试使用临时 SQLite 数据库，不连接生产库或服务器测试库。

连接服务器测试库进行小程序联调：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

脚本会建立 SSH 隧道、启动本地 8001 端口，并在运行期间将小程序本机配置指向该端口；退出时恢复生产地址模板。

详细说明见 [后端说明](backend/README.md)，其中包含测试库联调、服务器连接和生产部署说明。
