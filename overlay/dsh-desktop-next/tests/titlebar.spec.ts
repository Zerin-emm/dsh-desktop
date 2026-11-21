/**
 * Pin the caption values this build chose on purpose.
 *
 * The caption is the only code this project adds, so nothing upstream covers it. These assertions are
 * not a rendering test: they read the stylesheet string and check the handful of numbers and
 * selectors that came from 2.0.18 or from Next's own frame, which a careless edit would quietly
 * change.
 */
import { describe, expect, it } from 'vitest'
import { TITLEBAR_CSS as CSS } from '../src/client/titlebar/styles.ts'

describe('caption stylesheet', () => {
  it('fills the strip 4% darker than bg-base, and follows bg-layer-1 in the dark theme', () => {
    // 2.0.18 filled its strip with its own #f5f5f5; Next's bg-layer-1 is pure white in the light
    // theme, so the mix is what reproduces that layer without hard-coding a colour.
    expect(CSS).toContain('--dsh-desktop-frame-fill: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 96%, #000)')
    expect(CSS).toContain('body[data-ds-dark-theme] .dshDesktopFrameTitlebar')
    expect(CSS).toContain('--dsh-desktop-frame-fill: var(--dsw-alias-bg-layer-1, #232323)')
  })

  it('keeps the 2.0.18 type ratios one pixel up, because Next runs its interface at 14px', () => {
    expect(CSS).toMatch(/font: 14px\/1\.2/u)
    expect(CSS).toMatch(/\.dshDesktopFrameProduct \{\s*font-size: 14px/u)
    expect(CSS).toMatch(/\.dshDesktopFrameVersion \{[^}]*font-size: 12px/u)
    expect(CSS).toMatch(/\.dshDesktopCaptionMenuItem \{[^}]*font-size: 13px/u)
  })

  it('reserves the strip through the frame element and leaves the Windows marker alone', () => {
    // AppFrame reads that marker for both padding-top and `collapsedWidth = 0`; setting it would
    // cost the sidebar its 56px rail, so the caption reserves the strip from its own stylesheet.
    expect(CSS).toContain('div:has(> [data-shell-overlay])')
    expect(CSS).toContain('padding-top: var(--dsh-windows-titlebar-height, 36px)')
    expect(CSS).not.toContain('data-windows-titlebar =')
  })

  it('hides the upstream menu bar and sidebar opener that would land inside the strip', () => {
    expect(CSS).toMatch(/\[data-windows-menu\],\s*\[data-sidebar-opener\] \{ display: none !important; \}/u)
  })

  it('opens the action menu in place, with the centring offset only inside the version keyframes', () => {
    // 2.0.18's menu has no entrance animation. Sharing one keyframes with the version card, whose
    // centring needs translateX(-50%), slid the menu in from the left before it snapped into place.
    const menu = CSS.slice(CSS.indexOf('.dshDesktopCaptionMenu {'), CSS.indexOf('.dshDesktopCaptionMenuItem'))
    expect(menu).not.toContain('animation')
    expect(CSS).toMatch(/@keyframes dshDesktopVersionIn \{\s*from \{ opacity: 0; transform: translateX\(-50%\) scale\(\.98\); \}/u)
  })
})
