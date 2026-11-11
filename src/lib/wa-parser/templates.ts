// Template pesan WA yang dikirim toko ke customer (dari pemilik toko, Oktober 2026), dan template
// Olshop untuk pesanan Shopee/Tokopedia (November 2026).
// Dipakai untuk test parser dan contoh di e2e.

export const FO1_TEMPLATE = `#DetailFO1
Tanggal Pengiriman:
Jenis: PO/RS/MTO
Tipe Box: NORMAL

Untuk pemesanan boleh dilengkapi ya kak 🤗

Nama Penerima:
Nama Pengirim (Jika ada): 
No.Telp: 
Alamat Lengkap:
Tanggal kirim:

Kartu Ucapan (Jika ada)
To:
Wishes:
From:

Pilih Metode Pengiriman : 
- Pick Up
- Instant 
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir)

Request (Jika ada):


——


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
- Kurir Internal Burnt Butter (Pengiriman jam 09.00-17.00, tidak dapat request jam, mengikuti rute kurir)

Request (Jika ada):


——


Pilihan Menu (mohon meng-isi jumlah):

#BOX NORMAL

Size Large
A. Spaghetti Classico Bologna Brulee:
B. Not Your Mac and Cheese:
C. Potato Gratin Lasagna:
D. Melt My Mac and Cheese:
E. Spaghetti Aglio E Olio:

Size Regular
A. Spaghetti Classico Bologna Brulee:
B. Not Your Mac and Cheese:
C. Potato Gratin Lasagna:
D. Melt My Mac and Cheese:
E. Spaghetti Aglio E Olio:

Dessert
Choco Bon Bon:

Special Bundle
Bundle of 3:

#BOX CHRISTMAS

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
 * Template pesanan Olshop (Shopee/Tokopedia), dari pemilik toko (November 2026): hanya data
 * pesanan. Menu (biasa atau hampers) dipilih manual di form; tipe pesanan mengikuti menunya.
 */
export const OLSHOP_TEMPLATE = `Marketplace: Tokopedia/Shopee
Tanggal pengiriman:
Nama Penerima:
Nomor Invoice:`

/**
 * Contoh Olshop format lama (dengan daftar menu dan request). Parser tetap membacanya, jadi pesan
 * lama yang masih ditempel lengkap tidak rusak.
 */
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
