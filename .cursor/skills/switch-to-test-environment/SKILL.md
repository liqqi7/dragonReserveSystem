---
name: switch-to-test-environment
description: >-
  将 Dragon Reserve 本地联调切换为「测试环境」模式：通过 backend 的 start_backend_test
  脚本启动带 SSH 隧道的后端、并把小程序 API 指向本机端口。在用户说切换为测试环境、测试联调、
  start_backend_test、.env.test、或需要小程序连 127.0.0.1:8001 时使用。
---

# 切换为测试环境

本仓库的「测试环境」指：**后端用 `backend/.env.test` + 可选 SSH 隧道连远端测试库**，**小程序在会话期间请求 `http://127.0.0.1:8001/api/v1`**（默认端口，可被参数覆盖）。

## 与「本机/正式配置」的区别

| 场景 | 做法 |
|------|------|
| 测试联调（本仓库约定） | 运行 `start_backend_test.*`，不要手改 `config.js` 提交到 Git |
| 仅本机后端、不动小程序 config | 用 `start_backend_prod.*` 或自行 `uvicorn`，见根目录 `README.md` |

仓库提交的是 `miniprogram/services/config.js.template`（线上基址）；真实的 `miniprogram/services/config.js` 在 `.gitignore` 中，由测试脚本临时覆盖、退出后从 template 恢复。

## 前置条件

- `backend/.env.test` 存在且配置正确（含数据库与可选 `SSH_TEST_DB_*`；缺省时脚本内有默认 SSH 相关占位，仍以 `.env.test` 为准）。
- `backend/.venv` 已创建且依赖已安装（Windows 下 Python 为 `backend/.venv/Scripts/python.exe`）。
- 本机可执行 `ssh`（脚本会在本地转发端口不可用时建隧道）。

## 启动测试环境

**Windows（当前用户环境）：**

```powershell
cd backend
powershell -ExecutionPolicy Bypass -File ./scripts/start_backend_test.ps1
```

可选参数（示例）：`-EnvFile "D:/path/to/.env.test"`、`-AppHost 127.0.0.1`、`-AppPort 8001`、`-AppReload 0`。

**macOS / Linux：**

```bash
cd backend
./scripts/start_backend_test.sh
```

可通过环境变量覆盖 `ENV_FILE`、`APP_HOST`、`APP_PORT`、`APP_RELOAD` 等（见脚本头部注释与根目录 `README.md`）。

## 脚本会做什么（摘要）

1. 读取 `backend/.env.test`（或你指定的 env 文件）。
2. 若本地 MySQL 转发端口未就绪，启动到远端测试库的 SSH 隧道。
3. 用 `--env-file` 启动 uvicorn（默认 `http://127.0.0.1:8001`）。
4. 在进程存活期间写入 `miniprogram/services/config.js` 指向上述 API 基址。
5. 脚本退出时停止隧道（若由脚本启动）并用 `config.js.template` 恢复小程序配置。

## Agent 执行时注意

- 用项目内 **Shell** 在对应目录执行上述命令；长驻进程按需后台运行或提醒用户在终端保持窗口。
- 不要建议把含内网/本地地址的 `config.js` 提交进仓库。
- 更完整的变量说明与架构背景见仓库根目录 `README.md` 章节「环境与配置」「启动测试环境」。
