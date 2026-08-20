import { useMemo, useState } from 'react'
import type { Category, Meeting, Person, Priority } from '../types'
import { CATEGORIES, PRIORITIES } from '../types'
import { getToken, hasToken, newId, saveJson, setToken } from '../api/github'
import { PRIORITY_LABEL } from '../lib/derive'
import { errorText, recordMeeting, todayIso } from '../lib/recordMeeting'

interface Props {
  people: Person[]
  meetings: Meeting[]
  /** 「会った記録」で選択中の人。人別リストから飛んできた分もここに入る。 */
  selected: string[]
  onSelectedChange: (personIds: string[]) => void
  onPeopleSaved: (people: Person[]) => void
  onMeetingsSaved: (meetings: Meeting[]) => void
}

type Msg = { kind: 'ok' | 'err'; text: string } | null

function TokenSettings() {
  const [value, setValue] = useState(getToken())
  const [saved, setSaved] = useState(hasToken())

  return (
    <div className="form-card">
      <h2 className="form-title">設定 — GitHub トークン</h2>
      <p className="form-desc">
        書き込みに使う Fine-grained personal access token。この端末の localStorage にだけ保存され、
        ビルドやリポジトリには含まれません。権限は spring-ark-home の Contents: Read and write のみで十分です。
      </p>
      <div className="field">
        <label htmlFor="gh-token">トークン</label>
        <input
          id="gh-token"
          type="password"
          value={value}
          autoComplete="off"
          placeholder="github_pat_..."
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
        />
      </div>
      <div className="field-row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            setToken(value)
            setSaved(true)
          }}
        >
          保存
        </button>
        <button
          type="button"
          className="btn btn-sub"
          onClick={() => {
            setToken('')
            setValue('')
            setSaved(false)
          }}
        >
          削除
        </button>
      </div>
      {saved && <div className="msg ok">この端末にトークンを保存しました。</div>}
      {!saved && !value && <div className="msg warn">未設定です。保存するまで書き込みはできません。</div>}
    </div>
  )
}

function AddPersonForm({ people, onPeopleSaved }: Pick<Props, 'people' | 'onPeopleSaved'>) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Category>('前職')
  const [priority, setPriority] = useState<Priority>('mid')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setMsg(null)
    const person: Person = {
      id: newId(),
      name: trimmed,
      category,
      priority,
      ...(note.trim() ? { note: note.trim() } : {}),
    }
    const next = [...people, person]
    try {
      await saveJson('people', next, `add person: ${trimmed}`)
      onPeopleSaved(next)
      setName('')
      setNote('')
      setMsg({ kind: 'ok', text: `${trimmed} を追加しました。反映は数十秒後になることがあります。` })
    } catch (error) {
      setMsg({ kind: 'err', text: errorText(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2 className="form-title">① 人を追加</h2>
      <p className="form-desc">people.json に 1 件コミットします。</p>
      <div className="field">
        <label htmlFor="p-name">名前</label>
        <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="p-cat">カテゴリ</label>
          <select
            id="p-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="p-pri">優先度</label>
          <select
            id="p-pri"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}（{p}）
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="p-note">メモ</label>
        <input id="p-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" className="btn" disabled={busy || !name.trim()}>
        {busy ? '保存中…' : '追加する'}
      </button>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
    </form>
  )
}

function AddMeetingForm({
  people,
  meetings,
  selected,
  onSelectedChange,
  onMeetingsSaved,
}: Omit<Props, 'onPeopleSaved'>) {
  const [date, setDate] = useState(todayIso())
  const [query, setQuery] = useState('')
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return people
      .filter((p) => !selected.includes(p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q))
      .slice(0, 12)
  }, [people, query, selected])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (selected.length === 0) return
    setBusy(true)
    setMsg(null)
    const names = selected.map((id) => byId.get(id)?.name ?? id).join('、')
    try {
      const next = await recordMeeting({ meetings, personIds: selected, date, place, note, names })
      onMeetingsSaved(next)
      onSelectedChange([])
      setPlace('')
      setNote('')
      setQuery('')
      setMsg({ kind: 'ok', text: `${date} / ${names} を記録しました。` })
    } catch (error) {
      setMsg({ kind: 'err', text: errorText(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2 className="form-title">② 会った記録を追加</h2>
      <p className="form-desc">meetings.json に 1 件コミットします。複数人まとめて記録できます。</p>
      <div className="field">
        <label htmlFor="m-date">日付</label>
        <input
          id="m-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="m-search">誰と会ったか</label>
        {selected.length > 0 && (
          <div className="chips">
            {selected.map((id) => (
              <span className="chip" key={id}>
                {byId.get(id)?.name ?? id}
                <button
                  type="button"
                  aria-label="外す"
                  onClick={() => onSelectedChange(selected.filter((x) => x !== id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          id="m-search"
          value={query}
          placeholder="名前で検索"
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <div className="suggest">
            {suggestions.map((person) => (
              <button
                type="button"
                key={person.id}
                className="suggest-item"
                onClick={() => {
                  onSelectedChange([...selected, person.id])
                  setQuery('')
                }}
              >
                <span className={`pri-dot pri-${person.priority}`} />
                <span style={{ flex: 1 }}>{person.name}</span>
                <span className={`cat-badge cat-${person.category}`}>{person.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="m-place">場所（任意）</label>
        <input id="m-place" value={place} onChange={(e) => setPlace(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="m-note">メモ（任意）</label>
        <input id="m-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button type="submit" className="btn" disabled={busy || selected.length === 0}>
        {busy ? '保存中…' : '記録する'}
      </button>
      {msg && <div className={`msg ${msg.kind}`}>{msg.text}</div>}
    </form>
  )
}

export function InputTab(props: Props) {
  return (
    <div className="view">
      <AddMeetingForm
        people={props.people}
        meetings={props.meetings}
        selected={props.selected}
        onSelectedChange={props.onSelectedChange}
        onMeetingsSaved={props.onMeetingsSaved}
      />
      <AddPersonForm people={props.people} onPeopleSaved={props.onPeopleSaved} />
      <TokenSettings />
    </div>
  )
}
