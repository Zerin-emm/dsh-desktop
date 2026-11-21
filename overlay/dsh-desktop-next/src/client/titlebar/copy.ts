/** Caption copy, keyed by the two languages the Desktop's own pages carry. */

/** One language's caption text. */
export interface TitlebarCopy {
  readonly product: string
  readonly terminal: string
  readonly restartOptions: string
  readonly reloadRenderer: string
  readonly restartDesktop: string
  readonly restartToRecovery: string
  readonly developerOptions: string
  readonly toggleDeveloperTools: string
  readonly currentVersion: string
  readonly checkForUpdates: string
  readonly checking: string
  readonly checkFailed: string
}

const ZH: TitlebarCopy = {
  product: 'DSH Desktop',
  terminal: '打开终端',
  restartOptions: '重启选项',
  reloadRenderer: '重新加载界面',
  restartDesktop: '重启',
  restartToRecovery: '重启到恢复模式',
  developerOptions: '开发者选项',
  toggleDeveloperTools: '开发者工具',
  currentVersion: '当前版本',
  checkForUpdates: '检查更新',
  checking: '正在检查…',
  checkFailed: '检查失败',
}

const EN: TitlebarCopy = {
  product: 'DSH Desktop',
  terminal: 'Open terminal',
  restartOptions: 'Restart options',
  reloadRenderer: 'Reload renderer',
  restartDesktop: 'Restart',
  restartToRecovery: 'Restart to recovery',
  developerOptions: 'Developer options',
  toggleDeveloperTools: 'Developer tools',
  currentVersion: 'Current version',
  checkForUpdates: 'Check for updates',
  checking: 'Checking…',
  checkFailed: 'Check failed',
}

/**
 * The copy for one document language.
 *
 * The Desktop settings section reads the language the same way, so the caption needs no locale
 * namespace of its own.
 * @param language - The document's `lang`.
 * @returns that language's caption text.
 */
export function titlebarCopy(language: string): TitlebarCopy {
  return language.toLowerCase().startsWith('zh') ? ZH : EN
}
