"use client"

import {
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  MessageCircle,
  RotateCcw,
  ShoppingBag,
  WandSparkles,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ReactNode, useCallback, useEffect, useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createOrder } from "@/features/orders/actions"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type CatalogVariant, matchParsedItems, orderTotal } from "@/features/orders/catalog"
import {
  isMarketplace,
  ORDER_CHANNEL_LABEL,
  ORDER_CHANNELS,
  type OrderChannel,
  type StoredDraft,
  WA_DRAFT_EVENT,
  WA_DRAFT_KEY,
} from "@/features/orders/constants"
import { FlagNote, Field, ShippingMethodPicker } from "@/features/orders/components/order-fields"
import { OrderMenuPicker } from "@/features/orders/components/order-menu-picker"
import {
  type DraftField,
  draftFromParsed,
  draftIssues,
  EMPTY_DRAFT,
  type OrderDraft,
  parseRupiahInput,
} from "@/features/orders/draft"
import { formatHariTanggal, formatRupiah, toJakartaDateString } from "@/lib/format"
import { cn } from "@/lib/utils"
import { type OrderType, type ParsedItem, parseWaOrder } from "@/lib/wa-parser"

/** Lama popup "Pesanan sudah terinput" sebelum pindah ke daftar pesanan. */
const SAVED_REDIRECT_MS = 3000

const TYPE_OPTIONS = [
  { value: "personal", label: "Personal" },
  { value: "hadiah", label: "Hadiah" },
] as const satisfies readonly { value: OrderType; label: string }[]

const CHANNEL_OPTIONS = ORDER_CHANNELS.map((value) => ({
  value,
  label: ORDER_CHANNEL_LABEL[value],
}))

type ParseSummary = {
  filled: number
  checked: number
  items: number
  unmatched: ParsedItem[]
  /** Template Olshop tanpa marketplace yang jelas: sumber diambil dari pilihan sekarang. */
  guessedChannel?: OrderChannel
}

/** Field yang dicek saat Isi Otomatis: wajib, dan hasilnya ditandai bila tidak terbaca. */
function checkedFields(draft: OrderDraft): DraftField[] {
  if (isMarketplace(draft.channel)) return ["marketplaceOrderNo", "name", "deliveryDate"]
  const fields: DraftField[] = ["name", "phone", "address", "deliveryDate", "shippingMethod"]
  if (draft.type === "hadiah") fields.push("senderName")
  return fields
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = sessionStorage.getItem(WA_DRAFT_KEY)
    sessionStorage.removeItem(WA_DRAFT_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as Partial<StoredDraft>
    if (typeof stored.text !== "string") return null
    const channel = ORDER_CHANNELS.find((value) => value === stored.channel) ?? "whatsapp"
    return { text: stored.text, channel }
  } catch {
    return null
  }
}

/**
 * Sumber pesanan setelah Isi Otomatis. Template Olshop menyebut marketplace-nya sendiri; bila
 * belum jelas ("Tokopedia/Shopee"), dipakai marketplace yang sedang dipilih (atau Shopee).
 */
function channelAfterParse(
  parsed: { isMarketplace: boolean; marketplace: OrderChannel | null },
  current: OrderChannel,
): { channel: OrderChannel; guessed: boolean } {
  if (parsed.marketplace) return { channel: parsed.marketplace, guessed: false }
  if (!parsed.isMarketplace) return { channel: current, guessed: false }
  return { channel: isMarketplace(current) ? current : "shopee", guessed: true }
}

/**
 * Halaman Input Pesanan. Pesan di kiri, form hasil Isi Otomatis di kanan; pesan dari modal navbar
 * dibawa lewat sessionStorage (WA_DRAFT_KEY). WhatsApp memakai template Personal/Hadiah,
 * Shopee/Tokopedia (?sumber=) memakai template Olshop: marketplace, tanggal, penerima, invoice.
 */
