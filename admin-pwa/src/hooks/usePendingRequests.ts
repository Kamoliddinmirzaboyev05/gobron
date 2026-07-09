import { useEffect, useState } from 'react'
import { fetchRequests } from '../api/bookings'

const POLL_MS = 15_000

/**
 * Pending booking-request count, refreshed on an interval so a request a
 * player just made shows up without the owner reloading the app.
 *
 * ponytail: polling, not websockets. Web Push covers the app-closed case; this
 * only has to keep an open app fresh. Swap for a socket if 15s feels slow.
 */
export function usePendingRequestCount(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const requests = await fetchRequests()
        if (!cancelled) setCount(requests.length)
      } catch {
        // offline / token refresh in flight - keep the last known count
      }
    }

    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return count
}
