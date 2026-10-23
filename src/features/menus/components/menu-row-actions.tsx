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
import { setMenusActive } from "@/features/menus/actions"
import { MenuFormDialog } from "@/features/menus/components/menu-form-dialog"
import type { MenuRow } from "@/features/menus/queries"

export function MenuRowActions({ menu }: { menu: MenuRow }) {
  const [pending, startTransition] = useTransition()

  function toggleActive() {
    startTransition(async () => {
      const result = await setMenusActive([menu.id], !menu.isActive)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <MenuFormDialog
        menu={menu}
        trigger={
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-brand-ink"
            aria-label={`Ubah ${menu.name}`}
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
            aria-label={`Aksi lain untuk ${menu.name}`}
            disabled={pending}
          >
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={toggleActive} className="h-10">
            {menu.isActive ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            {menu.isActive ? "Nonaktifkan" : "Aktifkan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
