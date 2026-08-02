import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import { Order } from '@/src/types/order'
import { FreeDownload } from '@/src/types/freeDownload'
import { parseAmountMinorUnits } from './money'

/**
 * Business/revenue analytics computed from Supabase (orders, free_downloads,
 * products) — the confirmed, money-safe side of the dashboard.
 */

export { parseAmountMinorUnits }

async function fetchOrdersInRange(from: Date, to: Date): Promise<Order[]> {
  const { data, error } = await supabaseServer
    .from('orders')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (error) {
    console.error('[Analytics] Failed to fetch orders', error.message)
    return []
  }
  return data || []
}

async function fetchFreeDownloadsInRange(from: Date, to: Date): Promise<FreeDownload[]> {
  const { data, error } = await supabaseServer
    .from('free_downloads')
    .select('*')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())

  if (error) {
    console.error('[Analytics] Failed to fetch free_downloads', error.message)
    return []
  }
  return data || []
}

export interface BusinessSummary {
  freeDownloadsCompleted: number
  paidPurchasesCompleted: number
  grossRevenue: number
  averageOrderValue: number
  totalKnownCustomers: number
  newCustomers: number
}

/** completedOrders = orders with delivery_status 'sent' (i.e. Paddle-confirmed and delivered). */
function completedOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.delivery_status === 'sent')
}

function completedDownloads(downloads: FreeDownload[]): FreeDownload[] {
  return downloads.filter((d) => d.download_status === 'delivered')
}

export async function getBusinessSummary(from: Date, to: Date): Promise<BusinessSummary> {
  const [orders, downloads] = await Promise.all([
    fetchOrdersInRange(from, to),
    fetchFreeDownloadsInRange(from, to),
  ])

  const paid = completedOrders(orders)
  const free = completedDownloads(downloads)
  const grossRevenue = paid.reduce((sum, o) => sum + parseAmountMinorUnits(o.amount), 0)

  const { data: allTimeCustomers } = await supabaseServer
    .from('orders')
    .select('customer_email')
    .eq('delivery_status', 'sent')

  const totalKnownCustomers = new Set((allTimeCustomers || []).map((r) => r.customer_email)).size

  const emailsBeforeRange = await supabaseServer
    .from('orders')
    .select('customer_email')
    .eq('delivery_status', 'sent')
    .lt('created_at', from.toISOString())

  const priorEmails = new Set((emailsBeforeRange.data || []).map((r) => r.customer_email))
  const newCustomers = new Set(
    paid.map((o) => o.customer_email).filter((email) => !priorEmails.has(email))
  ).size

  return {
    freeDownloadsCompleted: free.length,
    paidPurchasesCompleted: paid.length,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    averageOrderValue: paid.length > 0 ? Math.round((grossRevenue / paid.length) * 100) / 100 : 0,
    totalKnownCustomers,
    newCustomers,
  }
}

export interface FunnelStage {
  label: string
  count: number
}

export interface FunnelData {
  free: FunnelStage[]
  paid: FunnelStage[]
}

/** visitors/productViews/checkoutStarts come from PostHog (or 0 if unavailable) — this only fills in the Supabase-confirmed stages. */
export async function getConfirmedFunnelStages(
  from: Date,
  to: Date
): Promise<{ freeDownloadsCompleted: number; paidPurchasesCompleted: number }> {
  const [orders, downloads] = await Promise.all([
    fetchOrdersInRange(from, to),
    fetchFreeDownloadsInRange(from, to),
  ])

  return {
    freeDownloadsCompleted: completedDownloads(downloads).length,
    paidPurchasesCompleted: completedOrders(orders).length,
  }
}

export interface TrafficSourceBusinessRow {
  source: string
  medium: string
  campaign: string
  downloads: number
  purchases: number
  revenue: number
}

