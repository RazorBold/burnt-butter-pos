"use client"

import { useActionState, useTransition } from "react"

/**
 * Seperti useActionState, tapi isian form TIDAK dikosongkan setelah aksi selesai.
 * React 19 me-reset form yang memakai <form action={…}> setiap kali aksi selesai, termasuk saat
 * validasi gagal, sehingga pengguna harus mengetik ulang. Pakai `onSubmit` dari hook ini.
 */
export function useActionForm<State>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
) {
  const [state, dispatch, pending] = useActionState(action, initialState)
  const [, startTransition] = useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }

  return { state, pending, onSubmit }
}
