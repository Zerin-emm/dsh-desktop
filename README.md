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
| `scripts/rename.mjs` | 23 条正则改写，每条带匹配数断言，失配即中止构建 |
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

## 测试

上游的 `yarn test` 断言的是**上游产品的事实**：`DSH NEXT` 的对话框标题、官方更新端点的
URL、`next` 频道的版本串、NSIS 安装器的启动参数。本项目故意改变了这些事实，所以这部分
用例会失败，属于预期，不去修 —— 把它们改绿只是让测试给改动背书。

数字：未改动的上游签出在本机跑是 **10 条失败**，全部平台绑定（codesign、macOS 授权、
wasm sharp、Windows GPU 对话框、icon 同步）。改名并接入新更新源之后是 **27 条**，即同一批
10 条加上 17 条钉住旧更新服务的断言。

改动的回归保护不是这些 spec，而是 `scripts/rename.mjs`：23 条正则各带匹配数断言，上游
任何一处锚点变了就 `exit 1`，构建当场停下。发布路径（`yarn build` → `package.ts dir` →
`package-inno.mjs`）不跑 `yarn test`，也不跑 `yarn check`。

## 已知取舍

- Windows 出 Inno Setup 安装包；macOS 出未签名 dmg（`xattr -cr` 后可用）；Linux 出
  AppImage 与 deb。
- 只跟进上游 `*-next` 发行版，跳过 `beta.*` 预发布。
- `overlay/` 的顶栏是新增文件，上游改官方 UI 不会影响它；上游改动被 `rename.mjs` 锚定的
  23 处字符串时才会失败，届时按报错修正锚点。
