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

**Palet grafik Laporan (diterapkan, Okt 2026).** Warna chart di atas disampling dari gambar desain. Saat divalidasi dengan skill dataviz (`validate_palette.js`, permukaan kartu `#FBF7F3`), warna itu gagal: chroma cokelat terlalu rendah (terbaca abu), Baru `#BF926F` vs Siap Kirim `#64A069` tidak terbedakan bagi buta warna merah-hijau (ΔE 1,0), dan metode kirim memakai gradasi cokelat untuk kategori yang tidak berurutan. Yang dipakai di `src/features/reports/colors.ts` adalah langkah lain dari keluarga warna brand yang sama, dan semuanya lolos:

| Pemakaian | Warna |
| --- | --- |
| Personal / Hadiah | `#8C4519` / `#E4605C` |
| Metode kirim (kategorikal) | Kurir Internal `#8C4519`, Instant `#D98A1E`, Pick Up `#4F8A55` |
| Status pesanan (gradasi ordinal satu hue) | Baru `#D4A06F` → Diproses `#BF7D48` → Siap Kirim `#A1602F` → Dikirim `#7D401B` → Selesai `#52250B` |
| Bar metode pembayaran | satu warna (`#8C4519`), panjang bar yang membawa nilai |

Aturan pendukung: setiap grafik dengan ≥2 seri punya legenda, ada tabel tersembunyi untuk pembaca layar, celah 2px warna permukaan di antara segmen, garis 2px, dan tanpa animasi.

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
- **Input Pesanan (form hasil Isi Otomatis):** halaman `/pesanan/baru`, bukan modal, karena form-nya panjang (data customer, data hadiah, pengiriman, 12 baris menu). Desktop: panel pesan WA di kiri (menempel saat digulir) supaya kasir bisa membandingkan, form di kanan. Ponsel: bertumpuk. Tipe Personal/Hadiah memakai tombol pilihan di kepala form; bagian "Pengirim dan kartu ucapan" hanya muncul untuk Hadiah. Metode kirim berupa kartu radio dengan keterangan dari template WA. Menu dikelompokkan seperti template (Large, Regular, Dessert, Special Bundle) dengan stepper − / +; baris yang terisi diberi latar krem dan subtotal "Rp 65.000 × 2 = Rp 130.000". Isian yang tidak terbaca dari pesan diberi garis dan catatan kuning (perlu dicek, bukan error). Footer menempel di bawah: total porsi dan rupiah, daftar "Belum lengkap" yang bisa diklik, tombol Simpan.
- **Daftar Pesanan:** mengikuti 03-pesanan.png, dengan beberapa penyesuaian:
  - Kartu ke-4 diberi label "Nilai Pesanan", bukan "Total Pembayaran". Modul Pembayaran belum ada, jadi yang dijumlahkan adalah total pesanan.
  - KPI hanya mengikuti rentang tanggal, bukan filter lain, dan pesanan Dibatalkan tidak dihitung. Tren dibandingkan dengan periode sepanjang rentang yang sama tepat sebelumnya. Sparkline memakai minimal 7 hari terakhir.
  - Rentang tanggal adalah tanggal pesanan dibuat (WIB), default hari ini. Pemilih rentangnya punya preset (Hari ini, Kemarin, 7 hari terakhir, Bulan ini) dan kalender, di komponen bersama `DateRangePicker`.
  - Urutan tabel mengikuti waktu dibuat dari yang paling awal, sebagai antrean hari itu. Kolom Waktu menampilkan jam, ditambah tanggal bila rentangnya lebih dari sehari.
  - Checkbox, menu ⋮, dan aksi massal: lihat **Aksi massal** di bawah.
  - Pesanan Hadiah: nama pengirim tampil kecil di bawah nama penerima ("dari Rizky"); pencarian juga mencari nama pengirim.
