/**
 * Clear the Low integrity labels that DSH's Windows sandbox leaves on its workspaces.
 *
 * `workspace-write` grants a capability SID and a `Mandatory Label\Low Mandatory Level:(NW)` on the
 * workspace tree. The label is stored in the SACL and survives the session, so an executable built
 * there keeps the label and — by the Windows process-creation rule that takes the lower of caller
 * and image — runs at Low integrity even when launched from Explorer. Switching DSH to full access
 * does not rewrite those SACLs, so writes to the user's own Medium/High targets still fail.
 *
 * This module rewrites each recorded workspace back to Medium. It is best-effort and never throws:
 * a workspace that disappeared or that icacls refuses is skipped. Note the trade-off — a workspace
 * reset to Medium can no longer be written by DSH's own Low-integrity sandbox processes; DSH
 * re-grants on its next sandboxed run, so treat this as "make it runnable outside DSH".
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Every workspace path recorded in `<home>/storages/workspace.json`, skipping unreadable ones. */
export function readWorkspacePaths(homeDir: string): string[] {
  let raw: string
  try {
    raw = readFileSync(join(homeDir, 'storages', 'workspace.json'), 'utf8')
  } catch {
    return []
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  const tables = (parsed as { tables?: { workspaces?: unknown } }).tables
  const workspaces = tables?.workspaces
  if (workspaces === null || typeof workspaces !== 'object') return []
  const paths = new Set<string>()
  for (const entry of Object.values(workspaces as Record<string, unknown>)) {
    const path = (entry as { path?: unknown } | null)?.path
    if (typeof path === 'string' && path.length > 0) paths.add(path)
  }
  return [...paths]
}

/** Reset one directory tree from Low to Medium integrity; resolves with whether icacls exited 0. */
function resetIntegrity(directory: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!existsSync(directory)) {
      resolve(false)
      return
    }
    const child = spawn('icacls', [directory, '/setintegritylevel', '(OI)(CI)M', '/T', '/C'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    child.once('error', () => resolve(false))
    child.once('exit', code => resolve(code === 0))
  })
}

/**
 * Rewrite every recorded workspace back to Medium integrity.
 * @param homeDir - the DSH home directory holding the workspace store.
 * @param log - receives one line per workspace that was reset.
 * @returns how many directories were reset.
 */
export async function repairWorkspaceIntegrity(homeDir: string, log: (message: string) => void): Promise<number> {
  if (process.platform !== 'win32') return 0
  let repaired = 0
  for (const directory of readWorkspacePaths(homeDir)) {
    if (await resetIntegrity(directory)) {
      repaired += 1
      log(`dsh-desktop: cleared Low integrity labels under ${directory}`)
    }
  }
  return repaired
}
