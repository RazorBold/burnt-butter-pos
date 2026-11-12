import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import type { Page } from "@playwright/test"

/** File sesi per akun, ditulis oleh e2e/auth.setup.ts (tidak di-commit). */
export function sessionFile(email: string) {
  return path.resolve("e2e/.auth", `${email}.json`)
}

/**
 * Masuk sebagai akun ini lalu buka `target`. Akun QA memakai sesi yang disimpan sekali oleh
 * auth.setup.ts, supaya satu run tidak login puluhan kali (batas rate Supabase Auth).
 * Akun lain (mis. staf uji yang dibuat di dalam test) login lewat form seperti biasa.
 */
/** Awal run e2e (satu worker = satu proses). */
const RUN_STARTED_AT = new Date().toISOString()

/**
 * Database e2e = database produksi, jadi bisa ada pesanan urgent asli yang popup-nya menutupi
 * layar test. Urgent yang ditandai sebelum run dimulai dianggap sudah dilihat; urgent yang dibuat
 * test sendiri (urgent.spec.ts) tetap memunculkan popup.
 */
async function ignorePreexistingUrgent(page: Page) {
  await page.context().addInitScript((startedAt) => {
    const getItem = Storage.prototype.getItem
    Storage.prototype.getItem = function (key: string) {
      const value = getItem.call(this, key)
      return value === null && key.startsWith("urgent:seen:") ? startedAt : value
    }
  }, RUN_STARTED_AT)
}

export async function loginAs(page: Page, email: string, password: string, target: string) {
  await ignorePreexistingUrgent(page)
  const file = sessionFile(email)
  if (existsSync(file)) {
    const { cookies } = JSON.parse(readFileSync(file, "utf8"))
    await page.context().addCookies(cookies)
    await page.goto(target)
    return
  }
  await page.goto(target)
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Kata sandi", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Masuk" }).click()
}
