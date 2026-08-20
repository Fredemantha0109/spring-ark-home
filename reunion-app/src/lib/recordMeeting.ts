import type { Meeting } from '../types'
import { newId, saveJson } from '../api/github'

interface Input {
  meetings: Meeting[]
  personIds: string[]
  date: string
  place?: string
  note?: string
  /** コミットメッセージ用の表示名 */
  names: string
}

/**
 * 会った記録を1件追加して meetings.json にコミットし、更新後の配列を返す。
 * 「入力」タブと「直近で会ってない人」タブのミニフォームで共用する。
 */
export async function recordMeeting({
  meetings,
  personIds,
  date,
  place,
  note,
  names,
}: Input): Promise<Meeting[]> {
  const meeting: Meeting = {
    id: newId(),
    personIds,
    date,
    ...(place?.trim() ? { place: place.trim() } : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  }
  const next = [...meetings, meeting].sort((a, b) => a.date.localeCompare(b.date))
  await saveJson('meetings', next, `add meeting: ${date} ${names}`)
  return next
}

export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
