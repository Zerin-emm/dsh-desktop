/**
 * The caption stylesheet.
 *
 * Values follow the 2.0.18 frame caption: an opaque strip, the identity centred over a popover above
 * `0 12px 32px`, 26px icon buttons holding 14px/stroke-1.8 icons, and a 190px menu of 32px rows under
 * the restart and developer buttons.
 *
 * Type sizes are 2.0.18's plus one pixel: that build set its whole interface at 13px, while Next's
 * sidebar runs at 14px, so the caption's 13px product name read a notch smaller than the page it
 * sits above. The 14px name, 12px version chip and 13px rows keep 2.0.18's spacing ratios.
 */

export const TITLEBAR_CSS = `
/*
 * The page keeps no titlebar padding of its own: Next's Windows marker stays unset so the sidebar
 * keeps its 56px icon rail, and that marker is what AppFrame uses for padding-top. This rule
 * reserves the strip for the drawn caption instead. shell.overlay is a direct child of the frame
 * element, which is what makes the frame selectable without depending on a hashed class name.
 */
div:has(> [data-shell-overlay]) {
  padding-top: var(--dsh-windows-titlebar-height, 36px);
}

.dshDesktopFrameTitlebar {
  /*
   * 2.0.18 fills the strip with its own light layer, #f5f5f5, rather than the page background.
   * Next resolves --dsw-alias-bg-layer-1 to pure white in the light theme, which left the caption
   * brighter than the sidebar beside it. Mixing 4% black into bg-base lands on #f5f5f5 for the
   * default theme and still tracks a customised one.
   */
  --dsh-desktop-frame-fill: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 96%, #000);
  position: fixed;
  z-index: 2147483647;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: var(--dsh-windows-titlebar-height, 36px);
  /* Clears the native minimise, maximise and close buttons on the right. */
  padding: 0 146px 0 8px;
  background: var(--dsh-desktop-frame-fill);
  color: var(--dsw-alias-label-primary, #202020);
  font: 14px/1.2 var(--dsw-font-family, system-ui, sans-serif);
  user-select: none;
  -webkit-app-region: drag;
}

.dshDesktopFrameTitlebar[data-material]:not([data-material='off']) {
  --dsh-desktop-frame-fill: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 54%, transparent);
}

/*
 * The dark theme swaps bg-base for the page colour, which is darker than the layer 2.0.18 used
 * (its own #232323). Next's bg-layer-1 is #232324 there, so the strip follows that instead.
 */
body[data-ds-dark-theme] .dshDesktopFrameTitlebar {
  --dsh-desktop-frame-fill: var(--dsw-alias-bg-layer-1, #232323);
}

/*
 * The Windows caption menu the preload draws, and the sidebar's own opener, would both land in this
 * strip's 36px. The strip carries the terminal, restart and developer controls itself; the sidebar
 * collapses through its Ctrl+B shortcut.
 */
[data-windows-menu],
[data-sidebar-opener] { display: none !important; }

.dshDesktopFrameIdentity {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  transform: translateX(-50%);
  pointer-events: none;
}

.dshDesktopFrameProduct {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.dshDesktopCaptionHoverAnchor {
  position: relative;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

.dshDesktopFrameVersion {
  min-height: 22px;
  padding: 2px 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #606060);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  white-space: nowrap;
  transition: background-color 120ms ease, color 120ms ease;
  -webkit-app-region: no-drag;
}

.dshDesktopFrameVersion:hover,
.dshDesktopFrameVersion:focus-visible,
.dshDesktopFrameVersion[aria-expanded='true'] {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
  color: var(--dsw-alias-label-primary, #202020);
}

.dshDesktopFrameVersion:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #536dfe);
  outline-offset: 1px;
}

.dshDesktopFrameActions {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  /* Beside the left padding, as the 2.0.18 caption places them. */
  margin-right: auto;
  -webkit-app-region: no-drag;
}

.dshDesktopTitlebarIconButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 34%, transparent);
  color: var(--dsw-alias-label-secondary, #606060);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
  -webkit-app-region: no-drag;
}

.dshDesktopTitlebarIconButton:hover:not(:disabled),
.dshDesktopTitlebarIconButton[aria-expanded='true'] {
  border-color: var(--dsw-alias-border-l2, #d5d5d5);
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
  color: var(--dsw-alias-label-primary, #202020);
}

.dshDesktopTitlebarIconButton:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #536dfe);
  outline-offset: 1px;
}

.dshDesktopTitlebarIconButton:disabled {
  cursor: default;
  opacity: .45;
}

.dshDesktopTitlebarIconButton svg,
.dshDesktopCaptionMenuItem svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.8;
}

.dshDesktopCaptionMenuAnchor { position: relative; }

.dshDesktopCaptionMenu {
  position: absolute;
  z-index: 1;
  top: calc(100% + 5px);
  left: 0;
  display: grid;
  min-width: 190px;
  padding: 5px;
  border: 1px solid var(--dsw-alias-border-l1, #e3e3e3);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #f5f5f5);
  box-shadow: 0 12px 32px color-mix(in srgb, #000 28%, transparent);
  /* 2.0.18 opens its action menu in place, without an entrance animation. */
  -webkit-app-region: no-drag;
}

.dshDesktopCaptionMenuItem {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 32px;
  padding: 5px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #202020);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  text-align: start;
  transition: background-color 120ms ease;
}

.dshDesktopCaptionMenuItem:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
}

.dshDesktopCaptionMenuItem:disabled {
  cursor: default;
  opacity: .45;
}

.dshDesktopCaptionMenuItem span { flex: 1; }

.dshDesktopVersionPopover {
  position: absolute;
  z-index: 1;
  top: calc(100% + 3px);
  left: 50%;
  display: grid;
  gap: 9px;
  box-sizing: border-box;
  width: 210px;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l1, #e3e3e3);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1, #f5f5f5);
  box-shadow: 0 12px 32px color-mix(in srgb, #000 28%, transparent);
  color: var(--dsw-alias-label-primary, #202020);
  transform: translateX(-50%);
  /* 2.0.18 fades and scales its hover card in over 120ms instead of appearing at once. */
  animation: dshDesktopVersionIn 120ms ease;
  -webkit-app-region: no-drag;
}

/*
 * The centring offset belongs inside the keyframes: an animation replaces transform outright, so
 * leaving translateX out would slide the card in from the side before it snapped to centre. Any backtick here would end the template literal.
 */
@keyframes dshDesktopVersionIn {
  from { opacity: 0; transform: translateX(-50%) scale(.98); }
  to { opacity: 1; transform: translateX(-50%) scale(1); }
}

.dshDesktopVersionPopoverHeader {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  color: var(--dsw-alias-label-secondary, #606060);
  font-size: 12px;
}

.dshDesktopVersionPopoverHeader strong {
  color: var(--dsw-alias-label-primary, #202020);
  font-size: 13px;
  font-weight: 600;
}

.dshDesktopVersionCheckButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 30px;
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-l2, #d5d5d5);
  border-radius: 7px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 48%, transparent);
  color: var(--dsw-alias-label-primary, #202020);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  transition: background-color 120ms ease;
  -webkit-app-region: no-drag;
}

.dshDesktopVersionCheckButton:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
}

.dshDesktopVersionCheckButton:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #536dfe);
  outline-offset: 1px;
}

.dshDesktopVersionCheckButton:disabled {
  cursor: default;
  opacity: .55;
}

.dshDesktopVersionCheckButton svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.8;
}

.dshDesktopVersionCheckError {
  color: var(--dsw-alias-state-error-primary, #d93025);
  font-size: 12px;
  line-height: 1.4;
}
`

/**
 * Install the caption stylesheet.
 * @returns The disposer that removes it with the owning effect.
 */
export function installTitlebarStyles(): () => void {
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-desktop-titlebar'
  style.textContent = TITLEBAR_CSS
  document.head.append(style)
  return () => style.remove()
}
