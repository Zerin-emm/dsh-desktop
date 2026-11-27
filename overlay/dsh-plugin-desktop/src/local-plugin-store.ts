/**
 * Copy a local plugin directory into the profile before pnpm links it.
 *
 * `pnpm add <local dir>` records a `link:` dependency and points a junction at the source
 * directory. Deleting or moving that source breaks the profile, and any later `pnpm install`
 * rebuilds the same broken junction. Copying the source into `<profile>/vendor/<pkg>` and
 * installing `file:<copy>` keeps pnpm's link semantics untouched — the junction now points inside
 * the profile, so it survives the source going away and every reinstall resolves to the same copy.
 *
 * Only `add` is rewritten; every other subcommand passes through unchanged. A spec that is not an
 * existing directory (a registry name, a git address, a tarball) is left alone.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'

const LOCAL_SPEC = /^(?:file|link):(.*)$/su
const VENDOR_DIRECTORY = 'vendor'

/** The filesystem directory a spec names, when it names one that exists. */
function localDirectory(spec: string): string | undefined {
  const stripped = LOCAL_SPEC.exec(spec)?.[1] ?? (isAbsolute(spec) ? spec : undefined)
  if (stripped === undefined) return undefined
  try {
    const resolved = resolve(stripped)
    return statSync(resolved).isDirectory() ? resolved : undefined
  } catch {
    return undefined
  }
}

/** The package name a directory declares, used to name its copy. */
function declaredName(directory: string): string | undefined {
  try {
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')) as { name?: unknown }
    return typeof manifest.name === 'string' && manifest.name.length > 0 ? manifest.name : undefined
  } catch {
    return undefined
  }
}

/** A stable, filesystem-safe directory name for one package name. */
function directoryNameFor(name: string): string {
  return name.replace(/^@/u, '').replace(/[\\/]/gu, '+')
}

/**
 * Copy one source directory into the vendor root, skipping `node_modules` and `.git`.
 *
 * The copy keeps only the package's own files: pnpm resolves the copy's dependencies from its
 * manifest, and a copied `node_modules` would otherwise be installed as plain files.
 * @param source - absolute source directory.
 * @param destination - absolute copy destination; replaced when it already exists.
 */
function copyIntoVendor(source: string, destination: string): void {
  if (existsSync(destination)) rmSync(destination, { recursive: true, force: true })
  cpSync(source, destination, {
    recursive: true,
    filter: current => {
      const inside = relative(source, current)
      return inside === '' || !/^(?:node_modules|\.git)(?:[\\/]|$)/u.test(inside)
    },
  })
}

/**
 * Rewrite an `add` command so a local plugin directory installs from a copy inside the profile.
 * @param argv - plugin command arguments, starting with the subcommand.
 * @param profileDir - the active profile directory that receives the copy.
 * @returns the arguments to run, or the same array when no argument named a local directory.
 */
export function vendorLocalPlugin(argv: readonly string[], profileDir: string): readonly string[] {
  const addAt = argv.indexOf('add')
  if (addAt === -1) return argv
  const vendorRoot = resolve(join(profileDir, VENDOR_DIRECTORY))
  let changed = false
  const rewritten = argv.map((argument, index) => {
    if (index <= addAt || argument.startsWith('-')) return argument
    const directory = localDirectory(argument)
    if (directory === undefined) return argument
    // Already a copy inside this profile: keep it as is.
    if (directory === vendorRoot || directory.startsWith(vendorRoot + sep)) return argument
    const name = declaredName(directory)
    if (name === undefined) return argument
    const destination = join(vendorRoot, directoryNameFor(name))
    mkdirSync(vendorRoot, { recursive: true })
    copyIntoVendor(directory, destination)
    changed = true
    return `file:${destination}`
  })
  return changed ? rewritten : argv
}
