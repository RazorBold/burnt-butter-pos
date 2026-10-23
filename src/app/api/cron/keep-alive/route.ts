import { sql } from "drizzle-orm"

import { getDb } from "@/db"

// Dipanggil Vercel Cron sekali sehari (lihat vercel.json) supaya project Supabase free
// tidak di-pause karena idle. Vercel mengirim header Authorization: Bearer <CRON_SECRET>.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false }, { status: 401 })
  }

  await getDb().execute(sql`select 1`)
  return Response.json({ ok: true, at: new Date().toISOString() })
}
