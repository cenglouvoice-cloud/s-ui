# S-UI 项目开发接手报告

> 当前 README 用作新开发者接手和构建部署说明；如需参考原项目的老 README，请查看 `docs/README.md`。

本文基于当前仓库 `https://github.com/cenglouvoice-cloud/s-ui.git` 的实际代码整理，目标是帮助新开发者从 0 到 1 完成环境配置、理解项目结构、修改前端页面、重新构建并部署。

## 1. 项目定位

S-UI 是一个基于 Sing-Box 的 Web 管理面板。项目是前后端一体化仓库：

- 后端：Go + Gin + GORM + SQLite，负责 Web 面板、API、订阅服务、Sing-Box 核心启动和配置生成。
- 前端：Vue 3 + Vite + TypeScript + Vuetify + Pinia，位于 `frontend/`。
- 发布形态：前端先构建为静态文件，再复制到 `web/html/`，Go 通过 `//go:embed` 将静态页面打进最终二进制 `sui`。
- 默认访问：面板端口 `2095`，面板路径 `/app/`，订阅端口 `2096`，订阅路径 `/sub/`，默认账号密码 `admin/admin`。

注意：仓库 remote 和 Go module 已统一为 `github.com/cenglouvoice-cloud/s-ui`。后续新增 Go 包时，请继续使用这个 module path。

## 2. 推荐开发工具

### 2.1 通用工具

- Git：用于拉取、分支、提交代码。
- Go：本项目 `go.mod` 指定 `go 1.25.7`。
- Node.js/npm：前端构建使用 npm。当前 CI 使用 Node `25`；本机验证 Node `v22.16.0` + npm `10.9.2` 可以构建通过。建议安装 Node 24 LTS 或 Node 25 Current。
- Docker Desktop：需要容器化构建或部署时安装。

官方下载地址：

- VS Code：https://code.visualstudio.com/download
- GoLand：https://www.jetbrains.com/go/download/
- WebStorm：https://www.jetbrains.com/webstorm/download/
- Node.js：https://nodejs.org/en/download/
- Go：https://go.dev/dl/
- Docker Desktop：https://www.docker.com/products/docker-desktop/
- Git 安装说明：https://github.com/git-guides/install-git

### 2.2 IDE 选择

方案 A：一个 VS Code 同时写前后端，轻量、免费。

建议扩展：

- Go
- Vue - Official
- ESLint
- TypeScript Vue Plugin
- Docker
- SQLite Viewer

方案 B：JetBrains 双 IDE，体验更完整。

- 后端用 GoLand 打开仓库根目录。
- 前端用 WebStorm 打开 `frontend/`。
- GoLand 也能编辑前端，但 WebStorm 对 Vue/TypeScript 体验更集中。

### 2.3 本机已完成的 VS Code 配置

已在本机完成 VS Code 开发环境搭建，可以直接打开仓库修改代码：

```bash
code /Volumes/U393/newsui
```

安装结果：

- VS Code Stable `1.119.0`，arm64。
- VS Code 应用位置：`/Users/lulu/Applications/Visual Studio Code.app`
- `code` 命令位置：`/opt/homebrew/bin/code`
- 备用 `code` 链接：`/Users/lulu/bin/code`
- 仓库级 VS Code 配置：`.vscode/extensions.json`、`.vscode/settings.json`、`.vscode/tasks.json`、`.vscode/launch.json`

已安装扩展：

```text
dbaeumer.vscode-eslint@3.0.24
editorconfig.editorconfig@0.18.2
golang.go@0.52.2
ms-azuretools.vscode-containers@2.4.4
ms-azuretools.vscode-docker@2.0.0
qwtel.sqlite-viewer@25.12.2
redhat.vscode-yaml@1.23.0
vue.volar@3.2.8
```

已安装 Go 开发工具：

