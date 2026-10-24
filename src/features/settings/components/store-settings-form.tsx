"use client"

import { CircleAlert, ExternalLink, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveStoreSettings, type StoreSettingsFormState } from "@/features/settings/actions"
import type { StoreSettings } from "@/features/settings/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import { formatPhone } from "@/lib/phone"

export function StoreSettingsForm({
  settings,
  lastSaved,
}: {
  settings: StoreSettings
  /** Keterangan "Terakhir diubah …" yang sudah diformat di server. */
  lastSaved: string | null
}) {
  const { state, pending, onSubmit } = useActionForm<StoreSettingsFormState>(saveStoreSettings, {})
  const { errors, hasErrors, onFormChange } = useFieldErrors(state)
  const id = useId()
  const handled = useRef<StoreSettingsFormState | null>(null)

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
  }, [state])

  const describedBy = (name: string, hint?: boolean) =>
    [hint && `${id}-${name}-hint`, errors[name] && `${id}-${name}-error`]
      .filter(Boolean)
      .join(" ") || undefined
  const fieldError = (name: string) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="text-sm text-trend-down-fg">
        {errors[name]}
      </p>
    ) : null

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} noValidate>
      <div className="divide-y divide-border">
        <Group
          title="Profil toko"
          description="Nama dan nomor yang dikenal customer, untuk pesan konfirmasi dan nota."
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-storeName`} className="text-text-strong">
              Nama toko
            </Label>
            <Input
              id={`${id}-storeName`}
              name="storeName"
              defaultValue={settings.storeName}
              maxLength={80}
              required
              aria-invalid={Boolean(errors.storeName)}
              aria-describedby={describedBy("storeName")}
              className="h-11 rounded-lg bg-white"
            />
            {fieldError("storeName")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-whatsapp`} className="text-text-strong">
              No. WhatsApp toko <span className="font-normal text-text-body">(opsional)</span>
            </Label>
            <Input
              id={`${id}-whatsapp`}
              name="whatsapp"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="0812 3456 7890"
              defaultValue={settings.whatsapp ? formatPhone(settings.whatsapp) : ""}
              aria-invalid={Boolean(errors.whatsapp)}
              aria-describedby={describedBy("whatsapp")}
              className="h-11 rounded-lg bg-white tabular-nums"
            />
            {fieldError("whatsapp")}
          </div>
        </Group>

        <Group
          title="Lokasi pick-up"
          description="Alamat untuk customer yang mengambil sendiri, sekaligus titik awal rute kurir."
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-pickupAddress`} className="text-text-strong">
              Alamat <span className="font-normal text-text-body">(opsional)</span>
            </Label>
            <Textarea
              id={`${id}-pickupAddress`}
              name="pickupAddress"
              defaultValue={settings.pickupAddress ?? ""}
              placeholder="Jalan, nomor, kelurahan, kota"
              rows={3}
              maxLength={300}
              aria-invalid={Boolean(errors.pickupAddress)}
              aria-describedby={describedBy("pickupAddress")}
              className="rounded-lg bg-white"
            />
            {fieldError("pickupAddress")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-pickupMapsUrl`} className="text-text-strong">
              Link Google Maps <span className="font-normal text-text-body">(opsional)</span>
            </Label>
            <Input
              id={`${id}-pickupMapsUrl`}
              name="pickupMapsUrl"
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://maps.app.goo.gl/…"
              defaultValue={settings.pickupMapsUrl ?? ""}
              aria-invalid={Boolean(errors.pickupMapsUrl)}
              aria-describedby={describedBy("pickupMapsUrl", true)}
              className="h-11 rounded-lg bg-white"
            />
            <p id={`${id}-pickupMapsUrl-hint`} className="text-[13px] text-text-body">
              Di Google Maps, buka lokasi toko lalu pilih Bagikan → Salin link.
              {settings.pickupMapsUrl && (
                <>
                  {" "}
                  <a
                    href={settings.pickupMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-brand-ink underline underline-offset-2"
                  >
                    Buka link tersimpan
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </>
              )}
            </p>
            {fieldError("pickupMapsUrl")}
          </div>
        </Group>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
        <p className="text-[13px] text-text-body">{lastSaved ?? "Belum pernah disimpan."}</p>
        <div className="flex flex-wrap items-center gap-3">
          {state.message && !state.ok && (!state.errors || hasErrors) && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-trend-down-fg">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="h-11 rounded-lg px-6">
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {pending ? "Menyimpan…" : "Simpan pengaturan"}
          </Button>
        </div>
      </div>
    </form>
  )
}

/** Satu kelompok isian: judul + keterangan di kiri, isian di kanan (bertumpuk di ponsel). */
function Group({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid gap-4 px-5 py-6 sm:px-6 lg:grid-cols-[240px_minmax(0,560px)] lg:gap-10"
    >
      <div>
        <h2 id={id} className="font-semibold text-brand-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-text-body">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  )
}
