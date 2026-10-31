export const COLORS = [
  {
    id: "moss",
    label: "綠",
    ink: "#0d8f3f",
    wash: "rgba(24, 186, 78, 0.48)",
    strong: "rgba(24, 186, 78, 0.7)",
    line: "rgba(16, 160, 64, 0.62)",
  },
  {
    id: "iris",
    label: "紫",
    ink: "#6a35d4",
    wash: "rgba(124, 64, 226, 0.42)",
    strong: "rgba(124, 64, 226, 0.64)",
    line: "rgba(106, 53, 212, 0.58)",
  },
  {
    id: "amber",
    label: "金",
    ink: "#c47c00",
    wash: "rgba(236, 168, 20, 0.5)",
    strong: "rgba(236, 168, 20, 0.72)",
    line: "rgba(210, 140, 10, 0.64)",
  },
  {
    id: "sea",
    label: "藍",
    ink: "#0c6ec4",
    wash: "rgba(22, 132, 224, 0.44)",
    strong: "rgba(22, 132, 224, 0.66)",
    line: "rgba(12, 110, 196, 0.58)",
  },
  {
    id: "rose",
    label: "粉",
    ink: "#d4266a",
    wash: "rgba(226, 52, 118, 0.42)",
    strong: "rgba(226, 52, 118, 0.64)",
    line: "rgba(212, 38, 106, 0.58)",
  },
  {
    id: "stone",
    label: "靛",
    ink: "#3d4fa8",
    wash: "rgba(78, 96, 196, 0.4)",
    strong: "rgba(78, 96, 196, 0.6)",
    line: "rgba(61, 79, 168, 0.55)",
  },
  {
    id: "teal",
    label: "青",
    ink: "#0c8f84",
    wash: "rgba(32, 196, 178, 0.5)",
    strong: "rgba(32, 196, 178, 0.72)",
    line: "rgba(14, 160, 146, 0.62)",
  },
  {
    id: "clay",
    label: "珊瑚",
    ink: "#d4532a",
    wash: "rgba(232, 96, 48, 0.46)",
    strong: "rgba(232, 96, 48, 0.68)",
    line: "rgba(212, 83, 42, 0.6)",
  },
] as const

export type Color = (typeof COLORS)[number]
export type ColorId = Color["id"]

const FALLBACK_COLOR = COLORS.find((color) => color.id === "stone") ?? COLORS[0]

export function isColorId(value: string): value is ColorId {
  return COLORS.some((color) => color.id === value)
}

export function getColor(id: string): Color {
  return COLORS.find((color) => color.id === id) ?? FALLBACK_COLOR
}

export type Part = {
  id: string
  label: string
  kind: "check" | "minutes"
  targetMinutes: number | null
  start: string | null
  end: string | null
  optional: boolean
  choices: number[] | null
  caption: string | null
}

export type Routine = {
  id: string
  name: string
  detail: string
  color: ColorId
  required: boolean
  completion: "all" | "any"
  mode: "tasks" | "rating"
  order: number
  parts: Part[]
}

export type Todo = {
  id: string
  title: string
  done: boolean
  createdAt: string
  completedAt: string | null
}

export type CheckItem = {
  id: string
  title: string
  done: boolean
}

export type DayLog = {
  checks: Record<string, boolean>
  minutes: Record<string, number>
  notes: Record<string, string>
  ratings: Record<string, Array<number | null>>
  ratingNotes: Record<string, string[]>
  checklist?: CheckItem[]
}

export type ProjectLink = {
  id: string
  title: string
  url: string
}

export type ProjectFile = {
  id: string
  name: string
  type: string
  size: number
  addedAt: string
}

export type ProjectStep = {
  id: string
  title: string
  done: boolean
  substeps: ProjectStep[]
}

export type Project = {
  note: string
  links: ProjectLink[]
  files: ProjectFile[]
  steps: ProjectStep[]
  hours: Record<string, number>
  bankMinutes: number
}

export type Store = {
  version: 2
  routines: Routine[]
  todos: Todo[]
  days: Record<string, DayLog>
  periodStart: string | null
  project: Project
  journal: Record<string, string>
}
