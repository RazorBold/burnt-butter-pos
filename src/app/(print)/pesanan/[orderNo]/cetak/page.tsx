import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import type { ReactNode } from "react"
import { Suspense } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import { PrintToolbar } from "@/features/orders/components/print-toolbar"
import { ORDER_CHANNEL_LABEL, ORDER_KIND_LABEL } from "@/features/orders/constants"
import { ORDER_STATUS_LABEL, ORDER_TYPE_LABEL } from "@/features/orders/filters"
import { getOrderDetail } from "@/features/orders/queries"
import { getStoreSettings } from "@/features/settings/queries"
import { shippingName } from "@/features/shipping-options/options"
import { SLOT_LABEL } from "@/features/shipments/logic"
import { requirePageAccess } from "@/lib/auth"
import {
  formatHariTanggal,
  formatRupiah,
  formatWaktuDibuat,
  toJakartaDateString,
} from "@/lib/format"
import { formatPhone } from "@/lib/phone"

export async function generateMetadata({
  params,
}: PageProps<"/pesanan/[orderNo]/cetak">): Promise<Metadata> {
  const { orderNo } = await params
  // Judul tab = nama file bawaan saat "Simpan sebagai PDF".
  return { title: { absolute: `Pesanan ${decodeURIComponent(orderNo)}` } }
}

const SIZE_LABEL = { large: "Large", regular: "Regular", single: null } as const

/**
 * Cetak / PDF Detail Pesanan (permintaan pemilik toko, 14 Nov 2026): A4 lengkap dengan harga.
 * Di luar layout aplikasi (tanpa sidebar), dialog print langsung terbuka.
 */
export default function PrintOrderPage({ params }: PageProps<"/pesanan/[orderNo]/cetak">) {
  return (
    <div className="min-h-full bg-nav-active pb-10 print:bg-white print:pb-0">
      <Suspense fallback={<PrintSkeleton />}>
        <PrintOrder params={params} />
      </Suspense>
    </div>
  )
}

