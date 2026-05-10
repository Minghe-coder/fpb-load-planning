import webpush from "web-push"
import { db } from "@/lib/db"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export async function sendPushToAdmins(payload: {
  title: string
  body: string
  url?: string
  tag?: string
}) {
  const subs = await db.pushSubscription.findMany({
    include: { user: { select: { role: true } } },
  })

  const adminSubs = subs.filter(
    (s) => s.user.role === "ADMIN" || s.user.role === "USER"
  )

  const results = await Promise.allSettled(
    adminSubs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err) => {
        // rimuove subscription scaduta (410 Gone)
        if (err.statusCode === 410) {
          await db.pushSubscription.delete({ where: { id: sub.id } })
        }
        throw err
      })
    )
  )

  return results
}
