"use client"

import { CircleAlert, CircleCheck, Copy, LoaderCircle, RotateCcw } from "lucide-react"
import { useId, useMemo, useRef, useState, useTransition } from "react"
import { toast } from "sonner"

import { SegmentedControl } from "@/components/app/segmented-control"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isBirthdayBoxMenu } from "@/features/orders/catalog"
import { saveTemplate } from "@/features/templates/actions"
import {
  checkTemplate,
  DEFAULT_TEMPLATES,
  normalizeTemplateBody,
  TEMPLATE_KEYS,
  TEMPLATE_LABEL,
  TEMPLATE_MAX_LENGTH,
  type TemplateKey,
  type TemplateMenu,
} from "@/features/templates/render"

export type EditorTemplate = {
  key: TemplateKey
  body: string
  custom: boolean
  /** "Terakhir diubah …", sudah diformat di server. */
  lastSaved: string | null
}

/**
 * Editor template pesan (Owner). Penanda {MENU…}, {PENGIRIMAN}, {HARGA: …} diisi dari Master
 * Data; pratinjau dan pengecekan Isi Otomatis berjalan langsung saat mengetik.
 */
export function TemplateEditor({
  templates,
  menus,
  shippingLines,
}: {
  templates: EditorTemplate[]
  menus: TemplateMenu[]
  shippingLines: string[]
}) {
  const id = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [active, setActive] = useState<TemplateKey>("fo1")
  const [drafts, setDrafts] = useState<Record<TemplateKey, string>>(
    () => Object.fromEntries(templates.map((t) => [t.key, t.body])) as Record<TemplateKey, string>,
  )
  const [serverProblems, setServerProblems] = useState<string[]>([])
  const [pending, startTransition] = useTransition()

  const saved = templates.find((template) => template.key === active)!
  const draft = drafts[active]
  const dirty = (key: TemplateKey) =>
    normalizeTemplateBody(drafts[key]) !==
    normalizeTemplateBody(templates.find((t) => t.key === key)!.body)
  const check = useMemo(
    () => checkTemplate(active, draft, menus, shippingLines),
    [active, draft, menus, shippingLines],
  )
  const problems = check.problems
  // Add-on Birthday Box punya baris Yes/No sendiri, jadi tidak ditawarkan sebagai daftar menu.
  const categories = useMemo(
    () => [
      ...new Set(
        menus.filter((menu) => !isBirthdayBoxMenu(menu.menuName)).map((menu) => menu.categoryName),
      ),
    ],
    [menus],
  )

  function setDraft(value: string) {
    setDrafts((current) => ({ ...current, [active]: value }))
    setServerProblems([])
  }

  /** Sisipkan penanda di posisi kursor. */
  function insert(token: string) {
    const element = textarea.current
    if (!element) return setDraft(`${draft}\n${token}`)
    const start = element.selectionStart
    const end = element.selectionEnd
    setDraft(draft.slice(0, start) + token + draft.slice(end))
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function save() {
    startTransition(async () => {
      const result = await saveTemplate({ key: active, body: draft })
      if (result.ok) {
        setDrafts((current) => ({ ...current, [active]: normalizeTemplateBody(draft) }))
        setServerProblems([])
        toast.success(result.message)
      } else {
        setServerProblems(result.problems ?? [])
        toast.error(result.message)
      }
    })
  }

  const shownProblems = serverProblems.length > 0 ? serverProblems : problems
  const tokens = [
    ...categories.map((name) => `{MENU: ${name}}`),
    "{MENU}",
    "{PENGIRIMAN}",
    "{HARGA: Additional Birthday Box}",
  ]

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5 sm:p-6">
        <h2 id={`${id}-title`} className="text-xl font-bold text-brand-ink">
          Template Pesan
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-text-body">
          Format yang disalin Admin di Input Pesanan untuk dikirim ke customer. Daftar menu, pilihan
          pengiriman, dan harga terisi otomatis dari Master Data lewat penanda, jadi menu baru
          langsung muncul tanpa mengedit template.
        </p>
        <div className="mt-4 overflow-x-auto">
          <SegmentedControl
            label="Pilih template"
            value={active}
            onChange={(key) => {
              setActive(key)
              setServerProblems([])
            }}
            options={TEMPLATE_KEYS.map((key) => ({
              value: key,
              label: dirty(key) ? `${TEMPLATE_LABEL[key]} •` : TEMPLATE_LABEL[key],
            }))}
          />
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Label htmlFor={`${id}-body`} className="text-text-strong">
              Isi template {TEMPLATE_LABEL[active]}
            </Label>
            <span className="text-[13px] text-text-body">
              {saved.custom ? "Sudah diubah Owner" : "Template bawaan"}
              {dirty(active) && " · belum disimpan"}
            </span>
          </div>
          <div
            role="group"
            aria-label="Sisipkan penanda"
            className="flex flex-wrap items-center gap-1.5"
          >
            <span className="text-xs font-medium text-text-body">Sisipkan:</span>
            {tokens.map((token) => (
              <button
                key={token}
                type="button"
                onClick={() => insert(token)}
                className="rounded border border-border bg-white px-2 py-1 font-mono text-xs text-brand-ink transition-colors hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {token}
              </button>
            ))}
          </div>
          <Textarea
            ref={textarea}
            id={`${id}-body`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={26}
            maxLength={TEMPLATE_MAX_LENGTH}
            spellCheck={false}
            aria-describedby={`${id}-help ${id}-check`}
            className="min-h-[420px] rounded-lg bg-white font-mono text-[13px] leading-relaxed"
          />
          <p id={`${id}-help`} className="text-[13px] text-text-body">
            <code className="font-mono">{"{MENU: Pasta, Dessert}"}</code> = menu aktif di kategori
            itu, sesuai urutan yang ditulis. <code className="font-mono">{"{MENU}"}</code> = semua
            kategori. <code className="font-mono">{"{PENGIRIMAN}"}</code> = pilihan pengiriman
            aktif. <code className="font-mono">{"{HARGA: Nama Menu}"}</code> = harga menu itu.
          </p>
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-text-strong">Pratinjau (yang disalin Admin)</h3>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(check.text)
                toast.success("Pratinjau disalin ke clipboard.")
              }}
              className="flex items-center gap-1 rounded border border-border bg-white px-2 py-1 text-xs text-brand-ink transition-colors hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Copy className="size-3" aria-hidden /> Salin
            </button>
          </div>
          <pre
            data-testid="template-preview"
            tabIndex={0}
            aria-label={`Pratinjau ${TEMPLATE_LABEL[active]}`}
            className="max-h-[520px] overflow-auto rounded-lg border border-border bg-white p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-text-strong focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {check.text}
          </pre>
          <div id={`${id}-check`} role="status">
            {shownProblems.length === 0 ? (
              <p className="flex items-start gap-2 rounded-lg bg-status-siap px-3.5 py-2.5 text-sm text-status-siap-fg">
                <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Siap dipakai: semua menu di template terbaca Isi Otomatis.
              </p>
            ) : (
              <div className="rounded-lg bg-trend-down px-3.5 py-2.5 text-sm text-trend-down-fg">
                <p className="flex items-center gap-2 font-semibold">
                  <CircleAlert className="size-4 shrink-0" aria-hidden />
                  Perlu diperbaiki sebelum disimpan
                </p>
                <ul className="mt-1.5 list-disc space-y-1 pl-9">
                  {shownProblems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 sm:px-6">
        <p className="text-[13px] text-text-body">{saved.lastSaved ?? "Belum pernah diubah."}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setDraft(DEFAULT_TEMPLATES[active])}
            disabled={
              normalizeTemplateBody(draft) === normalizeTemplateBody(DEFAULT_TEMPLATES[active])
            }
            className="h-11 rounded-lg bg-white px-5"
          >
            <RotateCcw aria-hidden />
            Pakai template bawaan
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={pending || !dirty(active) || problems.length > 0}
            className="h-11 rounded-lg px-6"
          >
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {pending ? "Menyimpan…" : "Simpan template"}
          </Button>
        </div>
      </div>
    </section>
  )
}
