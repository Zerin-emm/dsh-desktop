#!/usr/bin/env node
/**
 * Run the upstream specs and compare their failures against a recorded baseline.
 *
 * The specs assert the upstream product: dialog titles, the official update endpoint, the `next`
 * channel's version strings, the NSIS launch switches. This build changes those facts on purpose, so
 * a fixed number of cases fail by design and rewriting them would only make the tests agree with the
 * change. What still matters is that nothing *else* breaks: a spec that passed before and fails now
 * means a patch reached further than intended, or upstream changed behaviour under us.
 *
 * Usage:
 *   node scripts/check-tests.mjs [--desktop-root DIR] [--update-baseline]
 *
 *   --desktop-root     where the upstream desktop package lives; defaults to <repo>/upstream/dsh-desktop-next
 *   --update-baseline  rewrite .known-test-failures.json from this run, then exit 0
 *
 * Exit codes: 0 when the failures are a subset of the baseline, 1 when a new one appears.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const baselinePath = join(repositoryRoot, '.known-test-failures.json')

/**
 * @param {string[]} argv - process arguments after the script name.
 * @returns {{ desktopRoot: string, updateBaseline: boolean }}
 */
function parseArguments(argv) {
  let desktopRoot
  let updateBaseline = false
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === '--update-baseline') {
      updateBaseline = true
    } else if (value === '--desktop-root') {
      desktopRoot = argv[index + 1]
      index += 1
    } else if (value.startsWith('--desktop-root=')) {
      desktopRoot = value.slice('--desktop-root='.length)
    }
  }
  return { desktopRoot: resolve(desktopRoot ?? join(repositoryRoot, 'upstream', 'dsh-desktop-next')), updateBaseline }
}

/**
 * Collect the failing cases as `<file>::<full test name>`.
 * @param {any} report - the vitest JSON report.
 * @param {string} desktopRoot - the directory the paths are relative to.
 * @returns {Set<string>} the failing case keys.
 */
function failingCases(report, desktopRoot) {
  const failed = new Set()
  for (const file of report.testResults ?? []) {
    const name = typeof file.name === 'string' ? relative(desktopRoot, file.name).replaceAll('\\', '/') : ''
    for (const test of file.assertionResults ?? []) {
      if (test.status === 'failed') failed.add(`${name}::${test.fullName ?? test.title ?? ''}`)
    }
  }
  return failed
}

const { desktopRoot, updateBaseline } = parseArguments(process.argv.slice(2))
const vitest = join(desktopRoot, 'node_modules', 'vitest', 'vitest.mjs')
if (!existsSync(vitest)) {
  console.error(`Missing vitest under ${desktopRoot}\nInstall the upstream dependencies first.`)
  process.exit(1)
}

/**
 * Run the suite once and collect its failing cases.
 * @returns {{ failed: Set<string>, seconds: string }}
 */
function runSuite() {
  const workspace = mkdtempSync(join(tmpdir(), 'dsh-specs-'))
  const output = join(workspace, 'report.json')
  const started = Date.now()
  const run = spawnSync(process.execPath, [vitest, 'run', '--reporter=json', `--outputFile=${output}`], {
    cwd: desktopRoot,
    stdio: 'inherit',
    env: { ...process.env, DSH_TELEMETRY_DISABLED: '1' },
  })
  if (run.error !== undefined) throw run.error
  if (!existsSync(output)) {
    console.error('vitest produced no JSON report; the run itself failed before any spec executed')
    rmSync(workspace, { recursive: true, force: true })
    process.exit(1)
  }
  const failed = failingCases(JSON.parse(readFileSync(output, 'utf8')), desktopRoot)
  rmSync(workspace, { recursive: true, force: true })
  return { failed, seconds: ((Date.now() - started) / 1000).toFixed(0) }
}

const first = runSuite()
let current = first.failed

if (updateBaseline) {
  const note = [
    'Cases that fail by design: they assert the upstream product name, update endpoint, channel',
    'and installer switches that this build replaces.',
    'Regenerate with node scripts/check-tests.mjs --update-baseline.',
  ].join(' ')
  const payload = { note, failures: [...current].sort() }
  writeFileSync(baselinePath, `${JSON.stringify(payload, undefined, 2)}\n`)
  console.log(`\nRecorded ${current.size} known failures in .known-test-failures.json (${first.seconds}s)`)
  process.exit(0)
}

if (!existsSync(baselinePath)) {
  console.error('No .known-test-failures.json yet; run with --update-baseline once.')
  process.exit(1)
}
const baseline = new Set(JSON.parse(readFileSync(baselinePath, 'utf8')).failures ?? [])

// A single CI run trips a timing-sensitive spec now and then. Confirming a candidate with a second
// full run keeps one flake from blocking a release, while a real regression fails both times.
let added = [...current].filter(name => !baseline.has(name)).sort()
if (added.length > 0) {
  console.log(`\n${added.length} candidate failure(s) outside the baseline; re-running to rule out flakes…`)
  const second = runSuite()
  current = second.failed
  added = added.filter(name => current.has(name))
  console.log(`second run finished in ${second.seconds}s`)
}

const gone = [...baseline].filter(name => !current.has(name)).sort()

console.log(`\nknown failures: ${baseline.size}   failing now: ${current.size}   (${first.seconds}s)`)
if (gone.length > 0) {
  console.log(`\n${gone.length} baseline case(s) pass now, shrink the baseline when convenient:`)
  for (const name of gone) console.log(`  - ${name}`)
}
if (added.length > 0) {
  console.error(`\n${added.length} case(s) failed twice and the baseline does not list them:`)
  for (const name of added) console.error(`  + ${name}`)
  console.error('\nA patch reached further than intended, or upstream changed behaviour. Investigate before releasing.')
  process.exit(1)
}
console.log('No new failures.')
