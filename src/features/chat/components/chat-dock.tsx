"use client"

import { AtSign, History, LoaderCircle, MessagesSquare, SendHorizontal, X } from "lucide-react"
import Link from "next/link"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"

import { fetchChat, markChatRead, sendChatMessage } from "@/features/chat/actions"
import { CAN_MENTION_ALL, MENTION_ALL, mentionQuery, splitMentions } from "@/features/chat/mentions"
import type { ChatMemberRow, ChatMessageView } from "@/features/chat/queries"
import { ROLE_LABEL, type Role } from "@/lib/access"
import { formatJam, formatTanggal, toJakartaDateString } from "@/lib/format"
import { cn } from "@/lib/utils"

const OPEN_KEY = "chat-tim:open"
/** Panel terbuka: cek pesan baru tiap 4 detik; tertutup: tiap 15 detik (untuk badge). */
const POLL_OPEN_MS = 4_000
const POLL_CLOSED_MS = 15_000

type Me = { id: string; name: string; role: Role }
type Suggestion = { id: string; label: string; hint: string }

/**
 * Chat Tim: satu ruang obrolan untuk semua staf, di sisi kanan layar dan bisa disembunyikan.
 * Pesan diambil berkala (polling); badge menunjukkan pesan belum dibaca dan mention.
 */
export function ChatDock({ me, members }: { me: Me; members: ChatMemberRow[] }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [loaded, setLoaded] = useState(false)
  const [unread, setUnread] = useState(0)
  const [unreadMentions, setUnreadMentions] = useState(0)
  const openRef = useRef(open)
  const lastRef = useRef<string | undefined>(undefined)
  const dayRef = useRef<string | undefined>(undefined)

  // Status buka/tutup diingat per browser (bukan data penting, jadi cukup localStorage).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- baca preferensi setelah hydrate
      if (localStorage.getItem(OPEN_KEY) === "1") setOpen(true)
    } catch {
      // Penyimpanan diblokir: mulai tertutup.
    }
  }, [])
  useLayoutEffect(() => {
    openRef.current = open
  }, [open])

  function setPanel(next: boolean) {
    setOpen(next)
    try {
      localStorage.setItem(OPEN_KEY, next ? "1" : "0")
    } catch {
      // abaikan
    }
  }

  const poll = useCallback(async () => {
    // Hari berganti (WIB): chat mulai kosong lagi, pesan kemarin pindah ke Riwayat Chat.
    const today = toJakartaDateString(new Date())
    if (dayRef.current !== today) {
      if (dayRef.current !== undefined) setMessages([])
      dayRef.current = today
      lastRef.current = undefined
    }
    const result = await fetchChat(lastRef.current)
    if (!result.ok) return
    const { feed } = result
    const initial = lastRef.current === undefined
    if (feed.messages.length > 0) {
      lastRef.current = feed.messages[feed.messages.length - 1].createdAt
      setMessages((current) => {
        const known = new Set(current.map((message) => message.id))
        return [...current, ...feed.messages.filter((message) => !known.has(message.id))]
      })
      // Tandai saya saat panel tertutup: beri tahu lewat toast.
      if (!initial && !openRef.current) {
        const mention = feed.messages.find((message) => message.mentionsMe)
        if (mention) {
          toast(`${mention.authorName} menandai kamu di Chat Tim`, {
            description: mention.body.slice(0, 120),
            action: { label: "Buka", onClick: () => setPanel(true) },
          })
        }
      }
    } else if (initial) {
      lastRef.current = new Date(0).toISOString()
    }
    setLoaded(true)
    if (openRef.current) {
      if (feed.unread > 0) await markChatRead()
      setUnread(0)
      setUnreadMentions(0)
    } else {
      setUnread(feed.unread)
      setUnreadMentions(feed.unreadMentions)
    }
  }, [])

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    async function tick() {
      if (!document.hidden) await poll().catch(() => undefined)
      if (!stopped) timer = window.setTimeout(tick, open ? POLL_OPEN_MS : POLL_CLOSED_MS)
    }
    void tick()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [open, poll])

  const badge = unread > 99 ? "99+" : String(unread)

  return (
    <>
      {!open && (
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => setPanel(true)}
          aria-label={`Buka Chat Tim${unread ? `, ${unread} pesan belum dibaca` : ""}${unreadMentions ? `, ${unreadMentions} menandai kamu` : ""}`}
          className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-xl bg-brand px-2 py-3 text-white shadow-lg outline-none hover:bg-brand-ink focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <MessagesSquare className="size-5" aria-hidden />
          <span className="text-[12px] font-semibold [writing-mode:vertical-rl]">Chat Tim</span>
          {unread > 0 && (
            <span className="min-w-5 rounded-full bg-white px-1 text-center text-[11px] leading-5 font-bold text-brand-ink tabular-nums">
              {badge}
            </span>
          )}
          {unreadMentions > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-[#d93a2b] text-white">
              <AtSign className="size-3.5" aria-hidden />
            </span>
          )}
        </button>
      )}

      {open && (
        <aside
          aria-label="Chat Tim"
          className="fixed top-[76px] right-0 bottom-0 z-30 flex w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[380px]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="font-semibold text-brand-ink">Chat Tim</h2>
              <p className="text-[13px] text-text-body">
                Hari ini · {members.length} staf · ketik @ untuk menandai
              </p>
              <Link
                href="/riwayat-chat"
                className="mt-0.5 inline-flex items-center gap-1 rounded text-[13px] font-medium text-brand-ink underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <History className="size-3.5" aria-hidden />
                Riwayat chat
              </Link>
            </div>
            <button
              suppressHydrationWarning
              type="button"
              onClick={() => setPanel(false)}
              aria-label="Sembunyikan Chat Tim"
              className="flex size-9 items-center justify-center rounded-lg text-text-body outline-none hover:bg-nav-active focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <MessageList messages={messages} loaded={loaded} members={members} />
          <Composer me={me} members={members} onSent={() => void poll()} />
        </aside>
      )}
    </>
  )
}

