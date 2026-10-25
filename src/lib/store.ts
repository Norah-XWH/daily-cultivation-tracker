import { parseClock } from "@/lib/dates"
import type { ColorId, DayLog, Part, Routine, Store, Todo } from "@/lib/types"
import { isColorId } from "@/lib/types"

export const STORAGE_KEY = "rike.v1"

export const RATING_GROUPS = 3
export const MAX_RATING_GROUPS = 24

export function snapRating(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value / 5) * 5))
}

export function emptyLog(): DayLog {
  return { checks: {}, minutes: {}, notes: {}, ratings: {}, ratingNotes: {} }
}

export function uid(): string {
  return crypto.randomUUID()
}

function checkPart(id: string, label: string, caption: string | null = null): Part {
  return {
    id,
    label,
    kind: "check",
    targetMinutes: null,
    start: null,
    end: null,
    optional: false,
    choices: null,
    caption,
  }
}

function minutesPart(
  id: string,
  label: string,
  targetMinutes: number,
  extra: Partial<Pick<Part, "optional" | "caption">> = {},
): Part {
  return {
    id,
    label,
    kind: "minutes",
    targetMinutes,
    start: null,
    end: null,
    optional: extra.optional === true,
    choices: null,
    caption: extra.caption ?? null,
  }
}

function choicePart(id: string, choices: number[]): Part {
  return {
    id,
    label: "",
    kind: "minutes",
    targetMinutes: null,
    start: null,
    end: null,
    optional: false,
    choices,
    caption: null,
  }
}

function slot(id: string, label: string, start: string, end: string): Part {
  return {
    id,
    label,
    kind: "check",
    targetMinutes: null,
    start,
    end,
    optional: false,
    choices: null,
    caption: null,
  }
}

export function exerciseTwoPart(): Part {
  return choicePart("exercise-2-time", [30, 60])
}

function exercise(index: number): Routine {
  const meditation = index === 5
  return {
    id: `exercise-${index}`,
    name: meditation ? "Exercise 5: meditation" : `Exercise ${index}`,
    detail: "",
    color: meditation ? "iris" : "moss",
    required: true,
    completion: "all",
    mode: "tasks",
    order: index - 1,
    parts: index === 2 ? [exerciseTwoPart()] : [checkPart(`exercise-${index}-done`, "完成")],
  }
}

export const CULTIVATE_QUESTION = "Have you seized every opportunity to really cultivate?"

function cultivateRoutine(): Routine {
  return {
    id: "cultivate",
    name: CULTIVATE_QUESTION,
    detail: "",
    color: "teal",
    required: true,
    completion: "all",
    mode: "rating",
    order: 7,
    parts: [],
  }
}

export function createDefaultStore(): Store {
  return {
    version: 2,
    routines: [
      exercise(1),
      exercise(2),
      exercise(3),
      exercise(4),
      exercise(5),
      {
        id: "fzn",
        name: "FZN",
        detail: "",
        color: "amber",
        required: true,
        completion: "all",
        mode: "tasks",
        order: 5,
        parts: [
          slot("fzn-1", "凌晨", "02:55", "03:10"),
          slot("fzn-2", "上午", "08:55", "09:10"),
          slot("fzn-3", "下午", "14:55", "15:10"),
          slot("fzn-4", "晚上", "20:55", "21:10"),
        ],
      },
      {
        id: "read-fa",
        name: "Read FA",
        detail: "",
        color: "sea",
        required: true,
        completion: "all",
        mode: "tasks",
        order: 6,
        parts: [
          checkPart("fa-lecture", "轉法輪", "1 Lecture"),
          minutesPart("fa-hour", "各地講法", 60, { optional: true, caption: "約 1 小時" }),
        ],
      },
      cultivateRoutine(),
    ],
    todos: [],
    days: {},
    periodStart: null,
  }
}

export function startNewPeriod(store: Store, today: string): Store {
  return { ...store, periodStart: today }
}

export function blankRoutine(order: number): Routine {
  return {
    id: uid(),
    name: "",
    detail: "",
    color: "stone",
    required: true,
    completion: "all",
    mode: "tasks",
    order,
    parts: [checkPart(uid(), "完成")],
  }
}

