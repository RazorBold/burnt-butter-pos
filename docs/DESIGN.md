# Design System

Sumber kebenaran visual adalah gambar di [design/](design/). Token di bawah diambil dengan sampling piksel dari [01-dashboard.png](design/01-dashboard.png), lalu dibulatkan. Kalau ada yang bertentangan, **gambar menang**. Perbarui file ini bila token diubah.

Nuansanya hangat dan rumahan: krem/beige seperti kertas roti, cokelat *burnt butter* untuk aksi dan judul, aksen tulisan tangan "Good Food Brighter Days". Bukan dashboard SaaS netral.

## Layar

| File | Layar | Elemen kunci |
| --- | --- | --- |
| [01-dashboard.png](design/01-dashboard.png) | Dashboard | Hero sapaan + ilustrasi box, filter periode, 4 KPI, pesanan terbaru, donat tipe, bar status, garis pembayaran, metode kirim, rekap produksi, stok packaging |
| [02-input-pesanan-modal.png](design/02-input-pesanan-modal.png) | Modal Input Pesanan | Kartu info WhatsApp, textarea, tombol Isi Otomatis + Reset |
| [03-pesanan.png](design/03-pesanan.png) | Pesanan | KPI, filter bar, tabel + checkbox, panel Detail Pesanan di kanan |
| [04-pengiriman.png](design/04-pengiriman.png) | Pengiriman | 5 KPI, tab segmen, tabel metode/kurir/slot, panel detail dengan peta mini |
| [05-laporan.png](design/05-laporan.png) | Laporan › Ringkasan | Tab laporan, 4 KPI, garis tren, 2 donat, produk terlaris, bar bertumpuk, metode bayar |
| [06-master-data.png](design/06-master-data.png) | Master Data | Sidebar kiri, kartu tabel per entitas (menu, packaging, bahan baku, kurir, metode bayar, user) |
| [bg-beige-brand.png](design/bg-beige-brand.png) | Aset latar | Gelombang beige, doodle garis, box Burnt Butter |
| [menu makanan.png](design/menu%20makanan.png) | Kolase menu | Foto + deskripsi 7 menu (Large, Regular, Dessert, Bundle). Hasil crop ada di `public/images/menu/` |

## Token warna

Tulis sebagai CSS variables di `src/app/globals.css` (Tailwind v4 `@theme`), dengan nama semantik.

### Permukaan & teks

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| `--bg-page` | `#F6F0EA` | Latar halaman |
| `--bg-card` | `#FBF7F3` | Kartu, panel, modal |
| `--bg-nav` | `#FCF9F4` | Navbar |
| `--bg-nav-active` | `#F9EDE1` | Pill menu aktif |
| `--bg-icon` | `#F9E6D3` | Lingkaran ikon di kartu KPI |
| `--bg-track` | `#EFE4D9` | Track progress bar |
| `--border-subtle` | `#F1EFEC` | Garis antar baris tabel, border kartu |
| `--brand` | `#754122` | Tombol utama, tab aktif, halaman aktif paginasi |
| `--brand-ink` | `#4C1C04` | Judul halaman, judul kartu, logo |
| `--text-strong` | `#282C32` | Isi tabel, nilai |
| `--text-body` | `#596068` | Subjudul, label |
| `--text-muted` | `#5A6066` | Header tabel, keterangan kecil |

### Badge tipe & status pesanan

| Label | Latar | Teks | Ikon |
| --- | --- | --- | --- |
| Personal | `#FBE8D4` | `#552613` | — |
| Hadiah | `#FEDEDD` | `#B12227` | — |
| Baru | `#D3EAF5` | `#0B63A9` | titik / centang |
| Diproses | `#FBEACB` | `#884913` | label/tag |
| Siap Kirim | `#DBF1D6` | `#155A15` | centang |
| Dikirim | `#EBEDED` | `#323C46` | centang |
| Selesai | `#DBF0D4` | `#155C16` | centang |
| Naik (badge KPI) | `#DDF2D9` | `#13711E` | panah atas |
| Turun (badge KPI) | `#FDE5E2` | `#9E1111` | panah bawah |

