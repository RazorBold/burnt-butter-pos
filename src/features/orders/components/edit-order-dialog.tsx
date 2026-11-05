"use client"

import { CircleAlert, LoaderCircle, SquarePen } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateOrderDetails } from "@/features/orders/actions"
import { isMarketplace, ORDER_CHANNEL_LABEL } from "@/features/orders/constants"
import { Field, ShippingMethodPicker } from "@/features/orders/components/order-fields"
import {
  type DraftField,
  draftIssues,
  type OrderDraft,
  parseRupiahInput,
} from "@/features/orders/draft"
import type { OrderDetail } from "@/features/orders/queries"
import { formatHariTanggal, formatRupiah, toJakartaDateString } from "@/lib/format"
import { formatPhone } from "@/lib/phone"

type EditDraft = Omit<OrderDraft, "quantities">

const TYPE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "hadiah", label: "Hadiah" },
] as const

function draftOf(order: OrderDetail): EditDraft {
  return {
    channel: order.channel,
    marketplaceOrderNo: order.marketplaceOrderNo ?? "",
    expedition: order.shipment.expedition ?? "",
    trackingNo: order.shipment.trackingNo ?? "",
    marketplaceTotal: formatRupiah(order.total).replace("Rp ", ""),
    type: order.type,
    name: order.customer.name,
    phone: order.customer.phone ? formatPhone(order.customer.phone) : "",
    address: order.shipment.address ?? "",
    deliveryDate: order.deliveryDate,
    senderName: order.senderName ?? "",
    cardTo: order.cardTo ?? "",
    cardWishes: order.cardWishes ?? "",
    cardFrom: order.cardFrom ?? "",
    shippingMethod: order.shipment.method,
    request: order.request ?? "",
  }
}

/** Tombol "Edit" di panel detail: ubah data customer, pengiriman, request, dan data hadiah. */
export function EditOrderDialog({ order }: { order: OrderDetail }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<EditDraft>(() => draftOf(order))
  const [errors, setErrors] = useState<Partial<Record<DraftField, string>>>({})
  const [pending, startTransition] = useTransition()
  const marketplace = isMarketplace(order.channel)
  const isHadiah = !marketplace && draft.type === "hadiah"

  function update<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key as DraftField]
      return next
    })
  }

  function save() {
    // Cek di klien dulu (aturan yang sama dengan server) supaya tidak bolak-balik untuk hal jelas.
    const issues = draftIssues(
      { ...draft, quantities: { menu: 1 } },
      toJakartaDateString(new Date()),
    )
    if (draft.deliveryDate === order.deliveryDate) delete issues.deliveryDate
    // Kurir dan resi diubah lewat Isi Resi di Pengiriman.
    delete issues.expedition
    if (Object.keys(issues).length > 0) {
      setErrors(issues)
      return
    }
    startTransition(async () => {
      const result = await updateOrderDetails({ orderId: order.id, draft })
      if (result.ok) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
        if ("errors" in result && result.errors) setErrors(result.errors)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDraft(draftOf(order))
          setErrors({})
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 rounded-lg bg-white px-3">
          <SquarePen aria-hidden />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-2xl bg-card p-6 sm:max-w-[640px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            Ubah data {order.orderNo}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {marketplace
              ? "Menu, kurir, dan resi tidak diubah di sini."
              : "Menu dan jumlahnya tidak diubah di sini. No. HP baru menautkan pesanan ke customer dengan nomor itu."}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          {marketplace ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="edit-marketplaceOrderNo"
                label={`No. pesanan ${ORDER_CHANNEL_LABEL[order.channel]}`}
                flag={errors.marketplaceOrderNo}
              >
                <Input
                  value={draft.marketplaceOrderNo}
                  onChange={(event) => update("marketplaceOrderNo", event.target.value)}
                  maxLength={60}
                  className="tabular-nums"
                />
              </Field>
              <Field
                id="edit-marketplaceTotal"
                label="Total pembayaran"
                flag={errors.marketplaceTotal}
              >
                <Input
                  value={draft.marketplaceTotal}
                  onChange={(event) => {
                    const amount = parseRupiahInput(event.target.value)
                    update(
                      "marketplaceTotal",
                      amount === null ? "" : formatRupiah(amount).replace("Rp ", ""),
                    )
                  }}
                  inputMode="numeric"
                  className="tabular-nums"
                />
              </Field>
            </div>
          ) : (
            <SegmentedControl
              label="Tipe pesanan"
              options={TYPE_OPTIONS}
              value={draft.type}
              onChange={(value) => update("type", value)}
            />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="edit-name"
              label={marketplace ? "Nama pembeli" : isHadiah ? "Nama penerima" : "Nama"}
              flag={errors.name}
            >
              <Input
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                maxLength={80}
              />
            </Field>
            <Field id="edit-phone" label="No. telp" optional={marketplace} flag={errors.phone}>
              <Input
                value={draft.phone}
                onChange={(event) => update("phone", event.target.value)}
                type="tel"
                inputMode="tel"
                className="tabular-nums"
              />
            </Field>
          </div>
          <Field
            id="edit-address"
            label="Alamat lengkap"
            optional={marketplace || draft.shippingMethod === "pick_up"}
            flag={errors.address}
          >
            <Textarea
              value={draft.address}
              onChange={(event) => update("address", event.target.value)}
              rows={3}
              maxLength={300}
            />
          </Field>
          <Field
            id="edit-deliveryDate"
            label="Tanggal kirim"
            flag={errors.deliveryDate}
            hint={draft.deliveryDate ? formatHariTanggal(draft.deliveryDate) : undefined}
          >
            <Input
              type="date"
              value={draft.deliveryDate}
              onChange={(event) => update("deliveryDate", event.target.value)}
              className="w-full sm:w-[220px]"
            />
          </Field>
          {isHadiah && (
            <>
              <Field id="edit-senderName" label="Nama pengirim" flag={errors.senderName}>
                <Input
                  value={draft.senderName}
                  onChange={(event) => update("senderName", event.target.value)}
                  maxLength={80}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="edit-cardTo" label="To" optional>
                  <Input
                    value={draft.cardTo}
                    onChange={(event) => update("cardTo", event.target.value)}
                    maxLength={60}
                  />
                </Field>
                <Field id="edit-cardFrom" label="From" optional>
                  <Input
                    value={draft.cardFrom}
                    onChange={(event) => update("cardFrom", event.target.value)}
                    maxLength={60}
                  />
                </Field>
              </div>
              <Field id="edit-cardWishes" label="Wishes" optional>
                <Textarea
                  value={draft.cardWishes}
                  onChange={(event) => update("cardWishes", event.target.value)}
                  rows={2}
                  maxLength={300}
                />
              </Field>
            </>
          )}
          {!marketplace && (
            <ShippingMethodPicker
              compact
              value={draft.shippingMethod}
              onChange={(method) => update("shippingMethod", method)}
              flag={errors.shippingMethod}
            />
          )}
          <Field id="edit-request" label="Request" optional>
            <Textarea
              value={draft.request}
              onChange={(event) => update("request", event.target.value)}
              rows={2}
              maxLength={300}
            />
          </Field>

          {Object.keys(errors).length > 0 && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Periksa lagi isian yang ditandai.
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={save} disabled={pending} className="h-11 rounded-lg px-6">
              {pending && <LoaderCircle className="animate-spin" aria-hidden />}
              {pending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
