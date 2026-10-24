// Template pesan WA yang dikirim toko ke customer (dari pemilik toko, Oktober 2026).
// Dipakai untuk test parser dan contoh di e2e.

const SHIPPING_AND_MENU = `Pilih Metode Pengiriman :
- Pick Up
- Instant
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir)

Request (Jika ada):


---


Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

Size Regular
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

Dessert
Choco Bon Bon :

Special Bundle
Bundle of 3 :`

export const PERSONAL_TEMPLATE = `Untuk pemesanan PERSONAL , silahkan diisi format berikut ya, Kak. 😊

Nama Lengkap:
No.Telp:
Alamat Lengkap:
Tanggal kirim:

${SHIPPING_AND_MENU}`

export const HADIAH_TEMPLATE = `Untuk pemesanan HADIAH , silahkan diisi format berikut ya, Kak. 😊

Nama Penerima:
No.Telp:
Alamat Lengkap:
Tanggal kirim:
Nama Pengirim:

Isi Kartu Ucapan (Jika ada)
To:
Wishes:
From:

${SHIPPING_AND_MENU}`

/** Contoh pesan Personal yang sudah diisi customer (opsi kirim lain dihapus). */
export const PERSONAL_SAMPLE = `Untuk pemesanan PERSONAL , silahkan diisi format berikut ya, Kak. 😊

Nama Lengkap: Siti Nurhaliza
No.Telp: 0812-3456-7890
Alamat Lengkap: Jl. Melati No. 12, RT 03/RW 05
Kel. Sukajadi, Bandung
Tanggal kirim: Sabtu, 25 Oktober 2026

Pilih Metode Pengiriman :
- Instant

Request (Jika ada):
Sausnya dipisah ya kak


---


Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee : 2
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna : 1
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

Size Regular
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  : 1 pcs
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  : -

Dessert
Choco Bon Bon : 2

Special Bundle
Bundle of 3 :`

/** Contoh pesan Hadiah: opsi kirim ditandai ✅, ucapan dua baris. */
export const HADIAH_SAMPLE = `Untuk pemesanan HADIAH , silahkan diisi format berikut ya, Kak. 😊

Nama Penerima: Alya Putri
No.Telp: +62 813 2345 6789
Alamat Lengkap: Apartemen Gateway Tower A lt. 9 no. 3, Jl. Ahmad Yani 669, Bandung
Tanggal kirim: 28/10
Nama Pengirim: Rizky

Isi Kartu Ucapan (Jika ada)
To: Alya
Wishes: Happy birthday sayang!
Semoga suka pastanya
From: Rizky

Pilih Metode Pengiriman :
- Pick Up
- Instant
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir) ✅

Request (Jika ada):


---


Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  : 1
E. Spaghetti Aglio E Olio  :

Size Regular
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

Dessert
Choco Bon Bon :

Special Bundle
Bundle of 3 : 1`
