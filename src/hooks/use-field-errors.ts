"use client"

import { useState } from "react"

type FormState = { errors?: Record<string, string> }

/**
 * Error per field dari Server Action yang hilang begitu field itu diubah, dan muncul lagi
 * (bila masih salah) di pengiriman berikutnya. Pasang `onFormChange` di <form onChange>,
 * dan panggil `markEdited(name)` untuk kontrol yang tidak memicu onChange (Select, toggle).
 */
export function useFieldErrors(state: FormState) {
  const [editedFor, setEditedFor] = useState(state)
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set())
  if (editedFor !== state) {
    setEditedFor(state)
    setEdited(new Set())
  }

  const markEdited = (...names: string[]) =>
    setEdited((prev) => (names.every((n) => prev.has(n)) ? prev : new Set([...prev, ...names])))

  const errors: Record<string, string> = Object.fromEntries(
    Object.entries(state.errors ?? {}).filter(([name]) => !edited.has(name)),
  )

  function onFormChange(event: React.FormEvent<HTMLFormElement>) {
    // event.target = field yang berubah (input/textarea), bukan form-nya.
    const field = event.target as unknown as { name?: unknown }
    if (typeof field.name === "string" && field.name) markEdited(field.name)
  }

  return {
    errors,
    hasErrors: Object.keys(errors).length > 0,
    markEdited,
    onFormChange,
  }
}