export function validateRoutine(routine: Routine): string | null {
  if (!routine.name.trim()) return "先寫一個名稱。"
  if (routine.mode !== "rating" && routine.parts.length === 0) return "至少留一條目。"
  for (const part of routine.parts) {
    const hasChoices = part.kind === "minutes" && (part.choices?.length ?? 0) > 0
    if (part.kind === "minutes" && !hasChoices && (part.targetMinutes ?? 0) < 1) {
      return "計時的目標至少是 1 分鐘。"
    }
    const hasStart = Boolean(part.start)
    const hasEnd = Boolean(part.end)
    if (hasStart !== hasEnd) return "時段要同時填開始和結束。"
    if (part.start && part.end && part.end <= part.start) return "結束時間要晚於開始時間。"
  }
  return null
}

export function sanitizeRoutine(routine: Routine): Routine {
  return {
    ...routine,
    name: routine.name.trim().slice(0, 80),
    detail: routine.detail.trim().slice(0, 280),
    mode: routine.mode === "rating" ? "rating" : "tasks",
    parts: routine.mode === "rating" ? [] : routine.parts.map((part) => {
      const choices = cleanChoices(part)
      return {
        ...part,
        label:
          part.label.trim().slice(0, 40) ||
          (choices ? "" : part.kind === "minutes" ? "計時" : "打卡"),
        targetMinutes:
          part.kind === "minutes" && !choices ? Math.max(1, Math.round(part.targetMinutes ?? 45)) : null,
        start: part.start || null,
        end: part.end || null,
        optional: part.optional === true,
        choices,
        caption: part.caption?.trim().slice(0, 40) || null,
      }
    }),
  }
}

export function getLog(store: Store, date: string): DayLog {
  return store.days[date] ?? emptyLog()
}

function writeDay(store: Store, date: string, update: (log: DayLog) => DayLog): Store {
  const current = store.days[date] ?? emptyLog()
  return { ...store, days: { ...store.days, [date]: update(current) } }
}

export function toggleCheck(store: Store, date: string, partId: string): Store {
  return writeDay(store, date, (log) => ({
    ...log,
    checks: { ...log.checks, [partId]: !log.checks[partId] },
  }))
}

export function setMinutes(store: Store, date: string, partId: string, minutes: number): Store {
  const safe = Math.max(0, Math.min(999, Math.round(minutes)))
  return writeDay(store, date, (log) => ({
    ...log,
    minutes: { ...log.minutes, [partId]: safe },
  }))
}

export function setRating(
  store: Store,
  date: string,
  routineId: string,
  index: number,
  percent: number,
): Store {
  if (index < 0 || index >= MAX_RATING_GROUPS) return store
  const safe = snapRating(percent)
  return writeDay(store, date, (log) => {
    const current = [...(log.ratings[routineId] ?? [])]
    while (current.length <= index) current.push(null)
    current[index] = safe
    return { ...log, ratings: { ...log.ratings, [routineId]: current } }
  })
}

export function addRatingGroup(store: Store, date: string, routineId: string): Store {
  return writeDay(store, date, (log) => {
    const current = [...(log.ratings[routineId] ?? [])]
    const count = Math.max(RATING_GROUPS, current.length)
    if (count >= MAX_RATING_GROUPS) return log
    while (current.length < count) current.push(null)
    current.push(null)
    return { ...log, ratings: { ...log.ratings, [routineId]: current } }
  })
}

export function setRatingNote(
  store: Store,
  date: string,
  routineId: string,
  index: number,
  note: string,
): Store {
  if (index < 0 || index >= MAX_RATING_GROUPS) return store
  return writeDay(store, date, (log) => {
    const current = [...(log.ratingNotes?.[routineId] ?? [])]
    while (current.length <= index) current.push("")
    current[index] = note.slice(0, 500)
    return { ...log, ratingNotes: { ...(log.ratingNotes ?? {}), [routineId]: current } }
  })
}

export function setRoutineNote(store: Store, date: string, routineId: string, note: string): Store {
  return writeDay(store, date, (log) => ({
    ...log,
    notes: { ...log.notes, [routineId]: note.slice(0, 500) },
  }))
}

export function upsertRoutine(store: Store, routine: Routine): Store {
  const exists = store.routines.some((item) => item.id === routine.id)
  return {
    ...store,
    routines: exists
      ? store.routines.map((item) => (item.id === routine.id ? routine : item))
      : [...store.routines, routine],
  }
}

