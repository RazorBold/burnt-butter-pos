// Bunyi alarm pesanan urgent, dibuat dengan Web Audio (tanpa file suara). Browser hanya
// mengizinkan bunyi setelah halaman pernah diklik/disentuh; bila diblokir, diam saja.

let context: AudioContext | null = null

/** Tiga kali "ding-dong" naik-turun, kira-kira 2 detik. */
export async function playUrgentSound(): Promise<boolean> {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return false
    context ??= new AudioCtx()
    if (context.state === "suspended") await context.resume()
    if (context.state !== "running") return false

    const start = context.currentTime + 0.05
    for (let round = 0; round < 3; round++) {
      for (const [offset, frequency] of [
        [0, 988],
        [0.18, 740],
      ] as const) {
        const at = start + round * 0.65 + offset
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = "triangle"
        oscillator.frequency.value = frequency
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.3)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(at)
        oscillator.stop(at + 0.32)
      }
    }
    return true
  } catch {
    return false
  }
}
