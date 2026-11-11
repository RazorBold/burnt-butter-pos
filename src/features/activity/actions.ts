"use server"

import { requireUser } from "@/lib/auth"

import type { Activity } from "./feed"
import { listActivity } from "./queries"

/** Polling lonceng notifikasi (tiap ±20 detik). Akun QA ikut melihat data uji e2e. */
export async function fetchActivity(): Promise<Activity[]> {
  const user = await requireUser()
  return listActivity(user.role, user.name.startsWith("QA "))
}