export function deleteRoutine(store: Store, id: string): Store {
  return {
    ...store,
    routines: store.routines
      .filter((routine) => routine.id !== id)
      .map((routine, order) => ({ ...routine, order })),
  }
}

export function moveRoutine(routines: Routine[], id: string, direction: -1 | 1): Routine[] {
  const sorted = [...routines].sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((routine) => routine.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= sorted.length) return routines
  const next = [...sorted]
  const current = next[index]
  const neighbor = next[target]
  if (!current || !neighbor) return routines
  next[index] = neighbor
  next[target] = current
  return next.map((routine, order) => ({ ...routine, order }))
}

export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    if (a.done) return (b.completedAt ?? "").localeCompare(a.completedAt ?? "")
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export function addTodo(store: Store, title: string, now = new Date()): Store {
  const clean = title.trim().slice(0, 140)
  if (!clean) return store
  const todo: Todo = {
    id: uid(),
    title: clean,
    done: false,
    createdAt: now.toISOString(),
    completedAt: null,
  }
  return { ...store, todos: [...store.todos, todo] }
}

export function renameTodo(store: Store, id: string, title: string): Store {
  return {
    ...store,
    todos: store.todos.map((todo) =>
      todo.id === id ? { ...todo, title: title.slice(0, 140) } : todo,
    ),
  }
}

export function toggleTodo(store: Store, id: string, now = new Date()): Store {
  return {
    ...store,
    todos: store.todos.map((todo) => {
      if (todo.id !== id) return todo
      const done = !todo.done
      return { ...todo, done, completedAt: done ? now.toISOString() : null }
    }),
  }
}

export function deleteTodo(store: Store, id: string): Store {
  return { ...store, todos: store.todos.filter((todo) => todo.id !== id) }
}

function asRecord(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  return input as Record<string, unknown>
}

function normalizePart(input: unknown, seen: Set<string>): Part | null {
  const raw = asRecord(input)
  if (!raw || typeof raw.id !== "string" || !raw.id || seen.has(raw.id)) return null
  if (raw.kind !== "check" && raw.kind !== "minutes") return null
  seen.add(raw.id)
  const label = typeof raw.label === "string" ? raw.label.slice(0, 40) : ""
  const target =
    typeof raw.targetMinutes === "number" && Number.isFinite(raw.targetMinutes)
      ? Math.max(0, Math.round(raw.targetMinutes))
      : null
  const start = typeof raw.start === "string" && parseClock(raw.start) != null ? raw.start : null
  const end = typeof raw.end === "string" && parseClock(raw.end) != null ? raw.end : null
  const choices = raw.kind === "minutes" ? cleanChoices(raw) : null
  const caption = typeof raw.caption === "string" ? raw.caption.trim().slice(0, 40) : ""
  return {
    id: raw.id,
    label,
    kind: raw.kind,
    targetMinutes: raw.kind === "minutes" && !choices ? target : null,
    start,
    end,
    optional: raw.optional === true,
    choices,
    caption: caption || null,
  }
}

function cleanChoices(input: { kind?: unknown; choices?: unknown }): number[] | null {
  if (input.kind != null && input.kind !== "minutes") return null
  if (!Array.isArray(input.choices)) return null
  const choices = [...new Set(
    input.choices
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0)
      .map((value) => Math.round(value)),
  )].slice(0, 4)
  return choices.length > 0 ? choices : null
}

const BUILT_IN_DETAILS = new Set(["至少 45 分钟。做什么可以记在下面，之后再补。"])

function cleanDetail(value: unknown): string {
  if (typeof value !== "string") return ""
  const detail = value.slice(0, 280)
  return BUILT_IN_DETAILS.has(detail.trim()) ? "" : detail
}

function normalizeRoutine(input: unknown, index: number, seenParts: Set<string>): Routine | null {
  const raw = asRecord(input)
  if (!raw || typeof raw.id !== "string" || !raw.id || typeof raw.name !== "string") return null
  const mode = raw.mode === "rating" || raw.mode === "events" || raw.id === "cultivate" ? "rating" : "tasks"
  if (mode !== "rating" && !Array.isArray(raw.parts)) return null
  const parts =
    mode === "rating" || !Array.isArray(raw.parts)
      ? []
      : raw.parts
          .map((part) => normalizePart(part, seenParts))
          .filter((part): part is Part => part != null)
  if (mode !== "rating" && parts.length === 0) return null
  const color: ColorId = typeof raw.color === "string" && isColorId(raw.color) ? raw.color : "stone"
  return {
    id: raw.id,
    name: raw.name.slice(0, 80),
    detail: cleanDetail(raw.detail),
    color,
    required: typeof raw.required === "boolean" ? raw.required : true,
    completion: raw.completion === "any" ? "any" : "all",
    mode,
    order: typeof raw.order === "number" && Number.isFinite(raw.order) ? raw.order : index,
    parts,
  }
}