```text
/Users/lulu/go/bin/gopls        golang.org/x/tools/gopls v0.21.1
/Users/lulu/go/bin/dlv          Delve 1.26.3
/Users/lulu/go/bin/staticcheck  staticcheck 2026.1 (v0.7.0)
```

特别注意：安装最新版 `gopls` 和 `staticcheck` 时，因为本机 `GOTOOLCHAIN=auto`，Go 自动下载了 `go1.25.10` 用于工具安装。项目本身仍按 `go.mod` 使用 `go 1.25.7`，当前 `go version` 仍显示 `go1.25.7 darwin/arm64`。

## 3. 从 0 到 1 初始化

### 3.1 克隆仓库

```bash
git clone https://github.com/cenglouvoice-cloud/s-ui.git
cd s-ui
```

### 3.2 安装前端依赖

```bash
cd frontend
npm ci
```

本次初始化时，上游原始 `package-lock.json` 与 `package.json` 曾存在不同步问题，`npm ci` 会因为缺少 `@emnapi/core`、`@emnapi/runtime` 等 lock 记录而失败。已通过 `npm install` 修正本地 lock 文件，修正后 `npm ci` 可以通过。后续团队协作建议优先使用 `npm ci`；如果重新克隆原始版本又遇到 lock 不同步，再执行一次 `npm install` 修复 lock。

### 3.3 构建前端

```bash
cd frontend
npm run build
```

构建产物输出到：

```text
frontend/dist/
```

### 3.4 将前端产物同步给后端

```bash
cd ..
mkdir -p web/html
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
```

为什么要做这一步：`web/web.go` 通过 `//go:embed *` 嵌入 `web/html/index.html` 和 `web/html/assets/*`。生产运行时不是由 Vite 提供页面，而是由 Go 二进制直接提供静态页面。

### 3.5 构建后端二进制

简单方式：

```bash
./build.sh
```

手动方式：

```bash
go build \
  -ldflags '-w -s -checklinkname=0 -extldflags "-Wl,-no_warn_duplicate_libraries"' \
  -tags 'with_quic,with_grpc,with_utls,with_acme,with_gvisor,with_naive_outbound,with_musl,badlinkname,tfogo_checklinkname0,with_tailscale' \
  -o sui main.go
```

产物：

```text
./sui
```

### 3.6 本地运行

```bash
SUI_DB_FOLDER=db SUI_DEBUG=true ./sui
```

访问：

```text
http://localhost:2095/app/
```

默认登录：

```text
admin / admin
```

常用命令：

```bash
./sui -v
./sui admin -show
./sui admin -username newadmin -password newpass
./sui setting -show
./sui setting -port 3095 -subPort 3096
./sui migrate
```

## 4. 前端开发方式

### 4.1 启动前端热更新

先启动后端：

```bash
SUI_DB_FOLDER=db SUI_DEBUG=true ./sui
```

再启动前端：

```bash
cd frontend
npm run dev
```

注意：`npm run dev` 会启动并持续占用 Vite 开发服务器，终端里会显示 `VITE ... ready` 和访问地址，命令不能立刻退出。`npm run build` 只是把前端打包到 `frontend/dist/`，不会启动 `3000` 端口，所以执行 `build` 后直接访问 `http://localhost:3000/app/` 会打不开。

开发访问：

```text
http://localhost:3000/app/
```

关键配置在 `frontend/vite.config.mts`：

- Vite 端口：`3000`
- 代理：`/app/api` 转发到 `http://localhost:2095`
- `index.html` 中开发模式会把 `window.BASE_URL` 设置为 `/app/`

### 4.1.1 后端未就绪：开发 Mock 模式（方式 3）

本项目已经加了一个只在 Vite 开发环境生效的前端 Mock 模式。后端没有启动时，也可以直接进主界面改页面、调布局、看列表和弹窗。

本次新增/修改文件：

