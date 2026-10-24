"use client"

import { EllipsisVertical, Eye, EyeOff, Pencil } from "lucide-react"
import { type ComponentProps, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Tombol pensil untuk membuka dialog ubah (dipakai sebagai `trigger` dialog form). */
export function EditIconButton({ name, ...props }: { name: string } & ComponentProps<"button">) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 rounded-lg text-brand-ink"
      aria-label={`Ubah ${name}`}
      {...props}
    >
      <Pencil className="size-4" />
    </Button>
  )
}

/**
 * Menu ⋮ dengan Aktifkan/Nonaktifkan. `toggle` adalah Server Action yang sudah di-bind dengan
 * id dan status tujuan di halaman server, mis. `setCourierActive.bind(null, id, !isActive)`.
 */
export function ActiveToggleMenu({
  name,
  isActive,
  toggle,
}: {
  name: string
  isActive: boolean
  toggle: () => Promise<{ ok: boolean; message: string }>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 rounded-lg text-text-strong"
          aria-label={`Aksi lain untuk ${name}`}
          disabled={pending}
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          className="h-10"
          onSelect={() =>
            startTransition(async () => {
              const result = await toggle()
              if (result.ok) toast.success(result.message)
              else toast.error(result.message)
            })
          }
        >
          {isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          {isActive ? "Nonaktifkan" : "Aktifkan"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
