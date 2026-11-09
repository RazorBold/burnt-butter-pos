# Arsitektur & Stack

Web app admin Burnt Butter & Segelas Awan: **Next.js di Vercel + Supabase (Postgres, Auth, Storage) free tier**. Semua halaman dirender di server; client component hanya untuk interaksi (modal, filter, chart).

Versi dicek di npm per 23 Oktober 2026. Saat setup (BELL-4), kunci versi di `package.json`.

## Stack

| Lapisan | Pilihan | Versi | Alasan |
| --- | --- | --- | --- |
| Framework | Next.js App Router + React | 16.4 / 19.3 | Native di Vercel; Server Components + Server Actions, jadi tidak perlu API terpisah |
| Bahasa | TypeScript (strict) | 5.x | |
| Package manager | pnpm | 10.x | Sudah terpasang |
| Styling | Tailwind CSS | 4.3 | Token warna dari [DESIGN.md](DESIGN.md) jadi CSS variables |
| Komponen | shadcn/ui (Radix) | CLI 4.22 | Kode komponen ada di repo dan bisa diubah sesuai desain |
| Ikon | lucide-react | 1.61 | Ikon garis, cocok dengan desain |
| Database | Supabase Postgres (free) | — | Postgres asli; Auth dan Storage ada di layanan yang sama |
| ORM & migrasi | Drizzle ORM + drizzle-kit + `postgres` (postgres-js) | 0.45 / 0.31 / 3.4 | Type-safe, SQL-like, ringan untuk serverless |
| Auth | Supabase Auth via `@supabase/ssr` | 0.12 | Email + password; role disimpan di tabel `profiles` |
| File | Supabase Storage | — | Foto menu/packaging, bukti transfer |
| Validasi | zod | 4.6 | Dipakai bersama di form dan Server Action |
| Form | react-hook-form | 7.90 | |
| Tabel | @tanstack/react-table | 9.3 | Sorting, seleksi checkbox, paginasi |
| Chart | Recharts (lewat komponen chart shadcn) | 3.10 | Donat, bar, garis, sparkline |
| Animasi | motion (`motion/react`) | 14.6 | Seperlunya saja; hormati `prefers-reduced-motion` |
| Tanggal | date-fns + locale `id`, zona `Asia/Jakarta` | 4.4 | |
| Test | Vitest (unit, parser WA) + Playwright (e2e smoke) | 5.0 / 1.64 | |
| Hosting | Vercel, region fungsi `sin1` | — | Dekat dengan Supabase region Singapore |

### Batas paket gratis (cek lagi di halaman pricing sebelum produksi)

- **Supabase Free:** ±500 MB database, ±1 GB storage, 2 project aktif. Project **di-pause setelah ±7 hari tanpa aktivitas**. Ini aman untuk toko yang buka tiap hari; route cron `/api/cron/keep-alive` (Vercel Cron harian) jadi pengaman tambahan.
- **Vercel Hobby:** gratis, tapi syarat layanannya untuk pemakaian **non-komersial**. Untuk tahap pengembangan dan uji coba tidak masalah. Saat dipakai untuk operasional toko, rencanakan pindah ke Vercel Pro.

### Alternatif yang ditimbang

- **Neon + Auth.js + Vercel Blob:** semuanya gratis dan Neon tidak pernah di-pause. Kekurangannya, ada tiga layanan yang harus diurus, dan auth plus upload perlu dirakit sendiri. Bisa jadi rencana cadangan; skema Drizzle tetap sama.
- **Prisma:** lebih berat di serverless dan butuh engine/adapter. Drizzle lebih sederhana untuk skala ini.

## Struktur folder

