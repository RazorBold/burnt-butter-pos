import { CalendarDays, MessagesSquare } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { PAGE_CONTAINER, PageHeader } from "@/components/app/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { splitMentions } from "@/features/chat/mentions"
import { getChatLog, listChatLogDays, listChatMembers } from "@/features/chat/queries"
import { ROLE_LABEL } from "@/lib/access"
import { requirePageAccess } from "@/lib/auth"
import { formatHariTanggal, formatJam, toJakartaDateString } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Riwayat Chat" }

const PATH = "/riwayat-chat"
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Log Chat Tim per hari (permintaan pemilik toko, 13 Nov 2026). Panel Chat Tim mulai kosong
 * setiap hari; pesan hari-hari sebelumnya bisa dibaca di sini (hanya baca).
 */
export default function RiwayatChatPage({ searchParams }: PageProps<"/riwayat-chat">) {
  return (
    <main className={PAGE_CONTAINER}>
      <PageHeader
        title="Riwayat Chat"
        description="Chat Tim dimulai kosong setiap hari. Pesan hari-hari sebelumnya tersimpan di sini per tanggal."
      />
      <Suspense fallback={<Skeleton aria-hidden className="mt-6 h-[520px] rounded-2xl" />}>
        <ChatLog searchParams={searchParams} />
      </Suspense>
    </main>
  )
}

async function ChatLog({ searchParams }: Pick<PageProps<"/riwayat-chat">, "searchParams">) {
  const user = await requirePageAccess(PATH)
  const { tanggal } = await searchParams
  const today = toJakartaDateString(new Date())
  const days = await listChatLogDays()
  const wanted = typeof tanggal === "string" && ISO_DATE.test(tanggal) ? tanggal : undefined
  const selected = wanted ?? days[0]?.day

  if (!selected) {
    return (
      <section className="mt-6 rounded-2xl border border-border bg-card px-6 py-12">
        <p className="font-semibold text-brand-ink">Belum ada riwayat chat.</p>
        <p className="mt-1 text-sm text-text-body">
          Pesan Chat Tim akan tersimpan di sini per hari.
        </p>
      </section>
    )
  }

  const [messages, members] = await Promise.all([getChatLog(selected, user.id), listChatMembers()])
  const names = members.map((member) => member.name)
  const label = (day: string) => (day === today ? "Hari ini" : formatHariTanggal(day))

  return (
    <div className="mt-6 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Tanggal chat" className="rounded-2xl border border-border bg-card p-2">
        <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5 lg:overflow-visible">
          {days.map((item) => {
            const active = item.day === selected
            return (
              <li key={item.day} className="shrink-0">
                <Link
                  href={`${PATH}?tanggal=${item.day}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-brand font-semibold text-white"
                      : "text-text-strong hover:bg-nav-active",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0" aria-hidden />
                    {label(item.day)}
                  </span>
                  <span
                    className={cn(
                      "text-[13px] tabular-nums",
                      active ? "text-white" : "text-text-body",
                    )}
                  >
                    {item.count} pesan
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <section
        aria-labelledby="riwayat-chat-judul"
        className="min-w-0 rounded-2xl border border-border bg-card"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-icon-bg text-brand-ink">
            <MessagesSquare className="size-5" aria-hidden />
          </span>
          <div>
            <h2 id="riwayat-chat-judul" className="font-semibold text-brand-ink">
              {label(selected)}
            </h2>
            <p className="text-[13px] text-text-body">
              {formatHariTanggal(selected)} · {messages.length} pesan
            </p>
          </div>
        </div>
        {messages.length === 0 ? (
          <p className="px-6 py-10 text-sm text-text-body">Tidak ada pesan pada tanggal ini.</p>
        ) : (
          <ol
            role="log"
            aria-label={`Pesan ${label(selected)}`}
            className="space-y-3 px-5 py-5 sm:px-6"
          >
            {messages.map((message) => (
              <li
                key={message.id}
                className={cn("flex flex-col", message.mine ? "items-end" : "items-start")}
              >
                <p className="mb-0.5 text-[12px] text-text-body">
                  <span className="font-semibold text-text-strong">
                    {message.mine ? "Kamu" : message.authorName}
                  </span>
                  {!message.mine && message.authorRole && ` · ${ROLE_LABEL[message.authorRole]}`}
                  {" · "}
                  <span className="tabular-nums">{formatJam(message.createdAt)}</span>
                </p>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap text-text-strong sm:max-w-[70%]",
                    message.mine
                      ? "rounded-br-md bg-nav-active"
                      : "rounded-bl-md border border-border bg-white",
                  )}
                >
                  {splitMentions(message.body, names).map((segment, part) =>
                    segment.mention ? (
                      <span key={part} className="font-semibold text-brand">
                        {segment.text}
                      </span>
                    ) : (
                      <span key={part}>{segment.text}</span>
                    ),
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