async function PrintOrder({ params }: Pick<PageProps<"/pesanan/[orderNo]/cetak">, "params">) {
  const user = await requirePageAccess("/pesanan")
  const { orderNo } = await params
  const [order, store] = await Promise.all([
    getOrderDetail(decodeURIComponent(orderNo)),
    getStoreSettings(),
  ])
  if (!order) notFound()

  const itemsTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0)
  const card = [
    order.cardTo && `To: ${order.cardTo}`,
    order.cardWishes,
    order.cardFrom && `From: ${order.cardFrom}`,
  ].filter(Boolean)
  const { shipment } = order
  const method = shippingName(shipment.method, shipment.optionName)
  const paidDiff = order.payment ? order.payment.amount - order.total : 0

  return (
    <>
      <PrintToolbar orderNo={order.orderNo} />
      <article
        aria-label={`Cetak pesanan ${order.orderNo}`}
        className="mx-auto w-full max-w-[210mm] bg-white px-5 py-6 text-[13px] leading-relaxed text-text-strong shadow-[0_8px_30px_rgb(76_28_4_/_0.12)] sm:px-[14mm] sm:py-[12mm] print:max-w-none print:p-0 print:shadow-none"
      >
        {/* Kepala: toko dan nomor pesanan. */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-brand-ink pb-4 sm:gap-6">
          <div>
            <Image
              src="/images/brand/logo-burnt-butter.png"
              alt={store.storeName}
              width={170}
              height={40}
              priority
              className="h-9 w-auto"
            />
            <p className="mt-2 text-[12px] text-text-body">
              {[store.whatsapp && `WA ${formatPhone(store.whatsapp)}`, store.pickupAddress]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-text-body uppercase">
              Detail Pesanan
            </p>
            <h1 className="text-[22px] leading-tight font-bold text-brand-ink tabular-nums">
              {order.orderNo}
            </h1>
            <p className="text-[12px] text-text-body">
              Dibuat {formatWaktuDibuat(order.createdAt)}
              {order.createdByName && ` oleh ${order.createdByName}`}
            </p>
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-md bg-card px-4 py-3 sm:grid-cols-4 print:grid-cols-4">
          <Fact label="Status">{ORDER_STATUS_LABEL[order.status]}</Fact>
          <Fact label="Jenis">{ORDER_KIND_LABEL[order.kind]}</Fact>
          <Fact label="Tipe">{ORDER_TYPE_LABEL[order.type]}</Fact>
          <Fact label="Sumber">
            {ORDER_CHANNEL_LABEL[order.channel]}
            {order.marketplaceOrderNo && ` · ${order.marketplaceOrderNo}`}
          </Fact>
        </dl>

        <div className="mt-5 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <Block title="Penerima">
            <Line label="Nama">{order.customer.name}</Line>
            <Line label="No. Telp">{formatPhone(order.customer.phone) || "-"}</Line>
            {shipment.method !== "pick_up" && <Line label="Alamat">{shipment.address || "-"}</Line>}
            {order.senderName && <Line label="Pengirim">{order.senderName}</Line>}
          </Block>
          <Block title="Pengiriman">
            <Line label="Tanggal kirim">{formatHariTanggal(order.deliveryDate)}</Line>
            <Line label="Metode">{method}</Line>
            {shipment.courierName && <Line label="Kurir">{shipment.courierName}</Line>}
            {shipment.slot && <Line label="Slot">{SLOT_LABEL[shipment.slot]}</Line>}
          </Block>
        </div>

        {card.length > 0 && (
          <section
            aria-label="Kartu ucapan"
            className="mt-5 rounded-md border-2 border-dashed border-hadiah-fg/60 px-4 py-3"
          >
            <h2 className="text-[11px] font-bold tracking-[0.12em] text-hadiah-fg uppercase">
              Kartu ucapan
            </h2>
            <p className="mt-1 break-words whitespace-pre-line">{card.join("\n")}</p>
          </section>
        )}

        {/* Menu dan harga. */}
        <table className="mt-6 w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-text-strong text-[11px] tracking-[0.08em] text-text-body uppercase">
              <th className="py-2 pr-3 font-semibold">Menu</th>
              <th className="py-2 pr-3 text-right font-semibold">Harga</th>
              <th className="py-2 pr-3 text-right font-semibold">Jumlah</th>
              <th className="py-2 text-right font-semibold">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => {
              const size = SIZE_LABEL[item.size]
              return (
                <tr key={item.id} className="break-inside-avoid border-b border-border align-top">
                  <td className="py-2 pr-3">
                    {item.menuName}
                    {size && ` (${size})`}
                    {item.note && (
                      <span className="block text-[12px] text-text-body">Catatan: {item.note}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatRupiah(item.unitPrice)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{item.qty}</td>
                  <td className="py-2 text-right tabular-nums">{formatRupiah(item.subtotal)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            {itemsTotal !== order.total && (
              <tr>
                <td colSpan={3} className="pt-3 pr-3 text-right text-text-body">
                  Subtotal menu
                </td>
                <td className="pt-3 text-right tabular-nums">{formatRupiah(itemsTotal)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="pt-3 pr-3 text-right font-semibold">
                Total Pembayaran
              </td>
              <td className="pt-3 text-right text-[16px] font-bold text-brand-ink tabular-nums">
                {formatRupiah(order.total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 grid break-inside-avoid gap-6 sm:grid-cols-2 print:grid-cols-2">
          <Block title="Pembayaran">
            <Line label="Status">{order.payment ? "Lunas" : "Belum bayar"}</Line>
            {order.payment && (
              <>
                <Line label="Metode">{order.payment.methodName}</Line>
                {order.payment.paidAt && (
                  <Line label="Tanggal">{formatWaktuDibuat(order.payment.paidAt)}</Line>
                )}
                <Line label="Dibayar">{formatRupiah(order.payment.amount)}</Line>
                {paidDiff !== 0 && (
                  <Line label={paidDiff < 0 ? "Kurang bayar" : "Lebih bayar"}>
                    {formatRupiah(Math.abs(paidDiff))}
                  </Line>
                )}
                {order.payment.note && <Line label="Keterangan">{order.payment.note}</Line>}
              </>
            )}
          </Block>
          <Block title="Request & catatan">
            <Line label="Request">{order.request || "-"}</Line>
            <Line label="Catatan">{order.note || "-"}</Line>
          </Block>
        </div>

        <footer className="mt-8 border-t border-border pt-3 text-[11px] text-text-body">
          Dicetak {formatHariTanggal(toJakartaDateString(new Date()))} oleh {user.name} ·{" "}
          {store.storeName}
        </footer>
      </article>
    </>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-text-body">{label}</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="border-b border-border pb-1 text-[11px] font-bold tracking-[0.12em] text-brand-ink uppercase">
        {title}
      </h2>
      <dl className="mt-2 space-y-1">{children}</dl>
    </section>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-2">
      <dt className="text-text-body">{label}</dt>
      <dd className="break-words whitespace-pre-line">{children}</dd>
    </div>
  )
}

function PrintSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-[210mm] px-4 py-16">
      <Skeleton className="h-[297mm] w-full rounded-none" />
    </div>
  )
}