```
src/
  app/
    (auth)/login/                 # halaman login
    (app)/layout.tsx              # shell: navbar global + modal Input Pesanan
    (app)/dashboard/
    (app)/pesanan/
    (app)/pembayaran/
    (app)/stok-packaging/
    (app)/produksi/
    (app)/pengiriman/
    (app)/laporan/[tab]/
    (app)/master-data/[section]/
    api/cron/keep-alive/route.ts
  components/
    ui/                           # hasil generate shadcn (boleh diubah)
    app/                          # komponen domain: KpiCard, StatusBadge, TypeBadge, DataTable, DetailPanel, FilterBar
  features/<modul>/               # per modul: queries.ts, actions.ts, schemas.ts, components/
  db/
    schema.ts                     # skema Drizzle (satu sumber kebenaran)
    index.ts                      # getDb(): klien lazy (postgres-js, prepare: false, max 10)
    seed.ts                       # data master dari gambar desain (klien sendiri, tanpa server-only)
  lib/
    supabase/{env,server,client,proxy}.ts
    auth.ts                       # getCurrentUser(), requireRole() (BELL-5)
    format.ts                     # formatRupiah, formatTanggal (WIB) + test
    wa-parser/                    # parser pesan WA + test (BELL-15)
  proxy.ts                        # Next 16 (pengganti middleware.ts): refresh sesi, redirect ke /login
public/images/menu/               # foto menu bawaan (.webp, hasil crop dari docs/design/menu makanan.png)
drizzle/                          # file migrasi hasil drizzle-kit (jangan diedit setelah dijalankan)
docs/                             # PRD, ARCHITECTURE, DESIGN, gambar desain
```

URL dan teks UI memakai Bahasa Indonesia (sama dengan navbar desain). Nama tabel, kolom, dan identifier kode memakai bahasa Inggris (lihat glosarium di [AGENTS.md](../AGENTS.md)).

## Model data (Postgres)

Uang disimpan sebagai `integer` dalam rupiah (tanpa desimal). Waktu disimpan sebagai `timestamptz` dan ditampilkan dalam WIB. Primary key `uuid`, kecuali disebut lain.

