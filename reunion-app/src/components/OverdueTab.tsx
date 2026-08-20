import type { Person } from '../types'
import { EMPTY_STATS, formatMd, scheduleLabel, type PersonStats } from '../lib/derive'
import { RETURN_DATE } from '../data/seed'

interface Props {
  people: Person[]
  stats: Map<string, PersonStats>
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

export function OverdueTab({ people, stats }: Props) {
  const sorted = [...people].sort((a, b) => {
    const ka = sortKey(stats.get(a.id) ?? EMPTY_STATS)
    const kb = sortKey(stats.get(b.id) ?? EMPTY_STATS)
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2])
  })

  return (
    <div className="view">
      <p className="section-note">
        帰国日 {formatMd(RETURN_DATE)} 以降に会えていない人を上に表示します。
      </p>
      {sorted.map((person) => {
        const stat = stats.get(person.id) ?? EMPTY_STATS
        const never = !stat.lastMeetingDate
        return (
          <div
            key={person.id}
            className={`overdue-card${stat.countAfterReturn === 0 ? ' never' : ''}`}
          >
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
          </div>
        )
      })}
      {sorted.length === 0 && <div className="empty">まだ誰も登録されていません。</div>}
    </div>
  )
}
