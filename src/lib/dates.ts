import { Solar } from "lunar-javascript"

export function formatKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function todayKey(now = new Date()): string {
  return formatKey(now)
}

export function losAngelesDateKey(now = new Date()): string {
  const parts = zonedParts(now, "America/Los_Angeles")
  if (!parts.year || !parts.month || !parts.day) return formatKey(now)
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
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

export function formatLunarDate(key: string): string {
  const date = parseKey(key)
  try {
    const lunar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar()
    const month = String(lunar.getMonthInChinese()).replaceAll("闰", "閏")
    const day = String(lunar.getDayInChinese())
    const animal = String(lunar.getYearShengXiao()).replaceAll("龙", "龍").replaceAll("马", "馬").replaceAll("鸡", "雞").replaceAll("猪", "豬")
    return animal ? `${animal}年 ${month}月${day}` : `${month}月${day}`
  } catch {
    return ""
  }
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

const FZN_BEIJING_CLOCK: Record<string, string> = {
  "fzn-1": "05:55",
  "fzn-2": "11:55",
  "fzn-3": "17:55",
  "fzn-4": "23:55",
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const pick = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return { year: pick("year"), month: pick("month"), day: pick("day"), hour: pick("hour"), minute: pick("minute") }
}

function zonedWallTime(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const wanted = Date.UTC(year, month - 1, day, hour, minute)
  let instant = wanted
  for (let step = 0; step < 3; step += 1) {
    const shown = zonedParts(new Date(instant), timeZone)
    const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute)
    instant += wanted - shownAsUtc
  }
  return new Date(instant)
}

function shanghaiInstant(hhmm: string, now: Date): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!match) return null
  const today = zonedParts(now, "Asia/Shanghai")
  if (!today.year || !today.month || !today.day) return null
  return zonedWallTime(today.year, today.month, today.day, Number(match[1]), Number(match[2]), "Asia/Shanghai")
}

function losAngelesClock(date: Date): { hour: number; minute: string; suffix: "am" | "pm"; sort: number } {
  const parts = zonedParts(date, "America/Los_Angeles")
  const suffix = parts.hour >= 12 ? "pm" : "am"
  const hour = parts.hour % 12 === 0 ? 12 : parts.hour % 12
  return { hour, minute: String(parts.minute).padStart(2, "0"), suffix, sort: parts.hour * 60 + parts.minute }
}

export function formatFznLosAngelesWindow(partId: string, now = new Date()): string {
  const hhmm = FZN_BEIJING_CLOCK[partId]
  const start = hhmm ? shanghaiInstant(hhmm, now) : null
  if (!start) return ""
  const from = losAngelesClock(start)
  const to = losAngelesClock(new Date(start.getTime() + 15 * 60 * 1000))
  if (from.suffix === to.suffix) return `${from.hour}:${from.minute}–${to.hour}:${to.minute}${from.suffix}`
  return `${from.hour}:${from.minute}${from.suffix}–${to.hour}:${to.minute}${to.suffix}`
}

export function fznLosAngelesOrder(partId: string, now = new Date()): number {
  const hhmm = FZN_BEIJING_CLOCK[partId]
  const start = hhmm ? shanghaiInstant(hhmm, now) : null
  return start ? losAngelesClock(start).sort : Number.MAX_SAFE_INTEGER
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
