/**
 * The Desktop's own caption, drawn into the shell overlay of the official frontend.
 *
 * Next replaced the 2.0.18 caption with the native Windows title bar, so nothing draws above the web
 * content any more. This restores it: the same 36px strip, the product name and version centred, and
 * the launcher actions beside the left edge.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { Titlebar } from './Titlebar.tsx'
import { installTitlebarStyles } from './styles.ts'

/** Overlay order: the shell's own health notice shares 0, the safe-mode notice uses 100. */
const TITLEBAR_ORDER = 0

/**
 * Mount the caption and its stylesheet while this client is applied.
 *
 * `ctx.slots.inject` is already an effect, and the stylesheet installer returns its own disposer, so
 * both registrations leave with the owning fiber without a cleanup written here.
 * @param ctx - Client context with the slot registry.
 */
export function installDesktopTitlebar(ctx: Context): void {
  ctx.effect(installTitlebarStyles, 'Desktop caption styles')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'desktop-titlebar',
    order: TITLEBAR_ORDER,
  }, Titlebar))
}
