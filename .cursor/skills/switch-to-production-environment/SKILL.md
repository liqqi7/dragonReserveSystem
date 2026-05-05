---
name: switch-to-production-environment
description: >-
  将 Dragon Reserve 小程序与联调流程切换为「线上环境」：API 基址使用仓库中的正式域名模板、
  不再指向本机 8001。在用户说切换到线上环境、正式环境、生产 API、恢复线上 config、
  不用测试联调了、config.js.template、或需要连 https://dragon.liqqihome.top 时使用。
---

# 切换到线上环境

本仓库的「线上环境」（小程序侧）指：**`miniprogram/services/config.js` 中的 `API_BASE_URL` 与 `config.js.template` 一致**，即正式 HTTPS 基址（当前为 `https://dragon.liqqihome.top/api/v1`），**不**再使用测试脚本写入的 `http://127.0.0.1:8001/api/v1`。

## 与「测试联调」的区别

| 场景 | 小程序 API 基址 | 典型操作 |
|------|------------------|----------|
| 测试联调 | `http://127.0.0.1:8001/api/v1` | 运行 `start_backend_test.*`（脚本生命周期内覆盖 `config.js`） |
| 线上 / 审核 / 连正式后端 | `config.js.template` 中的正式域名 | 见下文「切换步骤」 |

`config.js` 在 `.gitignore` 中，**不要**把含本地地址的版本提交到 Git。仓库只提交 `miniprogram/services/config.js.template`。

## 切换步骤（小程序）

任选其一即可达到「线上」配置：

1. **若正在跑 `start_backend_test.*`**：在运行该脚本的终端里**正常结束进程**（Ctrl+C）。脚本退出时会用 `config.js.template` **自动恢复** `config.js`。
2. **若未跑测试脚本，或 `config.js` 仍指向本机**：将模板覆盖为当前配置（PowerShell 示例，仓库根目录执行）：

   ```powershell
   Copy-Item -Force "miniprogram/services/config.js.template" "miniprogram/services/config.js"
   ```

   macOS / Linux：

   ```bash
   cp miniprogram/services/config.js.template miniprogram/services/config.js
   ```

3. **若本地没有 `config.js`（首次克隆等）**：同样执行上一步从模板复制。

然后在微信开发者工具中重新编译/预览，确认请求域名指向正式 HTTPS。

## 后端说明（可选）

- **只连线上正式 API**：无需在本机启动后端；保证小程序 `config.js` 与模板一致即可。
- **本机跑「正式/本机直连」后端且不改小程序**：使用 `backend/scripts/start_backend_prod.*`（默认读 `backend/.env`），**不会**改写 `config.js`。此时若仍要让小程序打本机，需自行改 `config.js`（属于本地特例，勿提交）；若要让小程序打线上，保持 `config.js` 与模板一致即可。

更完整的变量与端口说明见仓库根目录 `README.md`（「环境与配置」「本地 / 测试 / 正式 启动方式」）。

## Agent 执行时注意

- 优先确认用户是否仍开着 `start_backend_test`；若是，**先结束脚本**往往即可完成恢复。
- 用 **Copy-Item / cp** 或等价方式对齐模板，避免手抄 URL 出错。
- 真机调试需在小程序后台配置合法 `request` 域名（线上为 HTTPS 正式域名）；开发者工具可临时关闭域名校验，**不代表**真机已放行。
- 不要建议将带 `127.0.0.1` 或内网地址的 `config.js` 提交进仓库。
