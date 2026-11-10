import { Solar } from "lunar-javascript"

// Simplified → Traditional for the 12 zodiac animals
const ZODIAC_TRAD: Record<string, string> = {
  鼠: "鼠", 牛: "牛", 虎: "虎", 兔: "兔",
  龙: "龍", 蛇: "蛇", 马: "馬", 羊: "羊",
  猴: "猴", 鸡: "雞", 狗: "狗", 猪: "豬",
}

export function getLunarDateString(key: string): string {
  const [yearStr, monthStr, dayStr] = key.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return ""

  try {
    const solar = Solar.fromYmd(year, month, day)
    const lunar = solar.getLunar()
    const monthCn = lunar.getMonthInChinese().replace("闰", "閏")
    const dayCn = lunar.getDayInChinese()
    const animalSimp = lunar.getYearShengXiao() as string
    const animal = ZODIAC_TRAD[animalSimp] ?? animalSimp
    return `${monthCn}月${dayCn} · ${animal}年`
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

const TARGET = new Date(2027, 11, 31) // December 31, 2027

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
