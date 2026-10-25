import { addDays, parseKey, recentDates } from "@/lib/dates"
import { dayScore, hasActivity, isCompleteDay, routineRating, routineScore, sortRoutines } from "@/lib/score"
import { emptyLog } from "@/lib/store"
import type { ColorId, DayLog, Routine } from "@/lib/types"

export type HistorySpan = "30" | "90" | "all"

export type HistoryPoint = {
  date: string
  score: number | null
}

export type RoutineTrend = {
  id: string
  name: string
  color: ColorId
  mode: "tasks" | "rating"
  average: number | null
  samples: number
}

export type HistoryBucket = {
  start: string
  end: string
  label: string
  average: number | null
}

export type HistoryReport = {
  points: HistoryPoint[]
  logged: number
  average: number | null
  completeDays: number
  todayCountsEmpty: boolean
  routines: RoutineTrend[]
  recent: number | null
  previous: number | null
  weeks: HistoryBucket[]
  months: HistoryBucket[]
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
const MAX_DAYS = 366

function mean(values: Array<number | null>): number | null {
  const scored = values.filter((value): value is number => value != null)
  if (scored.length === 0) return null
  return scored.reduce((sum, value) => sum + value, 0) / scored.length
}

function datesThrough(start: string, end: string, max: number): string[] {
  const dates: string[] = []
  let cursor = start
  while (cursor <= end && dates.length < max) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  if (cursor <= end) return recentDates(end, max)
  return dates
}

export function spanDates(today: string, span: HistorySpan, days: Record<string, DayLog>): string[] {
  if (span === "30") return recentDates(today, 30)
  if (span === "90") return recentDates(today, 90)
  const earliest = Object.keys(days)
    .filter((key) => DATE_KEY.test(key) && key <= today)
    .sort()[0]
  if (!earliest) return recentDates(today, 7)
  return datesThrough(earliest, today, MAX_DAYS)
}

function pointFor(
  date: string,
  today: string,
  routines: Routine[],
  days: Record<string, DayLog>,
): HistoryPoint {
  const required = routines.some((routine) => routine.required)
  const log = days[date]
  const counted = required && (date === today || (log != null && hasActivity(log)))
  return {
    date,
    score: counted ? dayScore(routines, log ?? emptyLog()) : null,
  }
}

function weekBuckets(points: HistoryPoint[]): HistoryBucket[] {
  const chunks: HistoryPoint[][] = []
  for (let end = points.length; end > 0 && chunks.length < 8; end -= 7) {
    chunks.push(points.slice(Math.max(0, end - 7), end))
  }
  return chunks.reverse().map((chunk) => {
    const end = chunk[chunk.length - 1]?.date ?? ""
    const endDate = end ? parseKey(end) : null
    return {
      start: chunk[0]?.date ?? "",
      end,
      label: endDate ? `${endDate.getMonth() + 1}/${endDate.getDate()}` : "",
      average: mean(chunk.map((point) => point.score)),
    }
  })
}

function monthBuckets(points: HistoryPoint[]): HistoryBucket[] {
  const groups: Array<{ key: string; points: HistoryPoint[] }> = []
  for (const point of points) {
    const key = point.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.points.push(point)
    else groups.push({ key, points: [point] })
  }
  const recent = groups.slice(-12)
  const months = recent.map((group) => group.key.slice(5, 7))
  const duplicateMonth = months.length !== new Set(months).size
  return recent.map((group) => {
    const month = Number(group.key.slice(5, 7))
    const year = group.key.slice(2, 4)
    const first = group.points[0]
    const last = group.points[group.points.length - 1]
    return {
      start: first?.date ?? "",
      end: last?.date ?? "",
      label: duplicateMonth ? `${year}/${month}` : `${month}月`,
      average: mean(group.points.map((point) => point.score)),
    }
  })
}

export function buildHistory(
  routines: Routine[],
  days: Record<string, DayLog>,
  today: string,
  span: HistorySpan,
): HistoryReport {
  const dates = spanDates(today, span, days)
  const points = dates.map((date) => pointFor(date, today, routines, days))
  const todayLog = days[today]
  const todayPoint = points.find((point) => point.date === today)
  const routineTrends: RoutineTrend[] = sortRoutines(routines)
    .filter((routine) => routine.required)
    .map((routine) => {
      if (routine.mode === "rating") {
        const ratings = dates.flatMap((date) => {
          const log = days[date]
          if (!log) return []
          const rating = routineRating(routine, log)
          return rating == null ? [] : [rating / 100]
        })
        return {
          id: routine.id,
          name: routine.name,
          color: routine.color,
          mode: routine.mode,
          average: mean(ratings),
          samples: ratings.length,
        }
      }
      const scores = points.flatMap((point) => {
        if (point.score == null) return []
        return [routineScore(routine, days[point.date] ?? emptyLog())]
      })
      return {
        id: routine.id,
        name: routine.name,
        color: routine.color,
        mode: routine.mode,
        average: mean(scores),
        samples: scores.length,
      }
    })

  return {
    points,
    logged: dates.filter((date) => hasActivity(days[date])).length,
    average: mean(points.map((point) => point.score)),
    completeDays: dates.filter((date) => isCompleteDay(routines, days[date])).length,
    todayCountsEmpty: todayPoint?.score != null && !hasActivity(todayLog),
    routines: routineTrends,
    recent: mean(recentDates(today, 7).map((date) => pointFor(date, today, routines, days).score)),
    previous: mean(
      recentDates(addDays(today, -7), 7).map((date) => pointFor(date, today, routines, days).score),
    ),
    weeks: weekBuckets(points),
    months: monthBuckets(points),
  }
}
