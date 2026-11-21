/**
 * The drawn caption, matching the 2.0.18 frame: one terminal button, a restart menu of three
 * entries, a developer menu of one, and the version label opening its card on hover.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bug, RefreshCw, RotateCw, SquareTerminal, Wrench } from 'lucide-react'
import type {} from '../../desktop-contract.ts'
import { titlebarCopy, type TitlebarCopy } from './copy.ts'

/** Grace period the hover card waits before closing, as the 2.0.18 hover cards do. */
const CLOSE_DELAY_MS = 200

/** Delay before a hover card opens. */
const OPEN_DELAY_MS = 150

/** Track the document language so the caption relabels with the rest of the shell. */
function useDocumentLanguage(): string {
  const [language, setLanguage] = useState(() => document.documentElement.lang)
  useEffect(() => {
    const observer = new MutationObserver(() => { setLanguage(document.documentElement.lang) })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => { observer.disconnect() }
  }, [])
  return language
}

/** Close a menu when the pointer leaves it or Escape is pressed. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [open, close])
  return ref
}

/**
 * Draw the caption above the web content.
 *
 * Renders nothing outside the Desktop window: an ordinary browser has no bridge, and the official
 * frontend keeps its own chrome there.
 */
export function Titlebar() {
  const bridge = typeof window === 'undefined' ? undefined : window.desktopNext
  const copy: TitlebarCopy = titlebarCopy(useDocumentLanguage())
  const [version, setVersion] = useState('')
  const [restartOpen, setRestartOpen] = useState(false)
  const [developerOpen, setDeveloperOpen] = useState(false)
  const [versionOpen, setVersionOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkFailed, setCheckFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const closeVersion = useCallback(() => { setVersionOpen(false) }, [])
  const closeRestart = useCallback(() => { setRestartOpen(false) }, [])
  const versionRef = useDismiss(versionOpen, closeVersion)
  const restartRef = useDismiss(restartOpen, closeRestart)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (bridge === undefined) return
    let active = true
    void bridge.state().then((state) => { if (active) setVersion(state.version) }).catch(() => undefined)
    return () => { active = false }
  }, [bridge])

  useEffect(() => () => { clearTimeout(hoverTimer.current) }, [])

  const openVersion = useCallback((): void => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => { setVersionOpen(true) }, OPEN_DELAY_MS)
  }, [])

  const closeVersionSoon = useCallback((): void => {
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => { setVersionOpen(false) }, CLOSE_DELAY_MS)
  }, [])

  const run = useCallback((command: 'terminal' | 'reload' | 'restart' | 'restart-recovery' | 'devtools'): void => {
    if (bridge === undefined || pending) return
    setPending(true)
    setRestartOpen(false)
    setDeveloperOpen(false)
    void bridge.command({ type: command })
      .catch(() => undefined)
      .finally(() => { setPending(false) })
  }, [bridge, pending])

  const checkForUpdates = useCallback((): void => {
    if (bridge === undefined || checking) return
    setChecking(true)
    setCheckFailed(false)
    void bridge.command({ type: 'check-updates' })
      .catch(() => { setCheckFailed(true) })
      .finally(() => { setChecking(false) })
  }, [bridge, checking])

  if (bridge === undefined) return null

  return (
    <header className="dshDesktopFrameTitlebar" data-platform="win32" data-dsh-desktop-titlebar="">
      <div className="dshDesktopFrameActions">
        <button
          type="button"
          className="dshDesktopTitlebarIconButton"
          aria-label={copy.terminal}
          title={copy.terminal}
          disabled={pending}
          onClick={() => { run('terminal') }}
        >
          <SquareTerminal aria-hidden="true" />
        </button>
        <div className="dshDesktopCaptionMenuAnchor" ref={restartRef}>
          <button
            type="button"
            className="dshDesktopTitlebarIconButton"
            aria-label={copy.restartOptions}
            aria-expanded={restartOpen}
            aria-haspopup="menu"
            title={copy.restartOptions}
            disabled={pending}
            onClick={() => { setDeveloperOpen(false); setRestartOpen(open => !open) }}
          >
            <RotateCw aria-hidden="true" />
          </button>
          {restartOpen && (
            <div className="dshDesktopCaptionMenu" role="menu">
              <button type="button" role="menuitem" disabled={pending} onClick={() => { run('reload') }}>
                <RefreshCw aria-hidden="true" />
                <span>{copy.reloadRenderer}</span>
              </button>
              <button type="button" role="menuitem" disabled={pending} onClick={() => { run('restart') }}>
                <RotateCw aria-hidden="true" />
                <span>{copy.restartDesktop}</span>
              </button>
              <button type="button" role="menuitem" disabled={pending} onClick={() => { run('restart-recovery') }}>
                <RotateCw aria-hidden="true" />
                <span>{copy.restartToRecovery}</span>
              </button>
            </div>
          )}
        </div>
        <div className="dshDesktopCaptionMenuAnchor">
          <button
            type="button"
            className="dshDesktopTitlebarIconButton"
            aria-label={copy.developerOptions}
            aria-expanded={developerOpen}
            aria-haspopup="menu"
            title={copy.developerOptions}
            disabled={pending}
            onClick={() => { setRestartOpen(false); setDeveloperOpen(open => !open) }}
          >
            <Wrench aria-hidden="true" />
          </button>
          {developerOpen && (
            <div className="dshDesktopCaptionMenu" role="menu">
              <button type="button" role="menuitem" disabled={pending} onClick={() => { run('devtools') }}>
                <Bug aria-hidden="true" />
                <span>{copy.toggleDeveloperTools}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="dshDesktopFrameIdentity">
        <span className="dshDesktopFrameProduct">{copy.product}</span>
        <div
          className="dshDesktopCaptionHoverAnchor"
          ref={versionRef}
          onMouseEnter={openVersion}
          onMouseLeave={closeVersionSoon}
        >
          <button
            type="button"
            className="dshDesktopFrameVersion"
            aria-label={`${copy.currentVersion} v${version}`}
            aria-expanded={versionOpen}
            onFocus={openVersion}
            onBlur={closeVersionSoon}
          >
            v{version}
          </button>
          {versionOpen && (
            <div className="dshDesktopVersionPopover" role="dialog" aria-label={copy.currentVersion}>
              <div className="dshDesktopVersionPopoverHeader">
                <span>{copy.currentVersion}</span>
                <strong>v{version}</strong>
              </div>
              <button
                type="button"
                className="dshDesktopVersionCheckButton"
                disabled={checking}
                onClick={checkForUpdates}
              >
                <RefreshCw aria-hidden="true" />
                <span>{checking ? copy.checking : copy.checkForUpdates}</span>
              </button>
              {checkFailed && <span className="dshDesktopVersionCheckError" role="alert">{copy.checkFailed}</span>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
