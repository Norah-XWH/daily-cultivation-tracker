import { Solar } from "lunar-javascript"

export function getLunarDateString(key: string): string {
  const [yearStr, monthStr, dayStr] = key.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return ""

  try {
    const solar = Solar.fromYmd(year, month, day)
    const lunar = solar.getLunar()
    // getMonth() returns negative for leap months (e.g. -6 for 閏六月)
    const monthCn = lunar.getMonthInChinese().replace("闰", "閏")
    const dayCn = lunar.getDayInChinese()
    return `${monthCn}月${dayCn}`
  } catch {
    return ""
  }
}

export type Countdown = {
  days: number
  hours: number
  minutes: number
  past: boolean
}

const TARGET = new Date(2028, 6, 1) // July 1, 2028

export function countdownToJul2028(now: Date): Countdown {
  const diff = TARGET.getTime() - now.getTime()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, past: true }

  const totalMinutes = Math.floor(diff / 60_000)
  const minutes = totalMinutes % 60
  const totalHours = Math.floor(totalMinutes / 60)
  const hours = totalHours % 24
  const days = Math.floor(totalHours / 24)

  return { days, hours, minutes, past: false }
}
