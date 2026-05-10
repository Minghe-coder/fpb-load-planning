self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "FPB Load Planning", {
      body: data.body ?? "",
      icon: "/pwa-icon.png",
      badge: "/pwa-icon.png",
      tag: data.tag ?? "fpb-notification",
      data: { url: data.url ?? "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? "/"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
