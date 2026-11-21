/**
 * Launcher actions in the caption, structured as the 2.0.18 `DesktopNativeActions`: a terminal
 * button, a restart menu of three entries, and a developer menu of one, with arrow-key navigation,
 * focus capture on open, and dismissal on Escape or a click outside either anchor.
 */
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Bug, LifeBuoy, RefreshCw, RotateCw, SquareTerminal, Wrench } from 'lucide-react'
import type { TitlebarCopy } from './copy.ts'

/** Commands the bridge answers for these buttons. */
export type CaptionCommand = 'terminal' | 'reload' | 'restart' | 'restart-recovery' | 'devtools'

/** The restart menu's entries, in the order the 2.0.18 caption lists them. */
export function RestartMenuItems({
  busy, copy, onReload, onRestart, onRestartToRecovery,
}: {
  readonly busy: boolean
  readonly copy: TitlebarCopy
  readonly onReload: () => void
  readonly onRestart: () => void
  readonly onRestartToRecovery: () => void
}) {
  return (
    <>
      <button type="button" className="dshDesktopCaptionMenuItem" role="menuitem" disabled={busy} onClick={onReload}>
        <RefreshCw aria-hidden="true" /><span>{copy.reloadRenderer}</span>
      </button>
      <button type="button" className="dshDesktopCaptionMenuItem" role="menuitem" disabled={busy} onClick={onRestart}>
        <RotateCw aria-hidden="true" /><span>{copy.restartDesktop}</span>
      </button>
      <button type="button" className="dshDesktopCaptionMenuItem" role="menuitem" disabled={busy} onClick={onRestartToRecovery}>
        <LifeBuoy aria-hidden="true" /><span>{copy.restartToRecovery}</span>
      </button>
    </>
  )
}

/** The developer menu intentionally owns only the Developer Tools toggle. */
export function DeveloperMenuItems({
  busy, copy, onToggleDeveloperTools,
}: {
  readonly busy: boolean
  readonly copy: TitlebarCopy
  readonly onToggleDeveloperTools: () => void
}) {
  return (
    <button type="button" className="dshDesktopCaptionMenuItem" role="menuitem" disabled={busy} onClick={onToggleDeveloperTools}>
      <Bug aria-hidden="true" />
      <span>{copy.toggleDeveloperTools}</span>
    </button>
  )
}

/**
 * Draw the caption's buttons and their menus.
 * @param props - the command sink, the busy flag and the active copy.
 */
export function CaptionActions({
  run, busy, copy,
}: {
  readonly run: (command: CaptionCommand) => void
  readonly busy: boolean
  readonly copy: TitlebarCopy
}) {
  const [restartMenuOpen, setRestartMenuOpen] = useState(false)
  const [developerMenuOpen, setDeveloperMenuOpen] = useState(false)
  const restartMenuRef = useRef<HTMLDivElement>(null)
  const developerMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!developerMenuOpen && !restartMenuOpen) return
    const dismiss = (event: MouseEvent): void => {
      if (!developerMenuRef.current?.contains(event.target as Node)) setDeveloperMenuOpen(false)
      if (!restartMenuRef.current?.contains(event.target as Node)) setRestartMenuOpen(false)
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setDeveloperMenuOpen(false)
        setRestartMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [developerMenuOpen, restartMenuOpen])

  useEffect(() => {
    if (restartMenuOpen) restartMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [restartMenuOpen])

  const restartKeys = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const trigger = restartMenuRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')
    if (event.key === 'Escape' && restartMenuOpen) {
      event.preventDefault(); event.stopPropagation(); setRestartMenuOpen(false); trigger?.focus(); return
    }
    if (event.key === 'Tab') { setRestartMenuOpen(false); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault(); event.stopPropagation()
    if (!restartMenuOpen) { setRestartMenuOpen(true); return }
    const items = [...(restartMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length
    items[next]?.focus()
  }

  const restart = (command: 'reload' | 'restart' | 'restart-recovery'): void => {
    setRestartMenuOpen(false)
    run(command)
  }

  return (
    <div className="dshDesktopFrameActions">
      <button
        type="button"
        className="dshDesktopTitlebarIconButton"
        aria-label={copy.terminal}
        title={copy.terminal}
        disabled={busy}
        onClick={() => { run('terminal') }}
      >
        <SquareTerminal aria-hidden="true" />
      </button>
      <div className="dshDesktopCaptionMenuAnchor" ref={restartMenuRef} onKeyDown={restartKeys}>
        <button
          type="button"
          className="dshDesktopTitlebarIconButton"
          aria-label={copy.restartOptions}
          aria-expanded={restartMenuOpen}
          aria-haspopup="menu"
          title={copy.restartOptions}
          disabled={busy}
          onClick={() => {
            setDeveloperMenuOpen(false)
            setRestartMenuOpen(value => !value)
          }}
        >
          <RotateCw aria-hidden="true" />
        </button>
        {restartMenuOpen && (
          <div className="dshDesktopCaptionMenu" role="menu">
            <RestartMenuItems
              busy={busy}
              copy={copy}
              onReload={() => { restart('reload') }}
              onRestart={() => { restart('restart') }}
              onRestartToRecovery={() => { restart('restart-recovery') }}
            />
          </div>
        )}
      </div>
      <div className="dshDesktopCaptionMenuAnchor" ref={developerMenuRef}>
        <button
          type="button"
          className="dshDesktopTitlebarIconButton"
          aria-label={copy.developerOptions}
          aria-expanded={developerMenuOpen}
          aria-haspopup="menu"
          title={copy.developerOptions}
          disabled={busy}
          onClick={() => {
            setRestartMenuOpen(false)
            setDeveloperMenuOpen(value => !value)
          }}
        >
          <Wrench aria-hidden="true" />
        </button>
        {developerMenuOpen && (
          <div className="dshDesktopCaptionMenu" role="menu">
            <DeveloperMenuItems
              busy={busy}
              copy={copy}
              onToggleDeveloperTools={() => { setDeveloperMenuOpen(false); run('devtools') }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