```text
frontend/.env.development.example       Mock 开关示例，建议提交到仓库
frontend/.env.development.local         本机实际启用文件，已被 .gitignore 忽略
frontend/src/plugins/devMock.ts         前端模拟登录、数据和 API 返回
frontend/src/plugins/httputil.ts        GET/POST 先走 devMock，未命中再走真实后端
frontend/src/router/index.ts            开发模式可跳过登录鉴权
frontend/src/vite-env.d.ts              补充 Vite 环境变量类型
```

当前本机 `frontend/.env.development.local` 内容：

```bash
VITE_DEV_BYPASS_AUTH=true
VITE_DEV_MOCK=true
```

启用后操作：

```bash
cd frontend
npm run dev
```

访问：

```text
http://localhost:3000/app/
```

效果：

- `VITE_DEV_BYPASS_AUTH=true`：开发环境下不要求 `s-ui` 登录 Cookie，访问 `/app/`、`/app/inbounds`、`/app/settings` 等页面会直接进入。
- `VITE_DEV_MOCK=true`：`api/load`、`api/save`、`api/settings`、`api/status`、`api/logs`、`api/stats`、`api/users`、`api/tokens`、`api/keypairs`、`api/checkOutbound` 等常用接口由前端本地模拟。
- 新增、编辑、删除前端列表数据时，Mock 会在当前浏览器会话内做内存更新，刷新页面或重启 dev server 后会回到初始模拟数据。
- `api/login` 也有模拟返回；如果关闭跳过登录但保留 Mock，可以用任意非空用户名/密码登录开发页面。

关闭方式：

```bash
cd frontend
rm .env.development.local
```

或者把文件内容改成：

```bash
VITE_DEV_BYPASS_AUTH=false
VITE_DEV_MOCK=false
```

注意事项：

- 修改 `.env.development.local` 后要停止并重新执行 `npm run dev`，Vite 才会重新读取环境变量。
- 这个模式只用于前端开发调试，不连接真实数据库，不会真正重启后端或 Sing-Box。
- 备份下载、真实数据库导入、真实订阅转换、真实出站检测等后端能力在 Mock 模式下只能看到模拟结果。
- 生产构建不受影响，因为代码里同时判断了 `import.meta.env.DEV`；`npm run build` 时 Mock 和跳过登录都不会启用。

### 4.2 前端目录说明

```text
frontend/src/main.ts                 Vue 应用入口
frontend/src/App.vue                 根组件
frontend/src/router/index.ts         页面路由
frontend/src/layouts/default/        主布局、左侧菜单、顶部栏
frontend/src/views/                  页面级组件
frontend/src/components/             可复用业务组件
frontend/src/layouts/modals/         弹窗组件
frontend/src/store/modules/data.ts   Pinia 数据中心
frontend/src/plugins/api.ts          Axios 基础配置
frontend/src/plugins/httputil.ts     GET/POST 封装和消息处理
frontend/src/plugins/devMock.ts      开发环境 Mock 数据和登录绕过
frontend/src/locales/                多语言文案
frontend/src/types/                  TypeScript 类型定义
```

### 4.3 修改一个已有页面

例如要修改首页：

1. 编辑 `frontend/src/views/Home.vue`。
2. 运行 `npm run dev`，打开 `http://localhost:3000/app/` 查看效果。
3. 通过后端 API 的数据通常来自 `Data()` store，即 `frontend/src/store/modules/data.ts`。
4. 确认无误后执行：

```bash
cd frontend
npm run build
```

5. 回到根目录复制产物并重新构建后端：

```bash
cd ..
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
go build -o sui main.go
```

如果要使用完整发布标签，使用第 3.5 节的完整 `go build` 命令或直接执行 `./build.sh`。

### 4.4 新增一个前端页面

假设新增“报表”页面：

1. 新建 `frontend/src/views/Reports.vue`。
2. 在 `frontend/src/router/index.ts` 增加路由：

