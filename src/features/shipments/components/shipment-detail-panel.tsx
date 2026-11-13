import {
  CalendarDays,
  ClipboardList,
  MapPin,
  Phone,
  SquareArrowOutUpRight,
  StickyNote,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import {
  ShipmentStatusBadge,
  ShippingMethodLabel,
  TrackingLink,
} from "@/components/app/shipment-badges"
import { Button } from "@/components/ui/button"
import { DetailPanelFrame } from "@/features/orders/components/detail-panel-frame"
import { OrderItems } from "@/features/orders/components/order-detail-panel"
import { getOrderDetail } from "@/features/orders/queries"
import { getStoreSettings } from "@/features/settings/queries"
import { ShipmentActions } from "@/features/shipments/components/shipment-actions"
import { SLOT_LABEL, stateOf } from "@/features/shipments/logic"
import { listActiveCouriers } from "@/features/shipments/queries"
import { formatTanggal, formatWaktuDibuat } from "@/lib/format"
import { formatPhone } from "@/lib/phone"

const MAPS = "https://www.google.com/maps"

/** Link Google Maps: rute dari alamat toko (Pengaturan) ke customer, atau cari alamatnya saja. */
function mapsLinks(address: string, origin: string | null) {
  const destination = encodeURIComponent(address)
  return {
    route: origin
      ? `${MAPS}/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${destination}&travelmode=driving`
      : `${MAPS}/search/?api=1&query=${destination}`,
    embed: `${MAPS}?q=${destination}&output=embed`,
  }
}

function InfoRow({ icon: Icon, children }: { icon: typeof MapPin; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-text-strong" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </li>
  )
}

/** Panel Detail Pengiriman (04-pengiriman.png, F-44/F-45). Dibuka lewat ?pesanan=<no>. */
export async function ShipmentDetailPanel({
  orderNo,
  closeHref,
}: {
  orderNo: string
  closeHref: string
}) {
  const [order, store, couriers] = await Promise.all([
    getOrderDetail(orderNo),
    getStoreSettings(),
    listActiveCouriers(),
  ])

  if (!order) {
    return (
      <DetailPanelFrame closeHref={closeHref} title="Detail Pengiriman">
        <p className="px-5 py-6 text-sm text-text-body sm:px-6">
          Pesanan {orderNo} tidak ditemukan.
        </p>
      </DetailPanelFrame>
    )
  }

  const { shipment } = order
  const isPickUp = shipment.method === "pick_up"
  const destination = isPickUp ? store.pickupAddress : shipment.address
  const maps = destination ? mapsLinks(destination, isPickUp ? null : store.pickupAddress) : null
  const methodNote =
    shipment.method === "kurir_internal"
      ? shipment.slot
        ? `Slot ${SLOT_LABEL[shipment.slot]}${shipment.courierName ? `, kurir ${shipment.courierName}` : ", kurir belum dipilih"}`
        : "Pengiriman jam 09.00–17.00, tidak dapat request jam. Slot dan kurir belum diatur."
      : shipment.method === "instant"
        ? "Dipesankan ojek online (GoSend, GrabExpress)."
        : shipment.method === "ekspedisi"
          ? "Dikirim lewat ekspedisi marketplace. Cukup tandai setelah paket diserahkan."
          : "Customer mengambil sendiri di toko."
  const isExpedition = shipment.method === "ekspedisi"

  return (
    <DetailPanelFrame closeHref={closeHref} title="Detail Pengiriman">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-2 pb-4 sm:px-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-xl font-bold text-brand-ink tabular-nums">{order.orderNo}</p>
            <ShipmentStatusBadge state={stateOf(shipment.status)} />
          </div>
          <p className="mt-1 text-[13px] text-text-body">
            Dibuat {formatWaktuDibuat(order.createdAt)}
          </p>
        </div>
        <Button asChild size="sm" className="h-9 rounded-lg px-3.5">
          <Link href={`/pesanan/${order.orderNo}`}>
            <SquareArrowOutUpRight aria-hidden />
            Lihat Pesanan
          </Link>
        </Button>
      </div>

      <section aria-labelledby="shipment-info" className="border-t border-border px-5 py-4 sm:px-6">
        <h3 id="shipment-info" className="mb-3 font-semibold text-brand-ink">
          Informasi Pengiriman
        </h3>
        <ul className="space-y-2.5 text-sm text-text-strong">
          <InfoRow icon={UserRound}>
            {order.customer.name}
            {order.senderName && <span className="text-text-body"> (dari {order.senderName})</span>}
          </InfoRow>
          {order.customer.phone && (
            <InfoRow icon={Phone}>
              <a
                href={`tel:${order.customer.phone}`}
                className="tabular-nums underline-offset-2 hover:underline"
              >
                {formatPhone(order.customer.phone)}
              </a>
            </InfoRow>
          )}
          <InfoRow icon={MapPin}>
            <span className="whitespace-pre-line">
              {isPickUp
                ? "Diambil di toko"
                : (shipment.address ??
                  (isExpedition ? "Alamat ada di label marketplace" : "Alamat belum diisi"))}
            </span>
          </InfoRow>
          <InfoRow icon={CalendarDays}>{formatTanggal(order.deliveryDate)}</InfoRow>
          <li className="flex items-start gap-2.5">
            <ShippingMethodLabel method={shipment.method} name={shipment.optionName} />
          </li>
          <li className="-mt-1.5 pl-[26px] text-[13px] text-text-body">{methodNote}</li>
          {order.request && <InfoRow icon={ClipboardList}>Request: {order.request}</InfoRow>}
          {order.note && <InfoRow icon={StickyNote}>Catatan: {order.note}</InfoRow>}
          {shipment.trackingUrl && shipment.liveTracking && (
            <li className="pl-[26px]">
              <TrackingLink url={shipment.trackingUrl} orderNo={order.orderNo} />
            </li>
          )}
        </ul>

        {isExpedition ? null : maps ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <iframe
              title={`Peta ${isPickUp ? "lokasi toko" : "alamat pengiriman"}`}
              src={maps.embed}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-40 w-full border-0"
            />
            <a
              href={maps.route}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 border-t border-border bg-white py-2.5 text-sm font-semibold text-brand-ink hover:bg-nav-active"
            >
              <MapPin className="size-4 text-[#c0392b]" aria-hidden />
              {isPickUp ? "Lihat Lokasi Toko di Maps" : "Lihat Rute di Maps"}
            </a>
          </div>
        ) : (
          <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-2.5 text-[13px] text-text-body">
            {isPickUp
              ? "Alamat toko belum diisi. Admin bisa mengisinya di Master Data › Pengaturan."
              : "Alamat belum diisi, jadi rute belum bisa ditampilkan."}
          </p>
        )}
        {maps && !isPickUp && !isExpedition && !store.pickupAddress && (
          <p className="mt-2 text-[13px] text-text-body">
            Isi alamat toko di Master Data › Pengaturan supaya rute dihitung dari toko.
          </p>
        )}
      </section>

      <OrderItems order={order} />

      <div className="mt-auto px-5 pt-2 pb-5 sm:px-6">
        <ShipmentActions
          orderId={order.id}
          orderNo={order.orderNo}
          orderStatus={order.status}
          method={shipment.method}
          courierId={shipment.courierId}
          slot={shipment.slot}
          couriers={couriers}
        />
      </div>
    </DetailPanelFrame>
  )
}
