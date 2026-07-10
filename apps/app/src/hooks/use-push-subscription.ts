"use client"

import { useCallback, useEffect, useState } from "react"
import { subscribePush, unsubscribePush } from "@/actions/push.actions"
import { isPushSupported, urlBase64ToUint8Array } from "@/lib/push-client"

export type PushState =
  | "loading"
  | "unsupported"
  | "denied"
  | "available"
  | "subscribing"
  | "subscribed"

/** Dev builds unregister the SW, so serviceWorker.ready would hang forever. */
const SW_READY_TIMEOUT_MS = 3000

async function getReadyRegistration(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)),
  ])
}

/**
 * Push-subscription state for the CURRENT device. The permission request and
 * pushManager.subscribe both live behind subscribe() — always triggered by a
 * user gesture (the banner button), never automatically.
 */
export function usePushSubscription() {
  const [state, setState] = useState<PushState>("loading")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isPushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        return setStateSafe("unsupported")
      }
      if (Notification.permission === "denied") return setStateSafe("denied")
      const registration = await getReadyRegistration()
      if (!registration) return setStateSafe("unsupported")
      const subscription = await registration.pushManager.getSubscription()
      setStateSafe(subscription ? "subscribed" : "available")
    })()
    function setStateSafe(next: PushState) {
      if (!cancelled) setState(next)
    }
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState("subscribing")
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "available")
        return false
      }
      const registration = await getReadyRegistration()
      if (!registration) {
        setState("unsupported")
        return false
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ) as BufferSource,
      })
      const result = await subscribePush(subscription.toJSON())
      if (!result.ok) {
        // Keep browser and DB consistent — a subscription the server doesn't
        // know about would never receive anything.
        await subscription.unsubscribe().catch(() => {})
        setState("available")
        return false
      }
      setState("subscribed")
      return true
    } catch {
      setState("available")
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const registration = await getReadyRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe().catch(() => {})
        void unsubscribePush({ endpoint })
      }
      setState("available")
      return true
    } catch {
      return false
    }
  }, [])

  return { state, subscribe, unsubscribe }
}