```ts
{
  path: '/reports',
  name: 'pages.reports',
  component: () => import('@/views/Reports.vue'),
}
```

3. 在 `frontend/src/layouts/default/Drawer.vue` 的 `menu` 数组增加菜单项。
4. 在所有语言文件中增加文案，例如：

```text
frontend/src/locales/zhcn.ts
frontend/src/locales/en.ts
frontend/src/locales/fa.ts
frontend/src/locales/vi.ts
frontend/src/locales/ru.ts
frontend/src/locales/zhtw.ts
```

5. 页面需要访问后端时，优先通过 `HttpUtils.get()` / `HttpUtils.post()`，或者将共享数据放到 Pinia store。

## 5. 后端开发方式

### 5.1 后端目录说明

```text
main.go                  程序入口；无参数时启动服务，有参数时走 cmd
app/app.go               应用生命周期：日志、数据库、Cron、Web、订阅、Sing-Box 核心
web/web.go               Gin Web 服务、会话、静态页面、API 路由挂载
api/                     Web API handler 和请求/响应封装
service/                 主要业务逻辑
database/                SQLite 初始化、备份、导入
database/model/          GORM 数据模型
core/                    Sing-Box 核心封装和运行状态
sub/                     订阅服务
cronjob/                 定时任务：统计、流量扣减、核心检查等
cmd/                     CLI 命令：admin、setting、uri、migrate
config/                  版本、名称、环境变量配置
windows/                 Windows 服务安装和构建脚本
```

### 5.2 请求链路

前端请求：

```text
HttpUtils -> axios baseURL "./" -> api/load、api/save 等
```

开发模式：

```text
http://localhost:3000/app/api/* -> Vite proxy -> http://localhost:2095/app/api/*
```

生产模式：

```text
http://server:2095/app/api/* -> Go Gin router
```

后端路由：

```text
web.NewServer()
  -> engine.Group(base_url + "api")
  -> api.NewAPIHandler()
  -> api/apiHandler.go
  -> api/apiService.go
  -> service/*.go
  -> database/model/*.go
```

### 5.3 新增一个后端接口

典型步骤：

1. 在 `api/apiHandler.go` 的 `getHandler` 或 `postHandler` 增加 action。
2. 在 `api/apiService.go` 增加对应方法。
3. 复杂业务放到 `service/*.go`，不要堆在 handler。
4. 需要存储时增加或复用 `database/model/*.go`。
5. 如果改变已有数据库结构，补充迁移逻辑到 `cmd/migration/`。
6. 前端通过 `HttpUtils.get('api/xxx')` 或 `HttpUtils.post('api/xxx', data)` 调用。

示意：

```go
case "reports":
    a.ApiService.GetReports(c)
```

### 5.4 修改数据保存逻辑

通用保存入口在：

```text
frontend/src/store/modules/data.ts
service/config.go
```

前端调用：

```ts
Data().save('inbounds', 'add', data)
```

后端分发：

```go
func (s *ConfigService) Save(obj string, act string, data json.RawMessage, ...)
```

目前支持的 `obj` 包括：

```text
clients, tls, inbounds, outbounds, services, endpoints, config, settings
```

如果你新增一种业务对象，要同步补齐：

- 前端 store、类型、页面或弹窗
- API 保存对象名
- `ConfigService.Save` 分支
- 对应 `service` 和 `database/model`
- 必要的局部数据加载逻辑 `LoadPartialData`

## 6. 构建、验证、部署

### 6.1 只改前端后的完整构建

```bash
cd frontend
npm run build
cd ..
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
go build -o sui main.go
```

### 6.2 只改后端后的构建

只要 `web/html/` 中已经有前端产物：

```bash
go test ./...
go build -o sui main.go
```

如果你要模拟正式发布，请使用带 tags 的完整 `go build` 命令。

### 6.3 一键完整构建

```bash
./build.sh
```

脚本做了三件事：

