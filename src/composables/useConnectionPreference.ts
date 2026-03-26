const ACTIVE_CONNECTION_KEY = 'velora.active-connection'

export function getSavedConnectionId() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage.getItem(ACTIVE_CONNECTION_KEY)
}

export function saveConnectionId(connectionId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(ACTIVE_CONNECTION_KEY, connectionId)
}
