import { randomBytes } from "node:crypto"

// Tanpa huruf/angka yang mudah tertukar saat dibacakan atau diketik ulang (0/O, 1/l/I).
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** Kata sandi acak 16 karakter (~92 bit) untuk akun baru dan reset oleh Admin. */
export function generatePassword(length = 16) {
  // 256 bukan kelipatan 56, jadi byte ≥ 224 dibuang supaya setiap karakter sama peluangnya.
  const limit = 256 - (256 % ALPHABET.length)
  let result = ""
  while (result.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < limit) result += ALPHABET[byte % ALPHABET.length]
      if (result.length === length) break
    }
  }
  return result
}
