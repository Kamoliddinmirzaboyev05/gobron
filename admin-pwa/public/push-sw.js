// Imported into the generated service worker (vite-plugin-pwa
// workbox.importScripts). Keeps push handling out of the generated file so it
// survives regeneration.

self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Gobron', body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Gobron', {
      body: payload.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: { url: payload.url ?? '/home/notifications' },
      tag: 'gobron-booking-request',
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/home/notifications'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus an already-open tab and route it, rather than opening a duplicate.
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
