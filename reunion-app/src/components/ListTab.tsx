import type { Category, Person } from '../types'
import { CATEGORIES } from '../types'
import { EMPTY_STATS, formatMd, scheduleLabel, type PersonStats } from '../lib/derive'

interface Props {
  people: Person[]
  stats: Map<string, PersonStats>
  /** チェックを押したら「会った記録を追加」フォームへその人を渡す */
  onRecordMeeting: (personId: string) => void
}

export function ListTab({ people, stats, onRecordMeeting }: Props) {
  const extraCategories = [...new Set(people.map((p) => p.category))].filter(
    (c) => !CATEGORIES.includes(c),
  )
  const order: Category[] = [...CATEGORIES, ...extraCategories]

  return (
    <div className="view">
      <p className="section-note">
        チェックは帰国後に会えたかどうかの自動表示です。押すと「会った記録を追加」に反映されます。
      </p>
      {order.map((category) => {
        const members = people.filter((person) => person.category === category)
        if (members.length === 0) return null
        const doneCount = members.filter(
          (person) => (stats.get(person.id) ?? EMPTY_STATS).countAfterReturn > 0,
        ).length
        return (
          <section className="list-section" key={category}>
            <div className="section-head">
              <span className="section-name">{category}</span>
              <span className="section-count">
                {doneCount} / {members.length}
              </span>
            </div>
            {members.map((person) => {
              const stat = stats.get(person.id) ?? EMPTY_STATS
              const done = stat.countAfterReturn > 0
              return (
                <button
                  type="button"
                  key={person.id}
                  className={`list-item${done ? ' done' : ''}`}
                  onClick={() => onRecordMeeting(person.id)}
                >
                  <span className={`pri-dot pri-${person.priority}`} />
                  <span className="list-name">{person.name}</span>
                  <span className="list-meta">
                    {stat.lastMeetingDate ? formatMd(stat.lastMeetingDate) : '未会'} ·{' '}
                    {stat.countAfterReturn}回
                    <br />
                    {scheduleLabel(person)}
                  </span>
                  <span className="list-check">{done ? '✓' : ''}</span>
                </button>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}