1. `cd frontend && npm i && npm run build`
2. 清理并复制 `frontend/dist/*` 到 `web/html/`
3. 使用完整 tags 编译 `sui`

### 6.4 Docker 构建

本地构建镜像：

```bash
docker build -t s-ui:local .
```

Linux 服务器运行：

```bash
docker run -itd \
  --network host \
  -v "$PWD/db:/app/db" \
  -v "$PWD/cert:/app/cert" \
  --name s-ui \
  --restart unless-stopped \
  s-ui:local
```

macOS / Windows Docker Desktop 通常不要依赖 host network，可改用端口映射：

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

当前 `docker-compose.yml` 默认使用远端镜像 `ghcr.io/cenglouvoice-cloud/s-ui`。如果要使用本地改过的镜像，需要把 `image` 改成 `s-ui:local`，或增加 `build: .`。

### 6.5 Linux systemd 部署

发布包通常包含：

```text
sui
s-ui.service
s-ui.sh
```

典型部署位置：

```text
/usr/local/s-ui/
```

服务文件 `s-ui.service` 中写死：

```text
WorkingDirectory=/usr/local/s-ui/
ExecStart=/usr/local/s-ui/sui
```

部署后：

```bash
sudo cp s-ui.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable s-ui --now
sudo systemctl status s-ui
```

## 7. 数据库和配置

默认数据库路径：

```text
程序所在目录/db/s-ui.db
```

可用环境变量改位置：

```bash
SUI_DB_FOLDER=db ./sui
```

重要环境变量：

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

## 8. 本机验证结果

当前机器验证结果：

- `node -v`：`v22.16.0`
- `npm -v`：`10.9.2`
- `go version`：`go1.25.7 darwin/arm64`
- `npm install`：通过，并修正 lock 文件；提示 4 个 npm audit 漏洞，2 moderate、2 high
- `npm ci`：lock 修正后通过；仍提示同样的 4 个 npm audit 漏洞
- `npm run build`：通过，生成 `frontend/dist`
- 方式 3 Mock 改造后再次执行 `npm run build`：通过，确认不影响生产打包
- 方式 3 Mock 改造后临时启动 `npm run dev -- --host 127.0.0.1 --port 3100`：`http://127.0.0.1:3100/app/` 返回 Vite 页面；验证后已停止，未占用 `3000`
- 复制前端产物到 `web/html`：通过
- 完整 tags 后端构建：通过，生成 `./sui`
- `go test ./...`：通过，当前仓库没有测试文件
- `./sui -v`：显示 S-UI `1.4.1`，Sing-Box `v1.13.4`

额外注意：因为安装了 `frontend/node_modules`，`go test ./...` 会扫到 `frontend/node_modules/flatted/golang/pkg/flatted`。目前它能通过，但更干净的方式是：

```bash
go test $(go list ./... | grep -v '/frontend/node_modules/')
```

## 9. 建议学习顺序

1. 先跑通 `./build.sh` 和 `SUI_DB_FOLDER=db SUI_DEBUG=true ./sui`。
2. 熟悉登录、首页、左侧菜单和 `Data().loadData()` 的数据流。
3. 修改一个小前端页面，例如 `Home.vue` 的展示字段或布局。
4. 用 `npm run dev` 做热更新验证；后端没准备好时先使用第 4.1.1 节的方式 3 Mock 模式。
5. 执行“前端 build -> 复制到 web/html -> go build -> 运行 sui”的完整闭环。
6. 再读 `api/apiHandler.go`、`api/apiService.go`、`service/config.go`，理解保存、加载和重启 Sing-Box 的后端链路。
7. 最后再碰数据库模型和迁移，这部分影响面最大。

## 10. 常见问题

### Q1：为什么改完前端后，直接重启后端看不到变化？

因为生产页面来自 Go 二进制内嵌的 `web/html`。你必须重新执行：

