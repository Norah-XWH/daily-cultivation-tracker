"use client"

import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { HistoryView } from "@/components/history-view"
import { Overview } from "@/components/overview"
import { RoutineCard } from "@/components/routine-card"
import { RoutineEditor } from "@/components/routine-editor"
import { Button } from "@/components/ui/button"
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
  blankRoutine,
  createDefaultStore,
  deleteRoutine,
  getLog,
  addRatingGroup,
  setRatingNote,
  moveRoutine,
  normalizeStore,
  readStore,
  setRating,
  setMinutes,
  startNewPeriod,
  STORAGE_KEY,
  toggleCheck,
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
  const [view, setView] = useState<"day" | "trend">("day")
  const [mottoPop, setMottoPop] = useState(true)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [trackedToday, setTrackedToday] = useState(today)
  if (trackedToday !== today) {
    setTrackedToday(today)
    setSelected((current) => (current === trackedToday ? today : current))
  }

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

  const routines = sortRoutines(store.routines)
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
    <div className="min-h-dvh bg-[#06110f]">
      {mottoPop ? (
        <button
          type="button"
          className="fixed inset-0 z-40 grid place-items-center border-0 bg-[#06110f]/55 p-6"
          aria-label="Align thoughts, conduct, and habits with 真-善-忍"
          onClick={() => setMottoPop(false)}
        >
          <span className="animate-motto-pop font-oldstyle block max-w-[22rem] rounded-[1.75rem] bg-paper px-5 py-8 text-center text-[2.35rem] leading-[1.15] font-semibold text-[#123e3a] shadow-[0_28px_70px_rgba(6,17,15,0.45)] motion-reduce:animate-none">
            Align thoughts, conduct, and habits with{" "}
            <span className="font-zhen whitespace-nowrap">真-善-忍</span>
          </span>
        </button>
      ) : null}
      <main
        className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-paper px-4 pb-12"
        style={{
          paddingTop: "max(1.25rem, env(safe-area-inset-top))",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
        }}
      >
        <header>
          <h1 className="font-oldstyle text-[1.9rem] leading-none font-semibold text-[#123e3a]">
            Daily Cultivation Tracker
          </h1>
          <p
            className={
              view === "day"
                ? `font-oldstyle mt-2 text-[1.05rem] leading-snug font-medium text-[#123e3a]${mottoPop ? " invisible" : ""}`
                : "mt-1 text-sm text-ink-soft"
            }
          >
            {view === "day" ? (
              <>
                Align thoughts, conduct, and habits with{" "}
                <span className="font-zhen whitespace-nowrap">真-善-忍</span>
              </>
            ) : (
              "完成度怎麼變"
            )}
          </p>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2" role="group" aria-label="切換頁面">
          <button
            type="button"
            className="h-12 rounded-lg text-sm font-medium leading-tight"
            aria-pressed={view === "day"}
            style={viewTabStyle(view === "day")}
            onClick={() => setView("day")}
          >
            <span className="block">今天</span>
            <span className="block text-xs font-normal">Today</span>
          </button>
          <button
            type="button"
            className="h-12 rounded-lg text-sm font-medium leading-tight"
            aria-pressed={view === "trend"}
            data-testid="view-trend"
            style={viewTabStyle(view === "trend")}
            onClick={() => setView("trend")}
          >
            <span className="block">一段時間</span>
            <span className="block text-xs font-normal">Over time</span>
          </button>
        </div>

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

        {view === "trend" ? (
          <HistoryView
            routines={store.routines}
            days={store.days}
            today={today}
            periodStart={store.periodStart}
            onOpenDay={(date) => {
              setSelected(date > today ? today : date)
              setView("day")
            }}
          />
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
          <p className="min-w-0 flex-1 text-center text-base font-medium">
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

        <section className="mt-8" aria-label="Routines">
          <h2 className="text-sm font-medium">Routines</h2>
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
      </main>

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

function viewTabStyle(active: boolean): { backgroundColor: string; color: string } {
  return active
    ? { backgroundColor: "#26867b", color: "#f4fffd" }
    : { backgroundColor: "rgba(255,255,255,0.72)", color: "#123e3a" }
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
