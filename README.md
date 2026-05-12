# S-UI 开发与构建指南

> 当前 README 面向公开发布、新开发者接手和二次开发场景；原项目 README 已保留在 `docs/README.md`，需要了解原始项目说明时可参考。

S-UI 是一个基于 Sing-Box 的 Web 管理面板。本仓库采用前后端一体化结构：后端负责面板服务、API、订阅服务、数据库、Sing-Box 核心启动和配置生成；前端负责 Web 管理界面。

## 项目概览

- 后端：Go + Gin + GORM + SQLite
- 前端：Vue 3 + Vite + TypeScript + Vuetify + Pinia
- Go module：`github.com/cenglouvoice-cloud/s-ui`
- 默认面板地址：`http://localhost:2095/app/`
- 默认订阅地址：`http://localhost:2096/sub/`
- 默认账号密码：`admin / admin`

生产发布时，前端会先构建为静态文件并复制到 `web/html/`，再由 Go 通过 `//go:embed` 打进最终二进制 `sui`。

首次部署后请尽快修改默认管理员密码。

## 环境要求

建议使用以下工具：

- Git
- Go：以 `go.mod` 中的版本为准
- Node.js/npm：建议使用 Node 24 LTS 或项目 CI 所用 Node 25
- Docker Desktop：仅在需要容器构建或容器部署时安装
- VS Code、GoLand、WebStorm 等 IDE 均可

推荐 VS Code 扩展：

- Go
- Vue - Official
- ESLint
- Docker
- SQLite Viewer
- EditorConfig

## 快速开始

克隆仓库：

```bash
git clone https://github.com/cenglouvoice-cloud/s-ui.git
cd s-ui
```

安装前端依赖：

```bash
cd frontend
npm ci
cd ..
```

构建前端：

```bash
cd frontend
npm run build
cd ..
```

同步前端产物到后端静态目录：

```bash
mkdir -p web/html
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
```

构建后端二进制：

```bash
go build -o sui main.go
```

本地运行：

```bash
SUI_DB_FOLDER=db SUI_DEBUG=true ./sui
```

访问：

```text
http://localhost:2095/app/
```

## 常用命令

```bash
./sui -v
./sui admin -show
./sui admin -username newadmin -password newpass
./sui setting -show
./sui setting -port 3095 -subPort 3096
./sui migrate
```

## 前端开发

前端目录位于 `frontend/`。

启动后端：

```bash
SUI_DB_FOLDER=db SUI_DEBUG=true ./sui
```

启动前端热更新：

```bash
cd frontend
npm run dev
```

开发访问：

```text
http://localhost:3000/app/
```

关键配置在 `frontend/vite.config.mts`：

- Vite 端口：`3000`
- 代理：`/app/api` 转发到 `http://localhost:2095`
- 开发模式下 `frontend/index.html` 会把 `window.BASE_URL` 设置为 `/app/`

`npm run dev` 会启动并持续占用 Vite 开发服务器；`npm run build` 只生成 `frontend/dist/`，不会启动开发服务。

### 开发 Mock 模式

如果后端尚未准备好，可以启用前端 Mock 模式，直接进入主界面调试页面、列表和弹窗。

复制示例配置：

```bash
cd frontend
cp .env.development.example .env.development.local
```

确认 `frontend/.env.development.local` 中包含：

```bash
VITE_DEV_BYPASS_AUTH=true
VITE_DEV_MOCK=true
```

重新启动前端：

```bash
npm run dev
```

效果：

- `VITE_DEV_BYPASS_AUTH=true`：开发环境跳过登录 Cookie 检查
- `VITE_DEV_MOCK=true`：常用接口由 `frontend/src/plugins/devMock.ts` 返回模拟数据
- Mock 数据只保存在当前浏览器会话内，刷新或重启开发服务后会回到初始数据

关闭 Mock：

```bash
rm frontend/.env.development.local
```

或将两个开关改为 `false`。修改环境变量后需要重启 `npm run dev`。

Mock 模式只用于前端开发，不会连接真实数据库，也不会真正重启后端或 Sing-Box。

### 修改已有页面

例如修改首页：

1. 编辑 `frontend/src/views/Home.vue` 或相关组件。
2. 运行 `npm run dev`，访问 `http://localhost:3000/app/` 查看效果。
3. 通用数据通常来自 `frontend/src/store/modules/data.ts` 的 `Data()` store。
4. 确认后执行 `npm run build`。
5. 将 `frontend/dist/` 复制到 `web/html/`，再重新构建后端。

### 新增页面

通常需要修改：

- `frontend/src/views/`：新增页面组件
- `frontend/src/router/index.ts`：新增路由
- `frontend/src/layouts/default/Drawer.vue`：新增菜单
- `frontend/src/locales/*.ts`：新增多语言文案

请求后端时优先使用 `HttpUtils.get()` / `HttpUtils.post()`；共享数据优先放入 Pinia store。

## 后端开发

后端主要目录：

```text
main.go                  程序入口
app/app.go               应用生命周期
web/web.go               Gin Web 服务、会话、静态页面、API 路由
api/                     API handler 和请求响应封装
service/                 主要业务逻辑
database/                SQLite 初始化、备份、导入
database/model/          GORM 数据模型
core/                    Sing-Box 核心封装和运行状态
sub/                     订阅服务
cronjob/                 定时任务
cmd/                     CLI 命令
config/                  版本、名称、环境变量配置
windows/                 Windows 服务安装和构建脚本
```

请求链路：

```text
前端 HttpUtils
  -> api/load、api/save 等相对路径
  -> 开发环境 Vite proxy 或生产环境 Go Gin router
  -> api/apiHandler.go
  -> api/apiService.go
  -> service/*.go
  -> database/model/*.go
```

