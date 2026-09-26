'use client'

import { ReactNode, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export interface ColumnDef<T> {
  key: string
  header: string
  accessor: (row: T) => ReactNode
  sortValue?: (row: T) => number | string
  align?: 'left' | 'right'
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-admin-border bg-admin-surface2/60">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-admin-muted ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
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
            <tr key={rowKey(row)} className="border-b border-admin-border transition-colors last:border-0 hover:bg-admin-surface2">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-4 py-3 ${col.align === 'right' ? 'text-right tabular-nums' : ''}`}
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
