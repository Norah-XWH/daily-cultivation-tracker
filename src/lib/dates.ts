export function formatKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function todayKey(now = new Date()): string {
  return formatKey(now)
}

export function parseKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number)
  return new Date(year || 1970, (month || 1) - 1, day || 1)
}

export function addDays(key: string, delta: number): string {
  const date = parseKey(key)
  date.setDate(date.getDate() + delta)
  return formatKey(date)
}

export function recentDates(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(end, index - (count - 1)))
}

export function formatLong(key: string): string {
  const date = parseKey(key)
  const weekday = "日一二三四五六"[date.getDay()] ?? ""
  return `${date.getMonth() + 1}月${date.getDate()}日 週${weekday}`
}

export function formatMonthDay(key: string): string {
  const date = parseKey(key)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const ENGLISH_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatEnglishDate(key: string): string {
  const date = parseKey(key)
  return `${ENGLISH_MONTHS[date.getMonth()] ?? ""} ${date.getDate()}`
}

export function clockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes()
}

export function parseClock(value: string | null | undefined): number | null {
  if (!value) return null
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function to12(value: string): { hour: number; minute: string; suffix: "am" | "pm" } | null {
  const total = parseClock(value)
  if (total == null) return null
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const suffix = hours >= 12 ? "pm" : "am"
  const hour = hours % 12 === 0 ? 12 : hours % 12
  return { hour, minute: String(minutes).padStart(2, "0"), suffix }
}

export function formatClockRange(start: string, end: string): string {
  const from = to12(start)
  const to = to12(end)
  if (!from || !to) return ""
  if (from.suffix === to.suffix) {
    return `${from.hour}:${from.minute}–${to.hour}:${to.minute}${from.suffix}`
  }
  return `${from.hour}:${from.minute}${from.suffix}–${to.hour}:${to.minute}${to.suffix}`
}
