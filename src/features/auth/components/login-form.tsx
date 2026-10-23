"use client"

import { CircleAlert, Eye, EyeOff, Info, LoaderCircle } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signIn, type SignInState } from "@/features/auth/actions"

const fieldClass = "h-11 rounded-lg bg-white px-3 text-[15px]"

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, {})
  const [showPassword, setShowPassword] = useState(false)
  const errorId = state.error ? "login-error" : undefined

  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {notice && !state.error && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-status-baru px-3 py-2.5 text-sm text-status-baru-fg"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          {notice}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-text-strong">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state.email}
          aria-invalid={Boolean(state.error)}
          aria-describedby={errorId}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-text-strong">
          Kata sandi
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.error)}
            aria-describedby={errorId}
            className={`${fieldClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-text-body outline-none hover:text-brand-ink focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state.error && (
        <p
          id="login-error"
          role="alert"
          className="flex items-start gap-2 rounded-lg bg-trend-down px-3 py-2.5 text-sm text-trend-down-fg"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="h-11 w-full rounded-lg text-[15px]">
        {pending ? (
          <>
            <LoaderCircle className="animate-spin" aria-hidden />
            Memeriksa…
          </>
        ) : (
          "Masuk"
        )}
      </Button>
    </form>
  )
}
