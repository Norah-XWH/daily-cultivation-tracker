"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"

const COUNTDOWN_SECONDS = 180 * 60 * 60
const TIMER_KEY = "ai-trading-timer"
const MAX_DURATION = 23 * 3600 + 59 * 60
const WHEEL_ITEM = 32

type TimerSnap = {
  keptSeconds: number
  durationSeconds: number
  elapsedSeconds: number
  runningSince: number | null
}

function formatCountdown(totalSeconds: number): string {
  const total = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  return `${hours}H${String(minutes).padStart(2, "0")}M`
}

function liveElapsed(snap: TimerSnap, now: number): number {
  const run = snap.runningSince == null ? 0 : Math.floor(Math.max(0, now - snap.runningSince) / 1000)
  return Math.min(snap.durationSeconds, snap.elapsedSeconds + run)
}

const ZERO_TIMER: TimerSnap = {
  keptSeconds: 0,
  durationSeconds: 0,
  elapsedSeconds: 0,
  runningSince: null,
}

function readTimer(): TimerSnap {
  // 180H00M, wheels at 00, and no leftover run.
  writeTimer(ZERO_TIMER)
  return ZERO_TIMER
}

function writeTimer(snap: TimerSnap) {
  try {
    localStorage.setItem(TIMER_KEY, JSON.stringify(snap))
  } catch {
    // The countdown still runs in memory.
  }
}

let audioCtx: AudioContext | null = null
let lastBellAt = 0
let lastFinishedRun: number | null = null

function audioContext(): AudioContext | null {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

function unlockAudio() {
  const ctx = audioContext()
  if (ctx && ctx.state === "suspended") void ctx.resume()
}

function strike(ctx: AudioContext, when: number) {
  const partials = [1, 2.01, 2.97, 4.16, 5.43]
  partials.forEach((ratio, index) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = 784 * ratio
    const peak = 0.14 / (index + 1)
    gain.gain.setValueAtTime(0.0001, when)
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 1.7)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(when)
    osc.stop(when + 1.75)
  })
}

function playBell() {
  const stamp = Date.now()
  if (stamp - lastBellAt < 1200) return
  lastBellAt = stamp
  const ctx = audioContext()
  if (!ctx) return
  void ctx.resume()
  strike(ctx, ctx.currentTime)
  strike(ctx, ctx.currentTime + 0.38)
}

function Wheel({
  label,
  max,
  value,
  onChange,
}: {
  label: string
  max: number
  value: number
  onChange: (next: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const settle = useRef<number | null>(null)
  const syncing = useRef(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const target = value * WHEEL_ITEM
    if (Math.abs(el.scrollTop - target) < 1) return
    syncing.current = true
    if (settle.current != null) window.clearTimeout(settle.current)
    el.scrollTop = target
    window.setTimeout(() => {
      syncing.current = false
    }, 140)
  }, [value])

  function onScroll() {
    if (syncing.current) return
    if (settle.current != null) window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const next = Math.max(0, Math.min(max, Math.round(el.scrollTop / WHEEL_ITEM)))
      if (next !== value) onChange(next)
    }, 70)
  }

  return (
    <div className="relative h-full min-w-0 flex-1">
      <div
        ref={ref}
        aria-label={label}
        className="h-full touch-pan-y overflow-y-auto overscroll-contain snap-y snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 16%, rgba(0,0,0,0.4) 30%, #000 42%, #000 58%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.15) 84%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.15) 16%, rgba(0,0,0,0.4) 30%, #000 42%, #000 58%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.15) 84%, transparent 100%)",
        }}
        onScroll={onScroll}
      >
        <div style={{ height: WHEEL_ITEM }} />
        {Array.from({ length: max + 1 }, (_, item) => (
          <div
            key={item}
            className={`flex h-8 snap-center items-center justify-center text-[1.3rem] font-medium tabular-nums ${item === value ? "text-[#123e3a]" : "text-[#123e3a]/35"}`}
          >
            {String(item).padStart(2, "0")}
          </div>
        ))}
        <div style={{ height: WHEEL_ITEM }} />
      </div>
      <span className="pointer-events-none absolute top-1/2 left-[62%] -translate-y-1/2 text-[0.72rem] font-medium text-[#123e3a]/80">
        {label}
      </span>
    </div>
  )
}