Siap Kirim dan Selesai hampir sama hijaunya. Ikon dan teks harus selalu tampil supaya status tidak dibedakan dari warna saja.

Status pengiriman ([04-pengiriman.png](design/04-pengiriman.png)): Menunggu Kurir, Dalam Perjalanan, Dikirim memakai skema biru (Baru). Siap Dikirim memakai kuning (Diproses). Siap Diambil dan Selesai memakai hijau. Master data: Aktif/Cukup hijau, Menipis kuning, Habis merah (`#FDE5E2` / `#9E1111`).

### Warna chart

| Token | Hex | Dipakai untuk |
| --- | --- | --- |
| `--chart-baru` | `#BF926F` | Bar status Baru, seri Instant |
| `--chart-diproses` | `#F1AF4C` | Bar Diproses, stok kuning |
| `--chart-siap-kirim` | `#64A069` | Bar Siap Kirim, stok hijau |
| `--chart-dikirim` | `#9FD2EA` | Bar Dikirim |
| `--chart-selesai` | `#7C4627` | Bar Selesai, seri Personal, Kurir Internal |
| `--chart-hadiah` | `#FB8481` | Seri Hadiah, stok merah |
| `--chart-light` | `#F3D2B4` | Seri ketiga yang terang (Pick Up kecil, area di bawah garis). Perkiraan, belum disampling. |

## Tipografi

- Font UI: **Plus Jakarta Sans** (Google Fonts via `next/font`), bobot 400/500/600/700. Bentuknya paling dekat dengan desain; ganti bila ada font aslinya.
- Logo dan "Good Food Brighter Days" adalah **gambar**, bukan font. Jangan pakai font tulisan tangan untuk teks UI.

| Peran | Ukuran / bobot (desktop) | Warna |
| --- | --- | --- |
| Judul halaman ("Daftar Pesanan") | 32 / 700 | `--brand-ink` |
| Judul kartu ("Status Pesanan Hari Ini") | 18 / 600 | `--brand-ink` |
| Nilai KPI | 28 / 700 | `--text-strong` |
| Body, sel tabel | 14 / 400 | `--text-strong` |
| Label, header tabel | 13 / 500 | `--text-muted` |
| Badge, keterangan | 12 / 500 | sesuai badge |

Angka uang memakai `tabular-nums` dengan format `Rp 4.780.000`.

## Layout & bentuk

- Frame desain: desktop 1536 × 1024. Konten penuh lebar dengan padding sisi ±32 px.
- Navbar: tinggi ±76 px. Logo di kiri, menu di tengah, lalu tombol **+ Input Pesanan**, notifikasi, dan profil di kanan. Menu aktif = pill `--bg-nav-active` + garis bawah `--brand`.
- Kartu: radius ±16 px, border tipis `--border-subtle`, bayangan sangat halus atau tanpa bayangan. Jarak antar kartu ±16 px.
- Tombol, input, badge: radius ±8 px. Badge berbentuk pill.
- Baris tabel ±48 px dengan garis pemisah tipis; baris terpilih diberi latar `--bg-nav-active`.
- Panel detail (Pesanan, Pengiriman): kolom kanan ±450 px di dalam halaman, bukan overlay. Tombol tutup ×. Aksi utama ada di bawah panel.
- Grid kartu dashboard: 4 KPI sejajar, lalu grid 3 kolom.
- Di bawah 1280 px, panel detail berubah menjadi sheet dari kanan. Di bawah 1024 px, menu navbar dilipat ke menu hamburger.

## Komponen inti (`src/components/app`)

