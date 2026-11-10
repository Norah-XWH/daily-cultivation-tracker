"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getLunarDateString, countdownToJul2028 } from "@/lib/lunar"

// ─── Types ───────────────────────────────────────────────────────────────────

type TodoItem = {
  id: string
  text: string
  done: boolean
  sourceId?: string
  date: string
}

type AppData = {
  v: 1
  todos: Record<string, TodoItem[]>
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "myday.v1"

function todayStr(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function prevDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  const date = new Date(y!, m! - 1, d!)
  date.setDate(date.getDate() - 1)
  return todayStr(date)
}

function nextDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  const date = new Date(y!, m! - 1, d!)
  date.setDate(date.getDate() + 1)
  return todayStr(date)
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadData(): AppData {
  if (typeof window === "undefined") return { v: 1, todos: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { v: 1, todos: {} }
    const parsed = JSON.parse(raw) as AppData
    if (parsed.v !== 1) return { v: 1, todos: {} }
    return parsed
  } catch {
    return { v: 1, todos: {} }
  }
}

function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

// ─── Auto carry-forward ───────────────────────────────────────────────────────

function carryForward(data: AppData, today: string): AppData {
  let result = data
  // Look back up to 60 days
  let cur = prevDay(today)
  const limit = (() => {
    const [y, m, d] = today.split("-").map(Number)
    const t = new Date(y!, m! - 1, d!)
    t.setDate(t.getDate() - 60)
    return todayStr(t)
  })()

  const days: string[] = []
  while (cur >= limit) {
    days.unshift(cur)
    cur = prevDay(cur)
  }

  for (const day of days) {
    const nxt = nextDay(day)
    if (nxt > today) break
    const dayItems = result.todos[day] ?? []
    const undone = dayItems.filter((item) => !item.done && item.text.trim())
    if (undone.length === 0) continue

    const nxtItems: TodoItem[] = result.todos[nxt] ?? []
    const present = new Set(nxtItems.map((i) => i.sourceId ?? i.id))
    const toCarry = undone.filter((i) => !present.has(i.sourceId ?? i.id))
    if (toCarry.length === 0) continue

    const carried: TodoItem[] = toCarry.map((i) => ({
      id: uid(),
      text: i.text,
      done: false,
      sourceId: i.sourceId ?? i.id,
      date: nxt,
    }))
    result = {
      ...result,
      todos: {
        ...result.todos,
        [nxt]: [...nxtItems, ...carried],
      },
    }
  }

  return result
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"]

function formatDate(now: Date): string {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const w = WEEKDAYS[now.getDay()] ?? ""
  return `${y}年${m}月${d}日  週${w}`
}

// ─── Celebration ─────────────────────────────────────────────────────────────

const DOTS = [
  { l: "5%",  t: "15%", c: "#f97316", delay: 0   },
  { l: "78%", t: "10%", c: "#8b5cf6", delay: 60  },
  { l: "88%", t: "58%", c: "#06b6d4", delay: 90  },
  { l: "3%",  t: "68%", c: "#f43f5e", delay: 30  },
  { l: "45%", t: "4%",  c: "#10b981", delay: 55  },
  { l: "90%", t: "82%", c: "#eab308", delay: 20  },
  { l: "14%", t: "86%", c: "#3b82f6", delay: 80  },
  { l: "52%", t: "92%", c: "#f97316", delay: 45  },
  { l: "30%", t: "5%",  c: "#ec4899", delay: 70  },
  { l: "70%", t: "30%", c: "#14b8a6", delay: 10  },
]

function Celebration({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1300)
    return () => window.clearTimeout(t)
  }, [onDone])

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-live="polite"
      aria-label="完成！"
    >
      <div className="relative size-32">
        {/* checkmark circle */}
        <div
          className="absolute inset-0 m-auto size-16 rounded-full bg-white shadow-xl flex items-center justify-center"
          style={{ animation: "celebrate-pop 1300ms cubic-bezier(0.16,0.84,0.2,1.4) both" }}
        >
          <svg viewBox="0 0 24 24" className="size-9 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        {/* confetti */}
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: dot.l,
              top: dot.t,
              width: 10,
              height: 10,
              background: dot.c,
              animation: `celebrate-pop 1300ms ease-out ${dot.delay}ms both`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function MyDay() {
  const [now, setNow] = useState<Date | null>(null)
  const [data, setData] = useState<AppData>({ v: 1, todos: {} })
  const [celebrating, setCelebrating] = useState(false)
  const lastCarryRef = useRef<string | null>(null)

  // Hydrate on client only to avoid SSR mismatch
  useEffect(() => {
    const loaded = loadData()
    const today = todayStr()
    const carried = carryForward(loaded, today)
    lastCarryRef.current = today
    if (carried !== loaded) saveData(carried)
    setData(carried)
    setNow(new Date())
  }, [])

  // Clock tick every minute
  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setNow(n)
      // Carry forward if day has rolled over
      const today = todayStr(n)
      if (lastCarryRef.current !== today) {
        setData((prev) => {
          const next = carryForward(prev, today)
          if (next !== prev) saveData(next)
          return next
        })
        lastCarryRef.current = today
      }
    }
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [])

  const write = useCallback((next: AppData) => {
    saveData(next)
    setData(next)
  }, [])

  const today = now ? todayStr(now) : todayStr()
  const items: TodoItem[] = data.todos[today] ?? []

  function addItem() {
    const item: TodoItem = { id: uid(), text: "", done: false, date: today }
    write({ ...data, todos: { ...data.todos, [today]: [...items, item] } })
  }

  function setText(id: string, text: string) {
    write({
      ...data,
      todos: {
        ...data.todos,
        [today]: items.map((it) => (it.id === id ? { ...it, text } : it)),
      },
    })
  }

  function toggleDone(id: string) {
    const item = items.find((it) => it.id === id)
    if (!item) return
    const wasUndone = !item.done
    write({
      ...data,
      todos: {
        ...data.todos,
        [today]: items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
      },
    })
    if (wasUndone) setCelebrating(true)
  }

  function deleteItem(id: string) {
    write({
      ...data,
      todos: { ...data.todos, [today]: items.filter((it) => it.id !== id) },
    })
  }

  const cd = now ? countdownToJul2028(now) : null
  const lunarDate = now ? getLunarDateString(today) : null

  return (
    <div className="min-h-dvh bg-[#f5f4ef] flex justify-center">
      <div className="w-full max-w-sm flex flex-col px-5 pb-10" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>

        {/* ── Date header ── */}
        <header className="mb-6">
          {now ? (
            <>
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-[#1a1a1a]">
                {formatDate(now)}
              </h1>
              {lunarDate ? (
                <p className="mt-1 text-sm text-[#6b7c79]">農曆 {lunarDate}</p>
              ) : null}
            </>
          ) : (
            <div className="h-8 w-48 rounded-lg bg-black/8 animate-pulse" />
          )}
        </header>

        {/* ── Countdown card ── */}
        <div className="mb-7 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-black/5">
          <p className="text-xs font-medium tracking-widest text-[#8a9e9b] uppercase">距 2028 · 7 · 1</p>
          {cd && !cd.past ? (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-[#1a1a1a]">{cd.days}</span>
              <span className="text-sm text-[#8a9e9b] mr-2">天</span>
              <span className="text-2xl font-semibold tabular-nums text-[#1a1a1a]">{String(cd.hours).padStart(2, "0")}</span>
              <span className="text-sm text-[#8a9e9b] mr-1">時</span>
              <span className="text-2xl font-semibold tabular-nums text-[#1a1a1a]">{String(cd.minutes).padStart(2, "0")}</span>
              <span className="text-sm text-[#8a9e9b]">分</span>
            </div>
          ) : cd?.past ? (
            <p className="mt-2 text-lg font-semibold text-[#1a1a1a]">已到達</p>
          ) : (
            <div className="mt-2 h-10 w-40 rounded-lg bg-black/8 animate-pulse" />
          )}
        </div>

        {/* ── To-do list ── */}
        <section>
          <h2 className="mb-3 text-xs font-medium tracking-widest text-[#8a9e9b] uppercase">今天的待辦</h2>

          {items.length === 0 ? (
            <p className="text-sm text-[#aab8b5] mb-4">還沒有待辦。加一項開始。</p>
          ) : (
            <ul className="flex flex-col gap-2 mb-3">
              {items.map((item) => (
                <TodoRow
                  key={item.id}
                  item={item}
                  onText={setText}
                  onToggle={toggleDone}
                  onDelete={deleteItem}
                />
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={addItem}
            className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#c8d4d2] text-sm text-[#8a9e9b] transition-colors hover:border-[#9ab0ad] hover:text-[#6b7c79] active:bg-[#eaedec]"
          >
            <span className="text-lg leading-none">+</span>
            加一項
          </button>
        </section>
      </div>

      {celebrating ? <Celebration onDone={() => setCelebrating(false)} /> : null}
    </div>
  )
}

// ─── TodoRow ──────────────────────────────────────────────────────────────────

function TodoRow({
  item,
  onText,
  onToggle,
  onDelete,
}: {
  item: TodoItem
  onText: (id: string, text: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [swiping, setSwiping] = useState(false)
  const [offsetX, setOffsetX] = useState(0)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const ptrId = useRef<number | null>(null)
  const ref = useRef<HTMLLIElement>(null)

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-check],[data-input]")) return
    startX.current = e.clientX
    startY.current = e.clientY
    ptrId.current = e.pointerId
  }

  function onPointerMove(e: React.PointerEvent) {
    if (ptrId.current !== e.pointerId || startX.current === null || startY.current === null) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (!swiping) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        setSwiping(true)
        ref.current?.setPointerCapture(e.pointerId)
      } else if (Math.abs(dy) > 8) {
        startX.current = null
      }
      return
    }
    setOffsetX(Math.min(0, Math.max(dx, -100)))
  }

  function onPointerUp(e: React.PointerEvent) {
    if (ptrId.current !== e.pointerId) return
    if (swiping && offsetX <= -72) onDelete(item.id)
    setSwiping(false)
    setOffsetX(0)
    startX.current = null
    ptrId.current = null
  }

  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = "0px"
    el.style.height = `${el.scrollHeight}px`
  }, [item.text])

  return (
    <li
      ref={ref}
      className={`flex items-start gap-2 rounded-2xl bg-white px-3 ring-1 ring-black/5 transition-opacity ${item.done ? "opacity-45" : ""}`}
      style={{
        transform: offsetX ? `translateX(${offsetX}px)` : undefined,
        touchAction: swiping ? "none" : "pan-y",
        transition: swiping ? undefined : "transform 200ms ease, opacity 200ms",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Checkbox */}
      <button
        type="button"
        data-check
        className="mt-0.5 shrink-0 grid size-11 place-items-center"
        onClick={() => onToggle(item.id)}
        aria-pressed={item.done}
      >
        <span
          className={`flex size-5 items-center justify-center rounded-full border-2 transition-all ${
            item.done
              ? "border-emerald-500 bg-emerald-500"
              : "border-[#c8d4d2] bg-transparent"
          }`}
        >
          {item.done ? (
            <svg viewBox="0 0 12 12" className="size-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 6.5l2.5 2.5 5.5-5" />
            </svg>
          ) : null}
        </span>
      </button>

      {/* Text area */}
      <textarea
        ref={textRef}
        data-input
        rows={1}
        value={item.text}
        placeholder="寫下待辦…"
        onChange={(e) => onText(item.id, e.target.value)}
        className={`min-h-11 flex-1 resize-none overflow-hidden bg-transparent py-2.5 text-base leading-6 outline-none placeholder:text-[#c0ccc9] ${item.done ? "line-through text-[#9ab0ad]" : "text-[#1a1a1a]"}`}
        style={{ touchAction: "pan-y" }}
      />
    </li>
  )
}
