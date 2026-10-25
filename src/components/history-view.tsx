"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { formatEnglishDate, formatLong, formatMonthDay } from "@/lib/dates"
import { buildHistory, type HistoryBucket, type HistoryPoint, type HistorySpan } from "@/lib/history"
import { getColor } from "@/lib/types"
import type { DayLog, Routine } from "@/lib/types"
import { cn } from "@/lib/utils"

const SPANS: Array<{ id: HistorySpan; label: string }> = [
  { id: "30", label: "30 天" },
  { id: "90", label: "90 天" },
  { id: "all", label: "全部" },
]

type HistoryViewProps = {
  routines: Routine[]
  days: Record<string, DayLog>
  today: string
  periodStart: string | null
  onOpenDay: (date: string) => void
}

export function HistoryView({ routines, days, today, periodStart, onOpenDay }: HistoryViewProps) {
  const [span, setSpan] = useState<HistorySpan>("30")
  const [picked, setPicked] = useState<string | null>(null)
  const report = buildHistory(routines, days, today, span)
  const blankToday = report.todayCountsEmpty ? today : null
  const selected =
    picked != null && report.points.some((point) => point.date === picked)
      ? picked
      : (report.points.findLast((point) => point.score != null && point.date !== blankToday)?.date ??
        report.points.at(-1)?.date ??
        null)
  const selectedPoint = report.points.find((point) => point.date === selected) ?? null
  const filledMonths = report.months.filter((bucket) => bucket.average != null)
  const filledWeeks = report.weeks.filter((bucket) => bucket.average != null)
  const showMonths = span !== "30" && filledMonths.length >= 2
  const showWeeks = !showMonths && filledWeeks.length >= 2
  const hasRequired = report.routines.length > 0

  return (
    <div className="mt-4">
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="選擇一段時間">
        {SPANS.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={span === item.id ? "default" : "outline"}
            className="h-11"
            aria-pressed={span === item.id}
            onClick={() => setSpan(item.id)}
          >
            {item.label}
            {item.id === "all" ? <span className="ml-1 font-normal">All</span> : null}
          </Button>
        ))}
      </div>

      <section aria-label="一段時間的完成度" className="mt-4 rounded-3xl bg-white/55 px-4 py-4 ring-1 ring-black/5">
        {!hasRequired ? (
          <p className="text-sm leading-6 text-ink-soft">還沒有計入完成度的項目。</p>
        ) : report.logged === 0 ? (
          <p className="text-sm leading-6">還沒有記錄。先在「今天」裡打上勾，這裡會慢慢看出變化。</p>
        ) : (
          <>
            <p className="text-sm text-ink-soft">
              平均 <span>Average</span>
            </p>
            <p data-testid="trend-average" className="mt-1 text-5xl font-medium tracking-tight tabular-nums">
              {report.average == null ? "—" : `${Math.round(report.average * 100)}%`}
            </p>
            <p className="mt-1 text-sm text-ink-soft tabular-nums">
              記下 {report.logged} 天 · 全勤 {report.completeDays} 天
            </p>
            {periodStart ? (
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Earlier days are still here. This period starts {formatEnglishDate(periodStart)}.
              </p>
            ) : null}
            <Compare recent={report.recent} previous={report.previous} />
            {report.todayCountsEmpty ? (
              <p className="mt-2 text-sm leading-6 text-ink-soft">今天還是空的，所以會計成 0%。</p>
            ) : null}
            {report.logged === 1 ? (
              <p className="mt-2 text-sm leading-6 text-ink-soft">先有這一天。再記幾天，就能看出變化。</p>
            ) : null}

            <TrendChart
              points={report.points}
              selected={selected}
              blankToday={blankToday}
              onSelect={setPicked}
            />

            {selectedPoint ? (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm leading-6">
                  {formatLong(selectedPoint.date)}
                  <span className="ml-2 tabular-nums text-ink-soft">
                    {selectedPoint.score == null ? "沒有記錄" : `${Math.round(selectedPoint.score * 100)}%`}
                  </span>
                </p>
                <Button type="button" variant="outline" className="h-11 shrink-0" onClick={() => onOpenDay(selectedPoint.date)}>
                  打開這一天
                </Button>
              </div>
            ) : null}

            {showMonths ? <BucketChart title="按月" english="By month" buckets={report.months} /> : null}
            {showWeeks ? <BucketChart title="按週" english="By week" buckets={report.weeks} /> : null}
          </>
        )}
      </section>

      {hasRequired && report.logged > 0 ? (
        <section aria-label="各項平均" className="mt-4 rounded-3xl bg-white/55 px-4 py-4 ring-1 ring-black/5">
          <h2 className="text-sm font-medium">
            各項 <span className="font-normal text-ink-soft">Each item</span>
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {report.routines.map((routine) => {
              const color = getColor(routine.color)
              const width = routine.average == null ? 0 : Math.round(routine.average * 100)
              return (
                <div key={routine.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 text-sm leading-5 break-words">{routine.name}</p>
                    <p className="shrink-0 text-sm font-medium tabular-nums" style={{ color: color.ink }}>
                      {routine.average == null ? "—" : `${width}%`}
                    </p>
                  </div>
                  <div
                    className="mt-1 h-2.5 overflow-hidden rounded-full"
                    style={{ background: `color-mix(in srgb, ${color.ink} 22%, white)` }}
                  >
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: color.ink }} />
                  </div>
                  {routine.mode === "rating" ? (
                    <p className="mt-1 text-xs text-ink-soft">
                      程度 <span>degree</span>
                      {routine.samples > 0 ? ` · 評了 ${routine.samples} 天` : ""}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      <Button type="button" variant="outline" className="mt-4 h-11 w-full" onClick={() => onOpenDay(today)}>
        回到今天
      </Button>
    </div>
  )
}

function Compare({ recent, previous }: { recent: number | null; previous: number | null }) {
  if (recent == null && previous == null) return null
  return (
    <p className="mt-3 text-sm leading-6 text-ink-soft tabular-nums">
      {recent == null ? "近 7 天還沒有計入的日子。" : `近 7 天 ${Math.round(recent * 100)}%`}
      {previous == null ? " 再往前還沒有記錄。" : ` · 再往前 7 天 ${Math.round(previous * 100)}%`}
    </p>
  )
}

function TrendChart({
  points,
  selected,
  blankToday,
  onSelect,
}: {
  points: HistoryPoint[]
  selected: string | null
  blankToday: string | null
  onSelect: (date: string) => void
}) {
  if (points.length === 0) return null
  const dense = points.length > 42
  const label = chartLabel(points)

  if (!dense) {
    return (
      <div className="mt-4">
        <div
          className="grid h-24 gap-px"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          {points.map((point) => {
            const height = point.score == null ? 0 : Math.round(point.score * 100)
            return (
              <button
                key={point.date}
                type="button"
                aria-pressed={point.date === selected}
                aria-label={`${formatLong(point.date)}，${point.score == null ? "沒有記錄" : `完成度 ${height}%`}`}
                  className={cn(
                    "relative h-full overflow-hidden rounded-full bg-black/5",
                    point.date === selected && "ring-1 ring-[#123e3a]",
                  )}
                onClick={() => onSelect(point.date)}
              >
                <span
                  className="absolute inset-x-0 bottom-0 rounded-full"
                  style={{
                    height: point.score == null ? "0%" : `${Math.max(height, 4)}%`,
                    background:
                      height >= 100 ? getColor("moss").ink : "color-mix(in srgb, #26867b 72%, transparent)",
                  }}
                />
              </button>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-xs tabular-nums text-ink-soft">
          <span>{formatMonthDay(points[0]?.date ?? "")}</span>
          <span>{formatMonthDay(points[points.length - 1]?.date ?? "")}</span>
        </div>
      </div>
    )
  }

  const selectedIndex = Math.max(0, points.findIndex((point) => point.date === selected))

  function pick(clientX: number, width: number, left: number) {
    if (width <= 0) return
    const ratio = (clientX - left) / width
    const index = Math.round(ratio * (points.length - 1))
    const point = points[Math.max(0, Math.min(points.length - 1, index))]
    if (point) onSelect(point.date)
  }

  return (
    <div className="mt-4">
      <div
        data-testid="trend-chart"
        tabIndex={0}
        role="img"
        aria-label={label}
        className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#33b3a6]"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          pick(event.clientX, rect.width, rect.left)
        }}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
          event.preventDefault()
          const next = selectedIndex + (event.key === "ArrowRight" ? 1 : -1)
          const point = points[Math.max(0, Math.min(points.length - 1, next))]
          if (point) onSelect(point.date)
        }}
      >
        <LineChart
          points={points.map((point) =>
            point.date === blankToday ? { ...point, score: null } : point,
          )}
          selected={selected}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-ink-soft">
        <span>{formatMonthDay(points[0]?.date ?? "")}</span>
        <span>{formatMonthDay(points[points.length - 1]?.date ?? "")}</span>
      </div>
    </div>
  )
}

function chartX(index: number, count: number): number {
  if (count <= 1) return 50
  return (index / (count - 1)) * 100
}

function chartY(score: number): number {
  return 10 + (1 - score) * 80
}

function LineChart({ points, selected }: { points: HistoryPoint[]; selected: string | null }) {
  const runs: Array<Array<{ x: number; y: number }>> = []
  let run: Array<{ x: number; y: number }> = []
  points.forEach((point, index) => {
    if (point.score == null) {
      if (run.length > 0) runs.push(run)
      run = []
      return
    }
    run.push({ x: chartX(index, points.length), y: chartY(point.score) })
  })
  if (run.length > 0) runs.push(run)

  const selectedIndex = points.findIndex((point) => point.date === selected)
  const selectedPoint = selectedIndex >= 0 ? points[selectedIndex] : null
  const markerX = selectedIndex >= 0 ? chartX(selectedIndex, points.length) : null

  return (
    <div className="relative h-36">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        <line x1="0" x2="100" y1="50" y2="50" stroke="#123e3a" strokeOpacity="0.12" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
        {runs.map((path) => {
          const first = path[0]
          const last = path[path.length - 1]
          if (!first || !last) return null
          const line = path.map((dot, index) => `${index === 0 ? "M" : "L"}${dot.x.toFixed(2)},${dot.y.toFixed(2)}`).join(" ")
          const area = `${line} L${last.x.toFixed(2)},92 L${first.x.toFixed(2)},92 Z`
          return (
            <g key={`${first.x}-${last.x}`}>
              <path d={area} fill="#26867b" fillOpacity="0.2" />
              <path
                d={line}
                fill="none"
                stroke="#26867b"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )
        })}
      </svg>
      {markerX != null ? (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 w-px bg-[#123e3a]/35"
          style={{ left: `${markerX}%` }}
        />
      ) : null}
      {markerX != null && selectedPoint?.score != null ? (
        <span
          aria-hidden
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#123e3a]"
          style={{ left: `${markerX}%`, top: `${chartY(selectedPoint.score)}%` }}
        />
      ) : null}
    </div>
  )
}

function BucketChart({
  title,
  english,
  buckets,
}: {
  title: string
  english: string
  buckets: HistoryBucket[]
}) {
  return (
    <div className="mt-5 border-t border-black/5 pt-4">
      <h2 className="text-sm font-medium">
        {title} <span className="font-normal text-ink-soft">{english}</span>
      </h2>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))` }}>
        {buckets.map((bucket) => {
          const height = bucket.average == null ? 0 : Math.round(bucket.average * 100)
          return (
            <div key={`${bucket.start}-${bucket.end}`} className="flex flex-col items-center gap-1">
              <span
                className="relative h-16 w-3.5 overflow-hidden rounded-full bg-black/5"
                aria-label={`${formatMonthDay(bucket.start)}到${formatMonthDay(bucket.end)}，${bucket.average == null ? "沒有記錄" : `平均 ${height}%`}`}
              >
                <span
                  className="absolute inset-x-0 bottom-0 rounded-full"
                  style={{
                    height: `${height}%`,
                    background:
                      height >= 100 ? getColor("moss").ink : "color-mix(in srgb, #26867b 72%, transparent)",
                  }}
                />
              </span>
              <span className="text-center text-[10px] leading-3 tabular-nums text-ink-soft">{bucket.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function chartLabel(points: HistoryPoint[]): string {
  const scored = points.filter((point) => point.score != null)
  if (scored.length === 0) return "這段時間沒有記錄"
  const first = scored[0]
  const last = scored[scored.length - 1]
  if (!first || !last) return "完成度曲線"
  return `完成度曲線，從${formatMonthDay(first.date)}到${formatMonthDay(last.date)}，記下 ${scored.length} 天`
}
