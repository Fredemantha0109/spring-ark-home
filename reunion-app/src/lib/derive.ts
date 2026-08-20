import type { Meeting, Person } from '../types'
import { RETURN_DATE, WEEK1_START } from '../data/seed'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAY_JA = ['日', '月', '火', '水', '木', '金', '土']

/** YYYY-MM-DD をローカルタイムゾーンに依存せず扱うため UTC 基準で解釈する。 */
function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY_MS)
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

/** "2026-07-13" → "7/13(月)" */
export function formatMd(iso: string): string {
  const d = new Date(toUtc(iso))
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAY_JA[d.getUTCDay()]})`
}

/** Week N の月曜日。Week 1 = 2026-07-13。 */
export function weekStart(week: number): string {
  return addDays(WEEK1_START, (week - 1) * 7)
}

/** Week N のラベル（例: "7/13(月) 〜 7/17(金)"）。月・水・金の週3ペース。 */
export function weekRangeLabel(week: number): string {
  const start = weekStart(week)
  return `${formatMd(start)} 〜 ${formatMd(addDays(start, 4))}`
}

/** 日付が属する Week 番号。Week 1 開始より前は 0（帰国直後の週）。 */
export function weekOfDate(iso: string): number {
  const offset = diffDays(WEEK1_START, iso)
  return offset < 0 ? 0 : Math.floor(offset / 7) + 1
}

export function weekLabel(week: number): string {
  return `Week ${String(week).padStart(2, '0')}`
}

export function isAfterReturn(iso: string): boolean {
  return iso >= RETURN_DATE
}

export interface PersonStats {
  /** 全期間での最終会合日。未会なら undefined。 */
  lastMeetingDate?: string
  /** 帰国後（RETURN_DATE 以降）に会った回数 */
  countAfterReturn: number
  /** その人が参加した会合（日付降順） */
  meetings: Meeting[]
}

export function buildStats(people: Person[], meetings: Meeting[]): Map<string, PersonStats> {
  const stats = new Map<string, PersonStats>()
  for (const person of people) {
    stats.set(person.id, { countAfterReturn: 0, meetings: [] })
  }
  for (const meeting of meetings) {
    for (const personId of meeting.personIds) {
      const entry = stats.get(personId)
      if (!entry) continue
      entry.meetings.push(meeting)
      if (!entry.lastMeetingDate || meeting.date > entry.lastMeetingDate) {
        entry.lastMeetingDate = meeting.date
      }
      if (isAfterReturn(meeting.date)) entry.countAfterReturn += 1
    }
  }
  for (const entry of stats.values()) {
    entry.meetings.sort((a, b) => b.date.localeCompare(a.date))
  }
  return stats
}

export const EMPTY_STATS: PersonStats = { countAfterReturn: 0, meetings: [] }

/** その人の予定表示（確定日 > 週割り当て > 未定）。 */
export function scheduleLabel(person: Person): string {
  if (person.scheduledDate) return formatMd(person.scheduledDate)
  if (person.scheduledWeek) return `${weekLabel(person.scheduledWeek)} 予定`
  return '未定'
}

export const PRIORITY_LABEL: Record<string, string> = { high: '高', mid: '中', low: '低' }
