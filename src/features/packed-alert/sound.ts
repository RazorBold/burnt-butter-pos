// Bunyi "selesai packing", dibuat dengan Web Audio (tanpa file suara). Sengaja beda dari alarm
// lunas (beep kotak cepat) dan urgent ("ding-dong"): tiga nada lonceng lembut naik.
// Browser hanya mengizinkan bunyi setelah halaman pernah diklik/disentuh; bila diblokir, diam.

let context: AudioContext | null = null

/** Satu putaran: tiga nada sinus naik (do-mi-sol), kira-kira 1 detik. */
export async function playPackedChime(): Promise<boolean> {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return false
    context ??= new AudioCtx()
    if (context.state === "suspended") await context.resume()
    if (context.state !== "running") return false

    const start = context.currentTime + 0.05
    ;[784, 988, 1175].forEach((frequency, index) => {
      const at = start + index * 0.22
      const oscillator = context!.createOscillator()
      const gain = context!.createGain()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(frequency, at)
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.6)
      oscillator.connect(gain).connect(context!.destination)
      oscillator.start(at)
      oscillator.stop(at + 0.62)
    })
    return true
  } catch {
    return false
  }
}
