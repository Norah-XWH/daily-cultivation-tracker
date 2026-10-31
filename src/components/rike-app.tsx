"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react"
import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, ListChecks, Timer } from "lucide-react"
import { DailyTodo } from "@/components/daily-todo"
import { PerformanceBars } from "@/components/history-view"
import { ReadmePage } from "@/components/readme-page"
import { Overview } from "@/components/overview"
import { ProjectBoard, ProjectClock } from "@/components/project-board"
import { RoutineCard } from "@/components/routine-card"
import { RoutineEditor } from "@/components/routine-editor"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addDays, formatLong, todayKey } from "@/lib/dates"
import { sortRoutines } from "@/lib/score"
import {
  addChecklistItem,
  addProjectFile,
  addProjectLink,
  addProjectStep,
  blankRoutine,
  CHECKLIST_START,
  createDefaultStore,
  deleteChecklistItem,
  moveChecklistItem,
  deleteProjectFile,
  deleteProjectLink,
  deleteProjectStep,
  deleteRoutine,
  getLog,
  addRatingGroup,
  setChecklistTitle,
  setJournal,
  finishProjectTimer,
  setProjectNote,
  setRatingNote,
  moveRoutine,
  normalizeStore,
  readStore,
  setRating,
  setMinutes,
  startNewPeriod,
  STORAGE_KEY,
  toggleCheck,
  toggleChecklistItem,
  toggleProjectStep,
  upsertRoutine,
} from "@/lib/store"
import type { Routine, Store } from "@/lib/types"

type Snapshot = { ready: false } | { ready: true; store: Store; unreadable: boolean }

const serverSnapshot: Snapshot = { ready: false }
let snapshot: Snapshot = serverSnapshot
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Snapshot {
  if (!snapshot.ready && typeof window !== "undefined") {
    const loaded = readStore()
    snapshot = { ready: true, store: loaded.store, unreadable: loaded.unreadable }
  }
  return snapshot
}

