// Path SVG untuk sparkline kecil di kartu KPI. Murni (tanpa React) supaya bisa dites.
// Kurva memakai interpolasi kubik monoton (Fritsch–Carlson): tidak melewati nilai min/maks data,
// jadi bentuknya jujur terhadap angka meski dihaluskan.

export type SparklinePaths = { line: string; area: string }

type Point = [number, number]

const round = (value: number) => Math.round(value * 100) / 100

function toPoints(values: number[], width: number, height: number, padTop: number): Point[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const usable = height - padTop
  return values.map((value, index) => {
    const x = values.length === 1 ? width : (index / (values.length - 1)) * width
    // Seri datar digambar di tengah tinggi supaya tetap terlihat.
    const ratio = span === 0 ? 0.5 : (value - min) / span
    return [x, padTop + usable * (1 - ratio)]
  })
}

function monotoneTangents(points: Point[]): number[] {
  const n = points.length
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    slopes.push((y1 - y0) / (x1 - x0))
  }
  const tangents = new Array<number>(n)
  tangents[0] = slopes[0]
  tangents[n - 1] = slopes[n - 2]
  for (let i = 1; i < n - 1; i++) {
    tangents[i] = slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2
  }
  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const a = tangents[i] / slopes[i]
    const b = tangents[i + 1] / slopes[i]
    const sum = a * a + b * b
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum)
      tangents[i] = scale * a * slopes[i]
      tangents[i + 1] = scale * b * slopes[i]
    }
  }
  return tangents
}

/** Path garis dan area (tertutup ke dasar) untuk nilai-nilai berurutan. */
export function sparklinePaths(
  values: number[],
  { width, height, padTop = 4 }: { width: number; height: number; padTop?: number },
): SparklinePaths | null {
  const clean = values.filter((value) => Number.isFinite(value))
  if (clean.length < 2) return null

  const points = toPoints(clean, width, height, padTop)
  const tangents = monotoneTangents(points)

  let line = `M${round(points[0][0])},${round(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const dx = (x1 - x0) / 3
    line += `C${round(x0 + dx)},${round(y0 + tangents[i] * dx)} ${round(x1 - dx)},${round(
      y1 - tangents[i + 1] * dx,
    )} ${round(x1)},${round(y1)}`
  }
  const area = `${line}L${round(width)},${round(height)}L0,${round(height)}Z`
  return { line, area }
}
