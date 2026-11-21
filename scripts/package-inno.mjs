#!/usr/bin/env node
/**
 * Wrap an already packaged Windows application directory in an Inno Setup installer.
 *
 * This is deliberately independent of the upstream tree: it reads `dist/win-unpacked` and writes the
 * installer beside it, and it never edits anything under `upstream/`. The upstream NSIS flow stays
 * untouched and remains usable, so the two installers can be compared side by side.
 *
 * Usage:
 *   node scripts/package-inno.mjs <version> <owner/repo> [--desktop-root <dir>]
 *
 *   <version>      plain SemVer such as 2.0.24, matching the packaged application
 *   <owner/repo>   this repository, used for the publisher and update links
 *   --desktop-root where the upstream desktop package lives; defaults to <repo>/upstream/dsh-desktop-next
 *
 * The Inno compiler is taken from $ISCC, then the usual install locations, then PATH.
 */
import { existsSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')

/** Install locations the Inno Setup installers use, newest release last. */
const ISCC_CANDIDATES = [
  'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
  'D:\\Inno Setup 7\\ISCC.exe',
  'C:\\Program Files (x86)\\Inno Setup 7\\ISCC.exe',
  'C:\\Program Files\\Inno Setup 7\\ISCC.exe',
]

/**
 * @param {string[]} argv - process arguments after the script name.
 * @returns {{ version: string, repo: string, desktopRoot: string }}
 */
function parseArguments(argv) {
  const positional = []
  let desktopRoot
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--desktop-root') {
      desktopRoot = argv[index + 1]
      index += 1
    } else if (value.startsWith('--desktop-root=')) {
      desktopRoot = value.slice('--desktop-root='.length)
    } else {
      positional.push(value)
    }
  }
  const [version, repo] = positional
  if (version === undefined || repo === undefined) {
    console.error('usage: node scripts/package-inno.mjs <version> <owner/repo> [--desktop-root <dir>]')
    process.exit(2)
  }
  if (!/^\d+\.\d+\.\d+$/u.test(version)) {
    console.error(`version must be plain SemVer such as 2.0.24, got: ${version}`)
    process.exit(2)
  }
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repo)) {
    console.error(`repo must look like owner/name, got: ${repo}`)
    process.exit(2)
  }
  return {
    version,
    repo,
    desktopRoot: resolve(desktopRoot ?? join(repositoryRoot, 'upstream', 'dsh-desktop-next')),
  }
}

/**
 * @returns {string} the Inno Setup command line compiler.
 */
function findCompiler() {
  const configured = process.env.ISCC
  if (configured !== undefined && configured !== '' && existsSync(configured)) return configured
  for (const candidate of ISCC_CANDIDATES) if (existsSync(candidate)) return candidate
  const located = spawnSync('where', ['iscc'], { encoding: 'utf8' })
  const first = located.status === 0 ? located.stdout.split(/\r?\n/u)[0]?.trim() : undefined
  if (first !== undefined && first !== '' && existsSync(first)) return first
  console.error('Inno Setup compiler not found; set $ISCC or install Inno Setup 6/7')
  process.exit(1)
}

/**
 * Prepare one value for an Inno preprocessor `/D` definition.
 *
 * The compiler takes the text after `/Dname=` verbatim: quoting it would put the quote characters
 * into the value, which then lands in a path and in the output filename. The arguments go straight to
 * the compiler without a shell, so a value containing spaces still arrives intact.
 * @param {string} value - raw value.
 * @returns {string} the value as the preprocessor should receive it.
 */
const literal = value => {
  if (/[\r\n]/u.test(value)) throw new Error(`a /D value cannot span lines: ${value}`)
  return value
}

const { version, repo, desktopRoot } = parseArguments(process.argv.slice(2))
const buildDirectory = join(desktopRoot, 'dist', 'win-unpacked')
const outputDirectory = join(desktopRoot, 'dist')
const executable = join(buildDirectory, 'DSH Desktop.exe')
const icon = join(desktopRoot, 'build', 'app-icon.ico')
const script = join(repositoryRoot, 'installer', 'dsh-desktop.iss')
const expected = join(outputDirectory, `DSH-Desktop-Setup-${version}-x64.exe`)

for (const [label, path] of [
  ['application directory', buildDirectory],
  ['application executable', executable],
  ['installer icon', icon],
  ['installer script', script],
]) {
  if (!existsSync(path)) {
    console.error(`Missing ${label}: ${path}\nRun the packaging step before building the installer.`)
    process.exit(1)
  }
}

const compiler = findCompiler()
console.log(`Inno Setup: ${compiler}`)
console.log(`Application: ${buildDirectory}`)
console.log(`Output: ${expected}`)

const result = spawnSync(
  compiler,
  [
    `/DMyAppVersion=${literal(version)}`,
    `/DMyAppUrl=${literal(`https://github.com/${repo}`)}`,
    `/DBuildDir=${literal(buildDirectory)}`,
    `/DOutputDir=${literal(outputDirectory)}`,
    `/DSetupIconPath=${literal(icon)}`,
    script,
  ],
  { stdio: 'inherit', cwd: repositoryRoot },
)
if (result.error !== undefined) throw result.error
if (result.status !== 0) {
  console.error(`ISCC exited with ${String(result.status)}`)
  process.exit(1)
}
if (!existsSync(expected)) {
  console.error(`ISCC reported success but ${expected} is missing`)
  process.exit(1)
}
console.log(`Installer: ${expected} (${(statSync(expected).size / 1024 / 1024).toFixed(1)} MB)`)
