/**
 * The version label and its card, structured as the 2.0.18 `DesktopVersionControl`: the card opens
 * while the pointer or focus rests on the label, and the check button reports its own progress and
 * failure in place.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { TitlebarCopy } from './copy.ts'

/** Delay before the card opens, matching the 2.0.18 hover cards. */
const OPEN_DELAY_MS = 150

/** Grace period the card stays after the pointer leaves. */
const CLOSE_DELAY_MS = 200

/**
 * Draw the version label and its card.
 * @param props - the version to show, the check command and the active copy.
 */
export function VersionControl({
  version, copy, checkForUpdates,
}: {
  readonly version: string
  readonly copy: TitlebarCopy
  readonly checkForUpdates: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const visible = `v${version}`

  useEffect(() => () => { clearTimeout(timer.current) }, [])

  const openSoon = useCallback((): void => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setOpen(true) }, OPEN_DELAY_MS)
  }, [])

  const closeSoon = useCallback((): void => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setOpen(false) }, CLOSE_DELAY_MS)
  }, [])

  const runCheck = (): void => {
    if (checking) return
    setChecking(true)
    setFailed(false)
    void checkForUpdates()
      .catch(() => { setFailed(true) })
      .finally(() => { setChecking(false) })
  }

  return (
    <div
      className="dshDesktopCaptionHoverAnchor"
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        className="dshDesktopFrameVersion"
        aria-label={`${copy.currentVersion} ${visible}`}
        aria-expanded={open}
        onFocus={openSoon}
        onBlur={closeSoon}
      >
        {visible}
      </button>
      {open && (
        <div className="dshDesktopVersionPopover" role="dialog" aria-label={copy.currentVersion}>
          <div className="dshDesktopVersionPopoverHeader">
            <span>{copy.currentVersion}</span>
            <strong>{visible}</strong>
          </div>
          <button
            type="button"
            className="dshDesktopVersionCheckButton"
            disabled={checking}
            onClick={runCheck}
          >
            <RefreshCw aria-hidden="true" />
            <span>{checking ? copy.checking : copy.checkForUpdates}</span>
          </button>
          {failed && <span className="dshDesktopVersionCheckError" role="alert">{copy.checkFailed}</span>}
        </div>
      )}
    </div>
  )
}
