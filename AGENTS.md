# AGENTS.md

Panduan untuk agent AI (Claude Code, dll.) yang mengerjakan repo ini. Balas pengguna dalam **Bahasa Indonesia**.

## Proyek

Web Management POS untuk **Burnt Butter & Segelas Awan**: panel admin internal untuk input pesanan dari WhatsApp, produksi harian, pengiriman, stok, dan laporan.

| Dokumen | Isi |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Kebutuhan produk, kode fitur F-xx, alur status, pertanyaan terbuka |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, struktur folder, skema DB, auth, env, deploy |
| [docs/DESIGN.md](docs/DESIGN.md) | Token warna, tipografi, layout, komponen |
| [docs/design/](docs/design/) | Gambar desain tiap layar (sumber kebenaran visual) |

## Stack singkat

Next.js 16 (App Router) + React 19 + TypeScript strict · Tailwind CSS 4 + shadcn/ui · Supabase (Postgres, Auth, Storage) free tier · Drizzle ORM · zod + react-hook-form · TanStack Table · Recharts · motion · date-fns · Vitest + Playwright · pnpm · deploy ke Vercel. Detail dan alasannya ada di ARCHITECTURE.md.

## Perintah

```bash
pnpm dev            # server lokal
pnpm build          # build produksi
pnpm lint           # ESLint
pnpm typecheck      # next typegen && tsc --noEmit
pnpm format         # Prettier (tanpa titik koma, kutip ganda)
pnpm test           # Vitest
pnpm db:generate    # buat migrasi dari src/db/schema.ts
pnpm db:migrate     # jalankan migrasi (pakai DIRECT_DATABASE_URL)
pnpm db:seed        # isi data contoh dari gambar desain
pnpm db:studio      # Drizzle Studio
```

Playwright (`pnpm test:e2e`) belum dipasang; tambahkan saat e2e pertama dibuat. Tanpa `.env.local`, `pnpm dev` tetap jalan (proxy melewatkan auth di mode dev), tapi halaman yang membaca DB akan error.

## Backlog di Multica

PRD dan backlog dicatat di Multica (workspace **Bellatrix**, project **Web Management POS - Burnt Butter**). Multica **hanya untuk mencatat**; semua coding dilakukan di repo ini.

- CLI: `C:\Users\telkom\.multica\bin\multica.exe` (tidak ada di PATH).
- PRD = BELL-2. Epic dan sub-issue = BELL-3 sampai BELL-36. Pertanyaan terbuka = BELL-37.
- Sebelum mulai, cari issue yang sesuai: `multica issue get BELL-xx`.
- Pindahkan status **selalu dengan `--no-start`**: `multica issue status BELL-xx in_progress --no-start`, lalu `done` setelah selesai.
- **Jangan pernah assign issue ke agent Multica.** Itu akan menjalankan agent di sana.
- Setelah selesai, tambahkan komentar singkat di issue: apa yang dibuat, file utama, hal yang ditunda.
- Keputusan baru dari pengguna: centang di BELL-37 dan perbarui docs/PRD.md.

## Aturan kode

