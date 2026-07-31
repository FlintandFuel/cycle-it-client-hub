import { useEffect, useState } from 'react'

// Browser-level connectivity, not a Firestore sync signal — good enough to
// reassure a fitter mid-session that a save queued locally rather than
// silently failing. True offline is caught reliably; a merely weak signal
// may still report "online" (the browser doesn't distinguish), but the
// Firestore write queues and retries either way.
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}
