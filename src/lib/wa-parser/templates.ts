// Template pesan WA yang dikirim toko ke customer (dari pemilik toko, Oktober 2026; FO1 & FO3
// diperbarui 19 Nov 2026 dengan Additional Birthday Box), dan template
// Olshop untuk pesanan Shopee/Tokopedia (November 2026).
// Dipakai untuk test parser dan contoh di e2e.

export const FO1_TEMPLATE = `#DetailFO1
Tanggal Pengiriman:
Jenis: PO/RS/MTO

Tipe Box: NORMAL
*Additional Birthday Box (Rp 14.000)*: Yes/No

Nama Penerima:
Nama Pengirim (Di-isi jika ada):
No.Telp:
Alamat Lengkap:

Kartu Ucapan (Di-Isi jika ada)
To:
Wishes:
From:

Pilih Metode Pengiriman :
- Pick Up
- Instant Reguler
- Instant Prioritas
- Sameday

Request (Di-isi jika ada):

——

Pilihan Menu *(mohon meng-isi jumlah)*:

*Size Large*
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

*Size Regular*
A. Spaghetti Classico Bologna Brulee :
B. Not Your Mac and Cheese  :
C. Potato Gratin Lasagna :
D. Melt My Mac and Cheese  :
E. Spaghetti Aglio E Olio  :

*Dessert*
Choco Bon Bon :

*Special Bundle*
Bundle of 3 :`

export const FO2_TEMPLATE = `#DetailFO2
Tanggal Pengiriman:
Jenis: PO/RS/MTO
Tipe Box: HAMPERS

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima:
Nama Pengirim: 
No.Telp: 
Alamat Lengkap:
Tanggal kirim:

Kartu Ucapan (Template Christmas)
To:
From:

Pilih Metode Pengiriman : 
- Pick Up
- Instant 
- Sameday (dikirim di hari yang sama)
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir)

Request (Jika ada):


——


Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Classico Red : 
B. Mac & Joy  :  
C. Melted Cheese  : 
E. Holy E Olio  : 

Size Regular
A. Classico Red : 
B. Mac & Joy  :  
C. Melted Cheese  : 
E. Holy E Olio  : `

export const FO3_TEMPLATE = `#DetailFO3
Tanggal Pengiriman:
Jenis: PO/RS/MTO
Tipe Box: NORMAL & HAMPERS

*Untuk pemesanan boleh dilengkapi ya kak 🤗*

Nama Penerima:
Nama Pengirim:
No.Telp:
Alamat Lengkap:
Tanggal kirim:

Kartu Ucapan (Template Christmas)
To:
From:

Pilih Metode Pengiriman :
- Pick Up
- Instant
- Sameday

Request (Jika ada):


——


Pilihan Menu *(mohon meng-isi jumlah)*:

*#BOX NORMAL*

*Additional Birthday Box (Rp 14.000)*: Yes/No

*Size Large*
A. Spaghetti Classico Bologna Brulee:
B. Not Your Mac and Cheese:
C. Potato Gratin Lasagna:
D. Melt My Mac and Cheese:
E. Spaghetti Aglio E Olio:

*Size Regular*
A. Spaghetti Classico Bologna Brulee:
B. Not Your Mac and Cheese:
C. Potato Gratin Lasagna:
D. Melt My Mac and Cheese:
E. Spaghetti Aglio E Olio:

*Dessert*
Choco Bon Bon:

*Special Bundle*
Bundle of 3:

*#BOX CHRISTMAS*

*Size Large*
A. Classico Red :
B. Mac & Joy  :
C. Melted Cheese  :
E. Holy E Olio  :

*Size Regular*
A. Classico Red :
B. Mac & Joy  :
C. Melted Cheese  :
E. Holy E Olio  :`

export const NORMAL_TEMPLATE = FO1_TEMPLATE
export const HAMPERS_TEMPLATE = FO2_TEMPLATE
export const NORMAL_HAMPERS_TEMPLATE = FO3_TEMPLATE

// Alias untuk kompatibilitas
export const PERSONAL_TEMPLATE = NORMAL_TEMPLATE
export const HADIAH_TEMPLATE = HAMPERS_TEMPLATE

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

/**
 * Template pesanan Olshop (Shopee/Tokopedia), dari pemilik toko (18 Nov 2026, Birthday Box
 * 19 Nov 2026): data pesanan, Birthday Box Yes/No, daftar menu dengan jumlah, lalu notes/request
 * (boleh berisi kartu ucapan per menu). Menu yang tidak ada di daftar (mis. hampers) tetap bisa
 * dipilih manual di form.
 */
export const OLSHOP_TEMPLATE = `Marketplace: Tokopedia/Shopee
Tanggal pengiriman:
Nama Penerima:
Nomor Invoice:
Birthday Box: Yes/No

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
Bundle of 3 :

Jika ada notes/request tambahan:`

/** Contoh nyata template Olshop (Shopee, 18 Nov 2026): kartu ucapan per menu di notes. */
export const OLSHOP_CARD_SAMPLE = `Marketplace: Shopee
Tanggal pengiriman: 19 november 2026
Nama Penerima: Henny
Nomor Invoice: 261118MCC2SRP5

Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee : 
B. Not Your Mac and Cheese  : 1
C. Potato Gratin Lasagna : 
D. Melt My Mac and Cheese  : 
E. Spaghetti Aglio E Olio  : 

Size Regular
A. Spaghetti Classico Bologna Brulee : 1
B. Not Your Mac and Cheese  : 
C. Potato Gratin Lasagna : 
D. Melt My Mac and Cheese  : 
E. Spaghetti Aglio E Olio  : 

Dessert
Choco Bon Bon : 

Special Bundle
Bundle of 3 : 

Jika ada notes/request tambahan: 
Classico Bologna Kecil
To : Rainier // From : ii Via // Wish : Happy Belated Birthday Rainier !! May all your wishes come true :) 

Not your Mac n Cheese Besar
To : Sis Henny // From : Evi & Via // Wish : HBD Sis, Semoga hidupmu makin cerah & drama makin tipis :)`

/** Contoh Olshop dengan menu dan request satu paragraf. */
export const OLSHOP_SAMPLE = `Marketplace: Shopee
Tanggal pengiriman: 27/10/2026
Nama Penerima: Nadia Rahma
Nomor Invoice: 2610270ABCDEF

Pilihan Menu (mohon meng-isi jumlah):

Size Large
A. Spaghetti Classico Bologna Brulee : 1
B. Not Your Mac and Cheese  : 
C. Potato Gratin Lasagna : 
D. Melt My Mac and Cheese  : 
E. Spaghetti Aglio E Olio  : 

Size Regular
A. Spaghetti Classico Bologna Brulee : 
B. Not Your Mac and Cheese  : 2
C. Potato Gratin Lasagna : 
D. Melt My Mac and Cheese  : 
E. Spaghetti Aglio E Olio  : 

Dessert
Choco Bon Bon : 1

Special Bundle
Bundle of 3 :

Jika ada notes/request tambahan: Saus dipisah
Tanpa sendok plastik`

const SHIPPING_BLOCK = /(Pilih Metode Pengiriman :[^\n]*\n)(?:- [^\n]*\n)+/

/**
 * Template FO dengan pilihan pengiriman dari kategori Master Data. Tanpa kategori, pilihan bawaan
 * template dipakai.
 */
export function withShippingChoices(template: string, choices: readonly string[]): string {
  if (choices.length === 0) return template
  return template.replace(
    SHIPPING_BLOCK,
    (_, head: string) => head + choices.map((choice) => `- ${choice}\n`).join(""),
  )
}
