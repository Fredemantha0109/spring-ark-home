import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Meeting, Person } from './types'
import { fetchJson } from './api/github'
import { RETURN_DATE } from './data/seed'
import { buildStats, formatMd } from './lib/derive'
import { TabNav } from './components/TabNav'
import type { TabId } from './lib/tabs'
import { OverdueTab } from './components/OverdueTab'
import { ScheduleTab } from './components/ScheduleTab'
import { ListTab } from './components/ListTab'
import { InputTab } from './components/InputTab'

export default function App() {
  const [people, setPeople] = useState<Person[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [fromSeed, setFromSeed] = useState(false)
  const [tab, setTab] = useState<TabId>('overdue')
  const [meetingSelection, setMeetingSelection] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchJson<Person[]>('people'), fetchJson<Meeting[]>('meetings')]).then(
      ([p, m]) => {
        if (cancelled) return
        setPeople(p.data)
        setMeetings(m.data)
        setFromSeed(p.fromSeed || m.fromSeed)
        setLoading(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => buildStats(people, meetings), [people, meetings])

  const metCount = useMemo(
    () => people.filter((person) => (stats.get(person.id)?.countAfterReturn ?? 0) > 0).length,
    [people, stats],
  )
  const pct = people.length ? Math.round((metCount / people.length) * 100) : 0

  const recordMeetingFor = useCallback((personId: string) => {
    setMeetingSelection((prev) => (prev.includes(personId) ? prev : [...prev, personId]))
    setTab('input')
  }, [])

  return (
    <>
      <header className="hero">
        <div className="hero-label">Reunion Schedule 2026</div>
        <h1 className="hero-title">帰国後 再会スケジュール</h1>
        <p className="hero-sub">
          {formatMd(RETURN_DATE)} 帰国 → 7/13 スタート → 月・水・金
        </p>
        <div className="hero-stats">
          <div className="hstat">
            <div className="hstat-num">{people.length}</div>
            <div className="hstat-label">総人数</div>
          </div>
          <div className="hstat">
            <div className="hstat-num">{metCount}</div>
            <div className="hstat-label">帰国後に会えた</div>
          </div>
          <div className="hstat">
            <div className="hstat-num">{people.length - metCount}</div>
            <div className="hstat-label">残り</div>
          </div>
          <div className="hstat">
            <div className="hstat-num">{meetings.length}</div>
            <div className="hstat-label">記録数</div>
          </div>
        </div>
        <div className="progress-wrap">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="progress-pct">{pct}%</div>
        </div>
      </header>

      <TabNav active={tab} onChange={setTab} />

      {fromSeed && (
        <div className="banner">
          データファイルを読み込めなかったため、シードデータを表示しています（ローカル開発時など）。
        </div>
      )}

      {loading ? (
        <div className="view">
          <div className="empty">読み込み中…</div>
        </div>
      ) : (
        <>
          {tab === 'overdue' && (
            <OverdueTab
              people={people}
              meetings={meetings}
              stats={stats}
              onMeetingsSaved={setMeetings}
            />
          )}
          {tab === 'schedule' && <ScheduleTab people={people} stats={stats} />}
          {tab === 'list' && (
            <ListTab people={people} stats={stats} onRecordMeeting={recordMeetingFor} />
          )}
          {tab === 'input' && (
            <InputTab
              people={people}
              meetings={meetings}
              selected={meetingSelection}
              onSelectedChange={setMeetingSelection}
              onPeopleSaved={setPeople}
              onMeetingsSaved={setMeetings}
            />
          )}
        </>
      )}
    </>
  )
}
