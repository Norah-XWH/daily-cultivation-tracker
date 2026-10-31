"use client"

import { useRef } from "react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatClockRange } from "@/lib/dates"
import { countedParts, partDone, ratingValues, routineDone, routineRating } from "@/lib/score"
import { MAX_RATING_GROUPS, RATING_GROUPS, snapRating } from "@/lib/store"
import { getColor } from "@/lib/types"
import type { Color, DayLog, Part, Routine } from "@/lib/types"

function metalStyle(color: Color, done: boolean) {
  const body = done ? color.strong : color.wash
  return {
    background: [
      "linear-gradient(180deg, rgba(255,255,255,0.66) 0%, rgba(255,255,255,0.18) 20%, rgba(255,255,255,0) 46%)",
      `linear-gradient(180deg, ${body} 0%, color-mix(in srgb, ${color.ink} 36%, ${body}) 100%)`,
    ].join(", "),
    borderColor: `color-mix(in srgb, white 64%, ${color.ink})`,
    boxShadow: [
      "inset 0 1px 0 rgba(255,255,255,0.92)",
      "inset 0 -14px 18px rgba(0,0,0,0.07)",
      `0 0 24px -2px color-mix(in srgb, ${color.ink} 78%, transparent)`,
      `0 16px 24px -12px color-mix(in srgb, ${color.ink} 88%, transparent)`,
    ].join(", "),
  }
}

type RoutineCardProps = {
  routine: Routine
  log: DayLog
  editing: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  onToggle: (partId: string) => void
  onRate: (index: number, percent: number) => void
  onRatingNote: (index: number, note: string) => void
  onAddRating: () => void
  onMinutes: (partId: string, minutes: number) => void
  onEdit: () => void
  onDelete: () => void
  onMove: (direction: -1 | 1) => void
}

export function RoutineCard(props: RoutineCardProps) {
  const { routine, log } = props
  const color = getColor(routine.color)
  const done = routine.mode === "rating" ? false : routineDone(routine, log)
  const simple =
    routine.parts.length === 1 &&
    routine.parts[0]?.kind === "check" &&
    !routine.parts[0]?.start &&
    !routine.parts[0]?.end
  return (
    <article
      id={`routine-${routine.id}`}
      data-testid="routine"
      className="scroll-mt-4 rounded-2xl border px-3 py-2"
      style={metalStyle(color, done)}
    >
      {routine.mode === "rating" ? (
        <RatingBar {...props} ink={color.ink} />
      ) : simple && routine.parts[0] ? (
        <SimpleRow {...props} part={routine.parts[0]} done={done} ink={color.ink} />
      ) : (
        <ComplexBody {...props} done={done} ink={color.ink} />
      )}

      {props.editing ? (
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white/60"
            disabled={!props.canMoveUp}
            onClick={() => props.onMove(-1)}
          >
            上移
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-white/60"
            disabled={!props.canMoveDown}
            onClick={() => props.onMove(1)}
          >
            下移
          </Button>
          <Button type="button" variant="outline" className="h-10 bg-white/60" onClick={props.onEdit}>
            修改
          </Button>
          <Button type="button" variant="destructive" className="h-10" onClick={props.onDelete}>
            刪除
          </Button>
        </div>
      ) : null}
    </article>
  )
}

