"use client"

import { Check, Copy, KeyRound } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

/**
 * Email dan kata sandi yang baru dibuat. Ditampilkan sekali saja: server tidak menyimpan
 * kata sandi dalam bentuk yang bisa dibaca, jadi Admin perlu menyalinnya sekarang.
 */
export function CredentialsCard({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nKata sandi: ${password}`)
      setCopied(true)
      toast.success("Email dan kata sandi disalin.")
    } catch {
      toast.error("Belum bisa menyalin. Pilih teksnya lalu salin manual.")
    }
  }

  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border rounded-lg border border-border bg-white">
        <div className="px-4 py-3">
          <dt className="text-[13px] text-text-body">Email</dt>
          <dd className="font-medium break-all text-text-strong">{email}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-[13px] text-text-body">Kata sandi</dt>
          <dd
            className="font-mono text-lg tracking-wide break-all text-brand-ink"
            data-testid="new-password"
          >
            {password}
          </dd>
        </div>
      </dl>
      <p className="flex items-start gap-2 text-sm text-text-body">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden />
        Kirimkan ke staf lewat chat pribadi. Kata sandi ini tidak ditampilkan lagi setelah jendela
        ditutup.
      </p>
      <Button type="button" variant="outline" onClick={copy} className="h-11 w-full rounded-lg">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Tersalin" : "Salin email & kata sandi"}
      </Button>
    </div>
  )
}
