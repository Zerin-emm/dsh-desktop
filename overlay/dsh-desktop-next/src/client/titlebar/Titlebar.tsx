/**
 * The drawn caption, assembled as the 2.0.18 `DesktopFrameTitlebarView`: launcher actions beside the
 * left edge, product identity centred, version label and card on the identity.
 *
 * The 2.0.18 view also carries presentation modes and a remote-control entry; this build keeps
 * neither, so both are absent rather than disabled.
 */
import { useCallback, useEffect, useState } from 'react'
import type {} from '../../desktop-contract.ts'
import { titlebarCopy, type TitlebarCopy } from './copy.ts'
import { CaptionActions, type CaptionCommand } from './NativeActions.tsx'
import { VersionControl } from './VersionControl.tsx'

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
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (bridge === undefined) return
    let active = true
    void bridge.state().then((state) => { if (active) setVersion(state.version) }).catch(() => undefined)
    return () => { active = false }
  }, [bridge])

  const run = useCallback((command: CaptionCommand): void => {
    if (bridge === undefined || busy) return
    setBusy(true)
    // A rejected command leaves the shell running and reports itself through its own surface.
    void bridge.command({ type: command })
      .catch(() => undefined)
      .finally(() => { setBusy(false) })
  }, [bridge, busy])

  const checkForUpdates = useCallback(async (): Promise<void> => {
    if (bridge === undefined) return
    await bridge.command({ type: 'check-updates' })
  }, [bridge])

  if (bridge === undefined) return null

  return (
    <header className="dshDesktopFrameTitlebar" data-platform="win32" data-dsh-desktop-titlebar="">
      <CaptionActions run={run} busy={busy} copy={copy} />
      <div className="dshDesktopFrameIdentity">
        <span className="dshDesktopFrameProduct">{copy.product}</span>
        <VersionControl version={version} copy={copy} checkForUpdates={checkForUpdates} />
      </div>
    </header>
  )
}