| Tabel | Kolom penting | Catatan |
| --- | --- | --- |
| `profiles` | id (= auth.users.id), name, role, is_active | role: `admin`, `kasir`, `produksi`, `owner` |
| `customers` | name, phone, address | phone dinormalisasi ke format `08…`; dipakai untuk mencocokkan customer lama |
| `menu_categories` | name (unik), sized, sort_order | Diatur Owner. `sized` = menu punya varian Large/Regular. Urutan kelompok di form pesanan (`groupCatalog` di `src/features/orders/catalog.ts`) |
| `menus` | name, slug, category_id, description, photo_path, is_active, is_archived | `category_id` → `menu_categories` (null hanya untuk menu arsip yang kategorinya dihapus). `is_archived` = dihapus tapi pernah dipesan. Kolom lama `category` (enum) tidak dipakai lagi dan dihapus di migrasi berikutnya. `photo_path` = `/images/menu/<slug>-large.webp` (bawaan) atau path di Supabase Storage (upload dari Master Data) |
| `menu_variants` | menu_id, size, price | size: `large`, `regular`, `single` (untuk menu tanpa ukuran) |
| `orders` | order_no (unik), customer_id, customer_name, channel, marketplace_order_no (unik per channel), type, kind (`po`/`ready_stock`/`made_to_order`, bawaan `po`), status, packaging_type (`normal`/`hampers`, diisi saat packing), delivery_date, request, note, total, raw_wa_text, sender_name, card_to, card_wishes, card_from, created_by | Hadiah: customer = penerima. `customer_name` = nama seperti diketik di pesanan itu (customer dikenali dari no. HP dan namanya ikut nama terbaru, jadi pesanan menyimpan namanya sendiri); pengirim + kartu ucapan di kolom `sender_name`/`card_*`. type: `personal`, `hadiah`. Status: `baru`, `diproses`, `siap_packing`, `siap_kirim`, `dikirim`, `selesai`, `dibatalkan` |
| `orders` (urgent) | urgent_at, urgent_by, urgent_note | Pesanan dadakan; label tampil selama belum Selesai/Dibatalkan (`isUrgent` di `src/features/orders/status.ts`). Popup + suara: `src/features/urgent` (polling 10 detik, bunyi Web Audio tanpa file) |
| `order_items` | order_id, menu_variant_id, qty, unit_price, subtotal, note | unit_price disalin saat pesanan dibuat, jadi perubahan harga tidak mengubah pesanan lama. Ubah menu (`updateOrderItems`) mengganti semua baris dalam satu transaksi; varian lama tetap memakai unit_price lamanya. `note` = catatan per menu |
| `order_counters` | date (PK), last_seq | dipakai membuat `order_no` = `BB` + `YYMMDD` + 3 digit, dalam satu transaksi |
| `order_status_logs` | order_id, from_status, to_status, changed_by, changed_at | audit trail |
| `couriers` | name, type, phone, is_active | type: `internal`, `eksternal` |
| `shipments` | order_id (unik), method, courier_id, slot, expedition, tracking_no, tracking_url, tracking_link_sent_at (kapan link lacak ditandai terkirim ke customer; null lagi saat link diganti), status, address_lat, address_lng | method: `kurir_internal`, `instant`, `pick_up`. Slot: `09-12`, `13-17`. Status: `menunggu_kurir`, `siap_dikirim`, `siap_diambil`, `dalam_perjalanan`, `dikirim`, `selesai`. Kosong sampai pesanan Siap Kirim, lalu Kurir Internal = `siap_dikirim`, Instant = `menunggu_kurir`, Pick Up = `siap_diambil` (`src/features/orders/status.ts`). Ekspedisi (olshop): `siap_dikirim` lalu Tandai Dikirim langsung `selesai` (`sentStatusFor`). Kolom `expedition` dan `tracking_no` tidak dipakai lagi sejak Nov 2026 (dibiarkan supaya data lama aman), dan `tracking_url` tidak berlaku untuk olshop |
| `payment_methods` | name, type, is_active | type: `bank`, `ewallet`, `cash` |
| `payments` | order_id (unik), payment_method_id, amount, status, note, paid_at, recorded_by | Satu baris per pesanan: ada baris `lunas` = Lunas, tidak ada = Belum bayar (tanpa DP). `proof_path` dan status `menunggu`/`ditolak` belum dipakai |
| `packaging_categories` | name (unik), sort_order | Diatur Owner. Urutan kelompok di Stok Packaging dan dialog packing (`groupByCategory` di `src/features/packagings/categories.ts`) |
| `packagings` | name, photo_path, stock, capacity, unit, min_stock, category_id, is_active, size, per_order_qty | `category_id` → `packaging_categories` (null = "Lainnya"). `is_active = false` = diarsipkan (packaging lama atau dihapus Owner padahal sudah punya riwayat stok), tidak tampil di mana pun. Kolom lama `size` tidak dipakai lagi (diganti kategori). `per_order_qty` belum dipakai |
| `menu_variant_packagings` | menu_variant_id, packaging_id (PK gabungan), qty | Belum dipakai (Nov 2026): disiapkan untuk aturan packaging otomatis per menu. Sekarang admin mengisi packaging per pesanan di menu Packaging |
| `raw_materials` | name, unit, stock, min_stock | status Cukup/Menipis/Habis dihitung, tidak disimpan |
| `stock_movements` | item_type, item_id, direction, qty, order_id, note, created_by | `direction`: `in`, `out`. Packing mencatat `out` dengan `order_id`; batal packing / pesanan dibatalkan mencatat `in` dengan `order_id` yang sama. Pemakaian bersih per pesanan = out − in (`changeStatuses` di `src/features/orders/status-change.ts`, satu transaksi dengan perubahan status) |
| `chat_messages` | author_id, body, mentions_all, created_at | Chat Tim: satu ruang untuk semua staf. Mention dibaca server dari isi pesan (`src/features/chat/mentions.ts`) |
| `chat_mentions` | message_id, profile_id (PK gabungan) | Staf yang disebut `@Nama` di pesan |
| `chat_reads` | profile_id (PK), last_read_at | Kapan staf terakhir membuka Chat Tim, untuk badge belum dibaca. Pakai jam database (`now()`) |
| `store_settings` | store_name, whatsapp, pickup_address, pickup_maps_url, updated_by | Satu baris saja (`id = 1`, dijaga CHECK); dibaca dengan nilai bawaan bila belum disimpan |

### Data menu (seed)