- **Panel Detail Pesanan:** dibuka dengan klik baris (`?pesanan=BB…`, jadi bisa dibagikan). Di layar xl, panel menjadi kolom kanan 420 px yang menempel saat digulir, seperti desain. Di bawah xl, panel menjadi laci dari kanan di atas latar gelap. Ditutup dengan X, klik latar, atau Esc. Fokus pindah ke judul panel saat dibuka. Isinya sesuai desain; untuk Hadiah, judulnya "Data Penerima" dan ada baris Pengirim serta Kartu Ucapan. Tombol Edit hanya muncul sampai status Siap Kirim. Ubah Status hanya menawarkan langkah yang sah (maju satu, mundur satu, atau Batalkan dengan konfirmasi).
- **Detail Lengkap** (`/pesanan/BB…`, belum didesain): data customer, tabel menu dengan harga, jumlah, subtotal, dan total, lalu kartu Status dengan riwayat perubahan (siapa dan kapan), serta pesan WhatsApp asli.
- **Pembayaran** (belum didesain): halaman ini memakai pola Daftar Pesanan.
  - 4 kartu ringkasan tanpa tren: Belum Bayar, Nilai Belum Dibayar, Sudah Lunas, Total Diterima.
  - Filter: cari, tanggal pesanan, status bayar, dan metode.
  - Tabel: No. Pesanan, Customer, Tgl Kirim, Total, Status Bayar, Dibayar Lewat (metode, catatan, waktu, dan siapa yang mencatat), Aksi.
  - Badge status bayar: "Belum bayar" kuning dengan ikon jam, "Lunas" hijau dengan centang.
  - Tombol Tandai Lunas di baris memakai gaya garis tepi supaya tabel tidak penuh tombol cokelat.
  - Dialog Tandai Lunas berisi kartu radio metode bayar dan catatan opsional. Dialog yang sama dipakai untuk Ubah pembayaran.
  - "Jadikan belum bayar" ada di menu ⋮ dengan konfirmasi.
  - Panel Detail Pesanan menampilkan badge status bayar beserta tombol Tandai Lunas atau Ubah pembayaran.
- **Stok Packaging:**
  - **Master Data:** tabel sesuai 06-master-data.png (Foto, Nama, Stok Saat Ini, Satuan, Status). Foto kosong diganti ikon box. Status: Cukup hijau, Menipis kuning (stok ≤ minimum), Habis merah (stok 0), masing-masing berupa titik + teks (`StockBadge`). Form packaging berisi foto, nama, satuan, stok minimum, kapasitas, dan stok awal (khusus packaging baru). Stok tidak diedit langsung, harus lewat pencatatan supaya ada riwayat.
  - **Menu navbar** (belum didesain): 4 kartu ringkasan (Jenis, Perlu Restock, Masuk/Keluar Hari Ini), lalu kartu per packaging dengan stok besar, bar stok/kapasitas berwarna status (F-19), dan tombol Masuk/Keluar/Hitung. Packaging yang perlu restock tampil lebih dulu.
  - **Dialog pencatatan:** tombol pilihan Masuk/Keluar/Hitung ulang, jumlah, catatan, dan pratinjau "Stok jadi: 25 → 5 pcs". Untuk Hitung ulang, yang diisi adalah hasil hitung fisik, dan yang dicatat selisihnya.
  - **Riwayat Stok:** tabel dengan perubahan +/− (hijau/merah, plus teks Masuk/Keluar untuk pembaca layar), catatan, dan siapa yang mencatat. Bisa difilter per packaging.
- **Produksi** (belum didesain):
  - Pemilih tanggal kirim di kepala halaman: Hari ini, Besok, atau tanggal lain.
  - 4 kartu ringkasan: Total Porsi "selesai / total", Belum Mulai, Sedang Dimasak, Selesai Masak.
  - Rekap per Menu: kartu berisi foto, total porsi, baris per ukuran ("0 / 2 selesai"), dan bar hijau porsi yang selesai. Urutannya mengikuti template WA.
  - Papan Pesanan: 3 kolom (Belum mulai, Sedang dimasak, Selesai masak), bertumpuk di ponsel. Kartu pesanan berisi daftar "2× Menu (Large)", request (latar kuning), badge "Hadiah + kartu" untuk packing, metode kirim, dan jam masuk.
  - Tombol: Mulai masak / Selesai masak, plus tombol teks untuk mundur satu langkah bila salah klik.
