'use client'

import { ReactNode, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export interface ColumnDef<T> {
  key: string
  header: string
  accessor: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
  align?: 'left' | 'right'
  /** Pins this column to the left edge while the table scrolls
   * horizontally — use for the one or two columns that identify the
   * row (e.g. title), never for metric columns, which are exactly what
   * the admin is scrolling sideways TO see. At most one sticky column
   * is supported today (the common case — a title/name column); adding
   * more would need cumulative left-offset math this component doesn't
   * do yet. */
  sticky?: boolean
}

interface SortableTableProps<T> {
  columns: ColumnDef<T>[]
  rows: T[]
  rowKey: (row: T) => string
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  defaultSortKey?: string
  defaultSortDirection?: 'asc' | 'desc'
  /** Caps the table's own height so both its scrollbars stay reachable
   * near the top of the viewport instead of requiring a scroll past
   * however many rows exist to reach the bottom-edge native scrollbar —
   * the actual UX bug this fixes. Omit for a short table that's fine
   * growing with the page (e.g. under ~10 rows) — defaults to capped,
   * since every real content/automation list in this app can grow
   * past a screenful. */
  maxHeightClassName?: string
}

function LoadingSkeleton({ columnCount }: { columnCount: number }) {
  return (
    <div className="animate-pulse space-y-2 py-1">
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="flex gap-4 border-b border-admin-border px-3 py-3 last:border-0">
          {Array.from({ length: columnCount }).map((_, col) => (
            <div key={col} className="h-4 flex-1 rounded bg-admin-surface2" style={{ maxWidth: col === 0 ? '40%' : undefined }} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default function SortableTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  error,
  emptyMessage = 'No data for this period',
  defaultSortKey,
  defaultSortDirection = 'desc',
  maxHeightClassName = 'max-h-[70vh]',
}: SortableTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection)

  const sortedRows = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey)
    if (!column || !column.sortValue) return rows

    const copy = [...rows]
    copy.sort((a, b) => {
      const av = column.sortValue!(a)
      const bv = column.sortValue!(b)
      if (av === bv) return 0
      const result = av > bv ? 1 : -1
      return sortDirection === 'asc' ? result : -result
    })
    return copy
  }, [rows, columns, sortKey, sortDirection])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-400">{error}</div>
    )
  }

  if (isLoading) {
    return <LoadingSkeleton columnCount={columns.length} />
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-admin-border py-10 text-center text-sm text-admin-muted">
        {emptyMessage}
      </div>
    )
  }

  const stickyKey = columns.find((c) => c.sticky)?.key

  return (
    // A single box that scrolls BOTH axes within a capped height,
    // instead of letting the table grow to its full row count and
    // relying on the page's own scroll to reach a horizontal scrollbar
    // that only renders at the table's true (often off-screen) bottom
    // edge. Capping the height means that scrollbar sits a bounded,
    // small distance below wherever the table starts — reachable right
    // away, exactly what "Option A/B" in the UX report were both
    // trying to achieve, without a second hand-synced scrollbar widget
    // to build and maintain. `thead` can be position:sticky relative to
    // THIS box specifically because this box (not the page) is now the
    // real vertical scrolling container.
    <div className={`overflow-auto rounded-lg border border-admin-border ${maxHeightClassName}`}>
      <table className="w-full min-w-max text-sm">
        <thead className="sticky top-0 z-20 bg-admin-surface2">
          <tr className="border-b border-admin-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-admin-muted ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.sticky ? 'sticky left-0 z-30 bg-admin-surface2' : ''}`}
              >
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className={`inline-flex items-center gap-1 hover:text-admin-text ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                  >
                    {col.header}
                    {sortKey === col.key ? (
                      sortDirection === 'asc' ? (
                        <ChevronUp size={13} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={13} aria-hidden="true" />
                      )
                    ) : (
                      <ChevronsUpDown size={13} className="text-admin-faint" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={rowKey(row)} className="group border-b border-admin-border transition-colors last:border-0 hover:bg-admin-surface2">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 ${col.align === 'right' ? 'text-right tabular-nums' : ''} ${
                    col.key === stickyKey ? 'sticky left-0 z-10 bg-admin-bg group-hover:bg-admin-surface2' : ''
                  }`}
                >
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
