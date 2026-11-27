/**
 * The local-plugin vendoring rewrite: a directory install copies into the profile first.
 *
 * These cases pin the observable contract — the returned argv and the copy on disk — because the
 * whole point is that the profile no longer depends on where the user's source directory lived.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { vendorLocalPlugin } from '../src/local-plugin-store.ts'

const roots: string[] = []
function workspace(): { profile: string; source: string } {
  const root = mkdtempSync(join(tmpdir(), 'dsh-local-plugin-'))
  roots.push(root)
  const profile = join(root, 'profile')
  const source = join(root, 'source-plugin')
  mkdirSync(profile, { recursive: true })
  mkdirSync(join(source, 'dist'), { recursive: true })
  mkdirSync(join(source, 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(source, 'package.json'), JSON.stringify({ name: '@scope/my-plugin', version: '1.0.0' }))
  writeFileSync(join(source, 'dist', 'index.js'), 'export {}\n')
  writeFileSync(join(source, 'node_modules', 'dep', 'index.js'), 'module.exports = 1\n')
  return { profile, source }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('vendorLocalPlugin', () => {
  it('copies a local directory into the profile and installs from the copy', () => {
    const { profile, source } = workspace()
    const result = vendorLocalPlugin(['add', source], profile)
    const copy = join(profile, 'vendor', 'scope+my-plugin')
    expect(result).toEqual(['add', `file:${copy}`])
    expect(existsSync(join(copy, 'package.json'))).toBe(true)
    expect(existsSync(join(copy, 'dist', 'index.js'))).toBe(true)
  })

  it('leaves out node_modules so pnpm resolves the copy\'s dependencies itself', () => {
    const { profile, source } = workspace()
    vendorLocalPlugin(['add', source], profile)
    expect(existsSync(join(profile, 'vendor', 'scope+my-plugin', 'node_modules'))).toBe(false)
  })

  it('accepts file: and link: specs that point at a directory', () => {
    const { profile, source } = workspace()
    expect(vendorLocalPlugin(['add', `file:${source}`], profile)[1]).toMatch(/^file:.*vendor/u)
    expect(vendorLocalPlugin(['add', `link:${source}`], profile)[1]).toMatch(/^file:.*vendor/u)
  })

  it('passes registry, git and tarball specs through untouched', () => {
    const { profile } = workspace()
    for (const spec of ['dsh-bill@0.23.1', 'git+https://github.com/x/y.git', 'https://example.com/p.tgz']) {
      expect(vendorLocalPlugin(['add', spec], profile)).toEqual(['add', spec])
    }
  })

  it('passes non-add subcommands through untouched', () => {
    const { profile, source } = workspace()
    expect(vendorLocalPlugin(['remove', 'dsh-bill'], profile)).toEqual(['remove', 'dsh-bill'])
    expect(vendorLocalPlugin(['list'], profile)).toEqual(['list'])
    expect(vendorLocalPlugin(['add', '--save-exact', source], profile)[1]).toBe('--save-exact')
  })

  it('does not copy a directory already inside the profile vendor root', () => {
    const { profile } = workspace()
    const inside = join(profile, 'vendor', 'already')
    mkdirSync(inside, { recursive: true })
    writeFileSync(join(inside, 'package.json'), JSON.stringify({ name: 'already' }))
    expect(vendorLocalPlugin(['add', inside], profile)).toEqual(['add', inside])
  })
})
