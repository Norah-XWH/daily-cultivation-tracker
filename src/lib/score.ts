import { addDays, formatClockRange, parseClock } from "@/lib/dates"
import type { ColorId, DayLog, Part, Routine } from "@/lib/types"

export function sortRoutines(routines: Routine[]): Routine[] {
  return [...routines].sort((a, b) => a.order - b.order)
}

const SCORED_IDS = new Set([
  "exercise-1",
  "exercise-2",
  "exercise-3",
  "exercise-4",
  "exercise-5",
  "fzn",
  "read-fa",
])

export function scoredRoutines(routines: Routine[]): Routine[] {
  return sortRoutines(routines).filter((routine) => SCORED_IDS.has(routine.id))
}

export function countedParts(routine: Routine): Part[] {
  return routine.parts.filter((part) => !part.optional)
}

export function partDone(part: Part, log: DayLog): boolean {
  if (part.choices && part.choices.length > 0) {
    return part.choices.includes(log.minutes[part.id] ?? 0)
  }
  if (part.kind === "check") return Boolean(log.checks[part.id])
  const minutes = log.minutes[part.id] ?? 0
  const target = part.targetMinutes ?? 0
  return target <= 0 ? minutes > 0 : minutes >= target
}

export function partScore(part: Part, log: DayLog): number {
  if (part.choices && part.choices.length > 0) {
    return part.choices.includes(log.minutes[part.id] ?? 0) ? 1 : 0
  }
  if (part.kind === "check") return log.checks[part.id] ? 1 : 0
  const minutes = log.minutes[part.id] ?? 0
  const target = part.targetMinutes ?? 0
  if (target <= 0) return minutes > 0 ? 1 : 0
  return Math.min(1, minutes / target)
}

export function ratingValues(routine: Routine, log: DayLog): Array<number | null> {
  const value = log.ratings?.[routine.id]
  return Array.isArray(value) ? value : []
}

export function routineRating(routine: Routine, log: DayLog): number | null {
  const answered = ratingValues(routine, log).filter((value): value is number => typeof value === "number")
  if (answered.length === 0) return null
  return answered.reduce((sum, value) => sum + value, 0) / answered.length
}

export function routineScore(routine: Routine, log: DayLog): number {
  if (routine.mode === "rating") {
    const rating = routineRating(routine, log)
    return rating == null ? 0 : rating / 100
  }
  const parts = countedParts(routine)
  if (parts.length === 0) return 0
  const scores = parts.map((part) => partScore(part, log))
  if (routine.completion === "any") return Math.max(...scores)
  return scores.reduce((sum, score) => sum + score, 0) / scores.length
}

export function routineDone(routine: Routine, log: DayLog): boolean {
  if (routine.mode === "rating") return false
  const parts = countedParts(routine)
  if (parts.length === 0) return false
  const done = parts.map((part) => partDone(part, log))
  return routine.completion === "any" ? done.some(Boolean) : done.every(Boolean)
}

export function dayScore(routines: Routine[], log: DayLog): number {
  const required = scoredRoutines(routines)
  if (required.length === 0) return 0
  const total = required.reduce((sum, routine) => sum + routineScore(routine, log), 0)
  return total / required.length
}

export function isCompleteDay(routines: Routine[], log: DayLog | undefined): boolean {
  const required = scoredRoutines(routines)
  if (required.length === 0 || !log) return false
  return required.every((routine) => routineDone(routine, log))
}

export function hasActivity(log: DayLog | undefined): boolean {
  if (!log) return false
  if (Object.values(log.checks).some(Boolean)) return true
  if (Object.values(log.minutes).some((minutes) => minutes > 0)) return true
  if (Object.values(log.notes).some((note) => note.trim().length > 0)) return true
  if (
    Object.values(log.ratings ?? {}).some((ratings) =>
      ratings.some((rating) => typeof rating === "number"),
    )
  ) {
    return true
  }
  if (
    Object.values(log.ratingNotes ?? {}).some((notes) => notes.some((note) => note.trim().length > 0))
  ) {
    return true
  }
  return false
}

export function completionStreak(
  isComplete: (date: string) => boolean,
  today: string,
  todayComplete: boolean,
  since: string | null = null,
): number {
  const inPeriod = (date: string) => since == null || date >= since
  let cursor = todayComplete && inPeriod(today) ? today : addDays(today, -1)
  if (!inPeriod(cursor)) return 0
  let count = 0
  while (inPeriod(cursor) && isComplete(cursor)) {
    count += 1
    cursor = addDays(cursor, -1)
    if (count > 3660) break
  }
  return count
}

export type TimeCue = {
  phase: "now" | "next"
  routineId: string
  partId: string
  routineName: string
  color: ColorId
  range: string
}

export function findTimeCue(routines: Routine[], log: DayLog, nowMin: number): TimeCue | null {
  let next: { start: number; cue: TimeCue } | null = null
  for (const routine of sortRoutines(routines)) {
    for (const part of routine.parts) {
      const start = parseClock(part.start)
      const end = parseClock(part.end)
      if (start == null || end == null || !part.start || !part.end) continue
      if (partDone(part, log)) continue
      const range = formatClockRange(part.start, part.end)
      if (nowMin >= start && nowMin <= end) {
        return {
          phase: "now",
          routineId: routine.id,
          partId: part.id,
          routineName: routine.name,
          color: routine.color,
          range,
        }
      }
      if (nowMin < start && (next == null || start < next.start)) {
        next = {
          start,
          cue: {
            phase: "next",
            routineId: routine.id,
            partId: part.id,
            routineName: routine.name,
            color: routine.color,
            range,
          },
        }
      }
    }
  }
  return next?.cue ?? null
}
