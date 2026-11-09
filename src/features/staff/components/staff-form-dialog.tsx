"use client"

import { CircleAlert, LoaderCircle } from "lucide-react"
import { type ReactNode, useEffect, useId, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createStaff,
  type Credentials,
  type StaffFormState,
  updateStaff,
} from "@/features/staff/actions"
import { CredentialsCard } from "@/features/staff/components/credentials-card"
import type { StaffRow } from "@/features/staff/queries"
import { useActionForm } from "@/hooks/use-action-form"
import { useFieldErrors } from "@/hooks/use-field-errors"
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLES, type Role } from "@/lib/access"
import { cn } from "@/lib/utils"

export function StaffFormDialog({
  staff,
  isSelf = false,
  trigger,
}: {
  staff?: StaffRow
  /** Akun milik Admin yang sedang login: role dan status tidak bisa diubah sendiri. */
  isSelf?: boolean
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [session, setSession] = useState(0)
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setSession((value) => value + 1)
          setCredentials(null)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[560px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {credentials ? "Akun dibuat" : staff ? "Ubah akun staf" : "Tambah akun staf"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {credentials
              ? "Staf masuk dengan email dan kata sandi di bawah. Mereka bisa langsung memakainya."
              : staff
                ? "Ubah nama, role, atau status akun."
                : "Kata sandi dibuat otomatis dan ditampilkan sekali setelah akun dibuat."}
          </DialogDescription>
        </DialogHeader>
        {credentials ? (
          <div className="mt-6 space-y-5">
            <CredentialsCard {...credentials} />
            <div className="flex justify-end">
              <Button onClick={() => setOpen(false)} className="h-11 rounded-lg px-6">
                Selesai
              </Button>
            </div>
          </div>
        ) : (
          <StaffForm
            key={session}
            staff={staff}
            isSelf={isSelf}
            onSaved={(result) => {
              if (result) setCredentials(result)
              else setOpen(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function StaffForm({
  staff,
  isSelf,
  onSaved,
}: {
  staff?: StaffRow
  isSelf: boolean
  onSaved: (credentials?: Credentials) => void
}) {
  const { state, pending, onSubmit } = useActionForm<StaffFormState>(
    staff ? updateStaff : createStaff,
    {},
  )
  const { errors, hasErrors, markEdited, onFormChange } = useFieldErrors(state)
  const id = useId()
  const [role, setRole] = useState<Role>(staff?.role ?? "kasir")
  const [active, setActive] = useState(staff?.isActive ?? true)
  const handled = useRef<StaffFormState | null>(null)

  useEffect(() => {
    if (!state.ok || handled.current === state) return
    handled.current = state
    toast.success(state.message)
    onSaved(state.credentials)
  }, [state, onSaved])

  return (
    <form onSubmit={onSubmit} onChange={onFormChange} className="mt-6 space-y-5" noValidate>
      {staff && <input type="hidden" name="id" value={staff.id} />}
      {/* Radio yang dinonaktifkan tidak ikut terkirim, jadi role dikirim lewat input ini. */}
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="isActive" value={String(active)} />

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-name`} className="text-text-strong">
          Nama
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={staff?.name}
          placeholder="Nama yang tampil di aplikasi"
          maxLength={60}
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
          className="h-11 rounded-lg bg-white"
        />
        {errors.name && (
          <p id={`${id}-name-error`} className="text-sm text-trend-down-fg">
            {errors.name}
          </p>
        )}
      </div>

      {staff ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-strong">Email</p>
          <p className="break-all text-text-strong">{staff.email}</p>
          <p className="text-[13px] text-text-body">
            Email dipakai untuk masuk dan tidak bisa diubah di sini.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-email`} className="text-text-strong">
            Email
          </Label>
          <Input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="off"
            placeholder="nama@contoh.com"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? `${id}-email-error` : undefined}
            className="h-11 rounded-lg bg-white"
          />
          {errors.email && (
            <p id={`${id}-email-error`} className="text-sm text-trend-down-fg">
              {errors.email}
            </p>
          )}
        </div>
      )}

      <fieldset disabled={isSelf} className="space-y-2">
        <legend className="text-sm font-medium text-text-strong">Role</legend>
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          {ROLES.map((value) => {
            const checked = role === value
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border border-border bg-white px-3.5 py-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:cursor-not-allowed has-disabled:opacity-70",
                  checked && "border-brand bg-nav-active",
                )}
              >
                <input
                  suppressHydrationWarning
                  type="radio"
                  name="role-choice"
                  value={value}
                  checked={checked}
                  onChange={() => {
                    setRole(value)
                    markEdited("role")
                  }}
                  className="mt-1 size-4 shrink-0 accent-brand"
                />
                <span>
                  <span className="block font-semibold text-text-strong">{ROLE_LABEL[value]}</span>
                  <span className="block text-[13px] leading-snug text-text-body">
                    {ROLE_DESCRIPTION[value]}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        {isSelf && (
          <p className="text-[13px] text-text-body">
            Role akunmu sendiri hanya bisa diubah Owner lain.
          </p>
        )}
        {errors.role && <p className="text-sm text-trend-down-fg">{errors.role}</p>}
      </fieldset>

      {staff && !isSelf && (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3">
          <Checkbox
            id={`${id}-active`}
            checked={active}
            onCheckedChange={(value) => setActive(value === true)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor={`${id}-active`} className="text-text-strong">
              Akun aktif
            </Label>
            <p className="text-[13px] text-text-body">
              Akun nonaktif tidak bisa masuk. Riwayat pesanan yang dicatatnya tetap tersimpan.
            </p>
          </div>
        </div>
      )}

      {state.message && !state.ok && (!state.errors || hasErrors) && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending} className="h-11 rounded-lg px-6">
          {pending && <LoaderCircle className="animate-spin" aria-hidden />}
          {pending ? "Menyimpan…" : staff ? "Simpan perubahan" : "Buat akun"}
        </Button>
      </div>
    </form>
  )
}
