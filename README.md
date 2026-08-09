# 龙城俱乐部小程序

微信小程序和 FastAPI 后端组成的活动管理系统。项目不使用微信云开发、云函数或云数据库；业务数据由后端和 MySQL 管理。

## 当前功能

- 活动创建、编辑、取消、删除、报名、取消报名和签到
- 日程、历史统计和排行榜
- 微信登录、角色管理、用户资料和用户自行上传头像
- 管理员清理活动数据

账单、记账与云函数功能已移除。

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

最近一次完整结果为 `30 passed`。测试使用临时 SQLite 数据库，不连接生产库或服务器测试库。

连接服务器测试库进行小程序联调：

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend_test.ps1
```

脚本会建立 SSH 隧道、启动本地 8001 端口，并在运行期间将小程序本机配置指向该端口；退出时恢复生产地址模板。

详细说明见 [后端说明](backend/README.md)，其中包含测试库联调、服务器连接和生产部署说明。
