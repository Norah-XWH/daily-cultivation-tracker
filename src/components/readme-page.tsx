"use client"

import { useEffect, useState } from "react"

const QUESTIONS = [
  ["是不是也同樣站在別人的角度上考慮問題了？"],
  ["語氣平和嗎？", "是善的溝通方式嗎？"],
  ["講的道理在不在法上？", "或是用法來掩蓋自己的情緒？"],
]

const LINES = QUESTIONS.map((lines) => lines.map((text) => [...text]))
const TOTAL = LINES.reduce((sum, lines) => sum + lines.reduce((count, chars) => count + chars.length, 0), 0)
const CHARS_PER_SECOND = 3.6

export function ReadmePage() {
  const [cursor, setCursor] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
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
          holdUntil = now + 1400
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

  return (
    <article
      className="flex min-h-full flex-col justify-center bg-[#F5F2E8] px-6 py-16"
      aria-label="ReadMe"
    >
      <ul className="mx-auto flex w-full max-w-[16.5rem] flex-col gap-14">
        {LINES.map((lines) => (
          <li key={lines[0].join("")} className="flex items-stretch gap-4">
            <span className="w-[3px] shrink-0 bg-[#E3120B]" aria-hidden />
            <p className="font-lishu">
              {lines.map((chars) => {
                const shown = Math.max(0, Math.min(chars.length, read))
                read -= chars.length
                return <GuidedLine key={chars.join("")} chars={chars} shown={shown} />
              })}
            </p>
          </li>
        ))}
      </ul>
    </article>
  )
}

function GuidedLine({ chars, shown }: { chars: string[]; shown: number }) {
  return (
    <span className="block">
      {chars.map((char, index) => (
        <span key={`${char}-${index}`} className="relative">
          <span className="text-[#0D0D0D]/28">{char}</span>
          <span className={`absolute inset-0 text-[#0D0D0D] ${index < shown ? "opacity-100" : "opacity-0"}`} aria-hidden>
            {char}
          </span>
        </span>
      ))}
    </span>
  )
}