export function SkillPage() {
  const [now, setNow] = useState(() => Date.now())
  const [timer, setTimer] = useState<TimerSnap>(ZERO_TIMER)
  const [openStage, setOpenStage] = useState<number | null>(null)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [readmeOpen, setReadmeOpen] = useState(false)
  const running = timer.runningSince != null
  const elapsedSeconds = liveElapsed(timer, now)
  const sessionRemaining = Math.max(0, timer.durationSeconds - elapsedSeconds)
  const projectRemaining = Math.max(0, COUNTDOWN_SECONDS - timer.keptSeconds - elapsedSeconds)
  const paused = !running && timer.durationSeconds > 0 && sessionRemaining > 0
  const shownSeconds = sessionRemaining === 0 ? 0 : Math.ceil(sessionRemaining / 60) * 60
  const hours = Math.floor(shownSeconds / 3600)
  const minutes = Math.floor((shownSeconds % 3600) / 60)

  useEffect(() => {
    setNow(Date.now())
    setTimer(readTimer())
    setDone(readChecks())
    setCurrentId(readCurrent())
  }, [])

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running || sessionRemaining > 0 || timer.runningSince == null) return
    if (lastFinishedRun === timer.runningSince) return
    lastFinishedRun = timer.runningSince
    const next = {
      keptSeconds: timer.keptSeconds + timer.durationSeconds,
      durationSeconds: 0,
      elapsedSeconds: 0,
      runningSince: null,
    }
    writeTimer(next)
    setTimer(next)
    playBell()
  }, [running, sessionRemaining, timer])

  function setDuration(nextHours: number, nextMinutes: number) {
    const durationSeconds = Math.min(MAX_DURATION, nextHours * 3600 + nextMinutes * 60)
    const stamp = Date.now()
    setNow(stamp)
    unlockAudio()
    setTimer((current) => {
      const elapsed = liveElapsed(current, stamp)
      const next = {
        keptSeconds: current.keptSeconds + elapsed,
        durationSeconds,
        elapsedSeconds: 0,
        runningSince: durationSeconds > 0 ? stamp : null,
      }
      writeTimer(next)
      return next
    })
  }

  function pauseOrResume() {
    const stamp = Date.now()
    setNow(stamp)
    unlockAudio()
    setTimer((current) => {
      if (current.runningSince != null) {
        const next = { ...current, elapsedSeconds: liveElapsed(current, stamp), runningSince: null }
        writeTimer(next)
        return next
      }
      if (current.durationSeconds <= current.elapsedSeconds) return current
      const next = { ...current, runningSince: stamp }
      writeTimer(next)
      return next
    })
  }

  const usedSeconds = timer.keptSeconds + elapsedSeconds
  const checkedPlace = findTask(currentId)
  const doneSet = new Set(done)
  const stageTasks = checkedPlace ? PLAN[checkedPlace.stage].groups.flatMap((group) => group.tasks) : []
  const stageChecked = stageTasks.filter((task) => doneSet.has(task.id)).length
  const allTasks = PLAN.flatMap((stage) => stage.groups.flatMap((group) => group.tasks))
  const allChecked = allTasks.filter((task) => doneSet.has(task.id)).length
  const stageProgress = checkedPlace
    ? (stageHourShare(usedSeconds, checkedPlace.stage) + stageChecked / stageTasks.length) / 2
    : 0
  const wholeProgress = (Math.min(1, usedSeconds / COUNTDOWN_SECONDS) + allChecked / allTasks.length) / 2

  function toggleTask(id: string) {
    const turningOn = !doneSet.has(id)
    setDone((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      writeChecks(next)
      return next
    })
    if (turningOn) {
      setCurrentId(id)
      writeCurrent(id)
    } else if (currentId === id) {
      setCurrentId(null)
      writeCurrent(null)
    }
  }

  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col" aria-label="AI Trading Project">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[1.35rem] font-medium text-[#123e3a]">AI Trading Project</h1>
        <p className="text-[1.45rem] leading-none font-medium tabular-nums text-[#123e3a]" aria-label="180 hour countdown">
          {formatCountdown(projectRemaining)}
        </p>
      </div>
      <div className="mt-2">
        <Button
          type="button"
          variant="outline"
          aria-expanded={readmeOpen}
          className="h-7 border-[#123e3a]/20 bg-white/70 px-2.5 text-sm text-[#123e3a]"
          onClick={() => setReadmeOpen((open) => !open)}
        >
          ReadMe
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <div className="relative h-[96px] w-[13.75rem] shrink-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 z-0 h-8 -translate-y-1/2 rounded-lg bg-white/80 shadow-[inset_0_0_0_1px_rgba(18,62,58,0.08)]"
          />
          <div className="relative z-10 flex h-full">
            <Wheel label="hours" max={23} value={hours} onChange={(next) => setDuration(next, minutes)} />
            <Wheel label="min" max={59} value={minutes} onChange={(next) => setDuration(hours, next)} />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 shrink-0 border-[#123e3a]/20 bg-white/70 px-2.5 text-sm text-[#123e3a]"
          onClick={pauseOrResume}
          disabled={!running && !paused}
        >
          {paused ? "Resume" : "Pause"}
        </Button>
      </div>
      <div className="mt-3 space-y-2">
        <Meter label="This stage" value={stageProgress} />
        <Meter label="Whole setting" value={wholeProgress} />
      </div>
      {readmeOpen ? (
        <div className="mt-3 min-h-0 flex-1 space-y-4 overflow-y-auto pb-2 text-[0.95rem] leading-6 text-[#123e3a]">
          <p>Goal: Learn to operate a personal AI-assisted trading system using existing tools, with human approval required for every trade and trading income as the long-term goal.</p>
          <p>Day 90 target: Independently operate and evaluate a no-code, AI-assisted paper-trading system. Every simulated buy or sell requires human approval; none occurs automatically without it.</p>
        </div>
      ) : null}
      <ol className={`mt-3 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pb-2 ${readmeOpen ? "hidden" : ""}`}>
        {PLAN.map((stage, index) => {
          const open = openStage === index
          const current = checkedPlace?.stage === index
          return (
            <li key={stage.hours}>
              <button
                type="button"
                aria-expanded={open}
                className="w-full rounded-xl border border-[#123e3a]/10 bg-white/45 px-2.5 py-1.5 text-left"
                onClick={() => {
                  setOpenGroup(null)
                  setOpenStage(open ? null : index)
                }}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 text-sm text-[#123e3a]">
                    <span className="text-[#123e3a]/65">{stage.hours}</span>
                    <span className="mx-1.5 text-[#123e3a]/35">·</span>
                    <span className="font-medium">{stage.name}</span>
                  </span>
                  {current ? <span className="shrink-0 text-xs font-medium text-[#123e3a]">Current</span> : null}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-[#123e3a]/75">{stage.outcome}</span>
              </button>
              {open ? (
                <ul className="mt-1 space-y-1">
                  {stage.groups.map((group) => {
                    const groupOpen = openGroup === group.id
                    const groupCurrent = checkedPlace?.group === group.id
                    return (
                      <li key={group.id}>
                        <button
                          type="button"
                          aria-expanded={groupOpen}
                          className="flex w-full items-center justify-between gap-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-left text-sm font-medium text-[#123e3a]"
                          onClick={() => setOpenGroup(groupOpen ? null : group.id)}
                        >
                          <span>{group.title}</span>
                          {groupCurrent ? <span className="shrink-0 text-xs font-medium">Current</span> : null}
                        </button>
                        {groupOpen ? (
                          <ul className="mt-1 space-y-1">
                            {group.tasks.map((task) => {
                              const on = doneSet.has(task.id)
                              return (
                                <li key={task.id} className="flex items-center gap-1 rounded-lg bg-white/55 px-1">
                                  <button
                                    type="button"
                                    className="grid size-11 shrink-0 place-items-center"
                                    aria-pressed={on}
                                    aria-label={on ? `Mark not done ${task.text}` : `Mark done ${task.text}`}
                                    onClick={() => toggleTask(task.id)}
                                  >
                                    <Circle on={on} ink="#123e3a" />
                                  </button>
                                  <span className={`py-2 pr-2 text-sm leading-5 text-[#123e3a] ${on ? "opacity-55" : ""}`}>
                                    {task.text}
                                  </span>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs text-[#123e3a]/75">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/70" aria-hidden>
        <div className="h-full rounded-full bg-[#123e3a]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function stageHourShare(usedSeconds: number, index: number): number {
  const used = Math.max(0, usedSeconds) / 3600
  const start = index * 30
  return Math.min(1, Math.max(0, used - start) / 30)
}

const CHECK_KEY = "ai-trading-checks"

function readChecks(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CHECK_KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((item) => typeof item === "string") : []
  } catch {
    return []
  }
}

function writeChecks(ids: string[]) {
  try {
    localStorage.setItem(CHECK_KEY, JSON.stringify(ids))
  } catch {
    // Checks still update on screen.
  }
}

const CURRENT_KEY = "ai-trading-current"

function readCurrent(): string | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY)
    return raw && findTask(raw) ? raw : null
  } catch {
    return null
  }
}

function writeCurrent(id: string | null) {
  try {
    if (id) localStorage.setItem(CURRENT_KEY, id)
    else localStorage.removeItem(CURRENT_KEY)
  } catch {
    // The mark still updates on screen.
  }
}

function findTask(id: string | null): { stage: number; group: string } | null {
  if (!id) return null
  for (let stage = 0; stage < PLAN.length; stage += 1) {
    for (const group of PLAN[stage].groups) {
      if (group.tasks.some((task) => task.id === id)) return { stage, group: group.id }
    }
  }
  return null
}

type Task = { id: string; text: string }
type Group = { id: string; title: string; tasks: Task[] }
type Stage = { hours: string; name: string; outcome: string; groups: Group[] }

function group(id: string, title: string, tasks: string[]): Group {
  return { id, title, tasks: tasks.map((text, index) => ({ id: `${id}-${index + 1}`, text })) }
}

const PLAN: Stage[] = [
  {
    hours: "Hours 0–30",
    name: "Trading Fundamentals",
    outcome: "Trading fundamentals checklist and essential vocabulary.",
    groups: [
      group("1.1", "Stock Market Basics", [
        "Understand stocks, ETFs, and ownership.",
        "Learn how stock exchanges and brokers work.",
        "Understand what makes stock prices rise or fall.",
        "Learn market hours, liquidity, and bid/ask prices.",
        "Review examples and explain how the stock market works.",
      ]),
      group("1.2", "Trading Mechanics", [
        "Learn buying, selling, and order types.",
        "Learn to read stock price charts.",
        "Understand price trends, volume, and volatility.",
        "Practice calculating profits and losses.",
        "Understand fees, spreads, and other trading costs.",
      ]),
      group("1.3", "Strategies & Risk", [
        "Compare day trading, swing trading, and long-term investing.",
        "Learn basic trading indicators and their limitations.",
        "Understand common trading risks and losses.",
        "Learn position size, drawdown, and risk limits.",
        "Review how automated trading works and test your understanding.",
      ]),
    ],
  },
  {
    hours: "Hours 31–60",
    name: "Tools & AI Agents",
    outcome: "Selected tool stack and a workflow diagram.",
    groups: [
      group("2.1", "Tool Discovery", [
        "Explore existing stock trading and research platforms.",
        "Understand AI assistants, AI Agents, and trading bots.",
        "Explore market monitoring and alert tools.",
        "Explore paper-trading and backtesting platforms.",
        "Understand what each tool can and cannot automate.",
      ]),
      group("2.2", "Tool Selection", [
        "Compare three potential trading platforms.",
        "Compare AI Agent capabilities and limitations.",
        "Compare costs, ease of use, and reliability.",
        "Check compatibility, security, and human approval features.",
        "Select the tools for your simulated trading workflow.",
      ]),
      group("2.3", "Initial Setup", [
        "Set up available research and demo tools.",
        "Create a practice watchlist and explore market data.",
        "Practice setting price and indicator alerts.",
        "Test AI-generated market summaries for accuracy.",
        "Draw your complete AI-assisted trading workflow.",
      ]),
    ],
  },
  {
    hours: "Hours 61–90",
    name: "Trading Strategy & Rules",
    outcome: "One defined trading strategy and a tested human approval process.",
    groups: [
      group("3.1", "Strategy Selection", [
        "Understand trend-following strategies.",
        "Understand moving-average strategies.",
        "Understand momentum and reversal strategies.",
        "Compare the strategies' logic and limitations.",
        "Select one simple strategy for research and simulation.",
      ]),
      group("3.2", "Trading Rules", [
        "Define when the strategy generates a buy suggestion.",
        "Define when it generates a sell suggestion.",
        "Define conditions when no trade should be suggested.",
        "Establish simulated risk and exposure limits.",
        "Create a human approval checklist for each suggestion.",
      ]),
      group("3.3", "AI Agent Configuration", [
        "Configure available no-code monitoring features.",
        "Set alerts for the selected strategy's conditions.",
        "Test AI explanations against your written rules.",
        "Test approval, rejection, and no-response scenarios.",
        "Run a complete practice workflow using sample data.",
      ]),
    ],
  },
  {
    hours: "Hours 91–120",
    name: "Backtesting",
    outcome: "Backtesting report and a strategy risk assessment.",
    groups: [
      group("4.1", "Historical Testing", [
        "Understand what backtesting does.",
        "Learn your selected platform's backtesting functions.",
        "Examine historical data and date ranges.",
        "Run the first historical simulation.",
        "Save the test settings and results.",
      ]),
      group("4.2", "Performance Analysis", [
        "Understand total returns and losses.",
        "Understand win rate and average gains versus losses.",
        "Understand maximum drawdown.",
        "Examine the impact of fees and estimated execution costs.",
        "Summarize the strategy's historical performance.",
      ]),
      group("4.3", "Strategy Evaluation", [
        "Compare the strategy with a buy-and-hold benchmark.",
        "Learn how unrealistic assumptions can distort backtests.",
        "Test different historical periods.",
        "Identify weaknesses and possible improvements.",
        "Prepare the backtesting report and risk assessment.",
      ]),
    ],
  },
  {
    hours: "Hours 121–150",
    name: "AI-Assisted Paper Trading",
    outcome: "A working AI-assisted paper-trading process with approval and activity records.",
    groups: [
      group("5.1", "Automated Monitoring", [
        "Set up market monitoring using available tools.",
        "Configure rule-based trade-suggestion alerts.",
        "Test notifications using simulated scenarios.",
        "Check whether AI correctly explains each signal.",
        "Test the complete monitoring and notification process.",
      ]),
      group("5.2", "Human Approval", [
        "Practice reviewing suggested trades.",
        "Practice approving or rejecting simulated suggestions.",
        "Manually enter approved virtual trades.",
        "Test what happens when you reject or miss an alert.",
        "Verify that no trade occurs without approval.",
      ]),
      group("5.3", "Monitoring & Records", [
        "Create a simulated trade activity log.",
        "Record trade suggestions, decisions, and results.",
        "Review market-monitoring and alert accuracy.",
        "Test system errors, delayed alerts, and fallback procedures.",
        "Review the complete paper-trading workflow.",
      ]),
    ],
  },
  {
    hours: "Hours 151–180",
    name: "Performance & Improvement",
    outcome: "A final evaluation and a decision to continue, improve, or stop.",
    groups: [
      group("6.1", "Trading Performance", [
        "Organize all simulated trading results.",
        "Calculate simulated profits, losses, and costs.",
        "Review drawdowns and risk exposure.",
        "Compare results with the original strategy expectations.",
        "Prepare a preliminary performance summary.",
      ]),
      group("6.2", "System Reliability", [
        "Review AI analysis accuracy.",
        "Check missed or incorrect trade suggestions.",
        "Review system failures and notification delays.",
        "Measure how much manual supervision is required.",
        "Identify the most important system improvements.",
      ]),
      group("6.3", "Final Assessment", [
        "Review your trading knowledge and understanding.",
        "Review whether the tools meet your requirements.",
        "Document the strategy's strengths and weaknesses.",
        "Prepare the final evaluation report.",
        "Decide whether to continue testing, improve, or stop.",
      ]),
    ],
  },
]
