'use client'

import { ReactNode, useMemo, useState } from 'react'

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
      <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
    )
  }

  if (isLoading) {
    return <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border border-gray-100 py-8 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap px-3 py-2 font-semibold ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.sortValue ? (
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-black"
                  >
                    {col.header}
                    {sortKey === col.key && (
                      <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
            <tr key={rowKey(row)} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`whitespace-nowrap px-3 py-2 ${col.align === 'right' ? 'text-right' : ''}`}
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
