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
| `overlay/` | 原样拷进上游树的文件，只含新增内容，不与上游冲突 |
| `scripts/rename.mjs` | 13 处字符串替换，每处失败即中止构建 |
| `.github/workflows/build.yml` | 构建、发布 release、部署 `version.json` |

## 改名对照

| 位置 | 值 |
|---|---|
| 显示名 / exe 名 | `DSH Desktop` |
| 版本号 | 上游 `2.0.24-next` → 本仓库 `2.0.24` |
| appId | `com.<owner>.dsh.desktop` |

## 已知取舍

- 只构建 Windows。
- 只跟进上游 `*-next` 发行版，跳过 `beta.*` 预发布。
- `overlay/` 的顶栏是新增文件，上游改官方 UI 不会影响它；上游改动被 `rename.mjs` 锚定的
  11 处字符串时才会失败，届时按报错修正锚点。
