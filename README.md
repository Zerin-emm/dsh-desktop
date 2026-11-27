# DSH Desktop

个人构建。基于 [anywhere-labs/dsh-desktop](https://github.com/anywhere-labs/dsh-desktop) 的
DSH NEXT，只改三处：

- **顶栏**：把 2.0.18 那条 36px 半透明顶栏加回来（next 之后改成了系统原生标题栏）
- **程序名**：`DSH NEXT` → `DSH Desktop`
- **更新源**：指向本仓库的 GitHub Pages 与 releases，而不是官方发布服务

不提供支持。上游发新版后由 [`.github/workflows/build.yml`](.github/workflows/build.yml)
自动构建并发布。

## 本仓库不含上游代码

每次构建从上游仓库取对应 tag 的源码，应用本仓库的差异层，再打包：

```
clone tag  →  overlay/  →  scripts/rename.mjs  →  build  →  release + Pages
```

## 目录

| 路径 | 作用 |
|---|---|
| `overlay/` | 原样拷进上游树的文件，只含新增与覆盖内容，不删上游任何东西 |
| `overlay/dsh-plugin-desktop/` | 本地插件 vendoring：装本地目录插件前先复制进 profile，避免符号链接随源目录失效 |
| `scripts/rename.mjs` | 27 条正则改写，每条带匹配数断言，失配即中止构建 |
| `installer/`、`scripts/package-inno.mjs` | 独立于上游树的 Inno Setup 打包，只读 `win-unpacked`、只写 `dist/` |
| `scripts/check-tests.mjs` | 上游 spec 的基线差异门禁，只对基线外的失败报警 |
| [`UPSTREAM.md`](UPSTREAM.md) | 固定的上游 tag、升级步骤、锚点失配时的排查顺序 |
| `.github/workflows/build.yml` | 三平台构建、发布 release、部署 `version.json` |

## 改名对照

| 位置 | 值 |
|---|---|
| 显示名 / exe 名 | `DSH Desktop` |
| 版本号 | 上游 `2.0.24-next` → 本仓库 `2.0.24` |
| appId | `com.<owner>.dsh.desktop` |

## 发布物

| 平台 | 文件 | 自动更新 |
|---|---|---|
| Windows | `DSH-Desktop-win-x64.exe`（Inno Setup） | **是** |
| Windows | `DSH-Desktop-win-x64-Portable.zip`（免安装） | 否，解压即用、不写注册表 |
| macOS | `DSH-Desktop-mac-x64.dmg`（未签名） | 否，装完执行 `xattr -cr` |
| Linux | `DSH-Desktop-linux-x86_64.AppImage` / `-amd64.deb` | 否 |

Release 正文由上游同 tag 的说明改写而来（`DSH NEXT` → `DSH Desktop`，两种拼写都换），后面追加平台
表与安装包/便携包的区别。

Windows 安装包走镜像下载：`https://v4.gh-proxy.org/https://github.com/<owner>/<repo>/releases/latest/download/DSH-Desktop-win-x64.exe`。
更新器只要求最终落点是 HTTPS，镜像透明；`version.json` 与 release 说明链接仍直连。

## 本地插件安装

上游把本地目录插件装成 `link:` 依赖，`node_modules\<pkg>` 是指向源目录的符号链接。源目录一旦
删除或移动，链接就断（插件加载 `ENOENT`）；而且 lockfile 记着 `link:`，之后任何 `pnpm install`
都会重建这条断链。

本构建在 `pnpm.ts` 的 `runPlugin` 挂了一步 `vendorLocalPlugin()`：安装 `add <本地目录>` 时先把源
目录复制到 `<profile>/vendor/<pkg>`（跳过 `node_modules` 与 `.git`），再改写成 `file:<副本>`。
pnpm 的 link 语义不变，只是链接目标落在 profile 内部 —— 删源不影响，重装也指回同一份副本。

- 只处理 `add` + 存在的本地目录；registry / git / tarball 与其它子命令原样通过
- 用 `cpSync` 而非 `npm pack`，插件的 `prepack` 脚本不会被执行，副本也不带 `node_modules`
  （pnpm 会按副本的 manifest 重新解析依赖）
- 已在 `<profile>/vendor` 内的目录不再复制

## 测试

上游的 `yarn test` 断言的是**上游产品的事实**：`DSH NEXT` 的对话框标题、官方更新端点的
URL、`next` 频道的版本串、NSIS 安装器的启动参数。本项目故意改变了这些事实，所以这部分
用例会失败，属于预期，不去修 —— 把它们改绿只是让测试给改动背书。

数字：未改动的上游签出在本机跑是 **10 条失败**，全部平台绑定（codesign、macOS 授权、
wasm sharp、Windows GPU 对话框、icon 同步）。改名并接入新更新源之后是 **27 条**，即同一批
10 条加上 17 条钉住旧更新服务的断言。

改动的回归保护不是这些 spec，而是 `scripts/rename.mjs`：27 条正则各带匹配数断言，上游
任何一处锚点变了就 `exit 1`，构建当场停下。发布路径（`yarn build` → `package.ts dir` →
`package-inno.mjs`）不跑 `yarn test`，也不跑 `yarn check`。

## 已知取舍

- Windows 出 Inno Setup 安装包；macOS 出未签名 dmg（`xattr -cr` 后可用）；Linux 出
  AppImage 与 deb。
- 只跟进上游 `*-next` 发行版，跳过 `beta.*` 预发布。
- `overlay/` 的顶栏是新增文件，上游改官方 UI 不会影响它；上游改动被 `rename.mjs` 锚定的
  27 处字符串时才会失败，届时按报错修正锚点。
