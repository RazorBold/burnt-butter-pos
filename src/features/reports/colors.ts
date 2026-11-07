// Palet laporan, divalidasi dengan dataviz/validate_palette.js terhadap permukaan kartu #fbf7f3:
// Personal/Hadiah dan metode kirim (termasuk Ekspedisi) lolos semua cek kategorikal; status memakai gradasi ordinal
// satu hue (Baru terang → Selesai gelap). Warna desain asli (#7c4627 dll.) gagal chroma & CVD.
// Modul biasa (bukan "use client") supaya nilainya bisa dibaca Server Component juga.
export const REPORT_COLORS = {
  personal: "#8c4519",
  hadiah: "#e4605c",
  kurir_internal: "#8c4519",
  instant: "#d98a1e",
  pick_up: "#4f8a55",
  ekspedisi: "#2f6f9f",
  baru: "#d9a877",
  diproses: "#c4874f",
  siap_packing: "#ad6c37",
  siap_kirim: "#934f23",
  dikirim: "#733812",
  selesai: "#52250b",
} as const