| Komponen | Sumber di desain |
| --- | --- |
| `AppNavbar` | Semua layar |
| `PageHeader` | Judul + subjudul, opsional ilustrasi hero dan aksi kanan |
| `KpiCard` | Ikon dalam lingkaran, label, nilai, sparkline area, badge naik/turun |
| `StatusBadge`, `TypeBadge`, `StockBadge` | Tabel di semua layar |
| `FilterBar` | Cari, rentang tanggal, dropdown filter, tombol Reset |
| `SegmentTabs` | Tab Semua (22) / Perlu Dikirim (12) / … dan tab Laporan |
| `DataTable` | Checkbox, menu aksi ⋮, paginasi "Menampilkan 1–10 dari 24" |
| `DetailPanel` | Panel kanan Pesanan/Pengiriman |
| `MenuItemRow` | Foto bulat-kotak + nama (ukuran) + qty |
| `DonutCard`, `BarCard`, `LineCard`, `ProgressList` | Kartu chart |
| `InputOrderDialog` | Modal Input Pesanan |

Pakai shadcn/ui sebagai dasar (Button, Dialog, Sheet, Select, Popover + Calendar, Table, Tabs, DropdownMenu, Checkbox, Badge), lalu sesuaikan dengan token di atas.

## Keputusan untuk layar tanpa desain

- **User / Staff** (desain hanya menunjukkan tabel Nama, Role, Status): nama ditemani email di bawahnya, karena email dipakai untuk masuk. Ada kolom Terakhir masuk, dan akun sendiri diberi tanda "Kamu". Role dipilih dari kartu radio 2×2 (satu kolom di ponsel); tiap kartu menyebut menu yang bisa dibuka role itu. Kata sandi dibuat otomatis dan ditampilkan sekali dalam kartu kredensial dengan tombol salin, baik saat akun dibuat maupun saat diatur ulang. Halaman dan menu sidebar ini hanya untuk Admin.

- **Customer:** tabel Nama, No. HP, Alamat (dipotong satu baris, lengkap di tooltip), Pesanan, Total Belanja, Pesanan Terakhir, dengan kotak cari di kepala kartu seperti Produk & Menu. Footer paginasi mengikuti 03-pesanan.png ("Menampilkan 1–10 dari 24 …" + nomor halaman, aktif = cokelat penuh) lewat komponen bersama `TablePagination`. Tidak ada status aktif/nonaktif, karena customer hanya catatan.
- **Pengaturan:** bukan tabel, tapi form di dalam kartu Master Data. Isian dikelompokkan (Profil toko, Lokasi pick-up): judul + keterangan di kiri, isian di kanan, bertumpuk di ponsel. Footer kartu berisi "Terakhir diubah … oleh …" dan tombol Simpan pengaturan.
- **Sidebar Master Data di ponsel:** deretan chip digulir otomatis supaya chip bagian aktif terlihat. Bagian yang tidak boleh dibuka role tersebut tidak ditampilkan.

## Gerak

Hampir semua statis. Cukup satu momen: angka KPI dan chart muncul halus saat halaman dimuat. Selebihnya hanya transisi hover/fokus ±150 ms. Panel detail dan modal masuk dengan fade + slide pendek. Semua animasi dimatikan saat `prefers-reduced-motion: reduce`.

## Aset yang belum ada

- [ ] Logo "Burnt Butter & Segelas Awan" sebagai SVG/PNG transparan.
- [ ] Ilustrasi box pasta untuk hero (bisa di-crop dari [bg-beige-brand.png](design/bg-beige-brand.png), lebih baik file aslinya).
- [x] Foto menu: di-crop dari kolase ke `public/images/menu/*.webp` (±300 px, cukup untuk thumbnail). Pakai lewat `next/image` dengan `object-fit: cover`.
- [ ] Foto menu resolusi penuh (opsional, untuk tampilan besar) dan foto packaging.
- [ ] Desain: form hasil Isi Otomatis, Detail Lengkap pesanan, Pembayaran, Stok Packaging, Produksi, login, tab laporan lain, tampilan tablet.
