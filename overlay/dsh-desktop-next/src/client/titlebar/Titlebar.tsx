/** The drawn caption: product identity centred, launcher actions on the right. */
import { useCallback, useEffect, useState } from 'react'
import type {} from '../../desktop-contract.ts'

/** One launcher action, named by the command the bridge already answers. */
interface Action {
  readonly type: 'terminal' | 'reload' | 'devtools' | 'restart'
  readonly zh: string
  readonly en: string
  /** A single glyph keeps the bar icon-free without shipping an icon component. */
  readonly glyph: string
}

const ACTIONS: readonly Action[] = [
  { type: 'terminal', zh: '打开终端', en: 'Open terminal', glyph: '>_' },
  { type: 'reload', zh: '重载界面', en: 'Reload renderer', glyph: '⟳' },
  { type: 'devtools', zh: '开发者工具', en: 'Developer tools', glyph: '🛠' },
  { type: 'restart', zh: '重启桌面', en: 'Restart Desktop', glyph: '⏻' },
]

/**
 * The document language picks the copy; every label is rendered for assistive technology only.
 * @returns the active copy selector.
 */
function localized(zh: string, en: string): string {
  return document.documentElement.lang.toLowerCase().startsWith('zh') ? zh : en
}

/**
 * Draw the caption above the web content.
 *
 * Renders nothing outside the Desktop window: an ordinary browser has no bridge, and the official
 * frontend keeps its own chrome there.
 */
export function Titlebar() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktopNext
  const [version, setVersion] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<string>()

  useEffect(() => {
    if (bridge === undefined) return
    let active = true
    void bridge.state().then((state) => { if (active) setVersion(state.version) }).catch(() => undefined)
    return () => { active = false }
  }, [bridge])

  const run = useCallback((type: Action['type']): void => {
    if (bridge === undefined || busy !== undefined) return
    setBusy(type)
    setOpen(false)
    // A rejected command leaves the shell running; the action's own UI reports the failure.
    void bridge.command({ type } as Parameters<NonNullable<typeof bridge>['command']>[0])
      .catch(() => undefined)
      .finally(() => { setBusy(undefined) })
  }, [bridge, busy])

  const checkUpdates = useCallback((): void => {
    if (bridge === undefined) return
    setOpen(false)
    void bridge.command({ type: 'check-updates' }).catch(() => undefined)
  }, [bridge])

  if (bridge === undefined) return null

  return (
    <header className="dshDesktopTitlebar" data-dsh-desktop-titlebar="">
      <div className="dshDesktopTitlebarIdentity">
        <span className="dshDesktopTitlebarProduct">DSH Desktop</span>
        <button
          type="button"
          className="dshDesktopTitlebarVersion"
          aria-label={`${localized('当前版本', 'Current version')} v${version}`}
          aria-expanded={open}
          onClick={() => { setOpen(value => !value) }}
        >
          v{version}
        </button>
      </div>
      <div className="dshDesktopTitlebarActions">
        {ACTIONS.map(action => (
          <button
            key={action.type}
            type="button"
            className="dshDesktopTitlebarAction"
            aria-label={localized(action.zh, action.en)}
            title={localized(action.zh, action.en)}
            disabled={busy !== undefined}
            onClick={() => { run(action.type) }}
          >
            {action.glyph}
          </button>
        ))}
      </div>
      {open && (
        <div className="dshDesktopTitlebarPopover" role="dialog" aria-label={localized('版本', 'Version')}>
          <span className="dshDesktopTitlebarPopoverLabel">{localized('当前版本', 'Current version')}</span>
          <strong>v{version}</strong>
          <button type="button" className="dshDesktopTitlebarPopoverAction" onClick={checkUpdates}>
            {localized('检查更新', 'Check for updates')}
          </button>
        </div>
      )}
    </header>
  )
}
