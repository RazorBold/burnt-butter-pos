"use client"

import { EllipsisVertical, Eye, EyeOff, Pencil } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { setCourierActive } from "@/features/couriers/actions"
import { CourierFormDialog } from "@/features/couriers/components/courier-form-dialog"
import type { CourierRow } from "@/features/couriers/queries"

export function CourierRowActions({ courier }: { courier: CourierRow }) {
  const [pending, startTransition] = useTransition()

  function toggleActive() {
    startTransition(async () => {
      const result = await setCourierActive(courier.id, !courier.isActive)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <CourierFormDialog
        courier={courier}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-brand-ink"
            aria-label={`Ubah ${courier.name}`}
          >
            <Pencil className="size-4" />
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-text-strong"
            aria-label={`Aksi lain untuk ${courier.name}`}
            disabled={pending}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={toggleActive} className="h-10">
            {courier.isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {courier.isActive ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
