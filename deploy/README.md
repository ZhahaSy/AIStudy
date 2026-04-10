# AIStudy ECS 部署教程（GitHub Actions + Docker Compose）

> 本项目与 `my-turborepo` 共用同一台 ECS。`my-turborepo` 占用 **8080** 端口，AIStudy 使用 **8081** 端口，互不干扰。

---

## 架构概览

```
推送 main 分支
    ↓
GitHub Actions
    ├── 构建 ai-study-backend / ai-study-frontend 镜像
    ├── 推送到 GHCR（始终）+ ACR（可选）
    ├── SCP 传输 docker-compose.prod.yml 到 ECS
    └── SSH 登录 ECS → docker compose pull → up -d
    ↓
ECS 服务器
    ├── /opt/my-turborepo/deploy  ← 已有项目（端口 8080）
    └── /opt/ai-study/deploy      ← 本项目（端口 8081）
```

访问方式：`http://<ECS公网IP>:8081`

---

## 第一步：配置 GitHub Secrets

在 AIStudy 仓库 **Settings → Secrets and variables → Actions** 中添加。

### 必选

| Secret | 说明 | 备注 |
|--------|------|------|
| `ECS_HOST` | ECS 公网 IP 或域名 | 与 my-turborepo 相同 |
| `ECS_USER` | SSH 登录用户 | 与 my-turborepo 相同 |
| `ECS_SSH_KEY` | SSH 私钥全文（含 BEGIN/END 行） | 与 my-turborepo 相同 |
| `ECS_PORT` | SSH 端口，一般 `22` | 与 my-turborepo 相同 |
| `GHCR_USERNAME` | 生成 PAT 的 GitHub 用户名 | 与 my-turborepo 相同 |
| `GHCR_TOKEN` | Classic PAT，勾选 `read:packages` + `repo` | 与 my-turborepo 相同 |

> 这些值和 my-turborepo 仓库里配的一样，但需要在 AIStudy 仓库里**单独配一份**，GitHub Secrets 不跨仓库共享。

### 可选（国内 ECS 强烈建议）

配齐后 ECS 从同地域 ACR 拉镜像，比跨境拉 GHCR 快一个数量级。

| Secret | 示例 |
|--------|------|
| `ACR_REGISTRY` | `registry.cn-hangzhou.aliyuncs.com`（与 ECS 同地域） |
| `ACR_NAMESPACE` | ACR 控制台中的命名空间 |
| `ACR_USERNAME` | ACR 登录用户名 |
| `ACR_PASSWORD` | ACR 登录密码 |

---

## 第二步：ECS 一次性准备

SSH 登录到 ECS 服务器，执行以下操作。

### 2.1 创建目录

```bash
sudo mkdir -p /opt/ai-study/deploy
sudo mkdir -p /opt/ai-study/data/uploads
sudo mkdir -p /opt/ai-study/data/db
```

### 2.2 创建后端环境变量文件

```bash
cat > /opt/ai-study/deploy/backend.env << 'EOF'
JWT_SECRET=替换为随机密钥
ANTHROPIC_AUTH_TOKEN=替换为你的Claude_API_Key
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
EOF
```

生成随机 JWT_SECRET：

```bash
openssl rand -hex 32
```

> `backend.env` 包含敏感信息，**不要提交到 Git**。可参考仓库中的 `deploy/backend.env.example`。

### 2.3 确认 ECS 安全组

确保安全组放行以下端口：

| 端口 | 用途 |
|------|------|
| 22 | SSH（已有） |
| 80 | Nginx / my-turborepo（已有） |
| **8081** | **AIStudy 前端（新增）** |

---

## 第三步：触发部署

两种方式：

### 方式 A：推送代码自动触发

```bash
git push origin main
```

### 方式 B：手动触发

GitHub 仓库 → Actions → "Deploy To ECS" → Run workflow

---

## 第四步：验证部署

### 4.1 在 ECS 上检查

```bash
# 查看容器状态
cd /opt/ai-study/deploy
docker compose -f docker-compose.prod.yml ps

# 预期输出：ai-study-backend 和 ai-study-frontend 均为 Up 状态
```

```bash
# 查看 .env 是否正确
cat /opt/ai-study/deploy/.env

# 预期内容：
# IMAGE_BASE=ghcr.io/你的用户名  或  registry.cn-xxx.aliyuncs.com/命名空间
# IMAGE_TAG=某个commit_sha
# FRONTEND_HOST_PORT=8081
```

```bash
# 本机自检
curl -sI http://127.0.0.1:8081/ | head -3
```

### 4.2 浏览器访问

打开 `http://<ECS公网IP>:8081`，应能看到 AIStudy 前端页面。

### 4.3 确认两个项目共存正常

```bash
# my-turborepo 仍正常
curl -sI http://127.0.0.1:8080/ | head -3

# ai-study 正常
curl -sI http://127.0.0.1:8081/ | head -3
```

---

## 两个项目的目录对照

| | my-turborepo | AIStudy |
|--|-------------|---------|
| 部署目录 | `/opt/my-turborepo/deploy` | `/opt/ai-study/deploy` |
| 数据目录 | `/opt/my-turborepo/data/` | `/opt/ai-study/data/` |
| 前端端口 | 8080 | **8081** |
| 容器名 | `chat-service` / `chat-ui` | `ai-study-backend` / `ai-study-frontend` |
| Docker 网络 | `my-turborepo_app-net` | `ai-study_app-net` |
| 环境变量文件 | `chat-service.env` | `backend.env` |

两个项目完全隔离，互不影响。

---

## 常见问题

### 部署失败：Missing backend.env

```
Missing /opt/ai-study/deploy/backend.env
```

说明第二步的 `backend.env` 没有创建。回到「第二步 2.2」创建即可。

### 端口 8081 被占用

```bash
ss -tlnp | grep 8081
```

如果有其他进程占用，修改 `/opt/ai-study/deploy/.env` 中的 `FRONTEND_HOST_PORT` 为其他端口（如 8082），然后重启：

```bash
cd /opt/ai-study/deploy
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### docker compose pull 超时

国内 ECS 拉 GHCR 镜像经常超时。CI 已内置 5 次重试（每次间隔 60s），但根本解决方案是配置 ACR（见第一步「可选」部分）。

如果 CI 重试也失败，可以在 ECS 上手动拉取：

```bash
cd /opt/ai-study/deploy

# 先登录镜像仓库
echo "你的token" | docker login ghcr.io -u 你的用户名 --password-stdin
# 或 ACR
# echo "密码" | docker login registry.cn-hangzhou.aliyuncs.com -u 用户名 --password-stdin

# 手动拉取并启动
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --force-recreate
```

### 查看容器日志

```bash
# 后端日志
docker logs ai-study-backend --tail 50

# 前端日志
docker logs ai-study-frontend --tail 50
```

---

## 可选优化

| 优化项 | 说明 |
|--------|------|
| HTTPS | 在宿主机 Nginx 新增 server block，`proxy_pass http://127.0.0.1:8081`，配置 SSL 证书 |
| 域名访问 | 配置域名解析到 ECS IP，Nginx 按 `server_name` 分流到 8080/8081 |
| 构建缓存 | 给 `build-push-action` 加 `cache-from` / `cache-to: type=gha`，缩短 CI 构建时间 |
| 自建 Runner | 在阿里云 VPC 内跑 GitHub Runner，推 ACR 走境内，速度更快 |
