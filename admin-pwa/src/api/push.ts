import api from './client'

/** VAPID keys travel as base64url; PushManager wants raw bytes. */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(padded)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes.buffer
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/**
 * Ask for notification permission (if not already decided) and register this
 * device with the backend. Safe to call on every login: subscribing twice with
 * the same endpoint is an upsert server-side.
 *
 * Returns false when push is unsupported or the user denied permission — the
 * app still works, it just falls back to polling.
 */
export async function enablePush(): Promise<boolean> {
  if (!pushSupported()) return false

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.ready
  const { data } = await api.get<{ key: string }>('/push/vapid-public-key')
  if (!data.key || data.key === 'change-me-in-production') return false

  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key),
    }))

  await api.post('/push/subscribe', subscription.toJSON())
  return true
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await api.post('/push/unsubscribe', { endpoint: subscription.endpoint })
  await subscription.unsubscribe()
}
