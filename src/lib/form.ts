import type { z } from "zod"

/** Pesan error pertama per field, untuk ditampilkan di bawah input. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form")
    result[key] ??= issue.message
  }
  return result
}
