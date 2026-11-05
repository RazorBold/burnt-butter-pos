"use client"

import { ImageUp } from "lucide-react"
import Image from "next/image"
import { useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { photoFileError, photoSrc, PHOTO_TYPES } from "@/lib/photos"

/**
 * Isian foto untuk form (Menu, Packaging): pratinjau, tombol Pilih/Ganti foto, validasi tipe dan
 * ukuran di klien. File dikirim lewat input bernama `name` di dalam form.
 */
export function PhotoField({
  label,
  initialPath,
  error,
  onErrorChange,
  name = "photo",
}: {
  label: string
  initialPath?: string | null
  /** Error dari server (mis. upload gagal). */
  error?: string
  /** Dipanggil saat file yang dipilih tidak valid / sudah valid lagi (untuk menonaktifkan Simpan). */
  onErrorChange?: (error: string | null) => void
  name?: string
}) {
  const id = useId()
  const [preview, setPreview] = useState<string | null>(photoSrc(initialPath))
  const [localError, setLocalError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function setError(message: string | null) {
    setLocalError(message)
    onErrorChange?.(message)
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)
    if (!file) return
    setFileName(file.name)
    const invalid = photoFileError(file)
    if (invalid) {
      setError(invalid)
      event.target.value = ""
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  const message = localError ?? error

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#dccbbb] bg-white">
        {preview ? (
          <Image
            src={preview}
            alt=""
            fill
            sizes="96px"
            className="object-cover"
            unoptimized={preview.startsWith("blob:")}
          />
        ) : (
          <ImageUp className="size-7 text-text-body" aria-hidden />
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${id}-photo`} className="text-text-strong">
          {label}
        </Label>
        {/* Input file asli disembunyikan (tombol bawaannya mengikuti bahasa browser). */}
        <input
          suppressHydrationWarning
          ref={fileInput}
          id={`${id}-photo`}
          name={name}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          onChange={onChange}
          aria-describedby={`${id}-photo-help`}
          className="sr-only"
        />
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInput.current?.click()}
            className="h-9 shrink-0 rounded-lg bg-white px-3 text-brand-ink"
          >
            <ImageUp aria-hidden />
            {preview ? "Ganti foto" : "Pilih foto"}
          </Button>
          {fileName && <span className="truncate text-sm text-text-body">{fileName}</span>}
        </div>
        <p id={`${id}-photo-help`} className="text-[13px] text-text-body">
          JPG, PNG, atau WebP, maksimal 4 MB.
        </p>
        {message && <p className="text-sm text-trend-down-fg">{message}</p>}
      </div>
    </div>
  )
}
