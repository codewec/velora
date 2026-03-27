export function browserLocale() {
  if (typeof window !== 'undefined' && window.navigator.language) {
    return window.navigator.language
  }

  return undefined
}

export function formatBrowserDateTime(value: number | string | Date) {
  return new Date(value).toLocaleString(browserLocale())
}

export function formatBrowserTime(value: number | string | Date) {
  return new Date(value).toLocaleTimeString(browserLocale())
}
