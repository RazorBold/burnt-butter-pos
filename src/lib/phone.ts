// Nomor HP Indonesia. Disimpan sebagai "08xxxxxxxxxx", ditampilkan "0812 3456 7890".

/** "+62 812-3456-7890", "62812...", "0812 3456 7890" → "081234567890". Bukan nomor HP → null. */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  let digits = input.replace(/\D/g, "")
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`
  else if (digits.startsWith("8")) digits = `0${digits}`
  return /^08\d{8,12}$/.test(digits) ? digits : null
}

/** "081234567890" → "0812 3456 7890" (kelompok 4 digit). Kosong → "-". */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "-"
  return phone.replace(/(\d{4})(?=\d)/g, "$1 ")
}
