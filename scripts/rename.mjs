#!/usr/bin/env node
/**
 * Rewrite one upstream DSH NEXT tree into this project's DSH Desktop build.
 *
 * Every edit asserts that it matched: a silent miss would ship a build that still calls itself
 * DSH NEXT, or that points its updater at the official release service.
 *
 * Usage: node scripts/rename.mjs <upstream-dir> <version> <owner/repo>
 *   <upstream-dir>  the cloned dsh-desktop tree
 *   <version>       the release version without the -next suffix, such as 2.0.24
 *   <owner/repo>    this repository, used for release links and the download URL
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const [upstream, version, repo] = process.argv.slice(2)
if (upstream === undefined || version === undefined || repo === undefined) {
  console.error('usage: node scripts/rename.mjs <upstream-dir> <version> <owner/repo>')
  process.exit(2)
}
if (!/^\d+\.\d+\.\d+$/u.test(version)) {
  // The updater's client compares this as SemVer, and the Windows installer check compares it
  // against a four-part PE version, so anything but plain digits breaks one of the two.
  console.error(`version must be plain SemVer such as 2.0.24, got: ${version}`)
  process.exit(2)
}

const pages = `https://${repo.split('/')[0]}.github.io/${repo.split('/')[1]}`
const repository = `https://github.com/${repo}`

/**
 * Mirror placed in front of the release asset.
 *
 * `releases/download` from mainland China usually stalls, and the downloader accepts any settled
 * URL that is plain HTTPS, so the installer link goes through here while the version endpoint and
 * the release-notes links stay direct.
 */
const downloadMirror = 'https://v4.gh-proxy.org'

