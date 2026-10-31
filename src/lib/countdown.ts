import { addDays, parseKey } from "@/lib/dates"

const START = "2026-10-31"
const END = "2028-02-09"

export function countdownRemaining(today: string): { left: number; total: number } {
  const total = countNonSundays(START, END)
  const from = addDays(today, 1)
  const start = from < START ? START : from
  if (start > END) return { left: 0, total }
  return { left: countNonSundays(start, END), total }
}

function countNonSundays(start: string, end: string): number {
  let count = 0
  let cursor = start
  while (cursor <= end) {
    if (parseKey(cursor).getDay() !== 0) count += 1
    cursor = addDays(cursor, 1)
  }
  return count
}