function dayLabel(iso: string) {
  const day = toJakartaDateString(iso)
  const today = toJakartaDateString(new Date())
  const yesterday = toJakartaDateString(new Date(Date.now() - 86_400_000))
  if (day === today) return "Hari ini"
  if (day === yesterday) return "Kemarin"
  return formatTanggal(iso)
}

function MessageList({
  messages,
  loaded,
  members,
}: {
  messages: ChatMessageView[]
  loaded: boolean
  members: ChatMemberRow[]
}) {
  const ref = useRef<HTMLDivElement>(null)
  const names = members.map((member) => member.name)

  // Ikuti pesan terbaru bila pengguna sedang di bawah.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 160
    if (nearBottom || element.dataset.initial !== "done") {
      element.scrollTop = element.scrollHeight
      if (messages.length > 0) element.dataset.initial = "done"
    }
  }, [messages])

  return (
    <div
      ref={ref}
      role="log"
      aria-label="Pesan Chat Tim"
      className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
    >
      {!loaded ? (
        <p className="flex items-center gap-2 text-sm text-text-body">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Memuat pesan…
        </p>
      ) : messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-text-body">
          Belum ada pesan. Mulai koordinasi di sini, mis. &ldquo;@semua stok box hampers tinggal
          sedikit&rdquo;.
        </p>
      ) : (
        messages.map((message, index) => {
          const showDay =
            index === 0 ||
            toJakartaDateString(messages[index - 1].createdAt) !==
              toJakartaDateString(message.createdAt)
          return (
            <div key={message.id}>
              {showDay && (
                <p className="mb-3 text-center text-[12px] font-medium text-text-body">
                  {dayLabel(message.createdAt)}
                </p>
              )}
              <article
                aria-label={`Pesan dari ${message.authorName}`}
                className={cn("flex flex-col", message.mine ? "items-end" : "items-start")}
              >
                {!message.mine && (
                  <p className="mb-0.5 text-[12px] text-text-body">
                    <span className="font-semibold text-text-strong">{message.authorName}</span>
                    {message.authorRole && ` · ${ROLE_LABEL[message.authorRole]}`}
                  </p>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap text-text-strong",
                    message.mine
                      ? "rounded-br-md bg-nav-active"
                      : "rounded-bl-md border border-border bg-white",
                    message.mentionsMe && "border-brand ring-2 ring-brand/25",
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
                <p className="mt-0.5 text-[11px] text-text-body tabular-nums">
                  {formatJam(message.createdAt)}
                  {message.mentionsMe && " · menandai kamu"}
                </p>
              </article>
            </div>
          )
        })
      )}
    </div>
  )
}