function booleanRecord(input: unknown): Record<string, boolean> {
  const raw = asRecord(input)
  if (!raw) return {}
  const result: Record<string, boolean> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") result[key] = value
  }
  return result
}

function numberRecord(input: unknown): Record<string, number> {
  const raw = asRecord(input)
  if (!raw) return {}
  const result: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = Math.max(0, Math.round(value))
    }
  }
  return result
}

function stringRecord(input: unknown): Record<string, string> {
  const raw = asRecord(input)
  if (!raw) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") result[key] = value.slice(0, 500)
  }
  return result
}

function ratingList(value: unknown): Array<number | null> | null {
  if (typeof value === "number" && Number.isFinite(value)) return [snapRating(value)]
  if (!Array.isArray(value)) return null
  return value.slice(0, MAX_RATING_GROUPS).map((item) =>
    typeof item === "number" && Number.isFinite(item) ? snapRating(item) : null,
  )
}

function ratingRecord(input: unknown): Record<string, Array<number | null>> {
  const raw = asRecord(input)
  if (!raw) return {}
  const result: Record<string, Array<number | null>> = {}
  for (const [key, value] of Object.entries(raw)) {
    const list = ratingList(value)
    if (list) result[key] = list
  }
  return result
}

function marksToRating(input: unknown): number | null {
  if (!Array.isArray(input)) return null
  const answered = input.filter((item) => item === "tick" || item === "cross")
  if (answered.length === 0) return null
  const ticks = answered.filter((item) => item === "tick").length
  return snapRating((ticks / answered.length) * 100)
}

function normalizeLog(input: unknown): DayLog {
  const raw = asRecord(input)
  if (!raw) return emptyLog()
  const ratings = ratingRecord(raw.ratings)
  const rawMarks = asRecord(raw.marks)
  if (rawMarks) {
    for (const [key, value] of Object.entries(rawMarks)) {
      if (ratings[key] != null) continue
      const converted = marksToRating(value)
      if (converted != null) ratings[key] = [converted]
    }
  }
  const checks = booleanRecord(raw.checks)
  if (checks["cultivate-done"] && ratings.cultivate == null) ratings.cultivate = [100]
  delete checks["cultivate-done"]
  const ratingNotes: Record<string, string[]> = {}
  const rawRatingNotes = asRecord(raw.ratingNotes)
  if (rawRatingNotes) {
    for (const [key, value] of Object.entries(rawRatingNotes)) {
      if (!Array.isArray(value)) continue
      ratingNotes[key] = value
        .slice(0, MAX_RATING_GROUPS)
        .map((item) => (typeof item === "string" ? item.slice(0, 500) : ""))
    }
  }
  return {
    checks,
    minutes: numberRecord(raw.minutes),
    notes: stringRecord(raw.notes),
    ratings,
    ratingNotes,
  }
}

function normalizeTodo(input: unknown, seen: Set<string>): Todo | null {
  const raw = asRecord(input)
  if (!raw || typeof raw.id !== "string" || !raw.id || seen.has(raw.id)) return null
  if (typeof raw.title !== "string") return null
  seen.add(raw.id)
  const done = raw.done === true
  return {
    id: raw.id,
    title: raw.title.slice(0, 140),
    done,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "1970-01-01T00:00:00.000Z",
    completedAt: done && typeof raw.completedAt === "string" ? raw.completedAt : null,
  }
}