```bash
cd frontend
npm run build
cd ..
find web/html -mindepth 1 -maxdepth 1 -exec rm -rf {} +
cp -R frontend/dist/. web/html/
go build -o sui main.go
```

### Q2：为什么前端开发 URL 是 `/app/`？

后端默认 `webPath=/app/`，前端 router 使用：

```ts
createWebHistory((window as any).BASE_URL)
```

开发模式下 `frontend/index.html` 会把 `window.BASE_URL` 设为 `/app/`。

### Q3：前端请求为什么写 `api/load` 而不是完整 URL？

Axios 的 `baseURL` 是 `"./"`。在 `/app/` 下，`api/load` 会解析为 `/app/api/load`；开发环境由 Vite proxy 转给后端，生产环境由 Go 直接处理。

### Q4：新增页面后菜单不显示怎么办？

检查三处：

- `frontend/src/router/index.ts`
- `frontend/src/layouts/default/Drawer.vue`
- `frontend/src/locales/*.ts`

### Q5：端口冲突怎么办？

先改设置：

```bash
./sui setting -port 3095 -subPort 3096
```

再运行：

```bash
SUI_DB_FOLDER=db ./sui
```

访问：

```text
http://localhost:3095/app/
```

## 11. VS Code 搭建复查记录

本节记录本次实际执行过的 VS Code 下载、安装、配置动作，便于后续复查或在新机器上复现。

### 11.1 下载与安装 VS Code

本机架构：

```bash
uname -m
# arm64
```

一开始尝试的官方下载参数：

```text
https://code.visualstudio.com/sha/download?build=stable&os=darwin-arm64
```

实际返回 `404`。随后改用 VS Code 官方更新服务稳定版地址：

```text
https://update.code.visualstudio.com/latest/darwin-arm64/stable
```

执行过的安装步骤：

```bash
mkdir -p /tmp/codex-vscode-install
curl -L --fail -o /tmp/codex-vscode-install/vscode.zip \
  'https://update.code.visualstudio.com/latest/darwin-arm64/stable'

rm -rf /tmp/codex-vscode-install/VSCode
mkdir -p /tmp/codex-vscode-install/VSCode
ditto -x -k /tmp/codex-vscode-install/vscode.zip /tmp/codex-vscode-install/VSCode

mkdir -p "$HOME/Applications"
rm -rf "$HOME/Applications/Visual Studio Code.app"
mv "/tmp/codex-vscode-install/VSCode/Visual Studio Code.app" \
  "$HOME/Applications/Visual Studio Code.app"
```

配置 `code` 命令：

```bash
mkdir -p "$HOME/bin"
ln -sf "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" "$HOME/bin/code"
ln -sf "$HOME/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" /opt/homebrew/bin/code
```

验证：

```bash
code --version
# 1.119.0
# 8b640eef5a6c6089c029249d48efa5c99adf7d51
# arm64
```

### 11.2 安装 VS Code 扩展

执行过的扩展安装命令：

```bash
code --install-extension golang.Go --force
code --install-extension Vue.volar --force
code --install-extension dbaeumer.vscode-eslint --force
code --install-extension ms-azuretools.vscode-docker --force
code --install-extension qwtel.sqlite-viewer --force
code --install-extension redhat.vscode-yaml --force
code --install-extension EditorConfig.EditorConfig --force
```

验证：

```bash
code --list-extensions --show-versions | sort
```

当前结果：

```text
dbaeumer.vscode-eslint@3.0.24
editorconfig.editorconfig@0.18.2
golang.go@0.52.2
ms-azuretools.vscode-containers@2.4.4
ms-azuretools.vscode-docker@2.0.0
qwtel.sqlite-viewer@25.12.2
redhat.vscode-yaml@1.23.0
vue.volar@3.2.8
```

### 11.3 安装 Go 辅助工具

执行过的命令：

```bash
go install golang.org/x/tools/gopls@latest
go install github.com/go-delve/delve/cmd/dlv@latest
go install honnef.co/go/tools/cmd/staticcheck@latest
```

