"use client"

import { formatEnglishDate, formatMonthDay } from "@/lib/dates"
import {
  dayScore,
  hasActivity,
  isCompleteDay,
  routineDone,
  routineScore,
  scoredRoutines,
  completionStreak,
} from "@/lib/score"
import { getColor } from "@/lib/types"
import type { DayLog, Routine } from "@/lib/types"

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
  onFocusRoutine,
}: OverviewProps) {
  const required = scoredRoutines(routines)
  const recorded = selected === today || hasActivity(log)
  const score = required.length === 0 || !recorded ? 0 : dayScore(routines, log)
  const percent = Math.round(score * 100)
  const checks = required.filter((routine) => routine.mode !== "rating")
  const doneCount = recorded ? checks.filter((routine) => routineDone(routine, log)).length : 0
  const dayLabel = selected === today ? "今天" : formatMonthDay(selected)

  const inPeriod = (date: string) => periodStart == null || date >= periodStart
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
      {selected === today ? null : (
        <p className="text-sm text-ink-soft">{formatMonthDay(selected)}</p>
      )}
      <p
        data-testid="today-percent"
        aria-live="polite"
        className="mt-1 text-5xl font-medium tracking-tight tabular-nums"
      >
        {required.length === 0 || !recorded ? "—" : `${percent}%`}
      </p>
      {headline === "今天的完成度" || headline === "今天還沒開始" ? null : (
        <p className="mt-1 text-base">{headline}</p>
      )}
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

      {periodStart || streak > 0 ? (
        <div className="mt-5 border-t border-black/5 pt-4">
          {periodStart ? (
            <p className="text-sm text-[#123e3a]">This period starts {formatEnglishDate(periodStart)}</p>
          ) : null}
          {streak > 0 ? (
            <p className={periodStart ? "mt-3 text-sm text-[#123e3a]" : "text-sm text-[#123e3a]"}>
              連續全勤 {streak} 天{todayComplete ? "" : "，今天還沒完成"}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