Harga diambil dari [06-master-data.png](design/06-master-data.png), deskripsi dari [menu makanan.png](design/menu%20makanan.png). Foto ada di `public/images/menu/`. Pasta punya dua file, `<slug>-large.webp` dan `<slug>-regular.webp`; `menus.photo_path` memakai yang large.

| Menu | slug | Kategori | Harga Large / Regular | Deskripsi |
| --- | --- | --- | --- | --- |
| Spaghetti Classico Bologna Brulee | `spaghetti-classico-bologna-brulee` | pasta | Rp 65.000 / Rp 50.000 | Spaghetti dengan saus bolognese klasik, dipanggang dengan taburan keju yang creamy. |
| Not Your Mac and Cheese | `not-your-mac-and-cheese` | pasta | Rp 65.000 / Rp 50.000 | Mac and cheese creamy dengan perpaduan keju spesial yang rich dan lembut. |
| Potato Gratin Lasagna | `potato-gratin-lasagna` | pasta | Rp 65.000 / Rp 50.000 | Kentang lembut dengan saus keju dan krim, dipanggang hingga golden brown. |
| Melt My Mac and Cheese | `melt-my-mac-and-cheese` | pasta | Rp 65.000 / Rp 50.000 | Perpaduan macaroni, saus keju melimpah, dan topping yang super creamy. |
| Spaghetti Aglio E Olio | `spaghetti-aglio-e-olio` | pasta | Rp 60.000 / Rp 45.000 | Spaghetti dengan minyak zaitun, bawang putih, dan sedikit pedas yang gurih dan aromatik. |
| Choco Bon Bon | `choco-bon-bon` | dessert | Rp 40.000 (single) | Kue cokelat lembut dengan lapisan ganache yang rich dan lumer di mulut. |
| Bundle of 3 | `bundle-of-3` | bundle | Rp 180.000 (single) | Pilih 3 menu favorit dalam satu paket spesial. |

Foto hasil crop kecil (±300 px). Cukup untuk thumbnail tabel dan kartu, tapi untuk tampilan besar perlu foto asli.

Hal-hal yang masih menunggu keputusan di Multica BELL-37 (status bayar, pemotongan stok, rumus Menipis/Habis) dibuat sebagai kolom/fungsi yang mudah diubah, jangan di-hardcode di banyak tempat.

## Auth & otorisasi

1. Login email + password lewat Supabase Auth (`src/features/auth/actions.ts`). Tidak ada registrasi publik; Admin membuat user di Master Data › User / Staff (pakai `SUPABASE_SECRET_KEY`, hanya di server). Akun nonaktif juga di-ban di Supabase Auth. `pnpm user:create` tetap ada untuk akun Admin pertama dan akun QA. Matikan juga "Allow new users to sign up" di Supabase Auth settings; walau begitu, user tanpa baris `profiles` aktif tetap ditolak.
2. `proxy.ts` me-refresh sesi (`getClaims()`), mengarahkan pengguna yang belum login ke `/login?next=…`, dan setiap redirect membawa cookie sesi baru beserta header anti-cache.
3. Akses per halaman ada di `src/lib/access.ts`: `SECTION_ACCESS` untuk menu utama, `SUBSECTION_ACCESS` untuk sub-halaman yang lebih sempit (Customer: Admin/Kasir/Owner; User / Staff dan Pengaturan: Admin). Halaman memanggil `requirePageAccess(path)`; Server Action memanggil `requireRole([...])`. `getCurrentUser()` memverifikasi JWT dengan `getClaims()` lalu mencocokkan `profiles` (role, `is_active`). Database diakses lewat Drizzle dengan koneksi server, sehingga RLS Supabase **tidak** jadi lapisan pengaman utama. Aktifkan RLS tanpa policy pada semua tabel supaya kunci publishable tidak bisa membaca data.
4. Matriks akses mengikuti tabel *Pengguna & peran* di [PRD.md](PRD.md).

## File & Storage