export async function getTrafficSourceBusinessData(
  from: Date,
  to: Date
): Promise<TrafficSourceBusinessRow[]> {
  const [orders, downloads] = await Promise.all([
    fetchOrdersInRange(from, to),
    fetchFreeDownloadsInRange(from, to),
  ])

  const map = new Map<string, TrafficSourceBusinessRow>()

  const keyFor = (source: string | null, medium: string | null, campaign: string | null) =>
    `${source || 'direct'}::${medium || 'none'}::${campaign || 'none'}`

  const ensure = (source: string | null, medium: string | null, campaign: string | null) => {
    const key = keyFor(source, medium, campaign)
    if (!map.has(key)) {
      map.set(key, {
        source: source || 'direct',
        medium: medium || 'none',
        campaign: campaign || 'none',
        downloads: 0,
        purchases: 0,
        revenue: 0,
      })
    }
    return map.get(key)!
  }

  for (const d of completedDownloads(downloads)) {
    const row = ensure(d.last_touch_source, d.last_touch_medium, d.last_touch_campaign)
    row.downloads += 1
  }

  for (const o of completedOrders(orders)) {
    const row = ensure(o.last_touch_source ?? null, o.last_touch_medium ?? null, o.last_touch_campaign ?? null)
    row.purchases += 1
    row.revenue += parseAmountMinorUnits(o.amount)
  }

  return Array.from(map.values())
    .map((row) => ({ ...row, revenue: Math.round(row.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue || b.downloads - a.downloads)
}

export interface ProductBusinessRow {
  productId: string | null
  productTitle: string
  freeDownloads: number
  purchases: number
  revenue: number
}

export async function getProductBusinessData(from: Date, to: Date): Promise<ProductBusinessRow[]> {
  const [orders, downloads] = await Promise.all([
    fetchOrdersInRange(from, to),
    fetchFreeDownloadsInRange(from, to),
  ])

  const map = new Map<string, ProductBusinessRow>()
  const keyFor = (id: string | null, title: string) => id || `title:${title}`

  for (const d of completedDownloads(downloads)) {
    const key = keyFor(d.product_id, d.product_title)
    if (!map.has(key)) {
      map.set(key, { productId: d.product_id, productTitle: d.product_title, freeDownloads: 0, purchases: 0, revenue: 0 })
    }
    map.get(key)!.freeDownloads += 1
  }

  for (const o of completedOrders(orders)) {
    const key = keyFor(o.product_id, o.product_title)
    if (!map.has(key)) {
      map.set(key, { productId: o.product_id, productTitle: o.product_title, freeDownloads: 0, purchases: 0, revenue: 0 })
    }
    const row = map.get(key)!
    row.purchases += 1
    row.revenue += parseAmountMinorUnits(o.amount)
  }

  return Array.from(map.values())
    .map((row) => ({ ...row, revenue: Math.round(row.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue || b.purchases - a.purchases)
}

export interface RevenueByDayRow {
  date: string
  revenue: number
  purchases: number
}

export async function getRevenueByDay(from: Date, to: Date): Promise<RevenueByDayRow[]> {
  const orders = completedOrders(await fetchOrdersInRange(from, to))
  const map = new Map<string, RevenueByDayRow>()

  for (const o of orders) {
    const day = o.created_at.slice(0, 10)
    if (!map.has(day)) map.set(day, { date: day, revenue: 0, purchases: 0 })
    const row = map.get(day)!
    row.revenue += parseAmountMinorUnits(o.amount)
    row.purchases += 1
  }

  return Array.from(map.values())
    .map((row) => ({ ...row, revenue: Math.round(row.revenue * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface DownloadsByDayRow {
  date: string
  downloads: number
}

export async function getFreeDownloadsByDay(from: Date, to: Date): Promise<DownloadsByDayRow[]> {
  const downloads = completedDownloads(await fetchFreeDownloadsInRange(from, to))
  const map = new Map<string, number>()

  for (const d of downloads) {
    const day = d.created_at.slice(0, 10)
    map.set(day, (map.get(day) || 0) + 1)
  }

  return Array.from(map.entries())
    .map(([date, downloads]) => ({ date, downloads }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface RecentPurchaseRow {
  id: string
  productTitle: string
  customerEmail: string
  amount: number
  currency: string | null
  status: string
  createdAt: string
  source: string | null
}

export async function getRecentPurchases(
  from: Date,
  to: Date,
  page: number,
  pageSize: number
): Promise<{ rows: RecentPurchaseRow[]; total: number }> {
  const offset = (page - 1) * pageSize

  const { data, error, count } = await supabaseServer
    .from('orders')
    .select('*', { count: 'exact' })
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString())
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  if (error) {
    console.error('[Analytics] Failed to fetch recent purchases', error.message)
    return { rows: [], total: 0 }
  }

  return {
    rows: (data || []).map((o: Order) => ({
      id: o.id,
      productTitle: o.product_title,
      customerEmail: o.customer_email,
      amount: parseAmountMinorUnits(o.amount),
      currency: o.currency,
      status: o.delivery_status,
      createdAt: o.created_at,
      source: o.last_touch_source || null,
    })),
    total: count || 0,
  }
}