/** Every rewrite, in the order the files are read. `count` is how many matches the edit must find. */
const EDITS = [
  {
    file: 'dsh-desktop-next/package.json',
    label: 'package version',
    // The top-level version is the first key of the file; dependency versions never look like 2.0.x-next.
    find: /"version":\s*"\d+\.\d+\.\d+-next"/u,
    replace: `"version": "${version}"`,
  },
  {
    file: 'dsh-desktop-next/package.json',
    label: 'installer product name',
    find: /"productName":\s*"DSH NEXT"/u,
    replace: '"productName": "DSH Desktop"',
  },
  {
    file: 'dsh-desktop-next/package.json',
    label: 'application id',
    find: /"appId":\s*"[^"]+"/u,
    replace: `"appId": "com.${repo.split('/')[0].toLowerCase()}.dsh.desktop"`,
  },
  {
    file: 'dsh-desktop-next/src/main.ts',
    label: 'runtime application name',
    // Without this the shell sets its name back to DSH NEXT on every start.
    find: /app\.setName\('DSH NEXT'\)/u,
    replace: "app.setName('DSH Desktop')",
  },
  {
    file: 'dsh-desktop-next/src/main.ts',
    label: 'crash report product name',
    find: /startCrashReporting\(crashReporter, \{ productName: 'DSH NEXT'/u,
    replace: "startCrashReporting(crashReporter, { productName: 'DSH Desktop'",
  },
  {
    file: 'dsh-desktop-next/src/update-installer.ts',
    label: 'installer self-check',
    // ProductVersion is a four-part PE value (2.0.24 becomes 2.0.24.0), so it never equals the
    // SemVer string. Comparing it made every update fail its own self-check.
    find: /if \(info\.ProductName !== 'DSH NEXT' \|\| info\.ProductVersion !== version\)/u,
    replace: "if (info.ProductName !== 'DSH Desktop')",
  },
  {
    file: 'dsh-desktop-next/src/update-state.ts',
    label: 'release notes link',
    find: /const RELEASES_URL = 'https:\/\/github\.com\/anywhere-labs\/dsh-desktop\/releases'/u,
    replace: `const RELEASES_URL = '${repository}/releases'`,
  },
  {
    file: 'dsh-desktop-next/src/updates.ts',
    label: 'update channel',
    // The check and the download both name the channel. `next` requires a -next prerelease, and
    // this build reports the plain released version, so both must ask for the stable stream.
    find: /channel: 'next'/gu,
    replace: "channel: 'stable'",
    count: 2,
  },
  {
    file: 'dsh-desktop-next/src/updates.ts',
    label: 'installer filename channel',
    // The helper validates the version against this channel and throws when they disagree, so the
    // third argument must name the same stream as the download above it.
    find: /desktopUpdateFilename\(platform, result\.latestVersion, 'next'\)/u,
    replace: "desktopUpdateFilename(platform, result.latestVersion, 'stable')",
  },
  {
    file: 'dsh-plugin-desktop/src/update-checker.ts',
    label: 'version endpoint',
    // A GitHub Pages file answers with { version, channel, sha256 } and no redirect. The official
    // endpoint is unreachable for this build, and a release asset would redirect.
    find: /export const DESKTOP_VERSION_ENDPOINT = '[^']+'/u,
    replace: `export const DESKTOP_VERSION_ENDPOINT = '${pages}/version.json'`,
  },
  {
    file: 'dsh-plugin-desktop/src/update-download.ts',
    label: 'windows installer url',
    // The transport follows up to eight redirects and only checks that the settled URL is HTTPS, so
    // the mirror in front stays transparent. A fixed asset name keeps the link valid across versions.
    find: /win32:\s*'https:\/\/www\.dshdesktop\.cn\/api\/downloads\/windows'/u,
    replace: `win32: '${downloadMirror}/${repository}/releases/latest/download/DSH-Desktop-win-x64.exe'`,
  },
  {
    file: 'dsh-plugin-desktop/src/update-download.ts',
    label: 'macOS installer url',
    // Left alone this kept pointing at the official endpoint, so a Mac user pressing download got
    // the upstream package, whose bundle id differs and installs as a second application. The DMG
    // here is unsigned and its in-app update cannot complete, but the link must still name this
    // repository.
    find: /darwin:\s*'https:\/\/www\.dshdesktop\.cn\/api\/downloads\/mac'/u,
    replace: `darwin: '${downloadMirror}/${repository}/releases/latest/download/DSH-Desktop-mac-x64.dmg'`,
  },
  {
    file: 'dsh-desktop-next/package.json',
    label: 'package repository url',
    // Metadata only: publish is null and nothing reads it at runtime, but it should not keep naming
    // the upstream repository once the product identifies as something else.
    find: /"url":\s*"git\+https:\/\/github\.com\/anywhere-labs\/deepseek-harness-desktop\.git"/u,
    replace: `"url": "git+${repository}.git"`,
  },
  {
    file: 'dsh-desktop-next/package.json',
    label: 'start menu shortcut name',
    find: /"shortcutName":\s*"DSH NEXT"/u,
    replace: '"shortcutName": "DSH Desktop"',
  },
  {
    file: 'dsh-desktop-next/package.json',
    label: 'installer artifact names',
    // electron-builder writes the installers under these names, so the released files still said
    // DSH-NEXT after the product itself was renamed.
    find: /"artifactName":\s*"DSH-NEXT-/gu,
    replace: '"artifactName": "DSH-Desktop-',
    count: 4,
  },
  {
    file: 'dsh-desktop-next/src/client/settings.tsx',
    label: 'drop the app-icon row import',
    // One artwork ships now (the classic set), so the choice and its previews go with it.
    find: /^import \{ NextAppIconSetting \} from '\.\/app-icon-setting\.tsx'\r?\n/mu,
    replace: '',
  },
  {
    file: 'dsh-desktop-next/src/client/settings.tsx',
    label: 'drop the app-icon row',
    find: /^[ \t]*presentationRows=\{state && <NextAppIconSetting[^\n]*\r?\n/mu,
    replace: '',
  },
  {
    file: 'dsh-desktop-next/src/native-ui/onboarding.tsx',
    label: 'drop the unused icon imports',
    // The choice is gone, so only the value guard and its type stay in use.
    find: /import \{ appIconLabel, DESKTOP_APP_ICONS, isDesktopAppIcon, type DesktopAppIcon \} from '\.\.\/app-icon\.ts'/u,
    replace: "import { isDesktopAppIcon, type DesktopAppIcon } from '../app-icon.ts'",
  },
  {
    file: 'dsh-desktop-next/src/native-ui/onboarding.tsx',
    label: 'drop the icon preview import',
    find: /^import \{ AppIconPreview \} from '\.\.\/client\/app-icon-previews\.tsx'\r?\n/mu,
    replace: '',
  },
  {
    file: 'dsh-desktop-next/src/native-ui/onboarding.tsx',
    label: 'drop the setup icon choice',
    // One artwork ships, so setup has nothing to choose. The state and the completion payload keep
    // their shape; only the visible choice goes.
    find: /\{page === 0 && <div className="next-onboarding-option next-onboarding-reveal">\n(?:[^\n]*\n)*?[ \t]*<\/div>\}\n/u,
    replace: '',
  },
  {
    file: 'dsh-desktop-next/src/preload-windows.ts',
    label: 'keep the sidebar icon rail',
    // `AppFrame` maps this marker to both the page's padding-top and `collapsedWidth = 0`. The drawn
    // caption reserves the strip from its own stylesheet instead, so the marker must stay unset for
    // the 56px rail to survive collapsing. The height variable below it is kept.
    find: /^[ \t]*root\.dataset\.windowsTitlebar = ''\r?\n/mu,
    replace: '',
  },
  {
    file: 'dsh-desktop-next/src/recovery-support.ts',
    label: 'recovery feedback link',
    find: /href: 'https:\/\/github\.com\/anywhere-labs\/dsh-desktop\/issues'/u,
    replace: `href: '${repository}/issues'`,
  },
  {
    file: 'dsh-desktop-next/tests/package.spec.ts',
    label: 'package spec follows the released version',
    // The spec pinned the upstream `-next` prerelease; this build reports the plain version.
    find: /expect\(next\.version\)\.toBe\('2\.0\.24-next'\)/u,
    replace: `expect(next.version).toBe('${version}')`,
  },
  {
    file: 'dsh-desktop-next/tests/package.spec.ts',
    label: 'package spec follows the application id',
    find: /expect\(next\.build\.appId\)\.toBe\('ai\.deepseek\.dsh\.desktop\.next'\)/u,
    replace: `expect(next.build.appId).toBe('com.${repo.split('/')[0].toLowerCase()}.dsh.desktop')`,
  },
  {
    file: 'dsh-desktop-next/tests/package.spec.ts',
    label: 'package spec follows the repository url',
    // It compared against dsh-plugin-desktop's repository; the product now names its own.
    find: /expect\(next\.repository\)\.toEqual\(\{ type: 'git', url: stable\.repository\.url, directory: 'dsh-desktop-next' \}\)/u,
    replace: `expect(next.repository).toEqual({ type: 'git', url: 'git+${repository}.git', directory: 'dsh-desktop-next' })`,
  },
  {
    file: 'dsh-desktop-next/src/update-installer.ts',
    label: 'windows update drives the Inno Setup installer',
    // The application quits and shuts its Host down before this runs, so the installer only has to
    // install. Inno shows the progress bar for /SILENT without asking anything; --updated tells the
    // installer script to start the new version once it finishes. --force-run was NSIS-specific.
    find: /spawn\(this\.prepared!\.path, \['--updated', '--force-run'\]/u,
    replace: "spawn(this.prepared!.path, ['/SILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/CLOSEAPPLICATIONS', '--updated']",
  },
  {
    file: 'dsh-plugin-desktop/src/pnpm.ts',
    label: 'vendor a local plugin before pnpm links it',
    // `pnpm add <dir>` records a link: dependency and junctions into the source directory, so
    // deleting the source breaks the profile and every later reinstall rebuilds the broken link.
    // Copying the directory into <profile>/vendor first keeps the junction inside the profile.
    find: /return this\.startPlugin\(validatedArgv\(argv\), invokingDir, signal\)/u,
    replace: 'return this.startPlugin(validatedArgv(vendorLocalPlugin(argv, this.bootstrap.activeProfileDir)), invokingDir, signal)',
  },
]

/** Edits that add a line instead of replacing one. */
const INSERTS = [
  {
    file: 'dsh-desktop-next/src/client/index.ts',
    label: 'titlebar import',
    after: "import { installClientDiagnostics } from './client-diagnostics.ts'",
    text: "\nimport { installDesktopTitlebar } from './titlebar/index.ts'",
  },
  {
    file: 'dsh-desktop-next/src/client/index.ts',
    label: 'titlebar mount',
    after: 'export function apply(ctx: Context): void {',
    // `ctx.slots.inject` is already an effect, so this is a plain call; `ctx.effect` takes a
    // zero-argument function and would reject the context parameter.
    text: '\n  installDesktopTitlebar(ctx)',
  },
  {
    file: 'dsh-plugin-desktop/src/pnpm.ts',
    label: 'local plugin vendoring import',
    after: "import { withDesktopPnpmPolicy } from './pnpm-policy.ts'",
    text: "\nimport { vendorLocalPlugin } from './local-plugin-store.ts'",
  },
]

/**
 * Files where every `DSH NEXT` is copy the user reads or a name the shell shows.
 *
 * `data-directory.ts` is deliberately absent: it builds `%APPDATA%\DSH NEXT\home`, and renaming it
 * would point the build at an empty data directory instead of the one already in use.
 */
const COPY_FILES = [
  'dsh-desktop-next/src/client/settings.tsx',
  'dsh-desktop-next/src/client/updates.tsx',
  'dsh-desktop-next/src/native-ui/main.tsx',
  'dsh-desktop-next/src/desktop-menu.ts',
  'dsh-desktop-next/src/failure-report.ts',
  'dsh-desktop-next/src/app-downloads.ts',
  'dsh-desktop-next/src/desktop-terminal/windows-shell.ts',
  'dsh-desktop-next/src/host-startup-limit.ts',
  // The fuse verifier looks for the packaged executable by its build product name.
  'dsh-desktop-next/scripts/verify-fuses.ts',
]

/**
 * Replace every product name in the visible copy.
 * @param file - One source file carrying `DSH NEXT` as copy.
 */
async function applyCopyRewrite(file) {
  const path = join(upstream, file)
  const before = await readFile(path, 'utf8')
  const count = before.split('DSH NEXT').length - 1
  if (count === 0) {
    console.error(`MISS visible copy: ${file} carries no DSH NEXT`)
    failed = true
    return
  }
  await writeFile(path, before.replaceAll('DSH NEXT', 'DSH Desktop'))
  console.log(`ok   visible copy (${String(count)}): ${file}`)
}

let failed = false

/**
 * Apply one regular-expression rewrite, requiring the expected number of matches.
 * @param edit - the rewrite and how many matches it must find.
 */
async function applyEdit(edit) {
  const path = join(upstream, edit.file)
  const before = await readFile(path, 'utf8')
  const matches = before.match(edit.find)
  const expected = edit.count ?? 1
  if (matches === null || matches.length !== expected) {
    console.error(`MISS ${edit.label}: ${edit.file} matched ${matches === null ? 0 : matches.length}, expected ${expected}`)
    failed = true
    return
  }
  const after = before.replace(edit.find, edit.replace)
  if (after === before) {
    console.error(`MISS ${edit.label}: ${edit.file} did not change`)
    failed = true
    return
  }
  await writeFile(path, after)
  console.log(`ok   ${edit.label}: ${edit.file}`)
}

/**
 * Insert one line after a unique anchor.
 * @param edit - the anchor and the text to add after it.
 */
async function applyInsert(edit) {
  const path = join(upstream, edit.file)
  const before = await readFile(path, 'utf8')
  const occurrences = before.split(edit.after).length - 1
  if (occurrences !== 1) {
    console.error(`MISS ${edit.label}: ${edit.file} anchor found ${occurrences} times, expected 1`)
    failed = true
    return
  }
  await writeFile(path, before.replace(edit.after, `${edit.after}${edit.text}`))
  console.log(`ok   ${edit.label}: ${edit.file}`)
}

/**
 * Files that keep `DSH NEXT` on purpose.
 *
 * `data-directory.ts` builds `%APPDATA%\DSH NEXT\home`; renaming it would point the build at an
 * empty directory instead of the one already in use. The spec asserts that path, so it keeps the
 * old name for the same reason.
 */
const KEEP_PRODUCT_NAME = new Set([
  'dsh-desktop-next/src/data-directory.ts',
  'dsh-desktop-next/tests/data-directory.spec.ts',
])

/**
 * Source trees whose remaining product names are paths, window titles, build-time lookups and the
 * assertions that pin them.
 *
 * `tests` is in here because those assertions read the product name out of the code under test: a
 * scan that stopped at `src` left roughly two hundred upstream names in place, and the renamed code
 * then failed its own specs.
 */
const SCAN_ROOTS = ['dsh-desktop-next/src', 'dsh-desktop-next/scripts', 'dsh-desktop-next/tests', 'dsh-plugin-desktop/src', 'dsh-plugin-desktop/scripts', 'dsh-plugin-desktop/tests']

/** Text files that may carry the product name. */
const TEXT_EXTENSIONS = /\.(?:ts|tsx|mjs|js|json|html|yml|yaml)$/u

/**
 * Replace every remaining product name under the scanned trees.
 *
 * The build scripts look the packaged executable up by name (`win-unpacked/DSH NEXT.exe`), so a rename
 * that stopped at the copy left the packaging steps looking for a file that no longer exists.
 */
async function applyScanRewrite() {
  const walk = async (relative) => {
    const entries = await readdir(join(upstream, relative), { withFileTypes: true })
    for (const entry of entries) {
      const path = `${relative}/${entry.name}`
      if (entry.isDirectory()) { await walk(path); continue }
      if (!TEXT_EXTENSIONS.test(entry.name) || KEEP_PRODUCT_NAME.has(path)) continue
      const before = await readFile(join(upstream, path), 'utf8')
      // Artifact names carry `DSH-NEXT-` (hyphen, no space); the installer verifier looks the setup
      // file up by that name, so both spellings have to move together.
      const spaced = before.split('DSH NEXT').length - 1
      const hyphenated = before.split('DSH-NEXT').length - 1
      if (spaced === 0 && hyphenated === 0) continue
      const rewritten = before.replaceAll('DSH NEXT', 'DSH Desktop').replaceAll('DSH-NEXT', 'DSH-Desktop')
      await writeFile(join(upstream, path), rewritten)
      console.log(`ok   remaining (${String(spaced + hyphenated)}): ${path}`)
    }
  }
  for (const root of SCAN_ROOTS) await walk(root)
}
for (const edit of EDITS) await applyEdit(edit)
for (const edit of INSERTS) await applyInsert(edit)
for (const file of COPY_FILES) await applyCopyRewrite(file)
await applyScanRewrite()

if (failed) {
  console.error('\nOne or more rewrites did not match. The upstream tree changed; update scripts/rename.mjs.')
  process.exit(1)
}
console.log(`\nDSH Desktop ${version} prepared from ${upstream}`)
