export function formatPrice(price: number): string {
  if (price === 0) {
    return 'Free'
  }
  return `$${price}`
}

export function getPriceLabel(price: number): string {
  if (price === 0) {
    return 'Get Free Guide'
  }
  return 'Get Access'
}
