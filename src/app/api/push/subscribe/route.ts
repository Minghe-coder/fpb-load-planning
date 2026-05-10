import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys } = body as {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Dati subscription mancanti" }, { status: 400 })
  }

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh: keys.p256dh, auth: keys.auth },
    create: {
      userId: session.user.id!,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })

  const { endpoint } = await req.json()
  await db.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id! },
  })

  return NextResponse.json({ ok: true })
}