function remember(store: Store) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function RikeApp() {
  const session = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<Store | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function write(next: Store) {
    try {
      remember(next)
      setSaveError(null)
    } catch {
      setSaveError("這次沒保存上。可以清理一點瀏覽器空間，再試一次。")
    }
    snapshot = { ready: true, store: next, unreadable: false }
    emit()
  }

  function pickFile() {
    fileRef.current?.click()
  }

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    void file.text().then((text) => {
      try {
        const next = normalizeStore(JSON.parse(text))
        if (!next) {
          setImportError("沒有讀到備份。請選擇之前導出的檔案。")
          return
        }
        setImportError(null)
        setPendingImport(next)
      } catch {
        setImportError("沒有讀到備份。請選擇之前導出的檔案。")
      }
    })
  }

  function applyImport() {
    if (!pendingImport) return
    write(pendingImport)
    setPendingImport(null)
  }

  function restart() {
    write(createDefaultStore())
  }

  const fileInput = (
    <input
      ref={fileRef}
      className="sr-only"
      type="file"
      accept="application/json,.json"
      onChange={onFile}
    />
  )

  const importDialog = (
    <Dialog open={pendingImport != null} onOpenChange={(open) => { if (!open) setPendingImport(null) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>用備份替換現在的內容</DialogTitle>
          <DialogDescription>
            這份備份裡有 {pendingImport?.routines.length ?? 0} 項。導入後，現在的項目和打卡會被替換。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" onClick={() => setPendingImport(null)}>
            取消
          </Button>
          <Button type="button" className="h-11" onClick={applyImport}>
            導入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (!session.ready) {
    return (
      <>
        {fileInput}
        <Skeleton />
      </>
    )
  }

  if (session.unreadable) {
    return (
      <>
        {fileInput}
        {importDialog}
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center bg-paper px-5">
          <h1 className="font-oldstyle text-[1.9rem] leading-none font-semibold text-[#123e3a]">
            Daily Cultivation Tracker
          </h1>
          <p className="mt-3 text-base leading-7 text-ink-soft">
            瀏覽器裡原有的記錄讀不出來。可以導入之前導出的備份，或從初始項目重新開始。
          </p>
          {importError ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {importError}
            </p>
          ) : null}
          <div className="mt-6 flex flex-col gap-2">
            <Button type="button" className="h-11" onClick={pickFile}>
              導入備份
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={restart}>
              從初始項目重新開始
            </Button>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      {fileInput}
      {importDialog}
      <DayScreen
        store={session.store}
        onChange={(next) => write(next)}
        saveError={saveError}
        importError={importError}
      />
    </>
  )
}

function DayScreen({
  store,
  onChange,
  saveError,
  importError,
}: {
  store: Store
  onChange: (store: Store) => void
  saveError: string | null
  importError: string | null
}) {
  const [now, setNow] = useState(() => new Date())
  const today = todayKey(now)
  const [selected, setSelected] = useState(today)
  const editing = false
  const [draft, setDraft] = useState<Routine | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Routine | null>(null)
  const [view, setView] = useState<"day" | "readme" | "todo" | "project">("day")
  const [todoDate, setTodoDate] = useState(today)
  const [mottoPop, setMottoPop] = useState(true)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [trackedToday, setTrackedToday] = useState(today)
  if (trackedToday !== today) {
    setTrackedToday(today)
    setSelected((current) => (current === trackedToday ? today : current))
    setTodoDate((current) => (current === trackedToday ? today : current))
  }

  const shared = useRef(false)
  useEffect(() => {
    if (shared.current) return
    shared.current = true
    const params = new URLSearchParams(window.location.search)
    const rawUrl = params.get("url")?.trim() ?? ""
    const text = params.get("text")?.trim() ?? ""
    const title = params.get("title")?.trim() ?? ""
    const candidate = rawUrl || (/^https?:\/\//i.test(text) ? text : "")
    if (!candidate && !text) return
    if (candidate) {
      const next = addProjectLink(store, title, candidate)
      if (next) onChange(next)
    } else {
      const note = store.project.note.trim()
      onChange(setProjectNote(store, note ? `${note}\n${text}` : text))
    }
    setView("project")
    const clean = new URL(window.location.href)
    clean.search = ""
    window.history.replaceState(null, "", `${clean.pathname}${clean.hash}`)
  }, [onChange, store])

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, 30000)
    function onVisible() {
      if (document.visibilityState === "visible") tick()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [])

  const routines = sortRoutines(store.routines).filter(
    (routine) => routine.id !== "cultivate" && routine.mode !== "rating",
  )
  const log = getLog(store, selected)

  function update(change: (current: Store) => Store) {
    onChange(change(store))
  }

  function beginAdd() {
    const order = store.routines.reduce((max, routine) => Math.max(max, routine.order), -1) + 1
    setDraft(blankRoutine(order))
  }

  function confirmDelete() {
    if (!pendingDelete) return
    update((current) => deleteRoutine(current, pendingDelete.id))
    setPendingDelete(null)
    setDraft(null)
  }

  return (
    <div className="flex min-h-dvh justify-center bg-[#06110f]">
      {mottoPop ? (
        <button
          type="button"
          className="fixed inset-0 z-40 grid place-items-center border-0 bg-[#06110f]/55 p-6"
          aria-label="「事事對照，做到是修。」"
          onClick={() => setMottoPop(false)}
        >
          <span className="animate-motto-pop font-zhen block max-w-[22rem] rounded-[1.75rem] bg-paper px-8 py-8 text-center text-[2.6rem] leading-[1.35] font-semibold text-[#123e3a] shadow-[0_28px_70px_rgba(6,17,15,0.45)] motion-reduce:animate-none">
            「事事對照，
            <br />
            做到是修。」
          </span>
        </button>
      ) : null}
      <div
        className={`mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-cover bg-center bg-no-repeat sm:my-0 ${view === "readme" ? "bg-[#F5F2E8]" : view === "todo" ? "bg-[#EFEFEA]" : view === "project" ? "bg-[#f7f4ee]" : "bg-paper"}`}
        style={view === "project" ? { backgroundImage: "url('/skill-background.png')" } : undefined}
      >
      <main
        className="min-h-0 flex-1 overflow-y-auto px-4"
        style={{
          paddingTop: "max(0.75rem, env(safe-area-inset-top))",
          paddingBottom: "1.25rem",
        }}
      >
        {view === "readme" ? null : (
        <header>
          <div
            className={
              view === "day"
                ? `font-zhen mt-2 text-[1.2rem] leading-snug font-bold text-[#123e3a]${mottoPop ? " invisible" : ""}`
                : view === "project"
                  ? "mt-1 flex items-center justify-between gap-3"
                  : "mt-1 text-[1.35rem] font-medium text-[#123e3a]"
            }
          >
            {view === "todo" ? (
              "To-Do"
            ) : view === "project" ? (
              <>
                <span className="font-sans text-[1.35rem] font-medium leading-snug text-[#123e3a]">Build A Skill</span>
                <span className="flex items-start gap-3">
                  <ProjectClock
                    onFinish={(minutes) => update((current) => finishProjectTimer(current, today, minutes))}
                  />
                  <span className="grid size-16 shrink-0 place-items-center border border-[rgba(176,148,96,0.45)] bg-[#F4E8C8] text-[12px] font-normal tabular-nums text-[#123e3a]">
                    {Math.floor((store.project.bankMinutes ?? 0) / 60)}/500
                  </span>
                </span>
              </>
            ) : (
              "「事事對照，做到是修。」"
            )}
          </div>
        </header>
        )}

        {saveError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {saveError}
          </p>
        ) : null}
        {importError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {importError}
          </p>
        ) : null}

        {view === "project" ? (
          <ProjectBoard
            project={store.project}
            onNote={(note) => update((current) => setProjectNote(current, note))}
            onAddLink={(title, url) => {
              const next = addProjectLink(store, title, url)
              if (!next) return false
              onChange(next)
              return true
            }}
            onDeleteLink={(id) => update((current) => deleteProjectLink(current, id))}
            onAddStep={(title) => update((current) => addProjectStep(current, title))}
            onToggleStep={(id) => update((current) => toggleProjectStep(current, id))}
            onDeleteStep={(id) => update((current) => deleteProjectStep(current, id))}
            onAddFile={(file) => update((current) => addProjectFile(current, file))}
            onDeleteFile={(id) => update((current) => deleteProjectFile(current, id))}
          />
        ) : view === "todo" ? (
          <DailyTodo
            today={today}
            selected={todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate}
            log={getLog(store, todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate)}
            onSelect={setTodoDate}
            onTitle={(id, title) =>
              update((current) =>
                setChecklistTitle(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                  id,
                  title,
                ),
              )
            }
            onToggle={(id) =>
              update((current) =>
                toggleChecklistItem(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                  id,
                ),
              )
            }
            onAdd={() =>
              update((current) =>
                addChecklistItem(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                ),
              )
            }
            onDelete={(id) =>
              update((current) =>
                deleteChecklistItem(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                  id,
                ),
              )
            }
            onMove={(id, direction) =>
              update((current) =>
                moveChecklistItem(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                  id,
                  direction,
                ),
              )
            }
          />
        ) : view === "readme" ? (
          <ReadmePage />
        ) : (
          <>
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label="前一天"
            onClick={() => setSelected(addDays(selected, -1))}
          >
            <ChevronLeft />
          </Button>
          <p className="min-w-0 flex-1 text-center text-base font-normal">
            {formatLong(selected)}
            {selected === today ? " · 今天" : ""}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11"
            aria-label="後一天"
            disabled={selected >= today}
            onClick={() => setSelected(addDays(selected, 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        {selected !== today ? (
          <div className="mt-2 flex justify-center">
            <Button type="button" variant="outline" className="h-10" onClick={() => setSelected(today)}>
              回到今天
            </Button>
          </div>
        ) : null}

        <div className="mt-4">
          <Overview
            today={today}
            selected={selected}
            routines={store.routines}
            days={store.days}
            log={log}
            periodStart={store.periodStart}
            onSelect={(date) => setSelected(date > today ? today : date)}
            onFocusRoutine={(id) => {
              document.getElementById(`routine-${id}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
            }}
          />
        </div>

        <section className="mt-8" aria-label="項目">
          <h2 className="text-sm font-medium">項目</h2>
          {editing || routines.length === 0 ? (
            <Button type="button" variant="outline" className="mt-3 h-11 w-full" onClick={beginAdd}>
              加一項
            </Button>
          ) : null}
          {routines.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-ink-soft">還沒有項目。先加一項每天要做的事。</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2">
              {routines.map((routine, index) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  log={log}
                  editing={editing}
                  canMoveUp={index > 0}
                  canMoveDown={index < routines.length - 1}
                  onToggle={(partId) => update((current) => toggleCheck(current, selected, partId))}
                  onRate={(index, percent) =>
                    update((current) => setRating(current, selected, routine.id, index, percent))
                  }
                  onRatingNote={(index, note) =>
                    update((current) => setRatingNote(current, selected, routine.id, index, note))
                  }
                  onAddRating={() =>
                    update((current) => addRatingGroup(current, selected, routine.id))
                  }
                  onMinutes={(partId, minutes) =>
                    update((current) => setMinutes(current, selected, partId, minutes))
                  }
                  onEdit={() => setDraft(routine)}
                  onDelete={() => setPendingDelete(routine)}
                  onMove={(direction) =>
                    update((current) => ({
                      ...current,
                      routines: moveRoutine(current.routines, routine.id, direction),
                    }))
                  }
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}

        {view === "day" ? (
        <section className="mt-10 border-t border-black/5 pt-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            data-testid="start-period"
            onClick={() => setPeriodOpen(true)}
          >
            Start Anew
          </Button>
        </section>
        ) : null}

        {view === "day" ? (
          <PerformanceBars routines={store.routines} days={store.days} today={today} />
        ) : view === "todo" ? (
        <section className="mt-10 border-t border-black/5 pt-4" aria-label="Memo">
          <h2 className="text-sm font-medium">Memo</h2>
          <MemoField
            value={store.journal[todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate] ?? ""}
            onChange={(value) =>
              update((current) =>
                setJournal(
                  current,
                  todoDate < CHECKLIST_START ? CHECKLIST_START : todoDate > today ? today : todoDate,
                  value,
                ),
              )
            }
          />
        </section>
        ) : view === "readme" ? null : (
        <section className="mt-10 border-t border-black/5 pt-4" aria-label="日記">
          <h2 className="flex items-center gap-3 text-sm font-medium">
            <span>
              日記 <span className="font-normal text-ink-soft">Journal</span>
            </span>
            <span className="h-4 w-px shrink-0 bg-[#123e3a]/35" aria-hidden />
            <span className="font-normal text-ink-soft">{formatLong(today)}</span>
          </h2>
          <Textarea
            value={store.journal[today] ?? ""}
            aria-label="今天的日記"
            onChange={(event) => update((current) => setJournal(current, today, event.target.value))}
            className="mt-3 min-h-32 bg-white/70 text-base md:text-base"
          />
        </section>
        )}
      </main>
      <nav
        className={`grid shrink-0 grid-cols-4 border-t border-black/10 ${view === "readme" ? "bg-[#F5F2E8]" : view === "todo" ? "bg-[#EFEFEA]" : view === "project" ? "bg-[#f7f4ee]/70" : "bg-[#f7fffd]"}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="切換頁面"
      >
        {(
          [
            ["day", "今天", CalendarDays],
            ["readme", "ReadMe", BookOpen],
            ["todo", "待辦", ListChecks],
            ["project", "Skill", Timer],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = view === id
          return (
            <button
              key={id}
              type="button"
              className="flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium"
              aria-pressed={active}
              data-testid={`view-${id}`}
              style={{
                color:
                  view === "project"
                    ? active
                      ? "#123e3a"
                      : "#3e6b64"
                    : active
                      ? "#123e3a"
                      : "#3e6b64",
              }}
              onClick={() => setView(id)}
            >
              <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
      </div>

      <RoutineEditor
        draft={draft}
        isNew={draft != null && !store.routines.some((routine) => routine.id === draft.id)}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSave={(routine) => {
          update((current) => upsertRoutine(current, routine))
          setDraft(null)
        }}
        onDelete={() => {
          if (!draft) return
          setPendingDelete(draft)
          setDraft(null)
        }}
      />

      <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Anew</DialogTitle>
            <DialogDescription>
              Earlier days stay in Over time. From today, the last 7 days and the streak start again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setPeriodOpen(false)}>
              Not now
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                update((current) => startNewPeriod(current, today))
                setSelected(today)
                setView("day")
                setPeriodOpen(false)
              }}
            >
              Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingDelete != null} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除這項</DialogTitle>
            <DialogDescription>
              刪除「{pendingDelete?.name || "未命名"}」後，它不再出現在每天的列表裡。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setPendingDelete(null)}>
              留下
            </Button>
            <Button type="button" variant="destructive" className="h-11" onClick={confirmDelete}>
              刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MemoField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
      aria-label="Memo"
      onChange={(event) => onChange(event.target.value)}
      className="mt-3 min-h-16 w-full resize-none overflow-hidden whitespace-pre-wrap break-words rounded-lg border border-[#cecebf] bg-[#EFEFEA] px-3 py-2 text-base leading-7 text-[#0D0D0D] outline-none"
    />
  )
}

function Skeleton() {
  return (
    <div className="min-h-dvh bg-[#06110f]">
      <div className="mx-auto min-h-dvh w-full max-w-md bg-paper px-4 py-6">
        <div className="h-8 w-24 rounded-lg bg-black/5" />
        <div className="mt-6 h-44 rounded-3xl bg-black/5" />
        <div className="mt-4 h-16 rounded-2xl bg-black/5" />
        <div className="mt-2 h-16 rounded-2xl bg-black/5" />
        <div className="mt-2 h-16 rounded-2xl bg-black/5" />
      </div>
    </div>
  )
}
