"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { addDays, formatLong } from "@/lib/dates"
import { countdownToJul2028, getLunarDateString } from "@/lib/lunar"
import { CHECKLIST_START, checklistFor } from "@/lib/store"
import type { CheckItem, DayLog } from "@/lib/types"

type DailyTodoProps = {
  today: string
  selected: string
  now: Date
  log: DayLog
  onSelect: (date: string) => void
  onTitle: (id: string, title: string) => void
  onToggle: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function DailyTodo({
  today,
  selected,
  now,
  log,
  onSelect,
  onTitle,
  onToggle,
  onAdd,
  onDelete,
  onMove,
}: DailyTodoProps) {
  const items = checklistFor(selected, log)
  const started = selected >= CHECKLIST_START
  const [burst, setBurst] = useState<string | null>(null)
  const burstTimer = useRef<number | null>(null)
  const isToday = selected === today

  useEffect(() => {
    return () => {
      if (burstTimer.current != null) window.clearTimeout(burstTimer.current)
    }
  }, [])

  function complete(id: string) {
    const item = items?.find((entry) => entry.id === id)
    onToggle(id)
    if (!item || item.done) return
    setBurst(id)
    if (burstTimer.current != null) window.clearTimeout(burstTimer.current)
    burstTimer.current = window.setTimeout(() => setBurst(null), 1200)
  }

  const lunarDate = getLunarDateString(selected)

  return (
    <section className="relative mt-4" aria-label="待辦">
      {burst ? <Celebration /> : null}

      {/* Countdown card — only shown when viewing today */}
      {isToday ? <CountdownCard now={now} /> : null}

      <div className="mt-5 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 border-[#cecebf] bg-[#cecebf] text-[#0D0D0D] hover:bg-[#cecebf]"
          aria-label="前一天的待辦"
          disabled={selected <= CHECKLIST_START}
          onClick={() => onSelect(addDays(selected, -1))}
        >
          <ChevronLeft />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-base font-medium leading-tight">
            {formatLong(selected)}
            {isToday ? " · 今天" : ""}
          </p>
          {lunarDate ? (
            <p className="mt-0.5 text-xs text-ink-soft">農曆 {lunarDate}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 border-[#cecebf] bg-[#cecebf] text-[#0D0D0D] hover:bg-[#cecebf]"
          aria-label="後一天的待辦"
          onClick={() => onSelect(addDays(selected, 1))}
        >
          <ChevronRight />
        </Button>
      </div>
      {started && items ? (
        <>
          <ul className="mt-3 flex flex-col gap-2">
            {items.map((item, index) => (
              <TodoRow
                key={item.id}
                item={item}
                index={index}
                onTitle={onTitle}
                onToggle={complete}
                onDelete={onDelete}
                onMove={onMove}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
              />
            ))}
          </ul>
          <Button type="button" variant="outline" className="mt-3 h-11 w-full border-[#cecebf] bg-[#cecebf] text-[#0D0D0D] hover:bg-[#cecebf]" onClick={onAdd}>
            加一項
          </Button>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-soft">這一天還沒有待辦。清單從今天開始。</p>
      )}
    </section>
  )
}

function CountdownCard({ now }: { now: Date }) {
  const cd = countdownToJul2028(now)
  return (
    <div
      className="rounded-2xl bg-[#123e3a]/8 px-5 py-4"
      role="timer"
      aria-label="距 2028 年 7 月 1 日的倒計時"
    >
      <p className="text-xs font-medium tracking-wide text-ink-soft">距 2028 · 7 · 1 還有</p>
      {cd.past ? (
        <p className="mt-1 text-2xl font-semibold text-[#123e3a]">已到達</p>
      ) : (
        <div className="mt-1.5 flex items-baseline gap-3">
          <span className="text-3xl font-bold tabular-nums text-[#123e3a]">{cd.days}</span>
          <span className="text-sm text-ink-soft">天</span>
          <span className="text-xl font-semibold tabular-nums text-[#123e3a]">{String(cd.hours).padStart(2, "0")}</span>
          <span className="text-sm text-ink-soft">時</span>
          <span className="text-xl font-semibold tabular-nums text-[#123e3a]">{String(cd.minutes).padStart(2, "0")}</span>
          <span className="text-sm text-ink-soft">分</span>
        </div>
      )}
    </div>
  )
}

function GrowingNote({
  value,
  label,
  onChange,
}: {
  value: string
  label: string
  onChange: (value: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const field = ref.current
    if (!field) return
    field.style.height = "0px"
    field.style.height = `${field.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-11 min-w-0 flex-1 resize-none overflow-hidden whitespace-pre-wrap break-words bg-transparent py-2.5 text-base leading-6 text-[#0D0D0D] outline-none"
    />
  )
}

function TodoRow({
  item,
  index,
  onTitle,
  onToggle,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  item: CheckItem
  index: number
  onTitle: (id: string, title: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const label = item.title.trim() || `第 ${index + 1} 項`
  const [lifted, setLifted] = useState(false)
  const [offset, setOffset] = useState(0)
  const drag = useRef<DragState>(null)

  function clearDrag() {
    const state = drag.current
    if (state) window.clearTimeout(state.timer)
    drag.current = null
    setLifted(false)
    setOffset(0)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLLIElement>) {
    if ((event.target as HTMLElement).closest("[data-check]")) return
    const pointerId = event.pointerId
    const startX = event.clientX
    const startY = event.clientY
    const timer = window.setTimeout(() => {
      const state = drag.current
      if (!state || state.pointerId !== pointerId || state.swiping) return
      state.ready = true
      state.y = startY
      setLifted(true)
      event.currentTarget.setPointerCapture(pointerId)
    }, 320)
    drag.current = { pointerId, x: startX, y: startY, timer, ready: false, swiping: false, offset: 0 }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLLIElement>) {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    const dx = event.clientX - state.x
    const dy = event.clientY - state.y
    if (!state.ready) {
      if (!state.swiping && dx < -12 && Math.abs(dx) > Math.abs(dy)) {
        window.clearTimeout(state.timer)
        state.swiping = true
        event.currentTarget.setPointerCapture(event.pointerId)
      }
      if (state.swiping) {
        const next = Math.max(dx, -96)
        state.offset = next
        setOffset(next)
        return
      }
      if (Math.abs(dy) > 8) clearDrag()
      return
    }
    if (dy <= -32 && canMoveUp) {
      onMove(item.id, -1)
      state.y = event.clientY
    } else if (dy >= 32 && canMoveDown) {
      onMove(item.id, 1)
      state.y = event.clientY
    }
  }

  function onPointerUp(event: ReactPointerEvent<HTMLLIElement>) {
    const state = drag.current
    if (state && event.pointerId === state.pointerId && state.swiping && state.offset <= -72) {
      onDelete(item.id)
    }
    clearDrag()
  }

  return (
    <li
      className={`flex items-start gap-1 rounded-2xl bg-white/55 px-1 ring-1 ring-black/5 ${lifted ? "relative z-10 shadow-md ring-[#cecebf]" : ""} ${item.done ? "opacity-55" : ""}`}
      style={{ touchAction: lifted || offset < 0 ? "none" : "pan-y", transform: offset ? `translateX(${offset}px)` : undefined }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={clearDrag}
    >
      <button
        type="button"
        data-check
        className="grid size-11 shrink-0 place-items-center"
        aria-pressed={item.done}
        aria-label={item.done ? `標為未完成 ${label}` : `完成 ${label}`}
        onClick={() => onToggle(item.id)}
      >
        <Circle on={item.done} ink="#123e3a" />
      </button>
      <GrowingNote
        value={item.title}
        label={label}
        onChange={(value) => onTitle(item.id, value)}
      />
    </li>
  )
}

const CONFETTI_COLORS = ["#e2b15a", "#123e3a", "#6a9e97", "#e87040", "#c4f5f1", "#8b5cf6", "#f43f5e"]

function Celebration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20 grid place-items-center" role="status">
      <div
        className="relative grid size-28 place-items-center motion-reduce:animate-none"
        style={{ animation: "celebrate-pop 1200ms ease-out both" }}
      >
        {/* Centre checkmark */}
        <span className="relative z-10 grid size-16 place-items-center rounded-full bg-[#fffaf3] text-[#123e3a] shadow-[0_12px_30px_rgba(18,62,58,0.22)]">
          <svg viewBox="0 0 16 16" className="size-8" aria-hidden>
            <path
              d="M3.2 8.4 6.4 11.5 12.8 4.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        {/* Confetti particles */}
        <Spark left="4%"  top="12%" delay="0ms"   color={CONFETTI_COLORS[0]!} size={8}  />
        <Spark left="80%" top="8%"  delay="50ms"  color={CONFETTI_COLORS[1]!} size={7}  />
        <Spark left="90%" top="55%" delay="80ms"  color={CONFETTI_COLORS[2]!} size={9}  />
        <Spark left="2%"  top="65%" delay="30ms"  color={CONFETTI_COLORS[3]!} size={8}  />
        <Spark left="42%" top="2%"  delay="60ms"  color={CONFETTI_COLORS[4]!} size={6}  />
        <Spark left="88%" top="80%" delay="20ms"  color={CONFETTI_COLORS[5]!} size={7}  />
        <Spark left="12%" top="85%" delay="90ms"  color={CONFETTI_COLORS[6]!} size={6}  />
        <Spark left="50%" top="92%" delay="40ms"  color={CONFETTI_COLORS[0]!} size={5}  />
        <span className="sr-only">完成</span>
      </div>
    </div>
  )
}

function Spark({
  left,
  top,
  delay,
  color,
  size,
}: {
  left: string
  top: string
  delay: string
  color: string
  size: number
}) {
  return (
    <span
      className="absolute rounded-full"
      style={{
        left,
        top,
        width: size,
        height: size,
        background: color,
        animation: `celebrate-pop 1200ms ease-out ${delay} both`,
      }}
    />
  )
}

type DragState = {
  pointerId: number
  x: number
  y: number
  timer: number
  ready: boolean
  swiping: boolean
  offset: number
} | null
