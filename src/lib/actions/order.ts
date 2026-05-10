"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { sendPushToAdmins } from "@/lib/push"

export async function createOrder(input: {
  orderNumber?: string
  type: string
  customerId?: string
  supplierId?: string
  requestedDate?: string
  notes?: string
  sourceFile?: string
  lines: { productId: string; quantityOrdered: number; lotNumber?: string; notes?: string }[]
}) {
  if (!input.type) return { error: "Tipo ordine obbligatorio" }
  if (input.lines.length === 0) return { error: "Almeno una riga prodotto" }

  const order = await db.order.create({
    data: {
      orderNumber: input.orderNumber || null,
      type: input.type,
      customerId: input.customerId || null,
      supplierId: input.supplierId || null,
      requestedDate: input.requestedDate ? new Date(input.requestedDate) : null,
      notes: input.notes || null,
      sourceFile: input.sourceFile || null,
      lines: {
        create: input.lines.map((l) => ({
          productId: l.productId,
          quantityOrdered: l.quantityOrdered,
          lotNumber: l.lotNumber || null,
          notes: l.notes || null,
        })),
      },
    },
  })

  revalidatePath("/ordini")
  return { id: order.id }
}

export async function updateOrderStatus(id: string, status: string) {
  await db.order.update({ where: { id }, data: { status } })
  revalidatePath("/ordini")
  revalidatePath(`/ordini/${id}`)
  revalidatePath("/magazzino")
}

export async function markLinePrepared(lineId: string, isPrepared: boolean) {
  await db.orderLine.update({
    where: { id: lineId },
    data: { isPrepared, quantityPrepared: isPrepared ? undefined : 0 },
  })
  // check if all lines of the order are prepared
  const line = await db.orderLine.findUnique({
    where: { id: lineId },
    include: { order: { include: { lines: true } } },
  })
  if (line && isPrepared) {
    const allDone = line.order.lines.every((l) => l.id === lineId || l.isPrepared)
    if (allDone) {
      await db.order.update({
        where: { id: line.orderId },
        data: { status: "READY", preparedAt: new Date() },
      })
      const orderNum = line.order.orderNumber ?? `#${line.orderId.slice(-6).toUpperCase()}`
      sendPushToAdmins({
        title: "Ordine pronto ✓",
        body: `L'ordine ${orderNum} è completamente preparato`,
        url: `/ordini/${line.orderId}`,
        tag: `order-ready-${line.orderId}`,
      }).catch(() => {}) // fire-and-forget, non blocca il flusso
    } else if (line.order.status === "PENDING") {
      await db.order.update({
        where: { id: line.orderId },
        data: { status: "IN_PREPARATION" },
      })
    }
  }
  revalidatePath(`/magazzino/${line?.orderId}`)
  revalidatePath("/magazzino")
}

export async function deleteOrder(id: string) {
  await db.order.delete({ where: { id } })
  revalidatePath("/ordini")
}

export async function updateOrderNotes(id: string, warehouseNotes: string) {
  await db.order.update({ where: { id }, data: { warehouseNotes } })
  revalidatePath(`/ordini/${id}`)
  revalidatePath(`/magazzino/${id}`)
}
