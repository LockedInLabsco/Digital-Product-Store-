'use client'

interface ChartPoint {
  label: string
  value: number
}

interface MiniChartProps {
  data: ChartPoint[]
  color?: string
  height?: number
  formatValue?: (value: number) => string
  ariaLabel: string
}

/**
 * A tiny dependency-free SVG line/area chart. No canvas, no measuring
 * the DOM after mount, no random ids — deterministic from props only,
 * so it can't cause a hydration mismatch. Ships a visually-hidden data
 * table alongside the SVG so screen readers get real numbers, not an
 * opaque picture.
 */
export default function MiniChart({
  data,
  color = '#2F6BFF',
  height = 160,
  formatValue = (v) => String(v),
  ariaLabel,
}: MiniChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-gray-100 text-sm text-gray-400"
        style={{ height }}
      >
        No data for this period
      </div>
    )
  }

  const width = 600
  const padding = 10
  const values = data.map((d) => d.value)
  const max = Math.max(...values, 1)
  const min = Math.min(0, ...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x =
      data.length === 1 ? width / 2 : padding + (i / (data.length - 1)) * (width - padding * 2)
    const y = height - padding - ((d.value - min) / range) * (height - padding * 2)
    return { x, y }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(
    height - padding
  ).toFixed(1)} L${points[0].x.toFixed(1)},${(height - padding).toFixed(1)} Z`

  const first = data[0]
  const last = data[data.length - 1]
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill={color} opacity={0.08} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>{first.label}</span>
        <span>
          Peak: {peak.label} ({formatValue(peak.value)})
        </span>
        <span>{last.label}</span>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