- Foto produk disimpan di bucket Supabase Storage **`menu-photos`** (publik, maks 4 MB, jpg/png/webp). Bucket dibuat/diperbarui dengan `pnpm storage:setup`.
- Upload lewat Server Action setelah `requireRole(["admin"])`, memakai klien secret key (`src/lib/supabase/admin.ts`). Batas body Server Action 4,4 MB (`next.config.ts`), di bawah batas body Vercel ±4,5 MB.
- `photo_path` berisi path Storage (`menu/<slug>-<timestamp>.webp`) atau path lokal bawaan (`/images/menu/...`). URL dibentuk oleh `photoSrc()` di `src/lib/photos.ts`. Foto lama di Storage dihapus saat diganti.

## Variabel lingkungan

Semua env (kecuali `CRON_SECRET`) diisi otomatis oleh integrasi **Supabase di Vercel Marketplace** (resource `burnt-butter-db`, paket Free, region `sin1`). Kode membacanya lewat `src/db/url.ts`, yang juga membuang parameter `supa`/`pgbouncer` yang tidak dikenal postgres-js.

| Nama | Dipakai untuk |
| --- | --- |
| `POSTGRES_URL` | Aplikasi di Vercel: pooler mode transaction (port 6543), `prepare: false` |
| `POSTGRES_URL_NON_POOLING` | drizzle-kit migrate, seed, skrip, dan aplikasi lokal (lewat `DATABASE_URL`): pooler mode session (port 5432) |
| `NEXT_PUBLIC_SUPABASE_URL` | Klien Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Klien Supabase (auth di browser) |
| `SUPABASE_SECRET_KEY` | Server saja: membuat user, upload dengan hak admin |
| `CRON_SECRET` | Production saja, ditambahkan manual. Melindungi `/api/cron/keep-alive` |
| `DATABASE_URL`, `DIRECT_DATABASE_URL` | Opsional: menimpa dua URL di atas untuk setup di luar Vercel |

**Mode pooler: transaction di Vercel, session di lokal (Okt 2026).** postgres-js mengirim beberapa query berurutan lewat satu koneksi tanpa menunggu jawaban (pipelining) bila semua koneksinya sibuk. Di Supavisor mode transaction, koneksi server bisa dilepas di tengahnya. Akibatnya query menggantung (Postgres menunggu `ClientRead` sampai statement timeout 2 menit) dan halaman tidak selesai dimuat.

- **Lokal:** satu proses melayani semua request sekaligus, jadi pipelining sering terjadi. Karena itu lokal memakai mode session (`DATABASE_URL` = URL session di `.env.local`), yang mengikat satu klien ke satu koneksi server. Terbukti dengan suite e2e penuh: 60/60 lulus.
- **Vercel:** mode session tidak bisa dipakai, karena dibatasi 15 klien untuk seluruh aplikasi dan banyak instance fungsi langsung menghabiskannya (`EMAXCONNSESSION`). Jadi Vercel memakai mode transaction dengan `max: 10` per instance. Dengan koneksi yang cukup, pipelining praktis tidak terjadi; suite e2e produksi selalu lulus dengan mode ini.
- `max_pipeline: 0` **jangan dipakai**: transaksi `sql.begin` jadi tidak terkunci ke satu koneksi, dan query lain terselip ke dalamnya.
- Klien memakai `idle_timeout: 20`, `max_lifetime`, dan `connect_timeout` supaya koneksi yang ditutup pooler tidak menggantung.

Lokal: `vercel env pull .env.local` (project sudah di-link lewat `.vercel/`). `.env.local` tidak di-commit.

## Deploy

Project Vercel `razorbolds-projects/burnt-butter-pos` tersambung ke repo GitHub `RazorBold/burnt-butter-pos`.

- Push ke `main` = deploy produksi; tiap PR = preview deploy.
- Region fungsi `sin1` dan cron harian diatur di `vercel.json`.
- Migrasi **tidak** dijalankan otomatis saat build. Jalankan `pnpm db:migrate` dari lokal sebelum merge perubahan skema, lalu `pnpm db:seed` bila ada data master baru.
- Preview dan Production memakai database yang sama (satu project Supabase gratis). Hati-hati menguji aksi yang mengubah data di preview.
