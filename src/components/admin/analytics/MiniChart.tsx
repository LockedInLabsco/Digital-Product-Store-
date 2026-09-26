'use client'

import { useId, useMemo, useRef, useState } from 'react'

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

const WIDTH = 600
const PADDING = 10
// Validated dark-mode categorical slot 1 (blue) — see the dataviz skill's
// palette.md; passes lightness/chroma/CVD/contrast checks against this
// admin's actual dark surfaces (#141414 and #000000).
const DEFAULT_COLOR = '#3987e5'
const SURFACE = '#141414'

/**
 * A tiny dependency-free SVG line/area chart with a hover crosshair +
 * tooltip (per the dataviz skill: a line/area chart ships interactivity
 * by default, not as an upgrade) — keyboard-operable via arrow keys, not
 * just pointer. No canvas, no measuring the DOM after mount, no random
 * ids (useId is SSR-stable), so it can't cause a hydration mismatch.
 * Ships a visually-hidden data table alongside the SVG so screen readers
 * get real numbers, not an opaque picture — the tooltip is an
 * enhancement on top of that, never the only way to reach a value.
 */
export default function MiniChart({
  data,
  color = DEFAULT_COLOR,
  height = 160,
  formatValue = (v) => String(v),
  ariaLabel,
}: MiniChartProps) {
  const gradientId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const points = useMemo(() => {
    if (!data || data.length === 0) return []
    const values = data.map((d) => d.value)
    const max = Math.max(...values, 1)
    const min = Math.min(0, ...values)
    const range = max - min || 1

    return data.map((d, i) => ({
      x: data.length === 1 ? WIDTH / 2 : PADDING + (i / (data.length - 1)) * (WIDTH - PADDING * 2),
      y: height - PADDING - ((d.value - min) / range) * (height - PADDING * 2),
      ...d,
    }))
  }, [data, height])

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded border border-admin-border text-sm text-admin-faint"
        style={{ height }}
      >
        No data for this period
      </div>
    )
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${(height - PADDING).toFixed(1)} L${points[0].x.toFixed(1)},${(
    height - PADDING
  ).toFixed(1)} Z`

  const first = data[0]
  const last = data[data.length - 1]
  const peak = data.reduce((a, b) => (b.value > a.value ? b : a), data[0])

  const updateHoverFromClientX = (clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const index = data.length === 1 ? 0 : Math.round(fraction * (data.length - 1))
    setHoverIndex(index)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setHoverIndex((i) => Math.min(data.length - 1, (i ?? -1) + 1))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setHoverIndex((i) => Math.max(0, (i ?? data.length) - 1))
    } else if (e.key === 'Escape') {
      setHoverIndex(null)
    }
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null
  const hoverLeftPercent = hovered ? (hovered.x / WIDTH) * 100 : 0

  return (
    <div>
      <div
        ref={containerRef}
        className="relative"
        tabIndex={0}
        role="group"
        aria-label={`${ariaLabel} — use arrow keys to inspect values`}
        onPointerMove={(e) => updateHoverFromClientX(e.clientX)}
        onPointerLeave={() => setHoverIndex(null)}
        onFocus={() => setHoverIndex((i) => i ?? 0)}
        onBlur={() => setHoverIndex(null)}
        onKeyDown={handleKeyDown}
      >
        <svg viewBox={`0 0 ${WIDTH} ${height}`} className="w-full" style={{ height }} role="img" aria-label={ariaLabel} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {/* Endpoint markers — orientation only; per-point dots on every
              value are noise, not data (see marks-and-anatomy.md). */}
          {[points[0], points[points.length - 1]].map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={SURFACE} />
          ))}
          {[points[0], points[points.length - 1]].map((p, i) => (
            <circle key={`inner-${i}`} cx={p.x} cy={p.y} r={2.5} fill={color} />
          ))}

          {hovered && (
            <>
              <line x1={hovered.x} y1={PADDING} x2={hovered.x} y2={height - PADDING} stroke="#333333" strokeWidth={1} />
              <circle cx={hovered.x} cy={hovered.y} r={5} fill={SURFACE} />
              <circle cx={hovered.x} cy={hovered.y} r={3.5} fill={color} />
            </>
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-admin-border bg-admin-surface2 px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${hoverLeftPercent}%` }}
          >
            <p className="font-semibold text-admin-text">{formatValue(hovered.value)}</p>
            <p className="text-admin-muted">{hovered.label}</p>
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-xs text-admin-muted">
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
