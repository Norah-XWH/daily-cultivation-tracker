"use client"

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { deleteProjectBlob, loadProjectBlob, saveProjectBlob } from "@/lib/project-files"
import { uid } from "@/lib/store"
import type { Project, ProjectFile } from "@/lib/types"

const MAX_FILE_BYTES = 20 * 1024 * 1024

type ProjectBoardProps = {
  project: Project
  onNote: (note: string) => void
  onAddLink: (title: string, url: string) => boolean
  onDeleteLink: (id: string) => void
  onAddStep: (title: string) => void
  onToggleStep: (id: string) => void
  onDeleteStep: (id: string) => void
  onAddFile: (file: ProjectFile) => void
  onDeleteFile: (id: string) => void
}

const card = "rounded-3xl border border-[rgba(104,176,176,0.32)] bg-[rgba(104,176,176,0.14)] px-4 py-4 text-[#1E4E4E]"

export function ProjectBoard({
  project,
  onNote,
  onAddLink,
  onDeleteLink,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onAddFile,
  onDeleteFile,
}: ProjectBoardProps) {
  const doneSteps = project.steps.filter((step) => step.done).length
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [stepTitle, setStepTitle] = useState("")
  const [fileError, setFileError] = useState<string | null>(null)

  function submitLink(event: FormEvent) {
    event.preventDefault()
    if (!linkUrl.trim()) return
    const saved = onAddLink(linkTitle, linkUrl)
    if (!saved) {
      setLinkError("這個連結打不開。請貼上網址。")
      return
    }
    setLinkTitle("")
    setLinkUrl("")
    setLinkError(null)
  }

  function submitStep(event: FormEvent) {
    event.preventDefault()
    if (!stepTitle.trim()) return
    onAddStep(stepTitle)
    setStepTitle("")
  }

  async function takeFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    setFileError(null)
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_BYTES) {
        setFileError(`「${file.name}」超過 20MB，沒有存進來。`)
        continue
      }
      const id = uid()
      try {
        await saveProjectBlob(id, file)
      } catch {
        setFileError("這台瀏覽器沒把檔案存下來。")
        continue
      }
      onAddFile({
        id,
        name: file.name,
        type: file.type,
        size: file.size,
        addedAt: new Date().toISOString(),
      })
    }
  }

  function onFileInput(event: ChangeEvent<HTMLInputElement>) {
    void takeFiles(event.target.files)
    event.target.value = ""
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    void takeFiles(event.dataTransfer.files)
  }

  async function openFile(file: ProjectFile) {
    setFileError(null)
    try {
      const blob = await loadProjectBlob(file.id)
      if (!blob) {
        setFileError(`找不到「${file.name}」。它可能存在另一台裝置上。`)
        return
      }
      const url = URL.createObjectURL(blob)
      const opened = window.open(url, "_blank", "noopener,noreferrer")
      if (!opened) {
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = file.name
        anchor.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      setFileError("檔案沒有打開。")
    }
  }

  async function removeFile(id: string) {
    try {
      await deleteProjectBlob(id)
    } catch {
      setFileError("檔案記錄已移除，瀏覽器裡的副本可能還在。")
    }
    onDeleteFile(id)
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <section aria-label="Direction" className={card}>
        <h2 className="text-sm font-medium">Where I am going</h2>
        <Textarea
          value={project.note}
          aria-label="Where I am going"
          onChange={(event) => onNote(event.target.value)}
          className="mt-3 min-h-20 border-transparent bg-white/60 text-base text-[#1E4E4E] md:text-base"
        />
      </section>

      <section aria-label="Steps" className={card}>
        <h2 className="text-sm font-medium">
          Steps{project.steps.length > 0 ? ` · ${doneSteps}/${project.steps.length}` : ""}
        </h2>
        <form onSubmit={submitStep} className="mt-3 flex gap-2">
          <Input
            value={stepTitle}
            aria-label="Next step"
            onValueChange={setStepTitle}
            className="h-11 bg-white/70 text-base md:text-base"
          />
          <Button type="submit" variant="outline" className="h-11 shrink-0 border-[rgba(104,176,176,0.45)] bg-[rgba(104,176,176,0.28)] px-4 text-[#1E4E4E] hover:bg-[rgba(104,176,176,0.4)]" disabled={!stepTitle.trim()}>
            Add
          </Button>
        </form>
        <ul className="mt-3 flex flex-col gap-2">
          {project.steps.map((step) => (
            <li key={step.id} className="flex items-center gap-1 rounded-2xl bg-white/55 px-1 ring-1 ring-[rgba(104,176,176,0.28)]">
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center"
                aria-pressed={step.done}
                aria-label={step.done ? `標為未完成 ${step.title}` : `完成 ${step.title}`}
                onClick={() => onToggleStep(step.id)}
              >
                <Circle on={step.done} ink="#68B0B0" />
              </button>
              <span className="min-w-0 flex-1 py-2 text-base break-words">{step.title}</span>
              <Button
                type="button"
                variant="ghost"
                className="h-11 shrink-0 px-2 text-ink-soft"
                onClick={() => onDeleteStep(step.id)}
              >
                刪除
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="連結" className={card}>
        <h2 className="text-sm font-medium">Links</h2>
        <form onSubmit={submitLink} className="mt-3 flex flex-col gap-2">
          <Input
            value={linkTitle}
            aria-label="連結名稱"
            placeholder="Name"
            onValueChange={setLinkTitle}
            className="h-11 bg-white/70 text-base md:text-base"
          />
          <div className="flex gap-2">
            <Input
              value={linkUrl}
              aria-label="連結網址"
              placeholder="https://"
              inputMode="url"
              onValueChange={setLinkUrl}
              className="h-11 bg-white/70 text-base md:text-base"
            />
            <Button type="submit" variant="outline" className="h-11 shrink-0 border-[rgba(104,176,176,0.45)] bg-[rgba(104,176,176,0.28)] px-4 text-[#1E4E4E] hover:bg-[rgba(104,176,176,0.4)]" disabled={!linkUrl.trim()}>
              Save
            </Button>
          </div>
        </form>
        {linkError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {linkError}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-col gap-2">
          {project.links.map((link) => (
            <li key={link.id} className="rounded-2xl bg-white/55 px-3 py-2 ring-1 ring-[rgba(104,176,176,0.28)]">
              <a href={link.url} target="_blank" rel="noreferrer" className="block text-base font-medium break-words text-[#1E4E4E] underline">
                {link.title || link.url}
              </a>
              <p className="mt-0.5 truncate text-sm text-ink-soft">{link.url}</p>
              <Button
                type="button"
                variant="ghost"
                className="mt-1 h-10 px-2 text-ink-soft"
                onClick={() => onDeleteLink(link.id)}
              >
                刪除
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="文件"
        className={card}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <h2 className="text-sm font-medium">Files</h2>
        <label className="mt-3 flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[rgba(104,176,176,0.28)] px-4 text-sm font-medium text-[#1E4E4E]">
          Add files
          <input className="sr-only" type="file" multiple onChange={onFileInput} />
        </label>
        {fileError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-col gap-2">
          {project.files.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-2xl bg-white/55 px-3 py-2 ring-1 ring-[rgba(104,176,176,0.28)]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">{file.name}</p>
                <p className="text-sm text-ink-soft tabular-nums">{formatBytes(file.size)}</p>
              </div>
              <Button type="button" variant="outline" className="h-10 shrink-0 border-[rgba(104,176,176,0.45)] bg-[rgba(104,176,176,0.28)] text-[#1E4E4E] hover:bg-[rgba(104,176,176,0.4)]" onClick={() => void openFile(file)}>
                打開
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 shrink-0 px-2 text-ink-soft"
                onClick={() => void removeFile(file.id)}
              >
                刪除
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

const CLOCK_KEY = "rike.clock"
const GOAL_SECONDS = 2 * 60 * 60

function readClock(): { seconds: number; running: boolean; mark: number | null } {
  const idle = { seconds: 0, running: false, mark: null }
  if (typeof sessionStorage === "undefined") return idle
  try {
    const raw = sessionStorage.getItem(CLOCK_KEY)
    if (!raw) return idle
    const snap = JSON.parse(raw) as { seconds?: number; running?: boolean; mark?: number | null }
    if (typeof snap.seconds !== "number" || !Number.isFinite(snap.seconds)) return idle
    let seconds = Math.max(0, snap.seconds)
    const running = Boolean(snap.running && typeof snap.mark === "number")
    if (running && typeof snap.mark === "number") {
      seconds += Math.max(0, Math.floor((Date.now() - snap.mark) / 1000))
    }
    return { seconds, running, mark: running ? Date.now() : null }
  } catch {
    return idle
  }
}

function writeClock(seconds: number, running: boolean, mark: number | null) {
  try {
    sessionStorage.setItem(CLOCK_KEY, JSON.stringify({ seconds, running, mark }))
  } catch {
    // Private browsing can block storage. The clock still runs.
  }
}

export function ProjectClock({ onFinish }: { onFinish: (minutes: number) => void }) {
  const restored = useState(readClock)[0]
  const baseRef = useRef(restored.seconds)
  const markRef = useRef(restored.mark)
  const runningRef = useRef(restored.running)
  const [running, setRunning] = useState(restored.running)
  const [elapsed, setElapsed] = useState(restored.seconds)

  function currentSeconds() {
    if (!runningRef.current || markRef.current == null) return baseRef.current
    return baseRef.current + Math.max(0, Math.floor((Date.now() - markRef.current) / 1000))
  }

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      if (markRef.current == null) return
      setElapsed(baseRef.current + Math.max(0, Math.floor((Date.now() - markRef.current) / 1000)))
    }, 250)
    return () => window.clearInterval(id)
  }, [running])

  useEffect(() => {
    function persist() {
      const seconds = runningRef.current && markRef.current != null
        ? baseRef.current + Math.max(0, Math.floor((Date.now() - markRef.current) / 1000))
        : baseRef.current
      if (runningRef.current) {
        baseRef.current = seconds
        markRef.current = Date.now()
      }
      writeClock(baseRef.current, runningRef.current, markRef.current)
    }
    document.addEventListener("visibilitychange", persist)
    window.addEventListener("pagehide", persist)
    return () => {
      persist()
      document.removeEventListener("visibilitychange", persist)
      window.removeEventListener("pagehide", persist)
    }
  }, [])

  function toggle() {
    const seconds = currentSeconds()
    baseRef.current = seconds
    if (runningRef.current) {
      markRef.current = null
      runningRef.current = false
      setRunning(false)
    } else {
      markRef.current = Date.now()
      runningRef.current = true
      setRunning(true)
    }
    setElapsed(seconds)
    writeClock(baseRef.current, runningRef.current, markRef.current)
  }

  function finish() {
    const seconds = currentSeconds()
    baseRef.current = 0
    markRef.current = null
    runningRef.current = false
    setRunning(false)
    setElapsed(0)
    try {
      sessionStorage.removeItem(CLOCK_KEY)
    } catch {
      // The session is already cleared in memory.
    }
    const minutes = Math.round(seconds / 60)
    if (minutes > 0) onFinish(minutes)
  }

  const progress = Math.min(100, (elapsed / GOAL_SECONDS) * 100)

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={running}
        aria-label={running ? "Pause timer" : "Start timer"}
        className="relative grid size-16 shrink-0 place-items-center rounded-full border-0 bg-white/55 p-0 text-[#1E4E4E]"
      >
        <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="18" cy="18" r="15.2" fill="none" stroke="rgba(104,176,176,0.35)" strokeWidth="1.6" />
          <circle
            cx="18"
            cy="18"
            r="15.2"
            fill="none"
            stroke="#68B0B0"
            strokeWidth="1.6"
            strokeLinecap="round"
            pathLength="100"
            strokeDasharray={`${progress} 100`}
          />
        </svg>
        <span className="relative flex flex-col items-center">
          <span className="text-[11px] font-medium tabular-nums leading-none">{formatClock(elapsed)}</span>
          <span className="mt-0.5 text-[8px] font-medium tracking-wide text-[#68B0B0]">{running ? "Pause" : "Start"}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={finish}
        disabled={elapsed <= 0}
        className="mt-1 h-4 border-0 bg-transparent p-0 text-[10px] font-medium tracking-wide text-[#1E4E4E] disabled:text-transparent"
      >
        Done
      </button>
    </div>
  )
}

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const ss = String(seconds).padStart(2, "0")
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`
  return `${minutes}:${ss}`
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`
  return `${Math.round(size / (1024 * 102.4)) / 10} MB`
}