function RatingBar({
  routine,
  log,
  ink,
  onRate,
  onRatingNote,
  onAddRating,
}: RoutineCardProps & { ink: string }) {
  const stored = ratingValues(routine, log)
  const notes = log.ratingNotes?.[routine.id] ?? []
  const count = Math.max(RATING_GROUPS, stored.length, notes.length)
  const average = routineRating(routine, log)

  return (
    <div>
      <h3 className="py-1 text-base font-medium break-words">{routine.name}</h3>
      <p className="text-3xl font-medium tabular-nums" style={{ color: ink }}>
        {average == null ? "—" : `${Math.round(average)}%`}
      </p>
      <div className="mt-2 flex flex-col gap-3">
        {Array.from({ length: count }, (_, index) => {
          const value = stored[index]
          const rated = typeof value === "number"
          return (
            <div key={index}>
              <DegreeSlider
                label={`${index + 1}`}
                value={rated ? value : null}
                ink={ink}
                onRate={(percent) => onRate(index, percent)}
              />
              <Textarea
                value={notes[index] ?? ""}
                aria-label={`${index + 1} 備註`}
                onChange={(event) => onRatingNote(index, event.target.value)}
                className="mt-1 min-h-11 bg-white/80 text-base md:text-base"
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between px-1 text-xs tabular-nums text-ink-soft">
        <span>0%</span>
        <span>100%</span>
      </div>
      {count < MAX_RATING_GROUPS ? (
        <Button type="button" variant="outline" className="mt-2 h-11 w-full bg-white/75" onClick={onAddRating}>
          加一條
        </Button>
      ) : null}
    </div>
  )
}

function DegreeSlider({
  label,
  value,
  ink,
  onRate,
}: {
  label: string
  value: number | null
  ink: string
  onRate: (percent: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const shown = value ?? 0

  function rateAt(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    onRate(snapRating(((clientX - rect.left) / rect.width) * 100))
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-sm tabular-nums text-ink-soft">{label}</span>
      <span className="w-12 text-sm font-medium tabular-nums" style={{ color: ink }}>
        {value == null ? "—" : `${shown}%`}
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={shown}
        aria-valuetext={value == null ? "還沒評" : `${shown}%`}
        className="relative h-11 min-w-0 flex-1 touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#33b3a6]"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          rateAt(event.clientX)
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          rateAt(event.clientX)
        }}
        onKeyDown={(event) => {
          const current = value ?? 0
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault()
            onRate(Math.min(100, current + 5))
          } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault()
            onRate(Math.max(0, current - 5))
          } else if (event.key === "Home") {
            event.preventDefault()
            onRate(0)
          } else if (event.key === "End") {
            event.preventDefault()
            onRate(100)
          }
        }}
      >
        <div
          ref={trackRef}
          className="absolute inset-x-3.5 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-white/80"
        >
          <div className="h-full rounded-full" style={{ width: `${shown}%`, background: ink }} />
        </div>
        <div
          aria-hidden
          className="absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-white shadow-sm"
          style={{
            left: `calc(0.875rem + (100% - 1.75rem) * ${shown / 100})`,
            borderColor: ink,
          }}
        />
      </div>
    </div>
  )
}

function SimpleRow({
  routine,
  part,
  done,
  ink,
  onToggle,
}: RoutineCardProps & { part: Part; done: boolean; ink: string }) {
  return (
    <button
      type="button"
      className="flex min-h-12 w-full items-center gap-3 text-left"
      aria-pressed={done}
      aria-label={`${routine.name} ${done ? "已完成" : "未完成"}`}
      onClick={() => onToggle(part.id)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium break-words">{routine.name}</span>
        {routine.detail ? (
          <span className="mt-0.5 block text-sm leading-5 text-ink-soft">{routine.detail}</span>
        ) : null}
        {!routine.required ? (
          <span className="mt-0.5 block text-xs text-ink-soft">不計入完成度</span>
        ) : null}
      </span>
      <Circle on={done} ink={ink} />
    </button>
  )
}

function ComplexBody({
  routine,
  log,
  done,
  ink,
  onToggle,
  onMinutes,
}: RoutineCardProps & { done: boolean; ink: string }) {
  const counted = countedParts(routine)
  const doneParts = counted.filter((part) => partDone(part, log)).length
  const status =
    !done &&
    counted.length <= 1 &&
    (routine.id === "exercise-2" || routine.id === "read-fa")
      ? ""
      : done
        ? "已完成"
        : counted.length > 1
          ? `${doneParts}/${counted.length}`
          : "未完成"
  return (
    <div>
      <header className="flex items-start justify-between gap-3 py-1">
        <div className="min-w-0">
          <h3 className="text-base font-medium break-words">{routine.name}</h3>
          {routine.detail ? (
            <p className="mt-0.5 text-sm leading-5 text-ink-soft">{routine.detail}</p>
          ) : null}
          {!routine.required ? <p className="mt-0.5 text-xs text-ink-soft">不計入完成度</p> : null}
        </div>
        {status ? (
          <p className="shrink-0 pt-0.5 text-sm font-medium tabular-nums" style={{ color: ink }}>
            {status}
          </p>
        ) : null}
      </header>
      <div className="mt-1 flex flex-col gap-2">
        {routine.parts.map((part) =>
          part.choices && part.choices.length > 0 ? (
            <ChoiceRow key={part.id} part={part} log={log} ink={ink} onMinutes={onMinutes} />
          ) : part.kind === "minutes" ? (
            <MinutesRow key={part.id} part={part} log={log} ink={ink} onMinutes={onMinutes} />
          ) : (
            <CheckRow key={part.id} part={part} log={log} ink={ink} onToggle={onToggle} />
          ),
        )}
      </div>
    </div>
  )
}

function CheckRow({
  part,
  log,
  ink,
  onToggle,
}: {
  part: Part
  log: DayLog
  ink: string
  onToggle: (partId: string) => void
}) {
  const on = Boolean(log.checks[part.id])
  const range = part.start && part.end ? formatClockRange(part.start, part.end) : ""
  return (
    <button
      type="button"
      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left"
      style={{ background: on ? "rgba(255,255,255,0.5)" : "transparent" }}
      aria-pressed={on}
      aria-label={`${range || part.label} ${on ? "已完成" : "未完成"}`}
      onClick={() => onToggle(part.id)}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium tabular-nums">{range || part.label}</span>
        {part.caption ? <span className="block text-sm text-ink-soft">{part.caption}</span> : null}
        {range ? <span className="block text-sm text-ink-soft">{part.label}</span> : null}
      </span>
      <Circle on={on} ink={ink} />
    </button>
  )
}

function MinutesRow({
  part,
  log,
  ink,
  onMinutes,
}: {
  part: Part
  log: DayLog
  ink: string
  onMinutes: (partId: string, minutes: number) => void
}) {
  const minutes = log.minutes[part.id] ?? 0
  const target = part.targetMinutes ?? 0
  function bump(delta: number) {
    onMinutes(part.id, Math.max(0, Math.min(999, minutes + delta)))
  }
  return (
    <div className="rounded-xl px-2 py-1">
      <p className="text-sm font-medium" style={{ color: ink }}>
        {part.label}
      </p>
      {part.caption ? <p className="text-sm text-ink-soft">{part.caption}</p> : null}
      <div className="mt-1 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-14 bg-white/70 px-3"
          aria-label="減少 15 分鐘"
          onClick={() => bump(-15)}
        >
          −15
        </Button>
        <Input
          inputMode="numeric"
          aria-label={`${part.label} 分鐘`}
          value={String(minutes)}
          onValueChange={(value) => {
            const digits = value.replace(/[^\d]/g, "").slice(0, 3)
            onMinutes(part.id, digits === "" ? 0 : Number(digits))
          }}
          className="h-11 w-16 bg-white/70 text-center text-base tabular-nums md:text-base"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-14 bg-white/70 px-3"
          aria-label="增加 15 分鐘"
          onClick={() => bump(15)}
        >
          +15
        </Button>
        {target > 0 && !part.optional ? (
          <span className="text-sm text-ink-soft tabular-nums">/ {target} 分鐘</span>
        ) : null}
      </div>
    </div>
  )
}

function ChoiceRow({
  part,
  log,
  ink,
  onMinutes,
}: {
  part: Part
  log: DayLog
  ink: string
  onMinutes: (partId: string, minutes: number) => void
}) {
  const minutes = log.minutes[part.id] ?? 0
  return (
    <div className="grid grid-cols-2 gap-2 px-1 pb-1">
      {(part.choices ?? []).map((choice) => {
        const on = minutes === choice
        return (
          <button
            key={choice}
            type="button"
            aria-pressed={on}
            className="h-12 rounded-xl text-base font-medium"
            style={{
              background: on ? ink : "rgba(255,255,255,0.78)",
              color: on ? "#f4fffd" : "#123e3a",
            }}
            onClick={() => onMinutes(part.id, on ? 0 : choice)}
          >
            {choice} 分鐘
          </button>
        )
      })}
    </div>
  )
}
