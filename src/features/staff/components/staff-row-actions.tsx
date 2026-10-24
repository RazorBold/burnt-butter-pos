"use client"

import { KeyRound, LoaderCircle } from "lucide-react"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import { ActiveToggleMenu, EditIconButton } from "@/components/app/row-actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { resetStaffPassword } from "@/features/staff/actions"
import { CredentialsCard } from "@/features/staff/components/credentials-card"
import { StaffFormDialog } from "@/features/staff/components/staff-form-dialog"
import type { StaffRow } from "@/features/staff/queries"

export function StaffRowActions({
  staff,
  isSelf,
  toggle,
}: {
  staff: StaffRow
  isSelf: boolean
  /** Server Action yang sudah di-bind; tidak ada untuk akun sendiri. */
  toggle?: () => Promise<{ ok: boolean; message: string }>
}) {
  const [resetOpen, setResetOpen] = useState(false)

  return (
    <div className="flex items-center justify-end gap-1">
      <StaffFormDialog
        staff={staff}
        isSelf={isSelf}
        trigger={<EditIconButton name={staff.name} />}
      />
      <ActiveToggleMenu name={staff.name} isActive={staff.isActive} toggle={toggle}>
        <DropdownMenuItem className="h-10" onSelect={() => setResetOpen(true)}>
          <KeyRound aria-hidden />
          Atur ulang kata sandi
        </DropdownMenuItem>
      </ActiveToggleMenu>
      <ResetPasswordDialog staff={staff} open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  )
}

function ResetPasswordDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff: StaffRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [password, setPassword] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Kata sandi dibuang dari state saat ditutup, supaya tidak muncul lagi saat dibuka ulang.
  function setOpen(next: boolean) {
    onOpenChange(next)
    if (!next) setPassword(null)
  }

  function reset() {
    startTransition(async () => {
      const result = await resetStaffPassword(staff.id)
      if (result.ok) setPassword(result.password)
      else toast.error(result.message)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-0 rounded-2xl bg-card p-6 sm:max-w-[480px] sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle className="text-2xl font-bold text-brand-ink">
            {password ? "Kata sandi baru" : "Atur ulang kata sandi?"}
          </DialogTitle>
          <DialogDescription className="text-text-body">
            {password
              ? `Kata sandi lama ${staff.name} sudah tidak berlaku.`
              : `Kata sandi baru dibuat untuk ${staff.name} (${staff.email}). Kata sandi lama langsung tidak berlaku.`}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6 space-y-5">
          {password && <CredentialsCard email={staff.email} password={password} />}
          <div className="flex flex-wrap justify-end gap-2">
            {password ? (
              <Button onClick={() => setOpen(false)} className="h-11 rounded-lg px-6">
                Selesai
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="h-11 rounded-lg px-5"
                >
                  Batal
                </Button>
                <Button onClick={reset} disabled={pending} className="h-11 rounded-lg px-6">
                  {pending && <LoaderCircle className="animate-spin" aria-hidden />}
                  {pending ? "Membuat…" : "Buat kata sandi baru"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
