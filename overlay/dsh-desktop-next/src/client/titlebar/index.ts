/**
 * The Desktop's own title bar, drawn into the shell overlay of the official frontend.
 *
 * Next replaced the 2.0.18 title bar with the native Windows caption, so nothing draws above the
 * web content any more. This restores that bar: the same 36px translucent strip, the product name
 * and version centred in it, and the launcher actions on the right.
 */
import { Titlebar } from './Titlebar.tsx'
import './titlebar.css'

/** Overlay order: the shell's own health notice shares 0, the safe-mode notice uses 100. */
const TITLEBAR_ORDER = 0

/**
 * Mount the title bar while this client is applied.
 * @param ctx - Client context with the slot registry.
 */
export function installDesktopTitlebar(ctx: {
  slots: {
    inject(name: string, register: () => unknown): void
    register(options: Record<string, unknown>, component: unknown): unknown
  }
}): void {
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'desktop-titlebar',
    order: TITLEBAR_ORDER,
  }, Titlebar))
}