新增后端接口的一般步骤：

1. 在 `api/apiHandler.go` 的 get/post 分发中增加 action。
2. 在 `api/apiService.go` 增加对应方法。
3. 复杂业务放到 `service/*.go`。
4. 需要持久化时增加或复用 `database/model/*.go`。
5. 如涉及数据库结构变化，补充 `cmd/migration/`。
6. 前端通过 `HttpUtils.get('api/xxx')` 或 `HttpUtils.post('api/xxx', data)` 调用。

通用保存入口：

```text
frontend/src/store/modules/data.ts
service/config.go
```

当前常见保存对象：

```text
clients, tls, inbounds, outbounds, services, endpoints, config, settings
```

新增业务对象时，需要同步补齐前端类型、页面、API 保存对象名、后端 `ConfigService.Save` 分支、service、model 和必要的局部数据加载逻辑。

## 构建

### 完整构建

```bash
./build.sh
```

脚本会执行：

1. 安装前端依赖并构建 `frontend/dist/`
2. 清理并复制前端产物到 `web/html/`
3. 使用发布 tags 编译 `sui`

### 只改前端

```bash
cd frontend
npm run build
cd ..
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
go build -o sui main.go
```

### 只改后端

如果 `web/html/` 中已经有前端产物：

```bash
go test ./...
go build -o sui main.go
```

正式发布建议使用 `build.sh` 或 CI 中的完整构建参数。

## Docker

本地构建镜像：

```bash
docker build -t s-ui:local .
```

Linux 服务器可使用 host network：

```bash
docker run -itd \
  --network host \
  -v "$PWD/db:/app/db" \
  -v "$PWD/cert:/app/cert" \
  --name s-ui \
  --restart unless-stopped \
  s-ui:local
```

macOS / Windows Docker Desktop 建议使用端口映射：

```bash
docker run -itd \
  -p 2095:2095 \
  -p 2096:2096 \
  -v "$PWD/db:/app/db" \
  -v "$PWD/cert:/app/cert" \
  --name s-ui \
  --restart unless-stopped \
  s-ui:local
```

`docker-compose.yml` 默认使用镜像 `ghcr.io/cenglouvoice-cloud/s-ui`。如果要运行本地构建镜像，可将 `image` 改为 `s-ui:local`，或增加 `build: .`。

## Linux systemd 部署

发布包通常包含：

```text
sui
s-ui.service
s-ui.sh
```

默认服务文件使用：

```text
WorkingDirectory=/usr/local/s-ui/
ExecStart=/usr/local/s-ui/sui
```

部署示例：

```bash
sudo mkdir -p /usr/local/s-ui
sudo cp sui s-ui.sh /usr/local/s-ui/
sudo cp s-ui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable s-ui --now
sudo systemctl status s-ui
```

## 数据库和配置

默认数据库路径：

```text
程序所在目录/db/s-ui.db
```

可通过环境变量调整：

```bash
SUI_DB_FOLDER=db ./sui
```

常用环境变量：

```text
SUI_LOG_LEVEL     debug/info/warn/error，默认 info
SUI_DEBUG         true 时打开 debug 模式
SUI_BIN_FOLDER    默认 bin
SUI_DB_FOLDER     默认程序目录下 db
SINGBOX_API       Sing-Box API 地址
```

默认设置集中在 `service/setting.go` 的 `defaultValueMap`，例如：

```text
webPort=2095
webPath=/app/
subPort=2096
subPath=/sub/
timeLocation=Asia/Shanghai
trafficAge=30
```

## 验证清单

提交前建议至少执行：

```bash
cd frontend
npm run build
cd ..
go test ./...
go build -o sui main.go
```

如需验证完整发布流程，执行：

```bash
./build.sh
./sui -v
```

## 学习顺序

1. 跑通 `./build.sh` 和 `SUI_DB_FOLDER=db SUI_DEBUG=true ./sui`。
2. 熟悉登录、首页、左侧菜单和 `Data().loadData()` 的数据流。
3. 使用 `npm run dev` 修改一个前端页面。
4. 后端未就绪时，先使用开发 Mock 模式调前端。
5. 跑通“前端 build -> 复制到 web/html -> go build -> 运行 sui”的闭环。
6. 阅读 `api/apiHandler.go`、`api/apiService.go`、`service/config.go`。
7. 最后再处理数据库模型和迁移。

## 常见问题

### 为什么改完前端后，重启后端看不到变化？

生产页面来自 Go 二进制内嵌的 `web/html`。修改前端后需要重新构建前端、复制 `frontend/dist/` 到 `web/html/`，再重新构建后端二进制。

### 为什么开发 URL 是 `/app/`？

后端默认 `webPath=/app/`，前端 router 使用：

```ts
createWebHistory((window as any).BASE_URL)
```

开发模式下 `frontend/index.html` 会把 `window.BASE_URL` 设为 `/app/`。

### 为什么前端请求写 `api/load` 而不是完整 URL？

Axios 的 `baseURL` 是 `"./"`。在 `/app/` 下，`api/load` 会解析为 `/app/api/load`；开发环境由 Vite proxy 转给后端，生产环境由 Go 直接处理。

### 新增页面后菜单不显示怎么办？

检查：

- `frontend/src/router/index.ts`
- `frontend/src/layouts/default/Drawer.vue`
- `frontend/src/locales/*.ts`

### 端口冲突怎么办？

可通过 CLI 修改端口：

```bash
./sui setting -port 3095 -subPort 3096
SUI_DB_FOLDER=db ./sui
```

然后访问：

```text
http://localhost:3095/app/
```
