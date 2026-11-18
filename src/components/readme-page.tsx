"use client"

import { useEffect, useState } from "react"

const QUESTIONS = [
  ["I AM GRATITUDE."],
  ["I AM COURAGE."],
  ["I AM PEACE."],
  ["I AM POWER."],
  ["I AM WHOLENESS."],
  ["I AM LOVE."],
  ["I AM RADIANCE."],
  ["I AM FLOW."],
  ["I AM ABUNDANCE."],
]

const LINES = QUESTIONS.map((lines) => lines.map((text) => [...text]))
const TOTAL = LINES.reduce((sum, lines) => sum + lines.reduce((count, chars) => count + chars.length, 0), 0)
const CHARS_PER_SECOND = 58 / 13
const LINE_STYLE = { fontSize: "1.7rem", lineHeight: "2.35rem" }
const LOTUS_HOLD_MS = 6400

export function ReadmePage() {
  const [cursor, setCursor] = useState(0)
  const [motionOk, setMotionOk] = useState(true)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setMotionOk(false)
      setCursor(TOTAL)
      return
    }
    let start = performance.now()
    let frame = 0
    let holding = false
    let holdUntil = 0
    const tick = (now: number) => {
      if (holding) {
        if (now >= holdUntil) {
          holding = false
          start = now
          setCursor(0)
        }
      } else {
        const next = ((now - start) / 1000) * CHARS_PER_SECOND
        if (next >= TOTAL) {
          setCursor(TOTAL)
          holding = true
          holdUntil = now + LOTUS_HOLD_MS
        } else {
          setCursor(next)
        }
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  let read = Math.floor(cursor)
  const rows = LINES.map((lines) => {
    const chars = lines[0]
    const shown = Math.max(0, Math.min(chars.length, read))
    read -= chars.length
    return { chars, shown }
  }).filter((row) => row.shown > 0)

  const finished = cursor >= TOTAL

  return (
    <article className="relative flex h-full min-h-full flex-col justify-end bg-[#F5F2E8] px-4 pb-6 pt-8" aria-label="I AM...">
      <div className="w-full">
        {finished && (
          <div
            className="pointer-events-none absolute left-1/2 z-10"
            style={{
              top: "calc(40px - max(0.75rem, env(safe-area-inset-top)))",
              transform: "translateX(calc(-50% - 24px))",
            }}
          >
            <Lotus motion={motionOk} />
          </div>
        )}
        <ul className="flex w-full list-none flex-col-reverse items-center gap-3">
          {rows.map((row) => (
            <li key={row.chars.join("")} className="w-full text-center">
              <p className="font-lishu whitespace-nowrap" style={LINE_STYLE}>
                <GuidedLine chars={row.chars} shown={row.shown} />
              </p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

function Lotus({ motion }: { motion: boolean }) {
  return (
    <div className="h-[168px] w-[300px]" data-lotus aria-hidden>
      <style>{`
        @keyframes lotus-bloom {
          0% {
            transform: scale(0.22, 0.4) rotate(-8deg);
            clip-path: ellipse(8% 14% at 58% 32%);
            opacity: 0.55;
          }
          20% { opacity: 1; }
          100% {
            transform: scale(1, 1) rotate(0deg);
            clip-path: ellipse(38% 30% at 58% 36%);
            opacity: 1;
          }
        }
      `}</style>
      <img
        src="/lotus.png"
        alt=""
        className="h-full w-full object-cover"
        style={{
          transformOrigin: "58% 48%",
          animation: motion ? "lotus-bloom 5.4s cubic-bezier(.22,.65,.24,1) both" : "none",
        }}
      />
    </div>
  )
}

function GuidedLine({ chars, shown }: { chars: string[]; shown: number }) {
  return (
    <span className="block">
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} className={index < shown ? "text-[#0D0D0D]" : "text-[#0D0D0D]/28"}>
          {char}
        </span>
      ))}
    </span>
  )
}
