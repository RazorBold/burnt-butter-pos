import { describe, expect, it } from "vitest"

import { summarizeBulk } from "./bulk"

const messages = {
  one: (orderNo: string) => `Status ${orderNo} jadi Diproses.`,
  many: (count: number) => `${count} pesanan jadi Diproses.`,
}

describe("summarizeBulk", () => {
  it("satu pesanan memakai nomor pesanannya", () => {
    expect(summarizeBulk({ done: ["BB261025001"], skipped: [], ...messages })).toEqual({
      ok: true,
      message: "Status BB261025001 jadi Diproses.",
      details: undefined,
    })
  })

  it("banyak pesanan memakai jumlah, yang dilewati disebut dengan alasannya", () => {
    expect(
      summarizeBulk({
        done: ["BB261025001", "BB261025002"],
        skipped: [{ orderNo: "BB261025003", reason: "status Selesai" }],
        ...messages,
      }),
    ).toEqual({
      ok: true,
      message: "2 pesanan jadi Diproses.",
      details: "1 dilewati: BB261025003 (status Selesai).",
    })
  })

  it("tidak ada yang diproses berarti gagal", () => {
    expect(
      summarizeBulk({
        done: [],
        skipped: [
          { orderNo: "BB261025003", reason: "status Selesai" },
          { orderNo: "BB261025004", reason: "belum ada kurir" },
        ],
        ...messages,
      }),
    ).toEqual({
      ok: false,
      message: "Tidak ada pesanan yang diubah.",
      details: "Dilewati: BB261025003 (status Selesai), BB261025004 (belum ada kurir).",
    })
  })
})
