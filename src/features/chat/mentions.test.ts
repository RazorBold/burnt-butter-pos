import { describe, expect, it } from "vitest"

import { findMentions, mentionQuery, splitMentions } from "./mentions"

const members = [
  { id: "1", name: "Ani" },
  { id: "2", name: "Ani Putri" },
  { id: "3", name: "Budi Santoso" },
]

describe("findMentions", () => {
  it("@semua dan @Nama, tanpa beda huruf besar kecil", () => {
    expect(findMentions("@semua tolong cek stok ya, @budi santoso juga", members)).toEqual({
      all: true,
      ids: ["3"],
    })
  })

  it("nama terpanjang dulu: @Ani Putri bukan @Ani", () => {
    expect(findMentions("halo @Ani Putri!", members)).toEqual({ all: false, ids: ["2"] })
    expect(findMentions("halo @Ani, sudah?", members)).toEqual({ all: false, ids: ["1"] })
  })

  it("bukan mention: email, nama tidak dikenal, atau tanpa batas kata", () => {
    expect(findMentions("kirim ke ani@toko.com", members)).toEqual({ all: false, ids: [] })
    expect(findMentions("@Siti tolong", members)).toEqual({ all: false, ids: [] })
    expect(findMentions("@semuanya", members)).toEqual({ all: false, ids: [] })
  })

  it("nama yang sama disebut dua kali dihitung sekali", () => {
    expect(findMentions("@Ani @ani", members).ids).toEqual(["1"])
  })
})

describe("splitMentions", () => {
  it("menandai bagian mention untuk disorot", () => {
    expect(splitMentions("Tolong @Budi Santoso dan @semua.", ["Budi Santoso"])).toEqual([
      { text: "Tolong ", mention: false },
      { text: "@Budi Santoso", mention: true },
      { text: " dan ", mention: false },
      { text: "@semua", mention: true },
      { text: ".", mention: false },
    ])
  })

  it("tanpa mention: satu segmen biasa", () => {
    expect(splitMentions("halo", ["Ani"])).toEqual([{ text: "halo", mention: false }])
  })
})

describe("mentionQuery", () => {
  it("kata @ sebelum kursor", () => {
    expect(mentionQuery("halo @bu", 8)).toEqual({ start: 5, query: "bu" })
    expect(mentionQuery("@", 1)).toEqual({ start: 0, query: "" })
  })

  it("boleh berisi spasi untuk nama dua kata", () => {
    expect(mentionQuery("tolong @QA Ka", 13)).toEqual({ start: 7, query: "QA Ka" })
  })

  it("bukan mention bila @ tidak diawali spasi, atau sudah lewat 30 huruf", () => {
    expect(mentionQuery("ani@to", 6)).toBeNull()
    expect(mentionQuery(`@${"a".repeat(31)}`, 32)).toBeNull()
  })
})