- **Pengiriman** (04-pengiriman.png):
  - Hiasan header berupa potongan `public/images/brand/header-pasta.webp` dari bg-beige-brand, memudar ke kiri/bawah, hanya di lg ke atas. Teks tulisan tangan di desain tidak dibuat.
  - 5 KPI untuk tanggal kirim terpilih, tanpa tren.
  - Tab segmen berupa grup tombol `aria-pressed`, bukan tablist, karena tombolnya menyaring tabel.
  - Filter tanggal kirim memakai komponen bersama `DeliveryDatePicker` (Hari ini/Besok/tanggal), sama dengan Produksi.
  - Pesanan yang belum selesai dimasak ikut tampil dengan status abu "Belum siap", supaya kurir dan slotnya bisa diatur lebih awal.
  - Checkbox, menu ⋮, dan aksi massal: lihat **Aksi massal** di bawah.
  - **Panel detail** memakai bingkai yang sama dengan Detail Pesanan. Peta mini berupa embed Google Maps tanpa API key, dan "Lihat Rute di Maps" membuka rute dari alamat toko (Pengaturan) ke customer.
- **Bahan Baku** (Master Data, 06-master-data.png): tabel Nama Bahan, Satuan, Stok Saat Ini, Stok Minimum, Status (`StockBadge`), Aksi. Angka memakai format Indonesia (`formatJumlah`: "1,75", "1.200"). Admin: pensil untuk ubah data + menu ⋮ (Catat stok, Lihat riwayat stok). Produksi: tombol garis "Catat stok" saja. Kasir/Owner hanya melihat, dengan catatan di bawah tabel. Karena bahan baku tidak punya menu navbar sendiri, pencatatan stok dan kartu **Riwayat Stok Bahan Baku** (filter per bahan, paginasi) ada di halaman yang sama. Dialog catat stok sama dengan packaging; untuk bahan baku isian menerima koma ("2,5") dan menampilkan petunjuk "Boleh pakai koma".
- **Lonceng notifikasi** (BELL-33): untuk Admin dan Produksi, berisi packaging dan bahan baku yang Menipis atau Habis. Titik merah di lonceng bila ada isinya, dan label tombolnya menyebut jumlahnya untuk pembaca layar. Tiap baris: ikon (box = packaging, daun = bahan baku), nama, `StockBadge`, dan "Sisa 1,75 kg, minimum 2,5 kg"; diklik membuka halaman stoknya. Urutan: Habis dulu, lalu yang paling jauh di bawah minimum. Peringatan dihitung dari stok saat ini, jadi hilang sendiri setelah stok diisi ulang (tidak ada status "sudah dibaca"). Role lain melihat "Belum ada notifikasi."
- **Aksi massal** (BELL-19, belum didesain; Pesanan dan Pengiriman):
  - Kolom checkbox di awal tabel, dengan checkbox "pilih semua" di kepala tabel yang setengah tercentang bila sebagian baris dipilih. Pilihan hanya berlaku untuk halaman tabel yang sedang tampil dan kosong lagi saat filter atau halaman berganti. Seluruh sel checkbox bisa diklik dan tidak membuka panel detail. Baris terpilih diberi latar krem muda.
  - Saat ada baris terpilih, muncul bar cokelat tua (`brand-ink`) yang melayang di tengah bawah layar: "N pesanan dipilih", tombol aksi, dan X untuk batal pilih. Bar sengaja melayang supaya tabel tidak bergeser saat checkbox pertama dicentang dan bar tetap terlihat saat digulir. Muncul dengan geser-naik 180 ms (tanpa geser bila reduced motion). Jumlah terpilih diumumkan ke pembaca layar.
  - Tombol hanya mengirim pesanan yang memenuhi syarat. Bila hanya sebagian yang memenuhi, jumlahnya ditulis di tombol ("Tandai lunas (5)"). Tombol yang tidak berlaku untuk semua pesanan terpilih tampak redup (`aria-disabled`) tapi tetap bisa difokus dan diklik untuk memunculkan alasannya, karena tombol `disabled` tidak bisa menjelaskan kenapa. Server memeriksa ulang, lalu toast menyebut pesanan yang dilewati beserta alasannya.
  - **Pesanan:** Ubah status (menu berisi badge status tujuan dan "N pesanan" / "3 dari 6" / "tidak bisa"), Tandai lunas (dialog Tandai Lunas dengan satu metode dan catatan untuk semua; yang sudah lunas atau dibatalkan dilewati), Batalkan (konfirmasi berisi daftar nomor pesanan), dan Unduh CSV (koma, UTF-8 dengan BOM, satu baris per pesanan termasuk menu dan status bayar).
  - **Pengiriman:** Atur kurir & jadwal (dialog kurir yang sama, satu kurir dan slot untuk semua pesanan Kurir Internal terpilih) dan Tandai dikirim (hanya Siap Kirim; Kurir Internal harus sudah punya kurir, Pick Up tidak ikut).
  - **Menu ⋮ per baris** memakai aksi dan dialog yang sama untuk satu pesanan. Pesanan: Detail lengkap, Jadikan {status}, Tandai lunas, Batalkan pesanan (merah). Pengiriman: Lihat pesanan, langkah berikutnya (Tandai Dikirim / Tandai Selesai / Sudah Diambil), Ubah kurir / jadwal.
