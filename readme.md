# 🎉 IIROSE-MEDIA-WEB

为 [蔷薇花园](https://iirose.com/) 打造的一站式媒体点播插件——搜索、点播、歌词，一气呵成。

## ✨ 功能特性

- 🎵 **多平台聚合**：网易云音乐、JOOX、Bilibili 视频、无线电广播
- ⭐ **本地收藏系统**：基于 IndexedDB 的毫秒级本地持久化，支持网易云（单曲/专辑/歌单）、JOOX 单曲、B站视频；工具栏一键切换「全网发现」与「已藏」，无缝保留全网搜索与分页现场
- 🔍 **极速搜索**：关键词一搜，歌曲 / 专辑 / MV / 歌单即刻呈现
- 🎼 **歌词自动匹配**：点播即带歌词
- ⌨️ **快捷呼出**：Alt+S 或双指下滑，随时随地想点就点

## 🔍 DEMO

https://cloud.ming295.com/s/XACQ

## 📦 安装方法

### 💉 蔷薇注入

1. 打开左侧侧栏，选择「工具」>「终端」
2. 在终端中输入 `js` 回车，在框内输入以下地址并点击确定：

   ```
   https://func-ide-iirose-uest-web-cztvejindn.cn-beijing.fcapp.run/bundle.js
   ```

3. 等待载入成功后，呼出 UI：
   - **电脑端**：按下 `Alt + S`
   - **移动端**：双指下滑

## 自动部署腾讯云函数

仓库 `Ming-IIROSE-Plugin/IIROSE-MEDIA-WEB` 的 **Build and deploy** workflow 在所有分支的 push（不含标签）和手动 `workflow_dispatch` 时部署；面向 `main` 的 PR 只运行构建和离线测试。构建统一使用 Node.js 22、`npm ci` 和 `npm run build`，构建或测试失败不会进入部署。

目标固定为广州 `ap-guangzhou` 地域的 `IIROSE-MEDIA-WEB` 函数，默认命名空间是 `default`；如需覆盖，在仓库 Settings → Secrets and variables → Actions → Variables 配置 `SCF_NAMESPACE`。函数必须已存在，流程不会创建函数。

组织 Secrets `TENCENT_SECRET_ID`、`TENCENT_SECRET_KEY` 已授权给此仓库，部署时才注入环境变量。该身份需对目标 namespace/函数资源拥有以下 SCF API 权限：

- `scf:GetFunctionAddress`：获取现有 `$LATEST` 代码包的签名下载地址。
- `scf:UpdateFunctionCode`：更新函数代码。
- `scf:GetFunction`：轮询异步更新状态。

脚本在内存中读取现有 zip，识别 `src/` 或包根目录下配对的 `app.js`、`bundle.js`，仅替换 bundle。SCF 控制台的 `src` 可能表示编辑器根目录；若两种布局同时存在或均不存在则停止。上传前以及部署后重新下载时，都会校验文件列表、其他文件内容及 zip 元数据；路径缺失或校验失败会使 job 失败。代码包、签名 URL 和凭据不会打印或上传为 artifact，跨 job 传递的 artifact 只有本次构建的 `dist/bundle.js`。CI 的 Python SDK 依赖单独固定在 `scripts/requirements-scf.txt`。

更新只针对 **`$LATEST`**，`Publish=FALSE`，不改变 Handler、环境变量、触发器或别名。已发布版本和指向这些版本的别名不会自动切换；如果线上入口绑定的是已发布版本，需要另行发布/调整绑定才能提供新 bundle。同一目标的部署 job 共用 concurrency group，`cancel-in-progress: false`，不会由新 push 取消正在运行的部署。GitHub concurrency 只保留一个 pending job，密集 push 可能替换较早的待执行部署，且不保证执行顺序。

在仓库 Actions → **Build and deploy** 查看 `build` / `deploy` 结果；只有更新状态就绪且下载校验通过后才会输出成功。首次真实部署需先将 workflow 推送到仓库，云凭据无需也不应导出到本机。更新失败时在腾讯云控制台检查函数状态；脚本不自动回滚。

部署期间请避免同时在腾讯云控制台或其他流水线更新同一函数：GitHub 的并发控制只约束此仓库的部署任务，读取并替换代码包不是跨系统的原子操作。

离线验证（无需云凭据）：

```bash
npm run build
node --test "cloud/sync/*.test.js"
python3 -B -m unittest discover -s scripts -p 'test_*.py' -v
```

同步函数的门禁测试基于 Node 内置 `node:test`（零依赖、零网络）。注意 `node --test cloud/sync/` 这类目录写法在当前 Node 下不会展开目录内的测试文件，因此命令显式给出 glob。

## 自动部署同步云函数（IIROSE-MEDIA-SYNC）

同一 workflow 的 `deploy` job 在 `IIROSE-MEDIA-WEB` 之后执行 `python scripts/deploy_sync.py`，幂等地创建或更新收藏云同步后端。**本轮只交付后端**：插件侧的收藏同步客户端（`src/sync/`）尚未实现，前端不会调用这个端点，也没有任何 UI 入口。

前置条件（脚本不创建这些资源；缺失时部署会失败）：

- COS 桶 `iirose-media-sync-1309510434` 已创建，私有读写、**版本控制已开启**、生命周期规则以 `sync/` 前缀限定；
- 角色 `IIROSE-MEDIA-SYNC-Role` 与只授该桶 `sync/` 前缀的策略 `IIROSE-MEDIA-SYNC-COS` 已存在（`PutObject`/`GetObject`/`HeadObject`）——不要复用 `SCF_QcsRole`；
- 目标命名空间已存在（默认 `default`，可用 `SCF_NAMESPACE` 覆盖）；
- 部署身份除函数基础 API 外，还需 `scf:CreateFunction`、`scf:ListTriggers`、`scf:CreateTrigger`、`scf:UpdateTrigger`、`scf:UpdateFunctionConfiguration`、`scf:PutReservedConcurrencyConfig` 权限。

目标固定为广州 `ap-guangzhou` 的 `IIROSE-MEDIA-SYNC`；运行时 Nodejs24.11、128MB、30s、Handler `index.main_handler`；执行角色 `IIROSE-MEDIA-SYNC-Role`；环境变量 `COS_BUCKET=iirose-media-sync-1309510434`、`COS_REGION=ap-guangzhou`。函数每次调用都从 `TENCENTCLOUD_SECRETID`/`TENCENTCLOUD_SECRETKEY`/`TENCENTCLOUD_SESSIONTOKEN` 读取角色的临时凭据，仓库与函数配置里不出现任何长期密钥。

函数不存在则一次性创建（角色、内存/超时、环境变量、代码），已存在则先收敛 `Role`/`Environment`/`MemorySize`/`Timeout`、再替换代码（`CodeSource=ZipFile`、`Publish=FALSE`，只更新 `$LATEST`），两次变更之间等函数就绪；就绪轮询期间把 `ResourceNotFound` 当作「尚未就绪」而不是失败。随后确保**函数 URL**（`Type=http` 触发器、开放鉴权 `AuthType=NONE`、开启公网访问）：刚创建或刚改鉴权会短暂重试，地址从触发器描述的 `NetConfig.ExtranetUrl` 回读，**读不到地址即部署失败**，不会静默通过。最后下发**函数最大独占配额 1280MB**（≈10 并发）——这一步只调用 `PutReservedConcurrencyConfig`，脚本不回读，是否生效需在控制台确认。

地址形如 `https://<app-id>-<url-id>.ap-guangzhou.tencentscf.com`，浏览器直连、不经 CORS 代理。函数内部实现 `sync-protocol.md` 的 `GET`/`PUT`/`DELETE`/`OPTIONS` 与 `If-None-Match` 304 短路，四道闸（uid 白名单、信封字段白名单、512KB 体积、10 秒频率与 200 次/日配额）全部在函数内；日志只含状态码、uid 前 2 位、字节数与耗时，不含请求体、`ct` 或凭据。

需要人工确认（脚本不做）：控制台里函数 URL 鉴权为「开放」、角色绑定与最大独占配额符合预期、费用与日调用量告警已配置（运维清单见后端架构文档）。函数 URL 绑定版本 `$LATEST`；本轮不发布版本、不配置告警。

## ☕ 支持我

如果这个插件给你带来了便利，欢迎请我喝杯咖啡，你的支持是持续更新的动力！

- **爱发电**：[afdian.com/a/mingj](https://afdian.com/a/mingj)
- **GitHub Sponsors**：[github.com/sponsors/jingming295](https://github.com/sponsors/jingming295)

## 🐛 反馈

- 蔷薇花园艾特 [@61f7881cd4538@]
- GitHub 提交 [Issue](https://github.com/jingming295/IIROSE-MEDIA-WEB/issues)
