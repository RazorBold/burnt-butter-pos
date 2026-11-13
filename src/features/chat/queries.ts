import "server-only"

import { and, asc, count, desc, eq, gt, gte, inArray, lt, ne, or, sql } from "drizzle-orm"

import { getDb } from "@/db"
import { chatMentions, chatMessages, chatReads, profiles } from "@/db/schema"
import type { Role } from "@/lib/access"
import { toJakartaDateString } from "@/lib/format"

import type { ChatMember } from "./mentions"

export const CHAT_PAGE_SIZE = 60

/** Awal hari (00:00 WIB) untuk tanggal "YYYY-MM-DD". */
const startOfDay = (day: string) => new Date(`${day}T00:00:00+07:00`)

/**
 * Chat Tim dimulai kosong setiap hari (permintaan pemilik toko, 13 Nov 2026): panel hanya
 * menampilkan pesan hari ini (WIB). Pesan lama tidak dihapus, tapi tersimpan sebagai log per
 * hari di halaman Riwayat Chat.
 */
function sinceToday() {
  return gte(chatMessages.createdAt, startOfDay(toJakartaDateString(new Date())))
}

export type ChatMemberRow = ChatMember & { role: Role }

export type ChatMessageView = {
  id: string
  authorId: string | null
  authorName: string
  authorRole: Role | null
  body: string
  /** ISO, supaya aman dikirim lewat Server Action. */
  createdAt: string
  mine: boolean
  /** Pesan ini menandai saya (@semua atau @nama saya). */
  mentionsMe: boolean
}

export type ChatFeed = {
  messages: ChatMessageView[]
  /** Pesan orang lain setelah terakhir saya membuka chat. */
  unread: number
  /** Di antaranya, yang menandai saya. */
  unreadMentions: number
}

/** Staf aktif, untuk saran @nama dan sorotan mention. */
export async function listChatMembers(): Promise<ChatMemberRow[]> {
  return getDb()
    .select({ id: profiles.id, name: profiles.name, role: profiles.role })
    .from(profiles)
    .where(eq(profiles.isActive, true))
    .orderBy(asc(profiles.name))
}

/**
 * Pesan untuk user ini: `after` = hanya yang lebih baru (polling), tanpa `after` = 60 terakhir.
 * Ditambah jumlah belum dibaca dan mention yang belum dibaca.
 */
export async function getChatFeed(userId: string, after?: Date): Promise<ChatFeed> {
  const db = getDb()
  const mentionsMe = sql<boolean>`(${chatMessages.mentionsAll} or exists (
    select 1 from ${chatMentions}
    where ${chatMentions.messageId} = ${chatMessages.id} and ${chatMentions.profileId} = ${userId}
  ))`

  const rows = await db
    .select({
      id: chatMessages.id,
      authorId: chatMessages.authorId,
      authorName: profiles.name,
      authorRole: profiles.role,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      mentionsMe: mentionsMe.mapWith(Boolean),
    })
    .from(chatMessages)
    .leftJoin(profiles, eq(profiles.id, chatMessages.authorId))
    .where(and(sinceToday(), after ? gt(chatMessages.createdAt, after) : undefined))
    .orderBy(desc(chatMessages.createdAt), desc(chatMessages.id))
    .limit(CHAT_PAGE_SIZE)

  const [read] = await db
    .select({ lastReadAt: chatReads.lastReadAt })
    .from(chatReads)
    .where(eq(chatReads.profileId, userId))
  const unreadWhere = and(
    sinceToday(),
    read ? gt(chatMessages.createdAt, read.lastReadAt) : undefined,
    or(sql`${chatMessages.authorId} is null`, ne(chatMessages.authorId, userId)),
  )
  const [counts] = await db
    .select({
      unread: count(),
      unreadMentions: sql<number>`count(*) filter (where ${mentionsMe})`.mapWith(Number),
    })
    .from(chatMessages)
    .where(unreadWhere)

  return {
    messages: rows.reverse().map((row) => ({
      id: row.id,
      authorId: row.authorId,
      authorName: row.authorName ?? "Akun dihapus",
      authorRole: row.authorRole,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      mine: row.authorId === userId,
      mentionsMe: row.mentionsMe && row.authorId !== userId,
    })),
    unread: counts?.unread ?? 0,
    unreadMentions: counts?.unreadMentions ?? 0,
  }
}

/** Id staf aktif dari daftar id (untuk menyimpan mention hanya ke akun yang masih aktif). */
export async function activeProfileIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return []
  const rows = await getDb()
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(inArray(profiles.id, ids), eq(profiles.isActive, true)))
  return rows.map((row) => row.id)
}

export type ChatLogDay = { day: string; count: number }

/** Hari-hari yang punya pesan (WIB), terbaru di atas, untuk daftar Riwayat Chat. */
export async function listChatLogDays(limit = 60): Promise<ChatLogDay[]> {
  const day = sql<string>`to_char(${chatMessages.createdAt} at time zone 'Asia/Jakarta', 'YYYY-MM-DD')`
  return getDb()
    .select({ day, count: count() })
    .from(chatMessages)
    .groupBy(day)
    .orderBy(desc(day))
    .limit(limit)
}

/** Semua pesan pada satu hari (WIB), urut waktu, untuk log Riwayat Chat. */
export async function getChatLog(day: string, userId: string): Promise<ChatMessageView[]> {
  const next = new Date(startOfDay(day).getTime() + 86_400_000)
  const rows = await getDb()
    .select({
      id: chatMessages.id,
      authorId: chatMessages.authorId,
      authorName: profiles.name,
      authorRole: profiles.role,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      mentionsAll: chatMessages.mentionsAll,
    })
    .from(chatMessages)
    .leftJoin(profiles, eq(profiles.id, chatMessages.authorId))
    .where(and(gte(chatMessages.createdAt, startOfDay(day)), lt(chatMessages.createdAt, next)))
    .orderBy(asc(chatMessages.createdAt), asc(chatMessages.id))
  return rows.map((row) => ({
    id: row.id,
    authorId: row.authorId,
    authorName: row.authorName ?? "Akun dihapus",
    authorRole: row.authorRole,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    mine: row.authorId === userId,
    mentionsMe: false,
  }))
}
