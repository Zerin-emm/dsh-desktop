/**
 * Reading the workspace list that the integrity repair walks.
 *
 * Only the parse is exercised here; the reset itself shells out to `icacls` and is left to the
 * launcher, so this stays a pure check of what the store can hand back.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readWorkspacePaths } from '../src/workspace-integrity.ts'

const roots: string[] = []
function homeWith(store: unknown): string {
  const root = mkdtempSync(join(tmpdir(), 'dsh-ws-integrity-'))
  roots.push(root)
  mkdirSync(join(root, 'storages'), { recursive: true })
  writeFileSync(join(root, 'storages', 'workspace.json'), typeof store === 'string' ? store : JSON.stringify(store))
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('readWorkspacePaths', () => {
  it('returns every distinct workspace path in the store', () => {
    const home = homeWith({
      unit: { name: 'workspace', version: 2 },
      global: { defaultWorkspaceId: 'a', workspaceIds: ['a', 'b'] },
      tables: { workspaces: { a: { path: 'D:\\one' }, b: { path: 'D:\\two' }, c: { path: 'D:\\one' } } },
    })
    expect(readWorkspacePaths(home).sort()).toEqual(['D:\\one', 'D:\\two'])
  })

  it('skips entries without a usable path', () => {
    const home = homeWith({ tables: { workspaces: { a: { path: 'D:\\ok' }, b: {}, c: { path: 5 } } } })
    expect(readWorkspacePaths(home)).toEqual(['D:\\ok'])
  })

  it('returns nothing when the store is missing or unreadable', () => {
    const empty = mkdtempSync(join(tmpdir(), 'dsh-ws-empty-'))
    roots.push(empty)
    expect(readWorkspacePaths(empty)).toEqual([])
    expect(readWorkspacePaths(homeWith('not json'))).toEqual([])
    expect(readWorkspacePaths(homeWith({ unit: { name: 'workspace' } }))).toEqual([])
  })
})
