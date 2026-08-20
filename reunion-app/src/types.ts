export const CATEGORIES = [
  '前職',
  '監査法人',
  '高校大学',
  '前々職',
  'バイト',
  'その他',
  'シンガポール',
] as const

export type Category = (typeof CATEGORIES)[number]

export const PRIORITIES = ['high', 'mid', 'low'] as const

export type Priority = (typeof PRIORITIES)[number]

export interface Person {
  id: string
  name: string
  category: Category
  priority: Priority
  note?: string
  /** 週割り当て（1〜19） */
  scheduledWeek?: number
  /** 確定日（YYYY-MM-DD） */
  scheduledDate?: string
}

export interface Meeting {
  id: string
  /** 複数人同時も可 */
  personIds: string[]
  /** YYYY-MM-DD */
  date: string
  place?: string
  note?: string
}
