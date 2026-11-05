"use client"

import { Check, Minus, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { TableCell, TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type RowSelection = {
  ids: string[]
  selected: string[]
  isSelected: (id: string) => boolean
  toggle: (id: string, checked: boolean) => void
  setAll: (checked: boolean) => void
  clear: () => void
}

const SelectionContext = createContext<RowSelection | null>(null)

export function useRowSelection(): RowSelection {
  const context = useContext(SelectionContext)
  if (!context) throw new Error("useRowSelection harus di dalam RowSelectionProvider.")
  return context
}

/**
 * Pilihan baris (checkbox) untuk aksi massal, terbatas pada baris yang sedang tampil. Beri
 * `key` dari daftar id supaya pilihan kosong lagi saat filter atau halaman tabel berganti.
 */
export function RowSelectionProvider({ ids, children }: { ids: string[]; children: ReactNode }) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set())
  const value = useMemo<RowSelection>(
    () => ({
      ids,
      selected: ids.filter((id) => chosen.has(id)),
      isSelected: (id) => chosen.has(id),
      toggle: (id, checked) =>
        setChosen((current) => {
          const next = new Set(current)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        }),
      setAll: (checked) => setChosen(checked ? new Set(ids) : new Set()),
      clear: () => setChosen(new Set()),
    }),
    [ids, chosen],
  )
  return <SelectionContext value={value}>{children}</SelectionContext>
}

function TableCheckbox({ className, ...props }: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      suppressHydrationWarning
      className={cn(
        "peer grid size-[18px] shrink-0 cursor-pointer place-content-center rounded-[5px] border border-text-body/70 bg-white text-white transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="[&>svg]:size-3.5 [&>svg]:stroke-3">
        {props.checked === "indeterminate" ? <Minus aria-hidden /> : <Check aria-hidden />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

/** Sel kepala tabel: pilih/lepas semua baris di halaman ini. */
export function SelectAllHead({ label }: { label: string }) {
  const { ids, selected, setAll } = useRowSelection()
  const state =
    selected.length === 0 ? false : selected.length === ids.length ? true : "indeterminate"
  return (
    <TableHead className="w-12 pr-0 pl-6">
      <TableCheckbox
        aria-label={label}
        checked={state}
        onCheckedChange={(checked) => setAll(checked === true)}
        className="align-middle"
      />
    </TableHead>
  )
}

/**
 * Sel checkbox di awal baris. Seluruh sel adalah `<label>`, jadi area kliknya selebar sel dan
 * tidak ikut membuka panel detail (OrderRow mengabaikan klik di dalam label).
 */
export function SelectRowCell({ id, label }: { id: string; label: string }) {
  const { isSelected, toggle } = useRowSelection()
  return (
    <TableCell className="w-12 p-0">
      <label className="flex min-h-12 cursor-pointer items-center pr-2 pl-6">
        <TableCheckbox
          aria-label={label}
          checked={isSelected(id)}
          onCheckedChange={(checked) => toggle(id, checked === true)}
        />
      </label>
    </TableCell>
  )
}

/**
 * Tombol di bar aksi massal (latar gelap). `unavailable`: aksi tidak berlaku untuk pesanan
 * terpilih. Tombol tampak redup tapi tetap bisa difokus, dan bila diklik menjelaskan alasannya
 * (tombol `disabled` tidak bisa memberi tahu kenapa).
 */
export function BulkActionButton({
  className,
  unavailable,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { unavailable?: string }) {
  return (
    <Button
      variant="ghost"
      aria-disabled={unavailable ? true : undefined}
      onClick={unavailable ? () => toast.info(unavailable) : onClick}
      className={cn(
        "h-10 rounded-lg px-3 text-white hover:bg-white/12 hover:text-white focus-visible:ring-white/50 disabled:opacity-45 aria-disabled:opacity-45 aria-disabled:hover:bg-transparent aria-expanded:bg-white/12 aria-expanded:text-white",
        className,
      )}
      {...props}
    />
  )
}

/**
 * Bar aksi massal yang melayang di bawah layar saat ada baris terpilih, supaya tetap terlihat
 * saat tabel digulir dan tabel tidak bergeser ketika checkbox pertama dicentang.
 */
export function BulkActionBar({ noun, children }: { noun: string; children: ReactNode }) {
  const { selected, clear } = useRowSelection()
  const reduceMotion = useReducedMotion()
  const offset = reduceMotion ? 0 : 16
  const count = selected.length

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {count > 0 ? `${count} ${noun} dipilih` : ""}
      </p>
      {/* Ruang kosong supaya bar tidak menutupi paginasi saat digulir ke bawah. */}
      {count > 0 && <div aria-hidden className="h-24" />}
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            role="region"
            aria-label={`Aksi untuk ${noun} terpilih`}
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-2xl bg-brand-ink p-2 pl-4 text-white shadow-[0_12px_32px_rgb(76_28_4_/_0.3)]"
          >
            <span className="mr-2 text-sm font-semibold whitespace-nowrap tabular-nums">
              {count} {noun} dipilih
            </span>
            {children}
            <span aria-hidden className="mx-1 h-6 w-px bg-white/20" />
            <BulkActionButton
              size="icon"
              onClick={clear}
              aria-label="Batal pilih"
              className="w-10 px-0"
            >
              <X aria-hidden />
            </BulkActionButton>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
