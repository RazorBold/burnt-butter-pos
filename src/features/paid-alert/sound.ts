// Alarm pesanan baru Lunas, dibuat dengan Web Audio (tanpa file suara). Sengaja beda dari bunyi
// urgent ("ding-dong"): beep tinggi cepat seperti alarm, diulang oleh watcher sampai diklik.
// Browser hanya mengizinkan bunyi setelah halaman pernah diklik/disentuh; bila diblokir, diam.

let context: AudioContext | null = null

/** Satu putaran alarm: dua kali empat beep cepat naik, kira-kira 1,6 detik. */
export async function playPaidAlarm(): Promise<boolean> {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return false
    context ??= new AudioCtx()
    if (context.state === "suspended") await context.resume()
    if (context.state !== "running") return false

    const start = context.currentTime + 0.05
    for (let burst = 0; burst < 2; burst++) {
      for (let beep = 0; beep < 4; beep++) {
        const at = start + burst * 0.85 + beep * 0.15
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = "square"
        oscillator.frequency.setValueAtTime(1175 + beep * 120, at)
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(0.18, at + 0.01)
        gain.gain.setValueAtTime(0.18, at + 0.08)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.11)
        oscillator.connect(gain).connect(context.destination)
        oscillator.start(at)
        oscillator.stop(at + 0.12)
      }
    }
    return true
  } catch {
    return false
  }
}
