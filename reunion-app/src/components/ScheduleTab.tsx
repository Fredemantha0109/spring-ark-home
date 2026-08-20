import { useState } from 'react'
import type { Person } from '../types'
import {
  EMPTY_STATS,
  formatMd,
  weekLabel,
  weekOfDate,
  weekRangeLabel,
  type PersonStats,
} from '../lib/derive'

interface Props {
  people: Person[]
  stats: Map<string, PersonStats>
}

interface WeekGroup {
  week: number
  members: Person[]
}

function groupByWeek(people: Person[]): WeekGroup[] {
  const groups = new Map<number, Person[]>()
  for (const person of people) {
    const week = weekOfDate(person.scheduledDate!)
    const bucket = groups.get(week)
    if (bucket) bucket.push(person)
    else groups.set(week, [person])
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, members]) => ({ week, members }))
}

function WeekCard({ group, stats }: { group: WeekGroup; stats: Map<string, PersonStats> }) {
  const [open, setOpen] = useState(true)
  return (
    <div className={`week-card${open ? ' open' : ''}`}>
      <button type="button" className="week-header" onClick={() => setOpen((v) => !v)}>
        <span className="week-num">{weekLabel(group.week)}</span>
        <span className="week-dates">
          {group.week === 0 ? '帰国直後' : weekRangeLabel(group.week)}
        </span>
        <span className="week-dots">
          {group.members.map((person) => {
            const done = (stats.get(person.id) ?? EMPTY_STATS).meetings.length > 0
            return <span key={person.id} className={`dot${done ? ' done' : ''}`} />
          })}
        </span>
        <span className="week-chevron">▼</span>
      </button>
      {open && (
        <div className="week-slots">
          {group.members.map((person) => {
            const done = (stats.get(person.id) ?? EMPTY_STATS).meetings.length > 0
            return (
              <div key={person.id} className={`slot${done ? ' done' : ''}`}>
                <span className="slot-date">{formatMd(person.scheduledDate!)}</span>
                <span className={`pri-dot pri-${person.priority}`} />
                <span className="slot-name">{person.name}</span>
                <span className={`cat-badge cat-${person.category}`}>{person.category}</span>
                {done && <span className="slot-check">✓</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ScheduleTab({ people, stats }: Props) {
  const scheduled = people
    .filter((person) => person.scheduledDate)
    .sort((a, b) => a.scheduledDate!.localeCompare(b.scheduledDate!))

  const sgMembers = scheduled.filter((person) => person.category === 'シンガポール')
  const groups = groupByWeek(scheduled.filter((person) => person.category !== 'シンガポール'))

  return (
    <div className="view">
      {sgMembers.length > 0 && (
        <div className="sg-banner">
          <div className="sg-title">🇸🇬 帰国前 SGで会う</div>
          <div className="sg-pills">
            {sgMembers.map((person) => {
              const done = (stats.get(person.id) ?? EMPTY_STATS).meetings.length > 0
              return (
                <div key={person.id} className={`sg-pill${done ? ' done' : ''}`}>
                  <span>{person.name}</span>
                  <span className="sg-pill-date">{formatMd(person.scheduledDate!)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {groups.map((group) => (
        <WeekCard key={group.week} group={group} stats={stats} />
      ))}

      {groups.length === 0 && sgMembers.length === 0 && (
        <div className="empty">確定日が入っている人がまだいません。</div>
      )}
    </div>
  )
}
