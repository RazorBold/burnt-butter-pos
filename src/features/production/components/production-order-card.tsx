"use client"

import {
  ChefHat,
  CircleCheck,
  Gift,
  LoaderCircle,
  MessageSquareText,
  StickyNote,
  Undo2,
} from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { OrderStatusBadge, UrgentBadge } from "@/components/app/order-badges"
import { isUrgent } from "@/features/orders/status"
import { Button } from "@/components/ui/button"
import { updateProductionStatus } from "@/features/orders/actions"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import type { OrderStatus } from "@/features/orders/filters"
import type { ProductionOrder } from "@/features/production/queries"
import { formatJam } from "@/lib/format"
import { cn } from "@/lib/utils"

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

/** Kartu pesanan di papan Produksi: isi menu, request, dan tombol tahap dapur. */
export function ProductionOrderCard({
  order,
  canEdit,
}: {
  order: ProductionOrder
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()

  function move(target: OrderStatus) {
    startTransition(async () => {
      const result = await updateProductionStatus(order.id, target)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  const forward =
    order.status === "baru"
      ? { target: "diproses" as const, label: "Mulai masak", icon: ChefHat }
      : order.status === "diproses"
        ? { target: "siap_packing" as const, label: "Selesai masak", icon: CircleCheck }
        : null
  const back =
    order.status === "diproses"
      ? { target: "baru" as const, label: "Belum mulai" }
      : order.status === "siap_packing"
        ? { target: "diproses" as const, label: "Masak lagi" }
        : null

  return (
    <article
      aria-labelledby={`prod-${order.id}`}
      className={cn(
        "rounded-xl border bg-white p-4",
        isUrgent(order) ? "border-[#d93a2b] shadow-[inset_4px_0_0_#d93a2b]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`prod-${order.id}`} className="font-semibold text-text-strong tabular-nums">
            {order.orderNo}
          </h4>
          <p className="text-[13px] text-text-body">
            {order.customerName}
            {order.senderName && ` (dari ${order.senderName})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {isUrgent(order) && <UrgentBadge note={order.urgentNote} />}
          {order.type !== "normal" && (
            <span className="inline-flex items-center gap-1 rounded-md bg-hadiah px-2 py-0.5 text-xs font-medium text-hadiah-fg">
              <Gift className="size-3.5" aria-hidden />
              {order.type === "normal_hampers" ? "Normal & Hampers" : "Hampers"}
            </span>
          )}
          {(order.status === "siap_packing" ||
            order.status === "siap_kirim" ||
            order.status === "dikirim" ||
            order.status === "selesai") && <OrderStatusBadge status={order.status} />}
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="w-8 shrink-0 text-right font-semibold text-brand-ink tabular-nums">
              {item.qty}×
            </span>
            <span className="min-w-0 text-text-strong">
              {item.menuName}
              {SIZE_LABEL[item.size] && (
                <span className="text-text-body"> ({SIZE_LABEL[item.size]})</span>
              )}
              {item.note && (
                <span className="mt-0.5 block text-[13px] font-medium break-words text-status-diproses-fg">
                  Catatan: {item.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {order.request && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-status-diproses/60 px-2.5 py-2 text-[13px] text-status-diproses-fg">
          <MessageSquareText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-words">{order.request}</span>
        </p>
      )}

      {order.note && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-status-diproses/60 px-2.5 py-2 text-[13px] text-status-diproses-fg">
          <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="break-words">Catatan: {order.note}</span>
        </p>
      )}

      <p className="mt-3 text-[12px] text-text-body">
        {SHIPPING_METHOD_LABEL[order.shippingMethod]}, masuk {formatJam(order.createdAt)}
      </p>

      {canEdit && (forward || back) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {forward && (
            <Button
              size="sm"
              onClick={() => move(forward.target)}
              disabled={pending}
              className="h-9 rounded-lg px-3.5"
              aria-label={`${forward.label}: ${order.orderNo}`}
            >
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <forward.icon aria-hidden />
              )}
              {forward.label}
            </Button>
          )}
          {back && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => move(back.target)}
              disabled={pending}
              className="h-9 rounded-lg px-3 text-text-body"
              aria-label={`${back.label}: ${order.orderNo}`}
            >
              <Undo2 aria-hidden />
              {back.label}
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
