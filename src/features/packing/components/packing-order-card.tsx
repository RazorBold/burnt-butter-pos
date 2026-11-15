"use client"

import {
  Gift,
  LoaderCircle,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Package,
  PackageCheck,
  StickyNote,
  Truck,
  Undo2,
} from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import {
  ChannelBadge,
  KindBadge,
  OrderStatusBadge,
  UrgentBadge,
} from "@/components/app/order-badges"
import { isUrgent } from "@/features/orders/status"
import { Button } from "@/components/ui/button"
import { SHIPPING_METHOD_LABEL } from "@/features/orders/constants"
import { packOrder, unpackOrder } from "@/features/packing/actions"
import type { PackagingUse } from "@/features/packing/needs"
import type { PackingOrder, PackingPackaging } from "@/features/packing/queries"
import { cn } from "@/lib/utils"

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

/** "2 Box Large, 1 Paper Bag". */
export function usesText(uses: PackagingUse[], packagings: PackingPackaging[]): string {
  const name = new Map(packagings.map((item) => [item.id, item.name]))
  return uses.map((use) => `${use.qty} ${name.get(use.packagingId) ?? "Packaging"}`).join(", ")
}

/** Kartu pesanan di papan Packaging: isi menu, kebutuhan/pemakaian packaging, dan aksinya. */
export function PackingOrderCard({
  order,
  packagings,
  canEdit,
}: {
  order: PackingOrder
  packagings: PackingPackaging[]
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const waiting = order.status === "siap_packing"
  const packingType = order.type === "normal" ? "normal" : "hampers"
  const hasCard = Boolean(order.cardTo || order.cardWishes || order.cardFrom)

  function pack() {
    startTransition(async () => {
      const result = await packOrder(order.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  function unpack() {
    startTransition(async () => {
      const result = await unpackOrder(order.id)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <article
      aria-labelledby={`pack-${order.id}`}
      className={cn(
        "rounded-xl border bg-white p-4",
        isUrgent(order) ? "border-[#d93a2b] shadow-[inset_4px_0_0_#d93a2b]" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 id={`pack-${order.id}`} className="font-semibold text-text-strong tabular-nums">
            {order.orderNo}
          </h4>
          <p className="text-[13px] text-text-body">
            {order.customerName}
            {order.senderName && ` (dari ${order.senderName})`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {isUrgent(order) && <UrgentBadge note={order.urgentNote} />}
          {hasCard && (
            <span
              data-testid="packing-card-badge"
              className="inline-flex items-center gap-1 rounded-md bg-hadiah px-2 py-0.5 text-xs font-semibold text-hadiah-fg"
            >
              <Mail className="size-3.5" aria-hidden />
              Ada kartu ucapan
            </span>
          )}
          <ChannelBadge channel={order.channel} />
          <KindBadge kind={order.kind} />
          {/* Tipe pesanan selalu tampil (ikon + teks), juga sebelum di-packing. */}
          <span
            data-testid="packing-type"
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
              order.type === "normal" ? "bg-personal text-personal-fg" : "bg-hadiah text-hadiah-fg",
            )}
          >
            {order.type === "normal" ? (
              <Package className="size-3.5" aria-hidden />
            ) : (
              <Gift className="size-3.5" aria-hidden />
            )}
            {order.type === "normal"
              ? "Normal"
              : order.type === "normal_hampers"
                ? "Normal & Hampers"
                : "Hampers"}
          </span>
          {!waiting && <OrderStatusBadge status={order.status} />}
        </div>
      </div>

      <dl className="mt-3 space-y-1 text-[13px] text-text-strong">
        <div className="flex items-start gap-2">
          <dt className="sr-only">Pengiriman</dt>
          <Truck className="mt-0.5 size-3.5 shrink-0 text-text-body" aria-hidden />
          <dd>{order.shippingName ?? SHIPPING_METHOD_LABEL[order.shippingMethod]}</dd>
        </div>
        {order.phone && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">No. telp</dt>
            <Phone className="mt-0.5 size-3.5 shrink-0 text-text-body" aria-hidden />
            <dd className="tabular-nums">{order.phone}</dd>
          </div>
        )}
        {order.address && order.shippingMethod !== "pick_up" && (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Alamat</dt>
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-text-body" aria-hidden />
            <dd className="min-w-0 break-words whitespace-pre-line">{order.address}</dd>
          </div>
        )}
      </dl>

      {order.items.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
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
      )}

      {hasCard && (
        <section
          aria-label={`Kartu ucapan ${order.orderNo}`}
          data-testid="packing-card"
          className="mt-3 rounded-lg border-2 border-dashed border-hadiah-fg/50 bg-hadiah px-3 py-2.5 text-hadiah-fg"
        >
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide uppercase">
            <Mail className="size-4 shrink-0" aria-hidden />
            Tulis kartu ucapan
          </p>
          <div className="mt-1.5 space-y-1 text-sm break-words whitespace-pre-line text-text-strong">
            {order.cardTo && (
              <p>
                <span className="font-semibold text-hadiah-fg">To:</span> {order.cardTo}
              </p>
            )}
            {order.cardWishes && <p>{order.cardWishes}</p>}
            {order.cardFrom && (
              <p>
                <span className="font-semibold text-hadiah-fg">From:</span> {order.cardFrom}
              </p>
            )}
          </div>
        </section>
      )}

      {!waiting && (
        <div className="mt-3 rounded-lg bg-nav-active/70 px-3 py-2.5 text-[13px]">
          <p className="font-medium text-text-strong">
            Packing {order.packagingType ? PACKAGING_TYPE_LABEL[order.packagingType] : "-"}
          </p>
          {order.used.length > 0 && (
            <p className="mt-0.5 text-text-body">{usesText(order.used, packagings)}</p>
          )}
        </div>
      )}

      {order.request && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-status-diproses/60 px-2.5 py-2 text-[13px] text-status-diproses-fg">
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

      {canEdit && (waiting || order.status === "siap_kirim") && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {waiting ? (
            <>
              <Button
                size="sm"
                onClick={pack}
                disabled={pending}
                className="h-9 rounded-lg px-3.5"
                aria-label={`Selesai packing: ${order.orderNo}`}
              >
                {pending ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : (
                  <PackageCheck aria-hidden />
                )}
                Selesai packing
              </Button>
              <span className="text-[12px] text-text-body">
                Packing {PACKAGING_TYPE_LABEL[packingType]} (sesuai tipe pesanan)
                {hasCard && (
                  <span className="font-semibold text-hadiah-fg"> · jangan lupa kartu ucapan</span>
                )}
              </span>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={unpack}
              disabled={pending}
              className="h-9 rounded-lg px-3 text-text-body"
              aria-label={`Batal packing: ${order.orderNo}`}
            >
              {pending ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <Undo2 aria-hidden />
              )}
              Batal packing
            </Button>
          )}
        </div>
      )}
    </article>
  )
}

const PACKAGING_TYPE_LABEL = { normal: "Normal", hampers: "Hampers" } as const