function Composer({
  me,
  members,
  onSent,
}: {
  me: Me
  members: ChatMemberRow[]
  onSent: () => void
}) {
  const id = useId()
  const textarea = useRef<HTMLTextAreaElement>(null)
  const [draft, setDraft] = useState("")
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string>()
  /** Esc menutup saran nama sampai pengguna mengetik lagi. */
  const [dismissed, setDismissed] = useState(false)

  const query = mentionQuery(draft, caret)
  const canAll = CAN_MENTION_ALL.includes(me.role)
  const suggestions: Suggestion[] = query
    ? [
        ...(canAll ? [{ id: MENTION_ALL, label: MENTION_ALL, hint: "Tandai semua staf" }] : []),
        ...members
          .filter((member) => member.id !== me.id)
          .map((member) => ({ id: member.id, label: member.name, hint: ROLE_LABEL[member.role] })),
      ]
        .filter((option) => option.label.toLowerCase().includes(query.query.toLowerCase()))
        .slice(0, 6)
    : []
  const showSuggestions = !dismissed && suggestions.length > 0

  function pick(option: Suggestion) {
    if (!query) return
    const before = draft.slice(0, query.start)
    const after = draft.slice(caret)
    const inserted = `@${option.label} `
    const next = before + inserted + after
    const position = before.length + inserted.length
    setDraft(next)
    setCaret(position)
    setActive(0)
    requestAnimationFrame(() => {
      textarea.current?.focus()
      textarea.current?.setSelectionRange(position, position)
    })
  }

  async function send() {
    if (!draft.trim() || sending) return
    setSending(true)
    setError(undefined)
    const result = await sendChatMessage(draft)
    setSending(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setDraft("")
    setCaret(0)
    onSent()
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (showSuggestions) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault()
        const step = event.key === "ArrowDown" ? 1 : -1
        setActive((current) => (current + step + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault()
        pick(suggestions[Math.min(active, suggestions.length - 1)])
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        setDismissed(true)
        return
      }
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }

  return (
    <div className="relative border-t border-border px-3 py-3">
      {showSuggestions && (
        <ul
          id={`${id}-mentions`}
          role="listbox"
          aria-label="Pilih staf untuk ditandai"
          className="absolute right-3 bottom-full left-3 mb-1 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
        >
          {suggestions.map((option, index) => (
            <li
              key={option.id}
              id={`${id}-mention-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => {
                event.preventDefault()
                pick(option)
              }}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm",
                index === active ? "bg-nav-active" : "hover:bg-nav-active/60",
              )}
            >
              <span className="font-medium text-text-strong">@{option.label}</span>
              <span className="text-[12px] text-text-body">{option.hint}</span>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mb-2 text-[13px] text-trend-down-fg">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor={`${id}-input`} className="sr-only">
          Tulis pesan
        </label>
        <textarea
          ref={textarea}
          id={`${id}-input`}
          value={draft}
          rows={2}
          maxLength={1000}
          placeholder="Tulis pesan… ketik @ untuk menandai"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? `${id}-mentions` : undefined}
          aria-activedescendant={showSuggestions ? `${id}-mention-${active}` : undefined}
          onChange={(event) => {
            setDraft(event.target.value)
            setCaret(event.target.selectionStart)
            setActive(0)
            setDismissed(false)
            setError(undefined)
          }}
          onSelect={(event) => setCaret(event.currentTarget.selectionStart)}
          onKeyDown={onKeyDown}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm text-text-strong outline-none placeholder:text-text-body/70 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <button
          suppressHydrationWarning
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          aria-label="Kirim pesan"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand text-white outline-none hover:bg-brand-ink focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          {sending ? (
            <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <SendHorizontal className="size-5" aria-hidden />
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-text-body">
        Enter kirim · Shift+Enter baris baru{canAll ? " · @semua menandai semua staf" : ""}
      </p>
    </div>
  )
}
