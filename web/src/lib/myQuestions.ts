// myQuestions.ts — device-local record of the Talk questions THIS device authored, so the UI can show
// edit/delete only on your own posts WITHOUT the read-model ever exposing account_id (anonymity P0:
// questionShape never returns account_id). The server still authorises edit/delete by account_id.
const KEY = 'go_my_questions'

function read(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
function write(ids: string[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ids.slice(-500))) } catch { /* storage unavailable */ }
}

export function markMyQuestion(id: string): void {
  if (!id) return
  const ids = read()
  if (!ids.includes(id)) { ids.push(id); write(ids) }
}
export function unmarkMyQuestion(id: string): void {
  write(read().filter((x) => x !== id))
}
export function isMyQuestion(id: string): boolean {
  return read().includes(id)
}
