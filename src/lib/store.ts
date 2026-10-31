import { parseClock } from "@/lib/dates"
import type {
  CheckItem,
  ColorId,
  DayLog,
  Part,
  Project,
  ProjectFile,
  ProjectLink,
  ProjectStep,
  Routine,
  Store,
  Todo,
} from "@/lib/types"
import { isColorId } from "@/lib/types"

export const STORAGE_KEY = "rike.v1"
export const CHECKLIST_START = "2026-10-30"
export const CHECKLIST_SLOTS = 5

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
        completion: "any",
        mode: "tasks",
        order: 6,
        parts: [
          checkPart("fa-lecture", "轉法輪", "1 Lecture"),
          checkPart("fa-hour", "各地講法", "約 1 小時"),
        ],
      },
    ],
    todos: [],
    days: {},
    periodStart: null,
    project: emptyProject(),
    journal: {},
  }
}

export function emptyProject(): Project {
  return { note: "", links: [], files: [], steps: [], hours: {}, bankMinutes: 0 }
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

export function checklistFor(date: string, log: DayLog): CheckItem[] | null {
  if (date < CHECKLIST_START) return null
  if (log.checklist) return log.checklist
  return Array.from({ length: CHECKLIST_SLOTS }, (_, index) => ({
    id: `todo-${date}-${index + 1}`,
    title: "",
    done: false,
  }))
}

function withChecklist(
  store: Store,
  date: string,
  change: (items: CheckItem[]) => CheckItem[],
): Store {
  if (date < CHECKLIST_START) return store
  return writeDay(store, date, (log) => ({
    ...log,
    checklist: change(checklistFor(date, log) ?? []),
  }))
}

export function setChecklistTitle(store: Store, date: string, id: string, title: string): Store {
  return withChecklist(store, date, (items) =>
    items.map((item) => (item.id === id ? { ...item, title: title.slice(0, 4000) } : item)),
  )
}

export function toggleChecklistItem(store: Store, date: string, id: string): Store {
  return withChecklist(store, date, (items) =>
    items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
  )
}

export function addChecklistItem(store: Store, date: string): Store {
  return withChecklist(store, date, (items) => [
    ...items,
    { id: uid(), title: "", done: false },
  ])
}

export function deleteChecklistItem(store: Store, date: string, id: string): Store {
  return withChecklist(store, date, (items) => items.filter((item) => item.id !== id))
}

export function moveChecklistItem(store: Store, date: string, id: string, direction: -1 | 1): Store {
  return withChecklist(store, date, (items) => {
    const index = items.findIndex((item) => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= items.length) return items
    const next = [...items]
    const current = next[index]
    const neighbor = next[target]
    if (!current || !neighbor) return items
    next[index] = neighbor
    next[target] = current
    return next
  })
}

export function setJournal(store: Store, date: string, note: string): Store {
  return { ...store, journal: { ...store.journal, [date]: note.slice(0, 8000) } }
}

export function setProjectMinutes(store: Store, date: string, minutes: number): Store {
  const safe = Math.max(0, Math.min(24 * 60, Math.round(minutes)))
  return {
    ...store,
    project: { ...store.project, hours: { ...store.project.hours, [date]: safe } },
  }
}

export function finishProjectTimer(store: Store, date: string, minutes: number): Store {
  const add = Math.max(0, Math.round(minutes))
  if (add <= 0) return store
  const day = Math.min(24 * 60, (store.project.hours[date] ?? 0) + add)
  return {
    ...store,
    project: {
      ...store.project,
      bankMinutes: (store.project.bankMinutes ?? 0) + add,
      hours: { ...store.project.hours, [date]: day },
    },
  }
}

export function setProjectNote(store: Store, note: string): Store {
  return { ...store, project: { ...store.project, note: note.slice(0, 4000) } }
}

export function addProjectLink(store: Store, title: string, url: string): Store | null {
  const href = url.trim()
  const withScheme = /^https?:\/\//i.test(href) ? href : `https://${href}`
  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return null
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
  const link: ProjectLink = {
    id: uid(),
    title: title.trim().slice(0, 140) || parsed.hostname,
    url: parsed.toString().slice(0, 2000),
  }
  return { ...store, project: { ...store.project, links: [link, ...store.project.links] } }
}

export function deleteProjectLink(store: Store, id: string): Store {
  return {
    ...store,
    project: { ...store.project, links: store.project.links.filter((link) => link.id !== id) },
  }
}

const MAX_STEP_DEPTH = 5

function toggleInSteps(steps: ProjectStep[], id: string): ProjectStep[] {
  return steps.map((step) =>
    step.id === id ? { ...step, done: !step.done } : { ...step, substeps: toggleInSteps(step.substeps, id) },
  )
}

function deleteInSteps(steps: ProjectStep[], id: string): ProjectStep[] {
  return steps
    .filter((step) => step.id !== id)
    .map((step) => ({ ...step, substeps: deleteInSteps(step.substeps, id) }))
}

function addInSteps(steps: ProjectStep[], parentId: string, child: ProjectStep, depth: number): { steps: ProjectStep[]; placed: boolean } {
  let placed = false
  const next = steps.map((step) => {
    if (step.id === parentId && depth < MAX_STEP_DEPTH) {
      placed = true
      return { ...step, substeps: [...step.substeps, child] }
    }
    const nested = addInSteps(step.substeps, parentId, child, depth + 1)
    if (nested.placed) placed = true
    return { ...step, substeps: nested.steps }
  })
  return { steps: next, placed }
}

export function addProjectStep(store: Store, title: string, parentId?: string): Store {
  const trimmed = title.trim().slice(0, 140)
  if (!trimmed) return store
  const step: ProjectStep = { id: uid(), title: trimmed, done: false, substeps: [] }
  if (!parentId) {
    return { ...store, project: { ...store.project, steps: [...store.project.steps, step] } }
  }
  const nested = addInSteps(store.project.steps, parentId, step, 1)
  if (!nested.placed) return store
  return { ...store, project: { ...store.project, steps: nested.steps } }
}

export function toggleProjectStep(store: Store, id: string): Store {
  return { ...store, project: { ...store.project, steps: toggleInSteps(store.project.steps, id) } }
}

export function deleteProjectStep(store: Store, id: string): Store {
  return { ...store, project: { ...store.project, steps: deleteInSteps(store.project.steps, id) } }
}

export function addProjectFile(store: Store, file: ProjectFile): Store {
  return { ...store, project: { ...store.project, files: [file, ...store.project.files] } }
}

export function deleteProjectFile(store: Store, id: string): Store {
  return {
    ...store,
    project: { ...store.project, files: store.project.files.filter((file) => file.id !== id) },
  }
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

function normalizeJournal(input: unknown): Record<string, string> {
  const raw = asRecord(input)
  if (!raw) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === "string") result[key] = value.slice(0, 8000)
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
  const checklist = normalizeChecklist(raw.checklist)
  return {
    checks,
    minutes: numberRecord(raw.minutes),
    notes: stringRecord(raw.notes),
    ratings,
    ratingNotes,
    ...(checklist ? { checklist } : {}),
  }
}

function normalizeChecklist(input: unknown): CheckItem[] | undefined {
  if (!Array.isArray(input)) return undefined
  const seen = new Set<string>()
  const items: CheckItem[] = []
  for (const item of input.slice(0, 100)) {
    const raw = asRecord(item)
    if (!raw || typeof raw.id !== "string" || !raw.id || seen.has(raw.id)) continue
    seen.add(raw.id)
    items.push({
      id: raw.id,
      title: typeof raw.title === "string" ? raw.title.slice(0, 4000) : "",
      done: raw.done === true,
    })
  }
  return items
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
  const kept = routines.filter((routine) => routine.id !== "hobby" && routine.id !== "cultivate")
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
  return {
    version: 2,
    routines: kept,
    todos,
    days,
    periodStart,
    project: normalizeProject(raw.project),
    journal: normalizeJournal(raw.journal),
  }
}

function normalizeProject(input: unknown): Project {
  const raw = asRecord(input)
  if (!raw) return emptyProject()
  const links: ProjectLink[] = []
  const seenLinks = new Set<string>()
  if (Array.isArray(raw.links)) {
    for (const item of raw.links.slice(0, 200)) {
      const link = asRecord(item)
      if (!link || typeof link.id !== "string" || !link.id || seenLinks.has(link.id)) continue
      if (typeof link.url !== "string" || !/^https?:\/\//i.test(link.url)) continue
      seenLinks.add(link.id)
      links.push({
        id: link.id,
        title: typeof link.title === "string" ? link.title.slice(0, 140) : "",
        url: link.url.slice(0, 2000),
      })
    }
  }
  const files: ProjectFile[] = []
  const seenFiles = new Set<string>()
  if (Array.isArray(raw.files)) {
    for (const item of raw.files.slice(0, 200)) {
      const file = asRecord(item)
      if (!file || typeof file.id !== "string" || !file.id || seenFiles.has(file.id)) continue
      if (typeof file.name !== "string") continue
      seenFiles.add(file.id)
      files.push({
        id: file.id,
        name: file.name.slice(0, 180),
        type: typeof file.type === "string" ? file.type.slice(0, 120) : "",
        size: typeof file.size === "number" && Number.isFinite(file.size) ? Math.max(0, Math.round(file.size)) : 0,
        addedAt: typeof file.addedAt === "string" ? file.addedAt : "1970-01-01T00:00:00.000Z",
      })
    }
  }
  const steps = normalizeSteps(raw.steps, new Set<string>(), 1)
  const hours: Record<string, number> = {}
  const rawHours = asRecord(raw.hours)
  if (rawHours) {
    for (const [key, value] of Object.entries(rawHours)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || typeof value !== "number" || !Number.isFinite(value)) continue
      hours[key] = Math.max(0, Math.min(24 * 60, Math.round(value)))
    }
  }
  const bankMinutes =
    typeof raw.bankMinutes === "number" && Number.isFinite(raw.bankMinutes)
      ? Math.max(0, Math.round(raw.bankMinutes))
      : 0
  return {
    note: typeof raw.note === "string" ? raw.note.slice(0, 4000) : "",
    links,
    files,
    steps,
    hours,
    bankMinutes,
  }
}

function normalizeSteps(input: unknown, seen: Set<string>, depth: number): ProjectStep[] {
  if (!Array.isArray(input) || depth > MAX_STEP_DEPTH) return []
  const steps: ProjectStep[] = []
  for (const item of input.slice(0, 80)) {
    const step = asRecord(item)
    if (!step || typeof step.id !== "string" || !step.id || seen.has(step.id)) continue
    if (typeof step.title !== "string") continue
    seen.add(step.id)
    steps.push({
      id: step.id,
      title: step.title.slice(0, 140),
      done: step.done === true,
      substeps: normalizeSteps(step.substeps, seen, depth + 1),
    })
  }
  return steps
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
    routine.completion = "any"
    routine.parts = routine.parts.map((part) => {
      if (part.id === "fa-lecture") {
        return {
          ...part,
          kind: "check" as const,
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
          kind: "check" as const,
          label: part.label === "1 hour" || part.label === "" ? "各地講法" : part.label,
          targetMinutes: null,
          optional: false,
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
  for (const log of Object.values(days)) {
    if ((log.minutes["fa-hour"] ?? 0) <= 0 || log.checks["fa-hour"]) continue
    log.checks = { ...log.checks, "fa-hour": true }
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
