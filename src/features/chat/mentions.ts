// Mention di Chat Tim: "@semua" dan "@Nama Staf". Murni supaya bisa diuji dan dipakai di klien
// (sorotan, saran) maupun server (siapa yang ditandai). Nama dicocokkan tanpa beda huruf besar
// kecil; nama terpanjang dicek dulu supaya "@Ani Putri" tidak terbaca sebagai "@Ani".

import type { Role } from "@/lib/access"

export const MENTION_ALL = "semua"

/** Hanya Owner dan Admin yang boleh menandai semua staf sekaligus. */
export const CAN_MENTION_ALL: readonly Role[] = ["owner", "admin"]

export type ChatMember = { id: string; name: string }

export type MentionSegment = { text: string; mention: boolean }

const BOUNDARY = /[\s.,!?;:)\]}"'…-]|$/

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Pola semua mention yang dikenal, nama terpanjang dulu. */
function mentionPattern(names: string[]): RegExp {
  const unique = [...new Set([MENTION_ALL, ...names.map((name) => name.trim()).filter(Boolean)])]
  unique.sort((a, b) => b.length - a.length)
  return new RegExp(
    `(^|[\\s(])@(${unique.map(escapeRegExp).join("|")})(?=${BOUNDARY.source})`,
    "gi",
  )
}

/** Siapa yang ditandai di pesan ini: `all` untuk "@semua", `ids` untuk "@Nama". */
export function findMentions(body: string, members: ChatMember[]): { all: boolean; ids: string[] } {
  const byName = new Map(members.map((member) => [member.name.trim().toLowerCase(), member.id]))
  const ids = new Set<string>()
  let all = false
  for (const match of body.matchAll(mentionPattern(members.map((member) => member.name)))) {
    const name = match[2].toLowerCase()
    if (name === MENTION_ALL) all = true
    else {
      const id = byName.get(name)
      if (id) ids.add(id)
    }
  }
  return { all, ids: [...ids] }
}

/** Pecah pesan menjadi teks biasa dan mention, untuk menyorot "@Nama" saat ditampilkan. */
export function splitMentions(body: string, names: string[]): MentionSegment[] {
  const segments: MentionSegment[] = []
  let last = 0
  for (const match of body.matchAll(mentionPattern(names))) {
    const start = match.index + match[1].length
    if (start > last) segments.push({ text: body.slice(last, start), mention: false })
    segments.push({ text: `@${match[2]}`, mention: true })
    last = start + 1 + match[2].length
  }
  if (last < body.length) segments.push({ text: body.slice(last), mention: false })
  return segments
}

/**
 * Teks "@..." yang sedang diketik tepat sebelum kursor, untuk saran nama. Boleh berisi spasi
 * karena nama staf bisa lebih dari satu kata ("@QA Ka"); saran yang tidak cocok disaring oleh
 * pemanggil. Null bila kursor tidak sedang di dalam mention.
 */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret)
  const match = before.match(/(^|\s)@([^@\n]{0,30})$/)
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2] }
}
