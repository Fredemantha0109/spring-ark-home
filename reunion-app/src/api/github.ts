import type { Meeting, Person } from '../types'
import { SEED_MEETINGS, SEED_PEOPLE } from '../data/seed'

const OWNER = 'Fredemantha0109'
const REPO = 'spring-ark-home'
const BRANCH = 'main'

/** GitHub Pages 上での実データの置き場所（= 配信パスそのもの）。 */
const REPO_PATH = { people: 'reunion/data/people.json', meetings: 'reunion/data/meetings.json' } as const

export type DataKind = keyof typeof REPO_PATH

const TOKEN_KEY = 'reunion:githubToken'

/**
 * トークンはビルドに埋め込まず、端末の localStorage にのみ保持する。
 * Vite の import.meta.env.VITE_* は公開バンドルへそのまま出力されるため使わない。
 */
export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setToken(token: string): void {
  const trimmed = token.trim()
  if (trimmed) localStorage.setItem(TOKEN_KEY, trimmed)
  else localStorage.removeItem(TOKEN_KEY)
}

export function hasToken(): boolean {
  return getToken().length > 0
}

function seedFor(kind: DataKind): Person[] | Meeting[] {
  return kind === 'people' ? SEED_PEOPLE : SEED_MEETINGS
}

/** 読み取りは公開ファイルへの素の fetch（認証不要）。開発時など取得できなければシードで動かす。 */
export async function fetchJson<T>(kind: DataKind): Promise<{ data: T; fromSeed: boolean }> {
  const url = `${import.meta.env.BASE_URL}data/${kind}.json?t=${Date.now()}`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { data: (await res.json()) as T, fromSeed: false }
  } catch {
    return { data: seedFor(kind) as T, fromSeed: true }
  }
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function encodeContent(data: unknown): string {
  const json = JSON.stringify(data, null, 2) + '\n'
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function currentSha(path: string, token: string): Promise<string | undefined> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
    { headers: authHeaders(token), cache: 'no-store' },
  )
  if (res.status === 404) return undefined
  if (!res.ok) throw new Error(await describeError(res))
  const body = (await res.json()) as { sha?: string }
  return body.sha
}

async function describeError(res: Response): Promise<string> {
  let message = ''
  try {
    const body = (await res.json()) as { message?: string }
    message = body.message ?? ''
  } catch {
    message = await res.text().catch(() => '')
  }
  if (res.status === 401) return 'トークンが無効です（401）。設定から入れ直してください。'
  if (res.status === 403) return `権限が足りません（403）。${message}`
  if (res.status === 409) return '他の更新と競合しました（409）。再読み込みしてからやり直してください。'
  return `GitHub API エラー ${res.status}: ${message}`
}

/** 書き込みは Contents API 経由。SHA 競合時は取り直して 1 度だけ再試行する。 */
export async function saveJson(kind: DataKind, data: unknown, message: string): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('GitHub トークンが未設定です。「入力」タブの設定から登録してください。')

  const path = REPO_PATH[kind]
  const content = encodeContent(data)

  for (let attempt = 0; attempt < 2; attempt++) {
    const sha = await currentSha(path, token)
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`, {
      method: 'PUT',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, content, sha, branch: BRANCH }),
    })
    if (res.ok) return
    if (res.status === 409 && attempt === 0) continue
    throw new Error(await describeError(res))
  }
}

export function newId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
