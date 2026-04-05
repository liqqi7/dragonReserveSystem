# Tencent Cloud Deployment

本文档面向“微信小程序正式环境 + 腾讯云 Ubuntu 服务器”的部署方式。

当前已验证的目标环境：

- 系统：Ubuntu 24.04 LTS
- 域名：`dragon.liqqihome.top`
- 后端：FastAPI
- 反向代理：Caddy
- 数据库：MySQL 8
- 进程管理：systemd

## 目标结构

```text
WeChat Mini Program
    -> https://dragon.liqqihome.top
Caddy
    -> 127.0.0.1:8000
FastAPI (systemd)
    -> 127.0.0.1:3306
MySQL
```

## 已完成验证

- `dragon.liqqihome.top` 已解析到腾讯云公网 IP
- 腾讯云安全组已放行 `22`、`80`、`443`
- 服务器已安装：
  - `git`
  - `python3`
  - `python3-venv`
  - `mysql-server`
  - `caddy`
- 仓库已部署到：
  - `/home/ubuntu/apps/dragonReserveSystem`
- 后端测试已在服务器上跑通：
  - `28 passed`
- 公网接口已验证：
  - `GET /api/v1/health`
  - `POST /api/v1/auth/login`
  - `GET /api/v1/users/me`
- 主要业务接口已完成一轮线上冒烟：
  - 活动创建 / 查询 / 更新 / 报名 / 删除
  - 账单创建 / 列表 / 更新 / 删除
  - 统计接口

## 服务器目录

```text
/home/ubuntu/apps/dragonReserveSystem
└── backend
    ├── .env
    ├── .venv
    ├── logs/
    └── ...
```

## 当前 systemd 服务

服务名：

- `dragonreserve-backend`

常用命令：

```bash
sudo systemctl status dragonreserve-backend
sudo systemctl restart dragonreserve-backend
sudo systemctl stop dragonreserve-backend
sudo journalctl -u dragonreserve-backend -n 100 --no-pager
```

## 当前 Caddy 配置

配置文件：

- `/etc/caddy/Caddyfile`

当前域名：

```text
dragon.liqqihome.top
```

常用命令：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
sudo systemctl status caddy
```

## 首次部署顺序

1. 配置域名解析到腾讯云公网 IP
2. 安全组放行 `80/443`
3. 安装系统依赖：
   - `mysql-server`
   - `caddy`
   - `python3-venv`
4. 拉取仓库代码
5. 创建 `backend/.venv` 并安装 `requirements.txt`
6. 创建生产 `backend/.env`
7. 初始化 MySQL 数据库和应用用户
8. 执行 `alembic upgrade head`
9. 执行 `scripts/create_admin.py`
10. 配置并启动 `dragonreserve-backend`
11. 配置并重启 Caddy
12. 验证公网 HTTPS 接口

## 当前生产配置要求

- `APP_DEBUG=false`
- `CORS_ORIGINS=["https://dragon.liqqihome.top"]`
- `WECHAT_APP_ID` / `WECHAT_APP_SECRET` 已配置
- `PUBLIC_BASE_URL=https://dragon.liqqihome.top`
- `MEDIA_ROOT=storage`
- `MEDIA_URL_PREFIX=/media`
- `DATABASE_URL` 指向 `127.0.0.1:3306`
- MySQL 仅监听本机
- FastAPI 仅监听 `127.0.0.1:8000`

## 头像上传上线要求

当前头像方案不依赖对象存储，文件直接保存在应用服务器本地磁盘。

上线前需要确认：

1. 线上代码已经包含 `POST /api/v1/users/me/avatar`
2. 线上 `backend/.env` 已配置：
   - `PUBLIC_BASE_URL=https://dragon.liqqihome.top`
   - `MEDIA_ROOT=storage`
   - `MEDIA_URL_PREFIX=/media`
3. 运行后端进程的用户对 `backend/storage/avatars` 有写权限
4. Caddy 将 `https://dragon.liqqihome.top` 正常转发到当前这台后端服务
5. 新头像需要重新上传一次，旧的 `http://tmp/...` 不会自动修复

当前设计下：

- 上传后的文件路径位于 `backend/storage/avatars`
- 公网访问路径位于 `https://dragon.liqqihome.top/media/...`
- 如果后端部署到新机器，需要同时迁移 `storage/avatars` 目录中的历史文件

## 生产收尾

1. 在微信小程序后台配置合法 `request` 域名：
   - `https://dragon.liqqihome.top`
2. 将小程序生产 API 地址配置为：
   - `https://dragon.liqqihome.top/api/v1`
3. 尽快修改默认管理员密码：
   - 当前初始化账号：`admin / admin123456`

## 后续更新建议

后续上线建议统一走这条流程：

```bash
ssh ubuntu@124.156.228.148
cd ~/apps/dragonReserveSystem
git pull
cd backend
.venv/bin/pip install -r requirements.txt
.venv/bin/alembic upgrade head
sudo systemctl restart dragonreserve-backend
```

如涉及 Caddy 配置变化，再额外执行：

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl restart caddy
```
