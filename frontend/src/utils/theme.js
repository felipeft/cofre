export const THEME_OPTIONS = ['system', 'light', 'dark']

export function resolveTheme(preference, mediaQuery) {
  if (preference === 'dark') return 'dark'
  if (preference === 'light') return 'light'
  return mediaQuery?.matches ? 'dark' : 'light'
}

export function applyResolvedTheme(preference, mediaQuery) {
  const resolved = resolveTheme(preference, mediaQuery)
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.documentElement.dataset.theme = preference
  document.documentElement.dataset.resolvedTheme = resolved
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0A0A0B' : '#F4F6F8')
  return resolved
}