export function normalizeStore(input: unknown): Store | null {
  const raw = asRecord(input)
  if (!raw || !Array.isArray(raw.routines)) return null
  if (raw.version != null && raw.version !== 1 && raw.version !== 2) return null
  const seenRoutines = new Set<string>()
  const seenParts = new Set<string>()
  const routines: Routine[] = []
  raw.routines.forEach((item, index) => {
    const routine = normalizeRoutine(item, index, seenParts)
    if (!routine || seenRoutines.has(routine.id)) return
    seenRoutines.add(routine.id)
    routines.push(routine)
  })
  const seenTodos = new Set<string>()
  const todos = Array.isArray(raw.todos)
    ? raw.todos
        .map((item) => normalizeTodo(item, seenTodos))
        .filter((item): item is Todo => item != null)
    : []
  const days: Record<string, DayLog> = {}
  const rawDays = asRecord(raw.days)
  if (rawDays) {
    for (const [key, value] of Object.entries(rawDays)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key)) days[key] = normalizeLog(value)
    }
  }
  const kept = routines
    .filter((routine) => routine.id !== "hobby")
    .map((routine) =>
      routine.id === "cultivate" && routine.color === "rose" ? { ...routine, color: "teal" as const } : routine,
    )
  const incomingVersion = raw.version === 2 ? 2 : 1
  if (incomingVersion === 1 && !kept.some((routine) => routine.id === "cultivate")) {
    const order = kept.reduce((max, routine) => Math.max(max, routine.order), -1) + 1
    kept.push({ ...cultivateRoutine(), order })
  }
  applyBuiltInShape(kept, days)
  for (const routine of kept) {
    if (routine.mode !== "rating") continue
    for (const log of Object.values(days)) {
      const legacy = log.notes[routine.id]?.trim() ?? ""
      const slots = log.ratingNotes[routine.id] ?? []
      if (legacy && slots.every((note) => note.trim() === "")) {
        log.ratingNotes = { ...log.ratingNotes, [routine.id]: [legacy] }
        const notes = { ...log.notes }
        delete notes[routine.id]
        log.notes = notes
      }
    }
  }
  const periodStart =
    typeof raw.periodStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.periodStart)
      ? raw.periodStart
      : null
  return { version: 2, routines: kept, todos, days, periodStart }
}

function visibleCaption(caption: string | null, fallback: string, hidden: string[]): string {
  if (!caption || hidden.some((word) => caption.includes(word))) return fallback
  return caption
}

function applyBuiltInShape(routines: Routine[], days: Record<string, DayLog>) {
  for (const routine of routines) {
    if (
      routine.id === "exercise-2" &&
      routine.parts.length === 1 &&
      routine.parts[0]?.id === "exercise-2-done" &&
      routine.parts[0]?.kind === "check"
    ) {
      routine.parts = [exerciseTwoPart()]
      routine.completion = "all"
      routine.mode = "tasks"
    }
    if (routine.id !== "read-fa") continue
    routine.completion = "all"
    routine.parts = routine.parts.map((part) => {
      if (part.id === "fa-lecture") {
        return {
          ...part,
          kind: "check",
          label: part.label === "1 lecture" || part.label === "" ? "轉法輪" : part.label,
          targetMinutes: null,
          optional: false,
          choices: null,
          caption: visibleCaption(part.caption, "1 Lecture", ["必做"]),
        }
      }
      if (part.id === "fa-hour") {
        return {
          ...part,
          kind: "minutes",
          label: part.label === "1 hour" || part.label === "" ? "各地講法" : part.label,
          targetMinutes: part.targetMinutes && part.targetMinutes > 0 ? part.targetMinutes : 60,
          optional: true,
          choices: null,
          caption: visibleCaption(part.caption, "約 1 小時", ["可彈性", "可弹性"]),
        }
      }
      return part
    })
  }
  for (const log of Object.values(days)) {
    if (!log.checks["exercise-2-done"]) continue
    if ((log.minutes["exercise-2-time"] ?? 0) <= 0) {
      log.minutes = { ...log.minutes, "exercise-2-time": 30 }
    }
    const checks = { ...log.checks }
    delete checks["exercise-2-done"]
    log.checks = checks
  }
}

export function readStore(): { store: Store; persist: boolean; unreadable: boolean } {
  if (typeof window === "undefined") {
    return { store: createDefaultStore(), persist: false, unreadable: false }
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return { store: createDefaultStore(), persist: true, unreadable: false }
  try {
    const normalized = normalizeStore(JSON.parse(raw))
    if (!normalized) return { store: createDefaultStore(), persist: false, unreadable: true }
    return { store: normalized, persist: true, unreadable: false }
  } catch {
    return { store: createDefaultStore(), persist: false, unreadable: true }
  }
}
