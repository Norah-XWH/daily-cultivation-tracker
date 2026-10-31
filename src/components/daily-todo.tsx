"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { addDays, formatLong } from "@/lib/dates"
import { CHECKLIST_START, checklistFor } from "@/lib/store"
import type { CheckItem, DayLog } from "@/lib/types"

type DailyTodoProps = {
  today: string
  selected: string
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
    burstTimer.current = window.setTimeout(() => setBurst(null), 1100)
  }

  return (
    <section className="relative mt-4" aria-label="待辦">
      {burst ? <Celebration /> : null}
      <div className="flex items-center gap-2">
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
        <p className="min-w-0 flex-1 text-center text-base font-medium">
          {formatLong(selected)}
          {selected === today ? " · 今天" : ""}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 border-[#cecebf] bg-[#cecebf] text-[#0D0D0D] hover:bg-[#cecebf]"
          aria-label="後一天的待辦"
          disabled={selected >= today}
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
      className={`flex items-start gap-1 rounded-2xl bg-white/55 px-1 ring-1 ring-black/5 ${lifted ? "relative z-10 shadow-md ring-[#cecebf]" : ""}`}
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
      <GrowingNote value={item.title} label={label} onChange={(value) => onTitle(item.id, value)} />
    </li>
  )
}

function Celebration() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 grid place-items-center" role="status">
      <div className="relative grid size-24 place-items-center motion-reduce:animate-none" style={{ animation: "celebrate-pop 1100ms ease-out both" }}>
        <span className="grid size-16 place-items-center rounded-full bg-[#fffaf3] text-[#123e3a] shadow-[0_12px_30px_rgba(18,62,58,0.18)]">
          <svg viewBox="0 0 16 16" className="size-8" aria-hidden>
            <path d="M3.2 8.4 6.4 11.5 12.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <Spark left="8%" top="18%" delay="0ms" />
        <Spark left="78%" top="12%" delay="60ms" />
        <Spark left="86%" top="62%" delay="90ms" />
        <Spark left="6%" top="70%" delay="40ms" />
        <span className="sr-only">完成</span>
      </div>
    </div>
  )
}

function Spark({ left, top, delay }: { left: string; top: string; delay: string }) {
  return (
    <span
      className="absolute size-2 rounded-full bg-[#e2b15a]"
      style={{ left, top, animation: `celebrate-pop 1100ms ease-out ${delay} both` }}
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
