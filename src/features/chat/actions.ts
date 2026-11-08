"use server"

import { sql } from "drizzle-orm"
import { z } from "zod"

import { getDb } from "@/db"
import { chatMentions, chatMessages, chatReads } from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"

import { CAN_MENTION_ALL, findMentions } from "./mentions"
import { activeProfileIds, type ChatFeed, getChatFeed, listChatMembers } from "./queries"

type Result<T> = ({ ok: true } & T) | { ok: false; message: string }

const SESSION_ENDED = "Sesi berakhir. Muat ulang halaman lalu masuk lagi."

/**
 * Ambil pesan Chat Tim untuk polling (semua staf yang login). `after` = waktu pesan terakhir
 * yang sudah dimiliki klien (ISO); tanpa `after` = 60 pesan terakhir.
 */
export async function fetchChat(after?: unknown): Promise<Result<{ feed: ChatFeed }>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: SESSION_ENDED }
  const since = z.iso.datetime({ offset: true }).optional().safeParse(after)
  const feed = await getChatFeed(
    user.id,
    since.success && since.data ? new Date(since.data) : undefined,
  )
  return { ok: true, feed }
}

const bodySchema = z
  .string()
  .trim()
  .min(1, "Pesan masih kosong.")
  .max(1000, "Pesan terlalu panjang (maks. 1.000 huruf).")

/**
 * Kirim pesan. Mention dibaca server dari isi pesan (bukan dari klien): "@semua" hanya untuk
 * Owner dan Admin; "@Nama" hanya untuk staf aktif.
 */
export async function sendChatMessage(body: unknown): Promise<Result<{ id: string }>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: SESSION_ENDED }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const members = await listChatMembers()
  const mentions = findMentions(parsed.data, members)
  if (mentions.all && !CAN_MENTION_ALL.includes(user.role)) {
    return {
      ok: false,
      message: "@semua hanya untuk Owner dan Admin. Sebut nama orangnya, mis. @Andi.",
    }
  }
  const ids = (await activeProfileIds(mentions.ids)).filter((id) => id !== user.id)

  const id = await getDb().transaction(async (tx) => {
    const [message] = await tx
      .insert(chatMessages)
      .values({ authorId: user.id, body: parsed.data, mentionsAll: mentions.all })
      .returning({ id: chatMessages.id })
    if (ids.length > 0) {
      await tx
        .insert(chatMentions)
        .values(ids.map((profileId) => ({ messageId: message.id, profileId })))
    }
    // Pesan sendiri dianggap sudah dibaca.
    await tx
      .insert(chatReads)
      .values({ profileId: user.id, lastReadAt: sql`now()` })
      .onConflictDoUpdate({ target: chatReads.profileId, set: { lastReadAt: sql`now()` } })
    return message.id
  })
  return { ok: true, id }
}

/** Tandai semua pesan sudah dibaca (saat panel Chat Tim terbuka). */
export async function markChatRead(): Promise<Result<object>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, message: SESSION_ENDED }
  await getDb()
    .insert(chatReads)
    .values({ profileId: user.id, lastReadAt: sql`now()` })
    .onConflictDoUpdate({ target: chatReads.profileId, set: { lastReadAt: sql`now()` } })
  return { ok: true }
}
