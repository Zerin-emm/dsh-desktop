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
import { readFile, writeFile } from 'node:fs/promises'
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
    // The transport follows up to eight redirects, and a fixed asset name keeps this URL current.
    find: /win32:\s*'https:\/\/www\.dshdesktop\.cn\/api\/downloads\/windows'/u,
    replace: `win32: '${repository}/releases/latest/download/DSH-Desktop-win-x64.exe'`,
  },
  {
    file: 'dsh-desktop-next/src/recovery-support.ts',
    label: 'recovery feedback link',
    find: /href: 'https:\/\/github\.com\/anywhere-labs\/dsh-desktop\/issues'/u,
    replace: `href: '${repository}/issues'`,
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
    text: "\n  ctx.effect(installDesktopTitlebar, 'Desktop titlebar overlay')",
  },
]

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

for (const edit of EDITS) await applyEdit(edit)
for (const edit of INSERTS) await applyInsert(edit)

if (failed) {
  console.error('\nOne or more rewrites did not match. The upstream tree changed; update scripts/rename.mjs.')
  process.exit(1)
}
console.log(`\nDSH Desktop ${version} prepared from ${upstream}`)
