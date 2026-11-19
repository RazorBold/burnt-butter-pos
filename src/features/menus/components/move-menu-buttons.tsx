"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { useTransition } from "react"
import { toast } from "sonner"

import { moveMenu } from "@/features/menus/actions"

/** Panah naik/turun: urutan menu dalam kategorinya (A, B, C di template WA dan form pesanan). */
export function MoveMenuButtons({
  id,
  name,
  first,
  last,
}: {
  id: string
  name: string
  first: boolean
  last: boolean
}) {
  const [pending, startTransition] = useTransition()

  function move(direction: "up" | "down") {
    startTransition(async () => {
      const result = await moveMenu(id, direction)
      if (!result.ok) toast.error(result.message)
    })
  }

  const button =
    "flex size-9 items-center justify-center rounded-lg text-brand-ink transition-colors hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
  return (
    <>
      <button
        type="button"
        aria-label={`Naikkan ${name}`}
        title="Naikkan"
        disabled={pending || first}
        onClick={() => move("up")}
        className={button}
      >
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Turunkan ${name}`}
        title="Turunkan"
        disabled={pending || last}
        onClick={() => move("down")}
        className={button}
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
    </>
  )
}
