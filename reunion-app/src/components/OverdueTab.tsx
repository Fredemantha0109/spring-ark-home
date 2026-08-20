import { useState } from 'react'
import type { Meeting, Person } from '../types'
import { EMPTY_STATS, formatMd, scheduleLabel, type PersonStats } from '../lib/derive'
import { errorText, recordMeeting, todayIso } from '../lib/recordMeeting'
import { RETURN_DATE } from '../data/seed'

interface Props {
  people: Person[]
  meetings: Meeting[]
  stats: Map<string, PersonStats>
  onMeetingsSaved: (meetings: Meeting[]) => void
}

/**
 * 並び順:
 *   1. 帰国後に1回も会っていない人（うち一度も会った記録がない人を最上位、次に最終会合日が古い順）
 *   2. 帰国後に会えている人（最終会合日が古い順）
 */
function sortKey(stats: PersonStats): [number, number, string] {
  const group = stats.countAfterReturn === 0 ? 0 : 1
  const never = stats.lastMeetingDate ? 1 : 0
  return [group, never, stats.lastMeetingDate ?? '']
}

interface CardProps {
  person: Person
  stat: PersonStats
  meetings: Meeting[]
  open: boolean
  onToggle: () => void
  onClose: () => void
  onMeetingsSaved: (meetings: Meeting[]) => void
}

function OverdueCard({ person, stat, meetings, open, onToggle, onClose, onMeetingsSaved }: CardProps) {
  const [date, setDate] = useState(todayIso())
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const never = !stat.lastMeetingDate

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const next = await recordMeeting({
        meetings,
        personIds: [person.id],
        date,
        place,
        note,
        names: person.name,
      })
      onMeetingsSaved(next)
      setPlace('')
      setNote('')
      setMsg({ kind: 'ok', text: `${date} に会った記録を保存しました。` })
    } catch (error) {
      setMsg({ kind: 'err', text: errorText(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`overdue-card${stat.countAfterReturn === 0 ? ' never' : ''}`}>
      <span className={`pri-dot pri-${person.priority}`} />
      <div className="overdue-main">
        <div className="overdue-top">
          <span className="overdue-name">{person.name}</span>
          <span className={`cat-badge cat-${person.category}`}>{person.category}</span>
        </div>
        <div className="overdue-meta">
          <span className={never ? 'never-tag' : ''}>
            {never ? '未会' : `最終 ${formatMd(stat.lastMeetingDate!)}`}
          </span>
          <span>{scheduleLabel(person)}</span>
        </div>
      </div>
      <span className={`count-badge${stat.countAfterReturn > 0 ? ' met' : ''}`}>
        帰国後 {stat.countAfterReturn}回
      </span>
      <button type="button" className="quick-btn" onClick={onToggle} aria-expanded={open}>
        {open ? '閉じる' : '会った'}
      </button>

      {open && (
        <form className="quick-form" onSubmit={submit}>
          <div className="quick-row">
            <label className="quick-field">
              <span>日付</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="quick-field">
              <span>場所（任意）</span>
              <input value={place} onChange={(e) => setPlace(e.target.value)} />
            </label>
          </div>
          <label className="quick-field">
            <span>メモ（任意）</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <div className="quick-row">
            <button type="submit" className="btn" disabled={busy}>
              {busy ? '保存中…' : '記録する'}
            </button>
            <button type="button" className="btn btn-sub" onClick={onClose}>
              キャンセル
            </button>
          </div>
          {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
        </form>
      )}
    </div>
  )
}

export function OverdueTab({ people, meetings, stats, onMeetingsSaved }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)

  const sorted = [...people].sort((a, b) => {
    const ka = sortKey(stats.get(a.id) ?? EMPTY_STATS)
    const kb = sortKey(stats.get(b.id) ?? EMPTY_STATS)
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2])
  })

  return (
    <div className="view">
      <p className="section-note">
        帰国日 {formatMd(RETURN_DATE)} 以降に会えていない人を上に表示します。
        「会った」を押すとその場で記録できます。
      </p>
      {sorted.map((person) => (
        <OverdueCard
          key={person.id}
          person={person}
          stat={stats.get(person.id) ?? EMPTY_STATS}
          meetings={meetings}
          open={openId === person.id}
          onToggle={() => setOpenId((prev) => (prev === person.id ? null : person.id))}
          onClose={() => setOpenId(null)}
          onMeetingsSaved={onMeetingsSaved}
        />
      ))}
      {sorted.length === 0 && <div className="empty">まだ誰も登録されていません。</div>}
    </div>
  )
}
