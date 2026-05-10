"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

type State = "loading" | "unsupported" | "denied" | "off" | "on"

export function PushToggle() {
  const [state, setState] = useState<State>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported")
      return
    }
    if (Notification.permission === "denied") {
      setState("denied")
      return
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setState(sub ? "on" : "off")
    })
  }, [])

  async function register() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== "granted") { setState("denied"); return }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      })
      setState("on")
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function unregister() {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setState("off")
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  if (state === "loading") return null

  if (state === "unsupported")
    return <p className="text-xs text-slate-400">Notifiche push non supportate da questo browser.</p>

  if (state === "denied")
    return <p className="text-xs text-amber-600">Notifiche bloccate dal browser — abilitale nelle impostazioni del sito.</p>

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${state === "on" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
        {state === "on" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        {state === "on" ? "Attive" : "Disattive"}
      </div>
      <button
        onClick={state === "on" ? unregister : register}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
      >
        {busy
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : state === "on"
            ? <><BellOff className="h-3.5 w-3.5" /> Disattiva</>
            : <><Bell className="h-3.5 w-3.5" /> Attiva notifiche</>}
      </button>
    </div>
  )
}
