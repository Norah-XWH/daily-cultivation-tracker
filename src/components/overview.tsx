"use client"

import { formatEnglishDate, formatLong, formatMonthDay, parseKey, recentDates } from "@/lib/dates"
import {
  dayScore,
  hasActivity,
  isCompleteDay,
  routineDone,
  routineScore,
  sortRoutines,
  completionStreak,
} from "@/lib/score"
import { emptyLog } from "@/lib/store"
import { getColor } from "@/lib/types"
import type { DayLog, Routine } from "@/lib/types"
import { cn } from "@/lib/utils"

type OverviewProps = {
  today: string
  selected: string
  routines: Routine[]
  days: Record<string, DayLog>
  log: DayLog
  periodStart: string | null
  onSelect: (date: string) => void
  onFocusRoutine: (id: string) => void
}

export function Overview({
  today,
  selected,
  routines,
  days,
  log,
  periodStart,
  onSelect,
  onFocusRoutine,
}: OverviewProps) {
  const required = sortRoutines(routines).filter((routine) => routine.required)
  const recorded = selected === today || hasActivity(log)
  const score = required.length === 0 || !recorded ? 0 : dayScore(routines, log)
  const percent = Math.round(score * 100)
  const checks = required.filter((routine) => routine.mode !== "rating")
  const doneCount = recorded ? checks.filter((routine) => routineDone(routine, log)).length : 0
  const dayLabel = selected === today ? "今天" : formatMonthDay(selected)

  const inPeriod = (date: string) => periodStart == null || date >= periodStart
  const week = recentDates(today, 7).map((date) => {
    const dayLog = days[date]
    const recorded =
      inPeriod(date) &&
      required.length > 0 &&
      (date === today || (dayLog != null && hasActivity(dayLog)))
    return {
      date,
      score: recorded ? dayScore(routines, dayLog ?? emptyLog()) : null,
    }
  })
  const counted = week.filter((day) => day.score != null)
  const average =
    counted.length === 0
      ? null
      : counted.reduce((sum, day) => sum + (day.score ?? 0), 0) / counted.length
  const perfect = week.filter(
    (day) => inPeriod(day.date) && isCompleteDay(routines, days[day.date]),
  ).length
  const todayComplete = inPeriod(today) && isCompleteDay(routines, days[today])
  const streak = completionStreak(
    (date) => inPeriod(date) && isCompleteDay(routines, days[date]),
    today,
    todayComplete,
    periodStart,
  )

  const headline =
    required.length === 0
      ? "還沒有計入完成度的項目"
      : !recorded
        ? "這一天沒有記錄"
        : checks.length > 0 && doneCount === checks.length
          ? `${dayLabel}的必做都完成了`
          : score <= 0 && selected === today
            ? "今天還沒開始"
            : `${dayLabel}的完成度`

  return (
    <section
      aria-label="完成度"
      className="rounded-3xl bg-white/55 px-4 py-4 ring-1 ring-black/5"
    >
      <p className="text-sm text-ink-soft">
        {selected === today ? (
          <>
            今天 <span>Today</span>
          </>
        ) : (
          formatMonthDay(selected)
        )}
      </p>
      <p
        data-testid="today-percent"
        aria-live="polite"
        className="mt-1 text-5xl font-medium tracking-tight tabular-nums"
      >
        {required.length === 0 || !recorded ? "—" : `${percent}%`}
      </p>
      <p className="mt-1 text-base">{headline}</p>
      {checks.length > 0 && recorded ? (
        <p className="mt-1 text-sm text-ink-soft tabular-nums">
          {doneCount}/{checks.length} 項完成
        </p>
      ) : required.length === 0 ? (
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          點「調整」，把要算進完成度的項目打開。
        </p>
      ) : null}

      {required.length > 0 && recorded ? (
        <div className="mt-4 flex gap-1">
          {required.map((routine) => {
            const color = getColor(routine.color)
            const width = Math.round(routineScore(routine, log) * 100)
            return (
              <button
                key={routine.id}
                type="button"
                className="h-11 min-w-0 flex-1"
                aria-label={`${routine.name} ${width}%`}
                onClick={() => onFocusRoutine(routine.id)}
              >
                <span
                  className="block h-2.5 overflow-hidden rounded-full"
                  style={{
                    background: `color-mix(in srgb, ${color.ink} 55%, white)`,
                    boxShadow: `inset 0 0 0 1px ${color.line}`,
                  }}
                >
                  <span
                    className="block h-full rounded-full motion-safe:transition-[width]"
                    style={{ width: `${width}%`, background: color.ink }}
                  />
                </span>
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="mt-5 border-t border-black/5 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium">
            近 7 天 <span className="font-normal text-ink-soft">Last 7 days</span>
          </h2>
          {average != null ? (
            <p className="text-sm text-ink-soft tabular-nums">
              平均 {Math.round(average * 100)}% · 全勤 {perfect} 天
            </p>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {week.map((day) => {
            const height = day.score == null ? 0 : Math.round(day.score * 100)
            return (
              <button
                key={day.date}
                type="button"
                className="flex flex-col items-center gap-1"
                aria-pressed={day.date === selected}
                aria-label={`${formatLong(day.date)}，${day.score == null ? "沒有記錄" : `完成度 ${height}%`}`}
                onClick={() => onSelect(day.date)}
              >
                <span
                  className={cn(
                    "relative h-12 w-full overflow-hidden rounded-full bg-black/5",
                    day.date === selected && "ring-2 ring-[#123e3a]",
                  )}
                >
                  <span
                    className="absolute inset-x-0 bottom-0 rounded-full motion-safe:transition-[height]"
                    style={{
                      height: `${height}%`,
                      background:
                        height >= 100 ? getColor("moss").ink : "color-mix(in srgb, #26867b 72%, transparent)",
                    }}
                  />
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums text-ink-soft",
                    day.date === today && "font-medium text-[#123e3a]",
                  )}
                >
                  {parseKey(day.date).getDate()}
                </span>
              </button>
            )
          })}
        </div>
        {periodStart ? (
          <p className="mt-3 text-sm text-[#123e3a]">This period starts {formatEnglishDate(periodStart)}</p>
        ) : null}
        {streak > 0 ? (
          <p className="mt-3 text-sm text-[#123e3a]">
            連續全勤 {streak} 天{todayComplete ? "" : "，今天還沒完成"}
          </p>
        ) : null}
      </div>
    </section>
  )
}

