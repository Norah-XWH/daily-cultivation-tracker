"use client"

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react"
import { Search } from "lucide-react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { deleteProjectBlob, loadProjectBlob, saveProjectBlob } from "@/lib/project-files"
import { uid } from "@/lib/store"
import type { Project, ProjectFile, ProjectStep } from "@/lib/types"

const MAX_FILE_BYTES = 20 * 1024 * 1024

type ProjectBoardProps = {
  project: Project
  onFinish: (minutes: number) => void
  onNote: (note: string) => void
  onAddLink: (title: string, url: string) => boolean
  onDeleteLink: (id: string) => void
  onAddStep: (title: string, parentId?: string) => void
  onToggleStep: (id: string) => void
  onDeleteStep: (id: string) => void
  onAddFile: (file: ProjectFile) => void
  onDeleteFile: (id: string) => void
}

const card = "rounded-3xl border border-[rgba(176,148,96,0.4)] bg-[#F9F2E1] px-4 py-4 text-[#123e3a]"

export function ProjectBoard({
  project,
  onFinish,
  onNote,
  onAddLink,
  onDeleteLink,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onAddFile,
  onDeleteFile,
}: ProjectBoardProps) {
  const counted = countSteps(project.steps)
  const doneSteps = counted.done
  const totalSteps = counted.total
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const needle = query.trim().toLowerCase()
  const visibleLinks = needle
    ? project.links.filter((link) => `${link.title}\n${link.url}`.toLowerCase().includes(needle))
    : project.links
  const visibleFiles = needle
    ? project.files.filter((file) => file.name.toLowerCase().includes(needle))
    : project.files
  const [stepTitle, setStepTitle] = useState("")
  const [addingId, setAddingId] = useState<string | null>(null)
  const [subDraft, setSubDraft] = useState("")
  const [stepView, setStepView] = useState<"words" | "tree">("words")
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

  function submitSubstep(event: FormEvent) {
    event.preventDefault()
    if (!addingId || !subDraft.trim()) return
    onAddStep(subDraft, addingId)
    setSubDraft("")
    setAddingId(null)
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
        name: file.name.trim() || `photo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.jpg`,
        type: file.type || "image/jpeg",
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
    <div className="mt-1 flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 pb-9">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-[1.35rem] font-medium leading-snug text-[#123e3a]">Build A Skill</p>
          <div className="relative mt-2 w-full">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#123e3a]/50" aria-hidden />
            <Input
              type="search"
              value={query}
              aria-label="Search stored links and files"
              onValueChange={setQuery}
              className="h-8 rounded-full border-[rgba(176,148,96,0.4)] bg-[#F9F2E1]/90 pr-2 pl-7 text-sm md:text-sm"
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <ProjectClock onFinish={onFinish} />
          <span
            className="grid size-24 shrink-0 place-items-center bg-center bg-no-repeat text-sm font-normal tabular-nums text-[#123e3a]"
            style={{ backgroundImage: "url('/skill-cloud.png?v=3')", backgroundSize: "contain" }}
          >
            {Math.floor((project.bankMinutes ?? 0) / 60)}/500
          </span>
        </div>
      </div>
      <section aria-label="Direction" className={card}>
        <h2 className="text-sm font-medium">Where I am going</h2>
        <Textarea
          value={project.note}
          aria-label="Where I am going"
          onChange={(event) => onNote(event.target.value)}
          className="mt-3 min-h-20 border-transparent bg-white/60 text-base text-[#123e3a] md:text-base"
        />
      </section>

      <section aria-label="Steps" className={card}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-medium">
            Steps{totalSteps > 0 ? ` · ${doneSteps}/${totalSteps}` : ""}
          </h2>
          {totalSteps > 0 ? (
            <div className="flex shrink-0 rounded-full bg-white/70 p-0.5 text-[11px]">
              <button
                type="button"
                aria-pressed={stepView === "words"}
                className={`rounded-full px-2.5 py-1 ${stepView === "words" ? "bg-[#F0E5CA] text-[#123e3a]" : "text-[#123e3a]/60"}`}
                onClick={() => setStepView("words")}
              >
                Words
              </button>
              <button
                type="button"
                aria-pressed={stepView === "tree"}
                className={`rounded-full px-2.5 py-1 ${stepView === "tree" ? "bg-[#F0E5CA] text-[#123e3a]" : "text-[#123e3a]/60"}`}
                onClick={() => setStepView("tree")}
              >
                Dendrogram
              </button>
            </div>
          ) : null}
        </div>
        <form onSubmit={submitStep} className="mt-3 flex gap-2">
          <Input
            value={stepTitle}
            aria-label="Next step"
            onValueChange={setStepTitle}
            className="h-11 bg-white/70 text-base md:text-base"
          />
          <Button type="submit" variant="outline" className="h-11 shrink-0 border-[rgba(176,148,96,0.45)] bg-[#F0E5CA] px-4 text-[#123e3a] hover:bg-[#EADDC2]" disabled={!stepTitle.trim()}>
            Add
          </Button>
        </form>
        {stepView === "tree" && project.steps.length > 0 ? (
          <Dendrogram steps={project.steps} onToggle={onToggleStep} />
        ) : (
          <StepWords
            steps={project.steps}
            depth={1}
            addingId={addingId}
            subDraft={subDraft}
            onDraft={setSubDraft}
            onStart={(id) => {
              setAddingId(id)
              setSubDraft("")
            }}
            onSubmit={submitSubstep}
            onToggle={onToggleStep}
            onDelete={onDeleteStep}
          />
        )}
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
            <Button type="submit" variant="outline" className="h-11 shrink-0 border-[rgba(176,148,96,0.45)] bg-[#F0E5CA] px-4 text-[#123e3a] hover:bg-[#EADDC2]" disabled={!linkUrl.trim()}>
              Save
            </Button>
          </div>
        </form>
        {linkError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {linkError}
          </p>
        ) : null}
        {needle && visibleLinks.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No link matches.</p>
        ) : null}
        <ul className="mt-3 flex flex-col gap-2">
          {visibleLinks.map((link) => (
            <li key={link.id} className="rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[rgba(176,148,96,0.35)]">
              <a href={link.url} target="_blank" rel="noreferrer" className="block text-base font-medium break-words text-[#123e3a] underline">
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
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#F0E5CA] px-3 text-sm font-medium text-[#123e3a]">
            Add files
            <input className="sr-only" type="file" multiple onChange={onFileInput} />
          </label>
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-lg bg-[#F0E5CA] px-3 text-sm font-medium text-[#123e3a]">
            Take photo
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFileInput}
            />
          </label>
        </div>
        {fileError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {fileError}
          </p>
        ) : null}
        {needle && visibleFiles.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No file matches.</p>
        ) : null}
        <ul className="mt-3 flex flex-col gap-2">
          {visibleFiles.map((file) => (
            <li key={file.id} className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-[rgba(176,148,96,0.35)]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">{file.name}</p>
                <p className="text-sm text-ink-soft tabular-nums">{formatBytes(file.size)}</p>
              </div>
              <Button type="button" variant="outline" className="h-10 shrink-0 border-[rgba(176,148,96,0.45)] bg-[#F0E5CA] text-[#123e3a] hover:bg-[#EADDC2]" onClick={() => void openFile(file)}>
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

function countSteps(steps: ProjectStep[]): { done: number; total: number } {
  return steps.reduce(
    (sum, step) => {
      const nested = countSteps(step.substeps)
      return { done: sum.done + (step.done ? 1 : 0) + nested.done, total: sum.total + 1 + nested.total }
    },
    { done: 0, total: 0 },
  )
}

function StepWords({
  steps,
  depth,
  addingId,
  subDraft,
  onDraft,
  onStart,
  onSubmit,
  onToggle,
  onDelete,
}: {
  steps: ProjectStep[]
  depth: number
  addingId: string | null
  subDraft: string
  onDraft: (value: string) => void
  onStart: (id: string) => void
  onSubmit: (event: FormEvent) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (steps.length === 0) return null
  return (
    <ul className={depth === 1 ? "mt-3 flex flex-col gap-2" : "mt-2 flex flex-col gap-2 border-l border-[rgba(176,148,96,0.45)] pl-3"}>
      {steps.map((step) => (
        <li key={step.id}>
          <div className="flex items-center gap-1 rounded-2xl bg-white/70 px-1 ring-1 ring-[rgba(176,148,96,0.35)]">
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center"
              aria-pressed={step.done}
              aria-label={step.done ? `標為未完成 ${step.title}` : `完成 ${step.title}`}
              onClick={() => onToggle(step.id)}
            >
              <Circle on={step.done} ink="#26867b" />
            </button>
            <span className="min-w-0 flex-1 py-2 text-base break-words">{step.title}</span>
            {depth < 5 ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 shrink-0 px-2 text-[#123e3a]"
                aria-expanded={addingId === step.id}
                onClick={() => onStart(step.id)}
              >
                Sub
              </Button>
            ) : null}
            <Button type="button" variant="ghost" className="h-11 shrink-0 px-2 text-ink-soft" onClick={() => onDelete(step.id)}>
              刪除
            </Button>
          </div>
          {addingId === step.id ? (
            <form onSubmit={onSubmit} className="mt-2 flex gap-2">
              <Input
                value={subDraft}
                aria-label={`Substep of ${step.title}`}
                onValueChange={onDraft}
                className="h-10 bg-white/70 text-base md:text-base"
              />
              <Button type="submit" variant="outline" className="h-10 shrink-0 border-[rgba(176,148,96,0.45)] bg-[#F0E5CA] px-3 text-[#123e3a] hover:bg-[#EADDC2]" disabled={!subDraft.trim()}>
                Add
              </Button>
            </form>
          ) : null}
          <StepWords
            steps={step.substeps}
            depth={depth + 1}
            addingId={addingId}
            subDraft={subDraft}
            onDraft={onDraft}
            onStart={onStart}
            onSubmit={onSubmit}
            onToggle={onToggle}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  )
}

function Dendrogram({ steps, onToggle }: { steps: ProjectStep[]; onToggle: (id: string) => void }) {
  const { nodes, edges, width, height } = layoutDendrogram(steps)
  return (
    <div className="mt-3 overflow-x-auto">
      <svg width={width} height={height} role="img" aria-label="Dendrogram" className="text-[#123e3a]">
        {edges.map((edge) => (
          <path key={edge.key} d={edge.d} fill="none" stroke="rgba(120,96,58,0.7)" strokeWidth="1.4" />
        ))}
        {nodes.map((node) => (
          <g
            key={node.id}
            transform={`translate(${node.x} ${node.y})`}
            className={node.virtual ? undefined : "cursor-pointer"}
            onClick={node.virtual ? undefined : () => onToggle(node.id)}
          >
            <circle r={node.virtual ? 5 : 6} cy="0" fill={node.done ? "#26867b" : "#F9F2E1"} stroke="#26867b" strokeWidth="1.6" />
            {wrapLabel(node.title).map((line, index) => (
              <text key={`${node.id}-${index}`} x="0" y={16 + index * 13} textAnchor="middle" fontSize="11" fill="#123e3a">
                {line}
              </text>
            ))}
          </g>
        ))}
      </svg>
    </div>
  )
}

function wrapLabel(title: string): string[] {
  const text = title.trim()
  if (text.length <= 14) return [text]
  const splitAt = text.lastIndexOf(" ", 14)
  const cut = splitAt > 3 ? splitAt : 14
  const rest = text.slice(cut).trim()
  return [text.slice(0, cut), rest.length > 14 ? `${rest.slice(0, 13)}…` : rest]
}

function layoutDendrogram(steps: ProjectStep[]) {
  const col = 116
  const row = 64
  const nodes: { id: string; title: string; done: boolean; x: number; y: number; virtual: boolean }[] = []
  const edges: { key: string; d: string }[] = []
  let cursor = 0

  function link(parentId: string, parentX: number, parentY: number, children: { id: string; x: number; y: number }[]) {
    const mid = parentY + row / 2
    const left = children[0]?.x ?? parentX
    const right = children[children.length - 1]?.x ?? parentX
    edges.push({ key: `${parentId}-down`, d: `M ${parentX} ${parentY + 6} V ${mid}` })
    edges.push({ key: `${parentId}-bar`, d: `M ${left} ${mid} H ${right}` })
    children.forEach((child) => {
      edges.push({ key: `${parentId}-${child.id}`, d: `M ${child.x} ${mid} V ${child.y - 6}` })
    })
  }

  function walk(step: ProjectStep, depth: number): { x: number; y: number } {
    const y = 18 + depth * row
    if (step.substeps.length === 0) {
      const x = 58 + cursor * col
      cursor += 1
      nodes.push({ id: step.id, title: step.title, done: step.done, x, y, virtual: false })
      return { x, y }
    }
    const children = step.substeps.map((child) => ({ id: child.id, ...walk(child, depth + 1) }))
    const x = (children[0].x + children[children.length - 1].x) / 2
    nodes.push({ id: step.id, title: step.title, done: step.done, x, y, virtual: false })
    link(step.id, x, y, children)
    return { x, y }
  }

  const children = steps.map((step) => ({ id: step.id, ...walk(step, 1) }))
  const rootX = children.length > 0 ? (children[0].x + children[children.length - 1].x) / 2 : 58
  nodes.unshift({ id: "skill-root", title: "Skill", done: false, x: rootX, y: 18, virtual: true })
  if (children.length > 0) link("skill-root", rootX, 18, children)
  const width = Math.max(220, 16 + Math.max(cursor, 1) * col)
  const height = 36 + (deepest(steps) + 1) * row
  return { nodes, edges, width, height }
}

function deepest(steps: ProjectStep[]): number {
  return steps.reduce((max, step) => Math.max(max, 1 + deepest(step.substeps)), 0)
}

const CLOCK_KEY = "rike.clock"

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
  const [choosing, setChoosing] = useState(false)
  const [paused, setPaused] = useState(!restored.running && restored.seconds > 0)
  const [checkPop, setCheckPop] = useState(false)

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

  function onClockClick() {
    if (checkPop) return
    if (runningRef.current) {
      setChoosing((open) => !open)
      return
    }
    const seconds = currentSeconds()
    baseRef.current = seconds
    markRef.current = Date.now()
    runningRef.current = true
    setChoosing(false)
    setPaused(false)
    setRunning(true)
    setElapsed(seconds)
    writeClock(baseRef.current, true, markRef.current)
  }

  function pause() {
    const seconds = currentSeconds()
    baseRef.current = seconds
    markRef.current = null
    runningRef.current = false
    setRunning(false)
    setPaused(true)
    setChoosing(false)
    setElapsed(seconds)
    writeClock(seconds, false, null)
  }

  function finish() {
    const seconds = currentSeconds()
    baseRef.current = 0
    markRef.current = null
    runningRef.current = false
    setRunning(false)
    setPaused(false)
    setChoosing(false)
    setElapsed(0)
    setCheckPop(true)
    window.setTimeout(() => setCheckPop(false), 800)
    try {
      sessionStorage.removeItem(CLOCK_KEY)
    } catch {
      // The session is already cleared in memory.
    }
    const minutes = Math.round(seconds / 60)
    if (minutes > 0) onFinish(minutes)
  }

  return (
    <div className="relative size-24 shrink-0">
      <button
        type="button"
        onClick={onClockClick}
        aria-pressed={running}
        aria-expanded={choosing}
        aria-label={running ? "Timer options" : paused ? "Resume timer" : "Start timer"}
        className="relative grid size-24 place-items-center border-0 bg-transparent bg-center bg-no-repeat p-0 text-[#123e3a]"
        style={{ backgroundImage: "url('/skill-cloud.png?v=3')", backgroundSize: "contain" }}
      >
        {checkPop ? (
          <svg viewBox="0 0 16 16" className="relative size-10 text-[#26867b]" style={{ animation: "motto-burst 700ms ease-out" }} aria-hidden>
            <path d="M3.2 8.4 6.4 11.5 12.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span className="relative text-sm font-medium tabular-nums leading-none">{formatClock(elapsed)}</span>
        )}
      </button>
      {choosing ? (
        <div className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 gap-2">
          <button
            type="button"
            aria-label="Pause"
            onClick={pause}
            className="grid size-7 place-items-center rounded-full border border-[#26867b] bg-white/80 text-[#26867b]"
          >
            <PauseMark />
          </button>
          <button
            type="button"
            aria-label="Done"
            onClick={finish}
            className="grid size-7 place-items-center rounded-full border border-[#26867b] bg-white/80 text-[#26867b]"
          >
            <CheckMark />
          </button>
        </div>
      ) : paused ? (
        <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 text-[#26867b]" aria-hidden>
          <PauseMark />
        </span>
      ) : null}
    </div>
  )
}

function PauseMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path d="M5 3.5h2.2v9H5zM8.8 3.5H11v9H8.8z" fill="currentColor" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden>
      <path d="M3.2 8.4 6.4 11.5 12.8 4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
