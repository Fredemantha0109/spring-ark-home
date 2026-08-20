export const TABS = [
  { id: 'overdue', label: '直近で会ってない人' },
  { id: 'schedule', label: '確定スケジュール' },
  { id: 'list', label: '人別リスト' },
  { id: 'input', label: '入力' },
] as const

export type TabId = (typeof TABS)[number]['id']
