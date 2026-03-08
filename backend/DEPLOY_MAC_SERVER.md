# Mac Server Deployment

本文档面向“当前这台 Mac 既是开发机，也是后续正式服务器”的部署方式。

## 目标结构

```text
WeChat Mini Program
    -> HTTPS
Caddy
    -> 127.0.0.1:8000
FastAPI (launchd)
    -> 127.0.0.1:3306
MySQL
```

## 需要准备

- 一个可用域名，例如 `your-domain.example`
- 这台 Mac 能被公网访问
- 微信小程序后台可配置合法 request 域名
- 小程序 `AppSecret`
- 已创建并可启动的 `backend/.venv`

## 1. 生产环境变量

复制模板：

```bash
cd backend
cp .env.production.example .env
```

至少修改这些值：

- `JWT_SECRET_KEY`
- `WECHAT_APP_SECRET`
- `CORS_ORIGINS`
- `DATABASE_URL`
- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

## 2. 初始化数据库

```bash
cd backend
make install
make migrate
make create-admin
```

## 3. 本机验证后端

```bash
cd backend
make run-prod
```

确认本机可访问：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

## 4. 配置 launchd 开机自启

模板文件：

- [com.dragonreserve.backend.plist.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/com.dragonreserve.backend.plist.example)
- 自动生成文件：`backend/deploy/com.dragonreserve.backend.generated.plist`

先生成与你当前机器路径匹配的配置：

```bash
cd backend
SERVER_DOMAIN=your-domain.example make render-deploy
```

操作步骤：

1. 创建日志目录：

```bash
mkdir -p /Volumes/disk/project/dragonReserveSystem/backend/logs
```

2. 复制生成后的文件到用户 LaunchAgents：

```bash
cp backend/deploy/com.dragonreserve.backend.generated.plist ~/Library/LaunchAgents/com.dragonreserve.backend.plist
```

3. 如果你的仓库不在默认路径，可先传 `PROJECT_ROOT`：

```bash
cd backend
SERVER_DOMAIN=your-domain.example PROJECT_ROOT=/actual/project/root make render-deploy
```

4. 加载服务：

```bash
launchctl load ~/Library/LaunchAgents/com.dragonreserve.backend.plist
launchctl start com.dragonreserve.backend
```

5. 查看状态：

```bash
launchctl list | grep dragonreserve
```

## 5. 配置 Caddy

模板文件：

- [Caddyfile.example](/Volumes/disk/project/dragonReserveSystem/backend/deploy/Caddyfile.example)
- 自动生成文件：`backend/deploy/Caddyfile.generated`

先生成与你真实域名匹配的配置：

```bash
cd backend
SERVER_DOMAIN=your-domain.example make render-deploy
```

如果已安装 Caddy，可参考：

```bash
sudo cp backend/deploy/Caddyfile.generated /opt/homebrew/etc/Caddyfile
sudo caddy validate --config /opt/homebrew/etc/Caddyfile
sudo brew services restart caddy
```

## 6. 小程序前端地址

将 [config.js](/Volumes/disk/project/dragonReserveSystem/miniprogram/services/config.js) 中的正式地址常量改成你的真实 HTTPS 域名：

```js
const PRODUCTION_API_BASE_URL = "https://your-domain.example/api/v1";
```

当前实现默认行为：

- `develop` 环境自动走 `http://127.0.0.1:8000/api/v1`
- 非 `develop` 环境自动走 `PRODUCTION_API_BASE_URL`

建议在正式发布前将这里的占位值替换成真实域名，不要依赖运行时手动覆盖。

## 7. 微信后台配置

在小程序后台配置合法 request 域名：

- `https://your-domain.example`

同时确保后端 `.env` 中：

- `WECHAT_APP_ID`
- `WECHAT_APP_SECRET`

与这个小程序完全一致。

## 8. 生产前检查

- `APP_DEBUG=false`
- `JWT_SECRET_KEY` 已改为强随机值
- `CORS_ORIGINS` 不再是 `["*"]`
- MySQL 不暴露公网 `3306`
- 反向代理只暴露 `443`
- `backend/logs/` 可写
- `SERVER_DOMAIN=your-domain.example make render-deploy` 已执行
- `make test` 通过

## 9. 建议的长期项

- 给 MySQL 做定时备份
- 给 `backend/logs/` 做日志轮转
- 为公网访问配置固定域名
- 真机再跑一次微信登录、报名、签到、记账全链路
