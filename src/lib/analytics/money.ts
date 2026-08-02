/**
 * orders.amount is stored as Paddle minor units (e.g. "500" = $5.00),
 * matching the existing webhook convention (see saveOrderRecord). This
 * is the one place that converts it to a major-unit number.
 */
export function parseAmountMinorUnits(amount: string | null | undefined): number {
  if (!amount) return 0
  const parsed = Number(amount)
  if (!Number.isFinite(parsed)) return 0
  return parsed / 100
}
