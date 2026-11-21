# 上游锚点

本仓库**不跟随上游**。每次发布固定在一个上游 tag 上，用本仓库的差异层重新套一遍。上游出
新版不会自动改变我们的产物 —— 只有改这里的锚点才会。

## 当前锚点

| 项 | 值 |
|---|---|
| 上游仓库 | `anywhere-labs/dsh-desktop` |
| tag | `v2.0.24-next` |
| 版本号 | `2.0.24` |
| 提取规则 | tag 去掉 `v` 与 `-next`，必须剩下 `X.Y.Z` |

`rename.mjs` 拒绝其它写法：只有 `\d+\.\d+\.\d+` 通过。更新器按 SemVer 比较版本，Windows 安装器
自检按 PE 四段版本比较，带 `-next` 或四段的写法两边都会断。

## 各层职责

| 路径 | 生命周期 |
|---|---|
| `overlay/` | 原样拷进上游树。只放新增/覆盖文件（顶栏、图标、顶栏测试），不删上游任何东西 |
| `scripts/rename.mjs` | **唯一**修改上游源码的地方：23 条正则 + 2 条插入 + 10 个文案文件全替换 + 4 棵树扫尾 |
| `installer/`、`scripts/package-inno.mjs` | 完全独立：只读 `dist/win-unpacked`、只写 `dist/`，不进上游树 |
| `scripts/check-tests.mjs` | 跑上游 spec，只对基线之外的失败报警 |
| `.github/workflows/build.yml` | clone → overlay → rename → install → build → 测试门禁 → 打包 → 发布 |

## 升级步骤

1. 选 tag：

   ```bash
   gh api "repos/anywhere-labs/dsh-desktop/releases?per_page=30" \
     --jq '[.[] | select(.tag_name | endswith("-next"))][0].tag_name'
   ```

2. 本地试套：

   ```powershell
   git clone --depth 1 --branch v2.0.25-next https://github.com/anywhere-labs/dsh-desktop.git upstream
   Copy-Item -Recurse -Force overlay/* upstream/
   node scripts/rename.mjs upstream 2.0.25 <owner/repo>
   ```

3. 处理每一个 `MISS`（见下一节）
4. `cd upstream; yarn install --immutable; cd dsh-desktop-next; yarn build`
5. `node scripts/package.ts dir`
6. `node scripts/check-tests.mjs --desktop-root <desktop>` —— 只允许基线内的失败
7. `node scripts/package-inno.mjs 2.0.25 <owner/repo> --desktop-root <desktop>`
8. **实机装一次**：顶栏、图标、检查更新

CI 上只需 `gh workflow run build.yml -f tag=v2.0.25-next`；不填 tag 时自动取最新的 `-next`。

## 锚点失配的排查顺序

报错形如：

```
MISS installer self-check: dsh-desktop-next/src/update-installer.ts matched 0, expected 1
```

1. 打开上游对应文件，按 label 找到它描述的逻辑（label 就是意图，不是位置）
2. 判断上游怎么变的：改名、挪文件、参数变了、整段删了
3. 改 `find` 正则匹配新写法；语义也变了就一起改 `replace`
4. 若上游删掉了这段逻辑（例如 NSIS 换成了别的安装器），判断改动还需不需要 —— 不需要就删条目，
   并在 commit message 里写清理由
5. 重跑到 `DSH Desktop X.Y.Z prepared from …` 且零 `MISS`

`count` 是匹配数断言。上游把同一处写成两份时 `count` 要跟着改，否则只改一半、另一半漏网。

## 没有锚、只能靠肉眼的地方

- **`shell.overlay` slot 名**：顶栏靠它挂载。上游改名 → 顶栏静默消失，`titlebar.spec.ts` 抓不到
  （它只读样式字符串，不渲染）
- **`[data-shell-overlay]` 是 frame 的直接子元素**：条带预留用 `div:has(> …)` 选中它，层级变了就失效
- **`--dsw-alias-bg-base` / `bg-layer-1` 的取值**：顶栏浅色 = `bg-base × 96% + 黑 4%`，上游调色阶
  会改变观感；深色直接取 `bg-layer-1`
- **`--dsh-windows-titlebar-height`**：36px 条带高度由 preload 写入

每次升级装一次看顶栏，比读 diff 可靠。

## 版本号与更新源

上游的发布服务我们一概不指：

| 项 | 上游 | 本仓库 |
|---|---|---|
| 版本端点 | `www.dshdesktop.cn/api/desktop/version` | 自己的 GitHub Pages `version.json` |
| Windows 下载 | `www.dshdesktop.cn/api/downloads/windows` | `releases/latest/download/DSH-Desktop-win-x64.exe` |
| channel | `next` | `stable` |

`next` 只接受 `-next` 预发布版，而本仓库版本是纯 `X.Y.Z`，不改 `stable` 会直接抛
`The update version must match the next channel`。

## 测试基线

`yarn test` 有 27 条按设计失败（断言上游产品名、官方端点、`next` 频道、NSIS 开关）。
`scripts/check-tests.mjs` 拦住的是**基线之外的失败**。上游升级后若出现新失败，先判断是不是
上游行为变了 —— 那正是这条门禁存在的理由。缩基线用 `--update-baseline`。