安装位置：

```text
/Users/lulu/go/bin/gopls
/Users/lulu/go/bin/dlv
/Users/lulu/go/bin/staticcheck
```

版本验证：

```bash
/Users/lulu/go/bin/gopls version
/Users/lulu/go/bin/dlv version
/Users/lulu/go/bin/staticcheck -version
```

当前结果：

```text
golang.org/x/tools/gopls v0.21.1
Delve Debugger Version: 1.26.3
staticcheck 2026.1 (v0.7.0)
```

特别注意：安装 `gopls` 和 `staticcheck` 时出现了 `requires go >= 1.25; switching to go1.25.10`，这是 Go 的 `GOTOOLCHAIN=auto` 自动下载工具链行为。它只影响工具安装，不改变当前项目 `go.mod` 中的 `go 1.25.7`。

### 11.4 新增的仓库级 VS Code 文件

新增：

```text
.vscode/extensions.json
.vscode/settings.json
.vscode/tasks.json
.vscode/launch.json
```

同时调整了 `.gitignore`：不再整体忽略 `.vscode`，改为忽略 `.vscode/*`，但允许以上四个项目级配置文件进入版本管理。这样后续重新克隆项目时，VS Code 环境可以直接复用。

用途：

- `extensions.json`：打开项目时提示安装推荐扩展。
- `settings.json`：配置 Go 工具路径、Volar、ESLint、TypeScript SDK、终端 PATH、搜索排除项。
- `tasks.json`：提供前端安装、前端 dev、前端 build、后端测试、后端构建、完整重构建、本地运行等任务。
- `launch.json`：提供 Go 后端断点调试和 CLI 调试入口。

为了避免无关 diff，`editor.formatOnSave` 已设为 `false`。这个项目有不少 Go 文件是 CRLF 换行，如果自动格式化保存，容易把整文件换行改掉，导致审阅困难。需要格式化时建议只对确认要改的文件手动格式化。

### 11.5 VS Code 常用操作

打开项目：

```bash
code /Volumes/U393/newsui
```

首次打开后可以直接修改代码。推荐工作流：

1. 修改前端页面：编辑 `frontend/src/views/*.vue` 或相关组件。
2. 启动后端：VS Code 执行任务 `app: run local`，或终端运行 `SUI_DB_FOLDER=db SUI_DEBUG=true ./sui`。
3. 启动前端热更新：VS Code 执行任务 `frontend: dev server`，访问 `http://localhost:3000/app/`。
4. 生产构建验证：VS Code 执行任务 `app: full rebuild`。
5. 后端断点调试：左侧 Run and Debug 选择 `Debug S-UI Backend`。

可用任务：

```text
frontend: install dependencies
frontend: dev server
frontend: build
frontend: lint fix
backend: sync frontend dist
backend: test
backend: build simple
backend: build release
app: full rebuild
app: run local
```

可用调试配置：

```text
Debug S-UI Backend
Debug CLI: version
Debug CLI: setting show
```

### 11.6 本次验证

已验证：

```bash
node -e "JSON.parse(require('fs').readFileSync('.vscode/settings.json','utf8'))"
npm run build
go test ./...
go build -ldflags '-w -s -checklinkname=0 -extldflags \"-Wl,-no_warn_duplicate_libraries\"' \
  -tags 'with_quic,with_grpc,with_utls,with_acme,with_gvisor,with_naive_outbound,with_musl,badlinkname,tfogo_checklinkname0,with_tailscale' \
  -o sui main.go
./sui -v
code /Volumes/U393/newsui --reuse-window
```

结果：

```text
VS Code JSON 配置解析通过
npm run build 通过
go test ./... 通过
发布参数 go build 通过
S-UI Panel 1.4.1
Sing-Box v1.13.4
VS Code 可以通过 code 命令打开当前项目
```
