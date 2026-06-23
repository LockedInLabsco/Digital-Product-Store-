export interface Order {
  id: string
  customerEmail: string
  productId: string
  amount: number
  downloadToken: string
  createdAt: Date
  expiresAt: Date
}
