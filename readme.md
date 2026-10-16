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
python3 -B -m unittest discover -s scripts -p 'test_*.py' -v
```

## ☕ 支持我

如果这个插件给你带来了便利，欢迎请我喝杯咖啡，你的支持是持续更新的动力！

- **爱发电**：[afdian.com/a/mingj](https://afdian.com/a/mingj)
- **GitHub Sponsors**：[github.com/sponsors/jingming295](https://github.com/sponsors/jingming295)

## 🐛 反馈

- 蔷薇花园艾特 [@61f7881cd4538@]
- GitHub 提交 [Issue](https://github.com/jingming295/IIROSE-MEDIA-WEB/issues)