- **Laporan (tab Ringkasan):** tata letak mengikuti 05-laporan.png.
  - Tab lain belum didesain (BELL-36), jadi belum ditampilkan supaya tidak ada tab kosong. Pilihan "Bulan Ini" ada di preset pemilih tanggal, bukan dropdown terpisah.
  - Donat metode kirim tidak punya irisan "Lainnya" karena metodenya hanya tiga (lihat BELL-37).
  - Total Pembayaran = pembayaran lunas menurut tanggal dibayar. "Pendapatan" di rekap harian = nilai pesanan menurut tanggal pesanan dibuat.
- **Dashboard** (01-dashboard.png):
  - Tanggal acuan (default hari ini) + periode Hari Ini / 7 Hari / 30 Hari / Bulan Ini, semuanya berakhir di tanggal acuan. Bulan Ini berupa tombol, bukan dropdown.
  - KPI dan grafik memakai agregasi dan palet yang sama dengan Laporan. Grafik Total Pembayaran selalu 7 hari terakhir dari tanggal acuan (F-16). Rekap Produksi mengikuti tanggal kirim = tanggal acuan.
  - KPI memakai versi desain utama (Total Pembayaran), bukan versi di balik modal ("Pesanan Selesai"); lihat BELL-37.
  - Isi menyesuaikan role: Produksi tidak melihat kartu uang (KPI ke-4 diganti Total Porsi) dan Daftar Pesanan Terbaru. Tombol "Lihat Semua/Detail" hanya muncul bila halaman tujuannya boleh dibuka. Kasir diarahkan ke Pembayaran, Admin/Owner ke Laporan.
  - Stok Packaging (Ringkas): maksimal 4, yang perlu restock dulu. Packaging tanpa kapasitas ditampilkan dengan status, bukan bar.
- **Sidebar Master Data di ponsel:** deretan chip digulir otomatis supaya chip bagian aktif terlihat. Bagian yang tidak boleh dibuka role tersebut tidak ditampilkan.

## Gerak

Hampir semua statis. Cukup satu momen: angka KPI dan chart muncul halus saat halaman dimuat. Selebihnya hanya transisi hover/fokus ±150 ms. Panel detail dan modal masuk dengan fade + slide pendek. Semua animasi dimatikan saat `prefers-reduced-motion: reduce`.

## Aset yang belum ada

- [ ] Logo "Burnt Butter & Segelas Awan" sebagai SVG/PNG transparan.
- [ ] Ilustrasi box pasta untuk hero (bisa di-crop dari [bg-beige-brand.png](design/bg-beige-brand.png), lebih baik file aslinya).
- [x] Foto menu: di-crop dari kolase ke `public/images/menu/*.webp` (±300 px, cukup untuk thumbnail). Pakai lewat `next/image` dengan `object-fit: cover`.
- [ ] Foto menu resolusi penuh (opsional, untuk tampilan besar) dan foto packaging.
- [ ] Desain: form hasil Isi Otomatis, Detail Lengkap pesanan, Pembayaran, Stok Packaging, Produksi, login, tab laporan lain, tampilan tablet.
