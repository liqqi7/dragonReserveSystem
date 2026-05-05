---
name: backend-release
description: >-
  指导 Dragon Reserve 后端在生产环境发版：拉代码、安装依赖、执行 Alembic 迁移、重启
  systemd（腾讯云 Ubuntu）或 launchd（Mac 服务器）、必要时校验/重启 Caddy，并发版后健康检查。
  在用户说后端发版、生产上线、部署后端、更新服务器、restart dragonreserve-backend、
  alembic upgrade head、或需要按仓库文档做例行发布时使用。
---

# 后端发版

本技能面向本仓库 **FastAPI + MySQL + Alembic** 后端的**生产机例行发版**；首次装机、域名、安全组、`.env` 初始化等见专项文档，不在此重复全部细节。

## 权威文档（先读后动）

- 腾讯云 Ubuntu + systemd + Caddy：`backend/DEPLOY_TENCENT_CLOUD.md`
- Mac 作服务器 + launchd + Caddy：`backend/DEPLOY_MAC_SERVER.md`
- 环境变量与本地命令总览：`backend/README.md`、`backend/Makefile`

小程序端正式 API 基址与 `config.js` 约定：必要时配合项目技能 `switch-to-production-environment`（`.cursor/skills/switch-to-production-environment/SKILL.md`）。

## 发版前检查（Agent 与人工）

- [ ] 目标分支已合并、变更含**数据库迁移**时在发版说明中标注（必须执行 `alembic upgrade head`）。
- [ ] `requirements.txt` 有变更时，发版机需重装依赖。
- [ ] 不在仓库中提交或打印生产 `.env`、密钥；仅确认服务器上已有正确配置。
- [ ] 若涉及 **Caddy 域名/证书/路由** 或 **头像 `storage/`** 路径变更，对照 `DEPLOY_TENCENT_CLOUD.md` 中「头像上传」「Caddy」等章节。

## 腾讯云 Ubuntu（systemd：`dragonreserve-backend`）

仓库文档中的**建议例行流程**（具体 SSH 用户、主机与路径以 `backend/DEPLOY_TENCENT_CLOUD.md` 为准）：

```bash
ssh <user>@<host>
cd ~/apps/dragonReserveSystem
git pull
cd backend
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
sudo systemctl restart dragonreserve-backend
```

**仅当 Caddy 配置有变更时**再执行：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
```

常用排障：

```bash
sudo systemctl status dragonreserve-backend
sudo journalctl -u dragonreserve-backend -n 100 --no-pager
```

发版后验证：对公网基址请求 `GET /api/v1/health`（及关键业务冒烟，见部署文档「已完成验证」列表）。

## Mac 服务器（launchd：`com.dragonreserve.backend`）

文档侧重首次安装；**例行发版**可沿用同一思路（路径与域名以你机器为准）：

```bash
cd <PROJECT_ROOT>
git pull
cd backend
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
launchctl kickstart -k gui/$(id -u)/com.dragonreserve.backend
```

若 plist 或 Caddy 模板有变：先按 `backend/DEPLOY_MAC_SERVER.md` 执行 `make render-deploy` 并更新 `~/Library/LaunchAgents/` 与 Caddy 配置，再 `validate` / `restart`。

## Agent 执行注意

- 在**用户已授权**的生产 SSH 或本机服务器环境中执行命令；无凭证时不要臆测主机名或密钥。
- 发版命令会短暂中断服务；`alembic upgrade` 失败时应**停止**并回滚/修复迁移，避免半状态。
- 文档中的示例 IP、域名可能随环境变化，以当前仓库 `DEPLOY_*.md` 与服务器实况为准。