- **Bahasa:** teks UI, URL, dan pesan error untuk pengguna dalam Bahasa Indonesia. Identifier kode, tabel, dan kolom dalam bahasa Inggris (lihat glosarium).
- **Next 16 berbeda dari yang kamu tahu:** baca panduan terkait di `node_modules/next/dist/docs/` sebelum memakai API Next. Middleware sekarang bernama `src/proxy.ts`.
- **Cache Components aktif** (`cacheComponents: true`). Data dinamis secara default. Komponen yang membaca `cookies()`, sesi, atau DB per request harus berada di dalam `<Suspense>`, dengan skeleton sebagai fallback. Kalau tidak, build error. Jangan `await` sesi di level atas layout. Panduan: `01-app/02-guides/authentication-with-cache-components.md`.
- **Server dulu:** halaman adalah Server Component. `"use client"` hanya untuk komponen yang butuh state atau event.
- **Database:** pakai `getDb()` dari `@/db` (koneksi dibuat saat pertama dipakai). Script Node di luar Next (seed, tool) membuat klien sendiri dan tidak boleh mengimpor `@/db`, karena modul itu memakai `server-only`.
- **Mutasi** lewat Server Action di `src/features/<modul>/actions.ts`. Setiap action: `requireRole()` → validasi zod → transaksi Drizzle → `revalidatePath`.
- **Query** di `src/features/<modul>/queries.ts`; jangan menulis query di komponen.
- **Filter dan paginasi** disimpan di URL search params, supaya bisa dibagikan dan tetap ada setelah refresh.
- **Uang:** integer rupiah. Format hanya lewat `formatRupiah()` di `src/lib/format.ts`.
- **Waktu:** simpan `timestamptz`, tampilkan dalam WIB lewat helper di `src/lib/format.ts`. Rentang "Hari Ini" dihitung dalam zona `Asia/Jakarta`.
- **Nomor pesanan** hanya dibuat di server lewat `order_counters` di dalam transaksi.
- **Migrasi:** ubah `src/db/schema.ts`, lalu `pnpm db:generate`. Jangan mengedit file migrasi yang sudah dijalankan.
- **Rahasia:** jangan commit `.env*` (kecuali `.env.example`). `SUPABASE_SECRET_KEY` hanya dipakai di server.
- **Test:** parser WA (`src/lib/wa-parser`) wajib punya unit test dengan contoh pesan nyata. Logika status, nomor pesanan, dan perhitungan total juga diberi test.

## Aturan UI

- Cocokkan dengan gambar di `docs/design/` dan token di `docs/DESIGN.md`. Jangan memakai warna di luar token.
- Status selalu tampil sebagai ikon + teks, tidak hanya warna. Fokus keyboard harus terlihat. Kontras teks minimal 4.5:1.
- Layar yang belum ada desainnya (form hasil Isi Otomatis, Pembayaran, Produksi, dll.): ikuti pola layar yang sudah ada, lalu catat keputusan desainnya di DESIGN.md.
- Claude Code: untuk pekerjaan UI, pakai skill `frontend-design`, `impeccable` (jalankan critique/polish sebelum selesai), `ui-ux-pro-max` (checklist UX/aksesibilitas), dan `motion-dev-animations` sesuai instruksi global pengguna. Desain di repo ini adalah brief, jadi skill dipakai untuk eksekusi dan review, bukan untuk mengganti arah visual.

## Selesai berarti

1. `pnpm typecheck`, `pnpm lint`, `pnpm test` lulus.
2. Layar dicek di browser pada lebar 1536 px dan 1024 px, dan dibandingkan dengan gambar desain.
3. Akses role dicek: role yang tidak berhak tidak bisa melihat atau menjalankan aksi.
4. Status issue di Multica diperbarui (`--no-start`) dan diberi komentar.
5. Commit hanya bila pengguna meminta. Pesan commit menyebut kode issue, contoh: `feat(pesanan): tabel daftar pesanan (BELL-17)`.

## Glosarium

| UI (Indonesia) | Kode / DB |
| --- | --- |
| Pesanan | `order` / `orders` |
| Item menu pesanan | `order_items` |
| Tipe: Personal / Hadiah | `type`: `personal` / `hadiah` |
| Status: Baru, Diproses, Siap Kirim, Dikirim, Selesai, Dibatalkan | `baru`, `diproses`, `siap_kirim`, `dikirim`, `selesai`, `dibatalkan` |
| Pengiriman | `shipment` / `shipments` |
| Metode: Kurir Internal, Instant, Pick Up | `kurir_internal`, `instant`, `pick_up` |
| Status kirim: Menunggu Kurir, Siap Dikirim, Siap Diambil, Dalam Perjalanan, Dikirim, Selesai | `menunggu_kurir`, `siap_dikirim`, `siap_diambil`, `dalam_perjalanan`, `dikirim`, `selesai` |
| Pembayaran / Metode Pembayaran | `payments` / `payment_methods` |
| Produk & Menu, ukuran Large / Regular | `menus`, `menu_variants.size`: `large` / `regular` / `single` |
| Stok Packaging | `packagings` |
| Bahan Baku | `raw_materials` |
| Kurir | `couriers` |
| User / Staff, role | `profiles.role`: `admin`, `kasir`, `produksi`, `owner` |

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
