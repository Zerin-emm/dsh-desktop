/**
 * The Desktop's own title bar, drawn into the shell overlay of the official frontend.
 *
 * Next replaced the 2.0.18 title bar with the native Windows caption, so nothing draws above the
 * web content any more. This restores that bar: the same 36px translucent strip, the product name
 * and version centred in it, and the launcher actions on the right.
 */
import { Titlebar } from './Titlebar.tsx'
import { TITLEBAR_STYLES } from './styles.ts'

/** Overlay order: the shell's own health notice shares 0, the safe-mode notice uses 100. */
const TITLEBAR_ORDER = 0

/** Marks the injected stylesheet so a repeated install replaces it instead of stacking. */
const STYLE_ATTRIBUTE = 'data-dsh-desktop-titlebar-style'

/**
 * Mount the title bar and its stylesheet while this client is applied.
 * @param ctx - Client context with the slot registry.
 */
export function installDesktopTitlebar(ctx: {
  slots: {
    inject(name: string, register: () => unknown): void
    register(options: Record<string, unknown>, component: unknown): unknown
  }
}): void {
  // An imported `.css` never reaches the document here: the Loader owns styles created inside a
  // client factory, which is why every Next stylesheet is a string it appends itself.
  document.querySelector(`[${STYLE_ATTRIBUTE}]`)?.remove()
  const style = document.createElement('style')
  style.setAttribute(STYLE_ATTRIBUTE, '')
  style.textContent = TITLEBAR_STYLES
  document.head.append(style)

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'desktop-titlebar',
    order: TITLEBAR_ORDER,
  }, Titlebar))
}
