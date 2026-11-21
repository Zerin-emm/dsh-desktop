/**
 * The caption's stylesheet as text, injected at runtime.
 *
 * Next's client build does not mount an imported `.css` file: the Loader owns styles created inside a
 * client factory, so every Next stylesheet is a string appended to a `<style>` element. The same
 * string form keeps the caption's rules from being emitted into the bundle and never applied.
 */
export const TITLEBAR_STYLES = `
.dshDesktopTitlebar {
  position: fixed;
  z-index: 2147483647;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: var(--dsh-windows-titlebar-height, 36px);
  background: color-mix(in srgb, var(--dsw-alias-bg-base, #ffffff) 54%, transparent);
  color: var(--dsw-alias-label-primary, #202020);
  user-select: none;
  -webkit-app-region: drag;
  padding: 0 146px 0 8px;
  font: 13px/1.2 system-ui, sans-serif;
}

.dshDesktopTitlebarIdentity {
  position: absolute;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  transform: translateX(-50%);
  pointer-events: none;
}

.dshDesktopTitlebarProduct {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.dshDesktopTitlebarVersion {
  min-height: 22px;
  padding: 2px 5px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #606060);
  cursor: default;
  font: inherit;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: auto;
  -webkit-app-region: no-drag;
}

.dshDesktopTitlebarVersion:hover,
.dshDesktopTitlebarVersion:focus-visible,
.dshDesktopTitlebarVersion[aria-expanded='true'] {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
  color: var(--dsw-alias-label-primary, #202020);
}

.dshDesktopTitlebarVersion:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #536dfe);
}

.dshDesktopTitlebarActions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  -webkit-app-region: no-drag;
}

.dshDesktopTitlebarAction {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #606060);
  cursor: default;
  font: inherit;
  font-size: 12px;
  line-height: 1;
}

.dshDesktopTitlebarAction:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
  color: var(--dsw-alias-label-primary, #202020);
}

.dshDesktopTitlebarAction:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #536dfe);
  outline-offset: 1px;
}

.dshDesktopTitlebarAction:disabled {
  opacity: 0.45;
}

.dshDesktopTitlebarPopover {
  position: absolute;
  top: calc(var(--dsh-windows-titlebar-height, 36px) - 4px);
  left: 50%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-sizing: border-box;
  min-width: 200px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l1, #e3e3e3);
  border-radius: 8px;
  background: var(--dsw-alias-bg-base, #ffffff);
  box-shadow: 0 8px 24px #00000026;
  color: var(--dsw-alias-label-primary, #202020);
  transform: translateX(-50%);
  -webkit-app-region: no-drag;
}

.dshDesktopTitlebarPopoverLabel {
  color: var(--dsw-alias-label-secondary, #606060);
  font-size: 12px;
}

.dshDesktopTitlebarPopoverAction {
  padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l1, #e3e3e3);
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: default;
  font: inherit;
  font-size: 12px;
}

.dshDesktopTitlebarPopoverAction:hover {
  background: var(--dsw-alias-interactive-bg-hover, #0000000f);
}
`