export function NewOrderWorkspace({
  catalog,
  initialChannel,
}: {
  catalog: CatalogVariant[]
  initialChannel: OrderChannel
}) {
  const router = useRouter()
  const [today] = useState(() => toJakartaDateString(new Date()))
  const [waText, setWaText] = useState("")
  const [draft, setDraft] = useState<OrderDraft>({ ...EMPTY_DRAFT, channel: initialChannel })
  // Sumber dari URL bisa berubah saat halaman sudah terbuka (mis. dipilih dari modal navbar).
  const [urlChannel, setUrlChannel] = useState(initialChannel)
  if (initialChannel !== urlChannel) {
    setUrlChannel(initialChannel)
    setDraft((current) => ({ ...current, channel: initialChannel }))
  }
  // Isian yang tidak terbaca dari pesan WA; tanda hilang begitu kasir mengubahnya.
  const [flagged, setFlagged] = useState<Set<DraftField>>(new Set())
  const [summary, setSummary] = useState<ParseSummary | null>(null)

  const fillFrom = useCallback(
    (text: string, current: OrderChannel) => {
      const parsed = parseWaOrder(text, toJakartaDateString(new Date()))
      const { channel, guessed } = channelAfterParse(parsed, current)
      const { quantities, unmatched } = matchParsedItems(parsed.items, catalog)
      const next = { ...draftFromParsed(parsed, quantities), channel }
      const issues = draftIssues(next, toJakartaDateString(new Date()))
      const fields = checkedFields(next)
      const missing = new Set<DraftField>(fields.filter((field) => issues[field]))
      if (issues.items) missing.add("items")
      setDraft(next)
      setFlagged(missing)
      setSummary({
        filled: fields.filter((field) => !issues[field]).length,
        checked: fields.length,
        items: parsed.items.length - unmatched.length,
        unmatched,
        guessedChannel: guessed ? channel : undefined,
      })
      // URL ikut sumber hasil baca, supaya refresh dan tab Sumber tetap sesuai. Dibandingkan
      // dengan URL sekarang: pesan dari modal bisa membawa sumber lain dari tab yang terbuka.
      const openChannel = new URLSearchParams(window.location.search).get("sumber") ?? "whatsapp"
      if (channel !== openChannel) {
        router.replace(
          channel === "whatsapp" ? "/pesanan/baru" : `/pesanan/baru?sumber=${channel}`,
          { scroll: false },
        )
      }
    },
    [catalog, router],
  )

  // Pesan yang dibawa dari modal Input Pesanan (saat halaman dibuka, atau saat sudah terbuka).
  useEffect(() => {
    function takeStored() {
      const stored = readStoredDraft()
      if (!stored) return
      setWaText(stored.text)
      fillFrom(stored.text, stored.channel)
    }
    takeStored()
    window.addEventListener(WA_DRAFT_EVENT, takeStored)
    return () => window.removeEventListener(WA_DRAFT_EVENT, takeStored)
  }, [fillFrom])

  function update<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
    if (flagged.has(key as DraftField)) {
      setFlagged((current) => {
        const next = new Set(current)
        next.delete(key as DraftField)
        return next
      })
    }
  }

  function setQty(variantId: string, qty: number) {
    setDraft((current) => ({ ...current, quantities: { ...current.quantities, [variantId]: qty } }))
    if (flagged.has("items")) {
      setFlagged((current) => {
        const next = new Set(current)
        next.delete("items")
        return next
      })
    }
  }

  /** Pindah sumber: isian yang sama (nama, alamat, menu) tetap ada. */
  function chooseChannel(channel: OrderChannel) {
    setDraft((current) => ({ ...current, channel }))
    setFlagged(new Set())
    router.replace(channel === "whatsapp" ? "/pesanan/baru" : `/pesanan/baru?sumber=${channel}`, {
      scroll: false,
    })
  }

  function reset() {
    setWaText("")
    setDraft({ ...EMPTY_DRAFT, channel: draft.channel })
    setFlagged(new Set())
    setSummary(null)
  }

  const [saving, startSaving] = useTransition()
  const [saved, setSaved] = useState<{ orderNo: string; customerName: string; total: number }>()

  function save() {
    startSaving(async () => {
      const result = await createOrder({ draft, waText })
      if (result.ok) {
        toast.success(`Pesanan ${result.orderNo} tersimpan.`)
        setSaved(result)
        return
      }
      toast.error(result.message)
      // Isian yang ditolak server ditandai sama seperti hasil Isi Otomatis yang tidak terbaca.
      if (result.errors) setFlagged(new Set(Object.keys(result.errors) as DraftField[]))
    })
  }

  /** Setelah tersimpan, form dikosongkan supaya pesanan yang sama tidak tersimpan dua kali. */
  function closeSaved() {
    setSaved(undefined)
    reset()
  }

  /** Buka daftar pesanan dengan panel detail pesanan yang baru tersimpan. */
  const listHref = saved ? `/pesanan?pesanan=${encodeURIComponent(saved.orderNo)}` : "/pesanan"
  const goToList = useCallback(() => router.push(listHref), [router, listHref])

  // Popup tampil sebentar, lalu otomatis ke daftar pesanan. "Input pesanan baru" membatalkannya.
  useEffect(() => {
    if (!saved) return
    const timer = window.setTimeout(goToList, SAVED_REDIRECT_MS)
    return () => window.clearTimeout(timer)
  }, [saved, goToList])

  const issues = draftIssues(draft, today)
  const { items, total } = orderTotal(catalog, draft.quantities)
  const marketplace = isMarketplace(draft.channel)
  const channelLabel = ORDER_CHANNEL_LABEL[draft.channel]
  const isHadiah = !marketplace && draft.type === "hadiah"
  const shownTotal = marketplace ? (parseRupiahInput(draft.marketplaceTotal) ?? total) : total
  const fieldLabel: Record<DraftField, string> = {
    channel: "Sumber",
    marketplaceOrderNo: "Nomor invoice",
    marketplaceTotal: "Total pembayaran",
    type: "Tipe",
    name: marketplace || isHadiah ? "Nama penerima" : "Nama",
    phone: "No. telp",
    address: "Alamat",
    deliveryDate: "Tanggal kirim",
    senderName: "Nama pengirim",
    cardTo: "To",
    cardWishes: "Wishes",
    cardFrom: "From",
    shippingMethod: "Metode pengiriman",
    request: "Request",
    items: "Menu",
  }
  const pending = (Object.keys(issues) as DraftField[]).map((field) => ({
    field,
    label: fieldLabel[field],
  }))

  /** Pesan di bawah isian: hanya untuk yang ditandai tidak terbaca dari pesan. */
  const flagFor = (field: DraftField) =>
    flagged.has(field) ? (issues[field] ?? "Tidak terbaca dari pesan.") : undefined
  const messageLabel = marketplace ? `Template ${channelLabel}` : "Pesan WhatsApp"

  return (
    <div className="space-y-6">
      <SegmentedControl
        label="Sumber pesanan"
        options={CHANNEL_OPTIONS}
        value={draft.channel}
        onChange={chooseChannel}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:gap-8">
        {/* Pesan WhatsApp / template Olshop */}
        <section
          aria-labelledby="wa-panel-title"
          className="rounded-2xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-24"
        >
          <div className="flex items-start gap-3">
            {marketplace ? (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
                <ShoppingBag className="size-5" aria-hidden />
              </span>
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
                <MessageCircle className="size-5" aria-hidden />
              </span>
            )}
            <div>
              <h2 id="wa-panel-title" className="font-semibold text-text-strong">
                {messageLabel}
              </h2>
              <p className="text-sm text-text-body">
                {marketplace
                  ? "Tempel template Olshop yang sudah diisi (marketplace, tanggal, penerima, invoice, menu), lalu Isi Otomatis."
                  : "Tempel pesan customer, lalu Isi Otomatis. Pesan asli disimpan bersama pesanan."}
              </p>
            </div>
          </div>
          <label htmlFor="wa-message" className="sr-only">
            {messageLabel}
          </label>
          <Textarea
            id="wa-message"
            value={waText}
            onChange={(event) => setWaText(event.target.value)}
            placeholder={
              marketplace
                ? "Marketplace: Shopee\nTanggal pengiriman: …\nNama Penerima: …\nNomor Invoice: …"
                : "Tempel pesan pesanan dari WhatsApp di sini…"
            }
            className="mt-4 max-h-[50dvh] min-h-[220px] resize-y rounded-xl bg-white p-3.5 text-sm leading-relaxed lg:h-[min(52dvh,520px)]"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => fillFrom(waText, draft.channel)}
              disabled={!waText.trim()}
              className="h-11 rounded-lg px-5"
            >
              <WandSparkles aria-hidden />
              Isi Otomatis
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={reset}
              disabled={!waText && !summary}
              className="h-11 rounded-lg bg-white px-5"
            >
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </div>
          <div aria-live="polite">
            {summary && (
              <div className="mt-4 rounded-lg bg-nav-active/70 px-3.5 py-3 text-sm text-text-strong">
                <p>
                  Terbaca {summary.filled} dari {summary.checked} isian wajib dan {summary.items}{" "}
                  menu.
                  {flagged.size > 0 && " Isian bertanda kuning perlu dicek."}
                </p>
                {summary.guessedChannel && (
                  <p className="mt-1.5 text-trend-down-fg">
                    Marketplace tidak terbaca dari template, jadi dipakai{" "}
                    {ORDER_CHANNEL_LABEL[summary.guessedChannel]}. Ganti di pilihan Sumber bila
                    salah.
                  </p>
                )}
                {summary.unmatched.length > 0 && (
                  <p className="mt-1.5 text-trend-down-fg">
                    Menu tidak dikenali:{" "}
                    {summary.unmatched.map((item) => `${item.name} (${item.qty})`).join(", ")}.
                    Pilih manual di daftar menu.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Form pesanan */}
        <section
          aria-labelledby="order-form-title"
          className="rounded-2xl border border-border bg-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <h2 id="order-form-title" className="text-lg font-bold text-brand-ink">
              {marketplace ? `Data pesanan ${channelLabel}` : "Data pesanan"}
            </h2>
            {!marketplace && (
              <SegmentedControl
                label="Tipe pesanan"
                options={TYPE_OPTIONS}
                value={draft.type}
                onChange={(value) => update("type", value)}
              />
            )}
          </div>

          <div className="divide-y divide-border">
            {marketplace && (
              <FormGroup title="Pesanan">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="marketplaceOrderNo"
                    label={fieldLabel.marketplaceOrderNo}
                    flag={flagFor("marketplaceOrderNo")}
                    hint="Dari Seller Center; nomor yang sama ditolak supaya tidak input ganda."
                  >
                    <Input
                      value={draft.marketplaceOrderNo}
                      onChange={(event) => update("marketplaceOrderNo", event.target.value)}
                      maxLength={60}
                      className="tabular-nums"
                    />
                  </Field>
                  <Field
                    id="marketplaceTotal"
                    label="Total pembayaran"
                    optional
                    flag={flagFor("marketplaceTotal")}
                    hint={`Kosong = harga menu (${formatRupiah(total)}). Isi bila beda karena voucher atau diskon.`}
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
                      placeholder={formatRupiah(total).replace("Rp ", "")}
                      className="tabular-nums"
                    />
                  </Field>
                </div>
              </FormGroup>
            )}

            <FormGroup title={marketplace || isHadiah ? "Penerima" : "Customer"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label={fieldLabel.name} flag={flagFor("name")}>
                  <Input
                    value={draft.name}
                    onChange={(event) => update("name", event.target.value)}
                    placeholder={
                      marketplace
                        ? "Nama penerima di marketplace"
                        : isHadiah
                          ? "Nama penerima hadiah"
                          : "Nama lengkap customer"
                    }
                    maxLength={80}
                  />
                </Field>
                {/* Template Olshop tidak memuat no. HP dan alamat (ada di label marketplace). */}
                {!marketplace && (
                  <Field id="phone" label="No. telp" flag={flagFor("phone")}>
                    <Input
                      value={draft.phone}
                      onChange={(event) => update("phone", event.target.value)}
                      type="tel"
                      inputMode="tel"
                      placeholder="0812 3456 7890"
                      className="tabular-nums"
                    />
                  </Field>
                )}
              </div>
              {!marketplace && (
                <Field
                  id="address"
                  label="Alamat lengkap"
                  optional={draft.shippingMethod === "pick_up"}
                  flag={flagFor("address")}
                >
                  <Textarea
                    value={draft.address}
                    onChange={(event) => update("address", event.target.value)}
                    placeholder="Jalan, nomor, patokan, kelurahan, kota"
                    rows={3}
                    maxLength={300}
                  />
                </Field>
              )}
              <Field
                id="deliveryDate"
                label="Tanggal kirim"
                flag={flagFor("deliveryDate")}
                hint={draft.deliveryDate ? formatHariTanggal(draft.deliveryDate) : undefined}
              >
                <Input
                  type="date"
                  value={draft.deliveryDate}
                  min={today}
                  onChange={(event) => update("deliveryDate", event.target.value)}
                  className="w-full sm:w-[220px]"
                />
              </Field>
            </FormGroup>

            {isHadiah && (
              <FormGroup title="Pengirim dan kartu ucapan">
                <Field id="senderName" label="Nama pengirim" flag={flagFor("senderName")}>
                  <Input
                    value={draft.senderName}
                    onChange={(event) => update("senderName", event.target.value)}
                    placeholder="Nama yang memesan hadiah"
                    maxLength={80}
                    className="sm:max-w-[calc(50%-0.5rem)]"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="cardTo" label="To" optional>
                    <Input
                      value={draft.cardTo}
                      onChange={(event) => update("cardTo", event.target.value)}
                      maxLength={60}
                    />
                  </Field>
                  <Field id="cardFrom" label="From" optional>
                    <Input
                      value={draft.cardFrom}
                      onChange={(event) => update("cardFrom", event.target.value)}
                      maxLength={60}
                    />
                  </Field>
                </div>
                <Field id="cardWishes" label="Wishes" optional>
                  <Textarea
                    value={draft.cardWishes}
                    onChange={(event) => update("cardWishes", event.target.value)}
                    placeholder="Ucapan yang ditulis di kartu"
                    rows={3}
                    maxLength={300}
                  />
                </Field>
              </FormGroup>
            )}

            <FormGroup title="Pengiriman">
              {marketplace ? (
                <p className="text-sm text-text-body">
                  Dikirim lewat ekspedisi {channelLabel}. Tidak perlu isi kurir atau resi; cukup
                  tandai Dikirim di menu Pengiriman setelah paket diserahkan.
                </p>
              ) : (
                <ShippingMethodPicker
                  value={draft.shippingMethod}
                  onChange={(method) => update("shippingMethod", method)}
                  flag={flagFor("shippingMethod")}
                />
              )}
              <Field id="request" label="Request" optional>
                <Textarea
                  value={draft.request}
                  onChange={(event) => update("request", event.target.value)}
                  placeholder="Mis. saus dipisah, tanpa sendok"
                  rows={2}
                  maxLength={300}
                />
              </Field>
            </FormGroup>

            <FormGroup title="Menu">
              <div id="field-items" className="scroll-mt-28">
                {flagFor("items") && <FlagNote id="items-flag">{flagFor("items")}</FlagNote>}
                <div className={cn(flagFor("items") && "mt-2")}>
                  <OrderMenuPicker
                    catalog={catalog}
                    quantities={draft.quantities}
                    onChange={setQty}
                  />
                </div>
              </div>
            </FormGroup>
          </div>

          {/* Ringkasan: selalu terlihat di bawah layar saat form digulir. */}
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-b-2xl border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
            <div className="min-w-0">
              <p className="text-sm text-text-body">
                Total <span className="tabular-nums">{items}</span> porsi
              </p>
              <p
                className="text-2xl font-bold text-brand-ink tabular-nums"
                data-testid="order-total"
              >
                {formatRupiah(shownTotal)}
              </p>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-3">
              {pending.length > 0 ? (
                <p className="flex min-w-0 items-start gap-1.5 text-sm text-text-body">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#b7791f]" aria-hidden />
                  <span>
                    Belum lengkap:{" "}
                    {pending.map(({ field, label }, index) => (
                      <span key={field}>
                        {index > 0 && ", "}
                        <a
                          href={`#field-${field}`}
                          className="font-medium text-text-strong underline underline-offset-2"
                        >
                          {label}
                        </a>
                      </span>
                    ))}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-medium text-status-selesai-fg">Data pesanan lengkap.</p>
              )}
              <Button
                type="button"
                onClick={save}
                disabled={saving || pending.length > 0}
                className="h-11 rounded-lg px-6"
              >
                {saving && <LoaderCircle className="animate-spin" aria-hidden />}
                {saving ? "Menyimpan…" : "Simpan pesanan"}
              </Button>
            </div>
          </div>
        </section>

        <Dialog open={Boolean(saved)} onOpenChange={(open) => !open && goToList()}>
          <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[460px] sm:p-8">
            <DialogHeader className="items-start text-left">
              <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-status-selesai text-status-selesai-fg">
                <CircleCheck className="size-6" aria-hidden />
              </span>
              <DialogTitle className="text-2xl font-bold text-brand-ink">
                Pesanan sudah terinput
              </DialogTitle>
              <DialogDescription className="text-text-body">
                {marketplace
                  ? `Status Baru, sudah Lunas via ${channelLabel}.`
                  : "Status Baru, belum bayar. Pembayaran dicatat di menu Pembayaran."}
              </DialogDescription>
            </DialogHeader>
            {saved && (
              <dl className="mt-5 divide-y divide-border rounded-lg border border-border bg-white">
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-body">No. pesanan</dt>
                  <dd
                    className="font-semibold text-brand-ink tabular-nums"
                    data-testid="saved-order-no"
                  >
                    {saved.orderNo}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-body">Customer</dt>
                  <dd className="text-right font-medium text-text-strong">{saved.customerName}</dd>
                </div>
                <div className="flex justify-between gap-4 px-4 py-3">
                  <dt className="text-text-body">Total</dt>
                  <dd className="font-medium text-text-strong tabular-nums">
                    {formatRupiah(saved.total)}
                  </dd>
                </div>
              </dl>
            )}
            <p aria-live="polite" className="mt-4 flex items-center gap-2 text-sm text-text-body">
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
              Membuka daftar pesanan…
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={closeSaved}
                className="h-11 rounded-lg bg-white px-5"
              >
                Input pesanan baru
              </Button>
              <Button asChild className="h-11 rounded-lg px-5">
                <Link href={listHref}>Lihat di daftar pesanan</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="space-y-4 px-5 py-5 sm:px-6">
      <h3 id={id} className="font-semibold text-brand-ink">
        {title}
      </h3>
      {children}
    </section>
  )
}
