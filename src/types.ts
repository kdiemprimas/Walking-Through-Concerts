export type ConcertStatus = 'upcoming' | 'past'
export type Category = 'Vé concert' | 'Di chuyển' | 'Lưu trú' | 'Ăn uống' | 'Merchandise' | 'Freebies' | 'Cá nhân' | 'Chuẩn bị' | 'Trang phục & làm đẹp' | 'Fan project' | 'Quà tặng' | 'Phí dịch vụ' | 'Bảo hiểm' | 'SIM & Internet' | 'Khác'

export type Concert = {
  id: string
  artist: string
  tour: string
  city: string
  date: string
  venue: string
  status: ConcertStatus
  color: string
  accent: string
  estimatedBudget: number
  ticketUrl?: string
  relatedInfo?: string
  announcement?: string
}

export type Expense = {
  id: string
  name: string
  concertId: string
  category: Category
  customCategory?: string
  plannedAmount: number
  actualAmount: number
  depositAmount?: number
  peopleCount: number
  date: string
}
