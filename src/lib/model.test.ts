import assert from "node:assert/strict"
import { test } from "node:test"
import { addDays, formatClockRange, formatLong } from "./dates"
import {
  completionStreak,
  dayScore,
  findTimeCue,
  isCompleteDay,
  routineDone,
  routineScore,
} from "./score"
import {
  createDefaultStore,
  emptyLog,
  moveRoutine,
  normalizeStore,
  addRatingGroup,
  setRating,
  setMinutes,
  finishProjectTimer,
  startNewPeriod,
  toggleCheck,
  validateRoutine,
} from "./store"
import type { Routine } from "./types"

test("calendar helpers stay on local dates", () => {
  assert.equal(addDays("2026-10-01", -1), "2026-09-30")
  assert.equal(addDays("2026-12-31", 1), "2027-01-01")
  assert.equal(formatLong("2026-10-13"), "10月13日 週二")
})

test("clock ranges use the times you set", () => {
  assert.equal(formatClockRange("08:55", "09:10"), "8:55–9:10am")
  assert.equal(formatClockRange("20:55", "21:10"), "8:55–9:10pm")
  assert.equal(formatClockRange("02:55", "03:10"), "2:55–3:10am")
  assert.equal(formatClockRange("14:55", "15:10"), "2:55–3:10pm")
  assert.equal(formatClockRange("11:00", "13:00"), "11:00am–1:00pm")
})

test("default routines match the daily list", () => {
  const store = createDefaultStore()
  assert.deepEqual(
    store.routines.map((routine) => routine.name),
    [
      "Exercise 1",
      "Exercise 2",
      "Exercise 3",
      "Exercise 4",
      "Exercise 5: meditation",
      "FZN",
      "Read FA",
    ],
  )
  const fzn = store.routines.find((routine) => routine.name === "FZN")
  assert.ok(fzn)
  assert.deepEqual(
    fzn.parts.map((part) => [part.start, part.end]),
    [
      ["02:55", "03:10"],
      ["08:55", "09:10"],
      ["14:55", "15:10"],
      ["20:55", "21:10"],
    ],
  )
  const reading = store.routines.find((routine) => routine.name === "Read FA")
  assert.equal(reading?.completion, "any")
  assert.equal(reading?.parts.find((part) => part.id === "fa-lecture")?.label, "轉法輪")
  assert.equal(reading?.parts.find((part) => part.id === "fa-lecture")?.kind, "check")
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.label, "各地講法")
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.kind, "check")
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.optional, false)
  const second = store.routines.find((routine) => routine.id === "exercise-2")
  assert.deepEqual(second?.parts[0]?.choices, [30, 60])
  assert.equal(store.routines.some((routine) => routine.id === "cultivate"), false)
  assert.equal(store.routines.some((routine) => routine.id === "hobby"), false)
})

test("built-in explanations are not kept on items", () => {
  const store = createDefaultStore()
  const withNote = {
    ...store,
    routines: store.routines.map((routine) =>
      routine.id === "read-fa"
        ? { ...routine, detail: "至少 45 分钟。做什么可以记在下面，之后再补。" }
        : routine.id === "fzn"
          ? { ...routine, detail: "凌晨记得做" }
          : routine,
    ),
  }
  const next = normalizeStore(withNote)
  assert.equal(next?.routines.find((routine) => routine.id === "read-fa")?.detail, "")
  assert.equal(next?.routines.find((routine) => routine.id === "fzn")?.detail, "凌晨记得做")
})

test("scores partial work and either-or routines", () => {
  const store = createDefaultStore()
  const log = emptyLog()
  const fzn = store.routines.find((routine) => routine.id === "fzn")
  assert.ok(fzn)
  log.checks["fzn-1"] = true
  log.checks["fzn-2"] = true
  assert.equal(routineScore(fzn, log), 0.5)
  assert.equal(routineDone(fzn, log), false)
  assert.equal(dayScore(store.routines, log), 0.5 / 7)

  const reading = store.routines.find((routine) => routine.id === "read-fa")
  assert.ok(reading)
  const lectureLog = emptyLog()
  lectureLog.checks["fa-lecture"] = true
  assert.equal(routineDone(reading, lectureLog), true)
  assert.equal(routineScore(reading, lectureLog), 1)
  const localOnly = emptyLog()
  localOnly.checks["fa-hour"] = true
  assert.equal(routineDone(reading, localOnly), true)
  assert.equal(routineScore(reading, localOnly), 1)
  const both = emptyLog()
  both.checks["fa-lecture"] = true
  both.checks["fa-hour"] = true
  assert.equal(routineScore(reading, both), 1)
  assert.equal(routineDone(reading, both), true)
  assert.equal(routineDone(reading, emptyLog()), false)

  const second = store.routines.find((routine) => routine.id === "exercise-2")
  assert.ok(second)
  const thirty = emptyLog()
  thirty.minutes["exercise-2-time"] = 30
  assert.equal(routineScore(second, thirty), 1)
  assert.equal(routineDone(second, thirty), true)
  const sixty = emptyLog()
  sixty.minutes["exercise-2-time"] = 60
  assert.equal(routineScore(second, sixty), 1)
  assert.equal(routineDone(second, sixty), true)
  assert.equal(routineDone(second, emptyLog()), false)
})

test("several ratings average into a degree, not a finished check", () => {
  const store = createDefaultStore()
  const question = {
    id: "cultivate",
    name: "old question",
    detail: "",
    color: "teal" as const,
    required: false,
    completion: "all" as const,
    mode: "rating" as const,
    order: 0,
    parts: [],
  }
  const empty = emptyLog()
  assert.equal(routineScore(question, empty), 0)
  assert.equal(routineDone(question, empty), false)

  const mixed = emptyLog()
  mixed.ratings.cultivate = [100, null, 20]
  assert.equal(routineScore(question, mixed), 0.6)
  assert.equal(routineDone(question, mixed), false)

  const saved = setRating(store, "2026-10-14", "cultivate", 1, 52)
  assert.deepEqual(saved.days["2026-10-14"]?.ratings.cultivate, [null, 50])
  const added = addRatingGroup(store, "2026-10-14", "cultivate")
  assert.equal(added.days["2026-10-14"]?.ratings.cultivate.length, 4)
})

test("optional routines stay out of the day score", () => {
  const store = createDefaultStore()
  const routines = store.routines.map((routine) =>
    routine.id === "cultivate" ? { ...routine, required: false } : routine,
  )
  const log = emptyLog()
  log.ratings.cultivate = [80]
  assert.equal(dayScore(routines, log), 0)
  log.checks["exercise-1-done"] = true
  assert.equal(dayScore(routines, log), 1 / 7)
})

test("streak counts finished days and stops at a gap", () => {
  const today = "2026-10-13"
  const complete = new Set(["2026-10-11", "2026-10-12"])
  assert.equal(
    completionStreak((date) => complete.has(date), today, false),
    2,
  )
  assert.equal(
    completionStreak((date) => complete.has(date) || date === today, today, true),
    3,
  )
  assert.equal(
    completionStreak((date) => date === today, today, true),
    1,
  )
  const withGap = new Set(["2026-10-10", "2026-10-12", "2026-10-13"])
  assert.equal(
    completionStreak((date) => withGap.has(date), today, true),
    2,
  )
})

test("a fully checked day is complete", () => {
  let store = createDefaultStore()
  const date = "2026-10-13"
  for (const routine of store.routines) {
    for (const part of routine.parts) {
      if (part.optional) continue
      if (part.kind === "check") store = toggleCheck(store, date, part.id)
      else if (part.choices && part.choices[0] != null) store = setMinutes(store, date, part.id, part.choices[0])
    }
  }
  store = setRating(store, date, "cultivate", 0, 40)
  const log = store.days[date] ?? emptyLog()
  assert.equal(isCompleteDay(store.routines, log), true)
  assert.equal(dayScore(store.routines, log), 1)
})

test("time cue follows the clock", () => {
  const { routines } = createDefaultStore()
  const log = emptyLog()
  assert.equal(findTimeCue(routines, log, 9 * 60)?.phase, "now")
  assert.equal(findTimeCue(routines, log, 9 * 60)?.partId, "fzn-2")
  assert.equal(findTimeCue(routines, log, 10 * 60)?.partId, "fzn-3")
  assert.equal(findTimeCue(routines, log, 1 * 60)?.partId, "fzn-1")
  assert.equal(findTimeCue(routines, log, 21 * 60 + 30), null)
  const doneMorning = emptyLog()
  doneMorning.checks["fzn-2"] = true
  assert.equal(findTimeCue(routines, doneMorning, 9 * 60)?.partId, "fzn-3")
})

test("move routine rewrites order", () => {
  const store = createDefaultStore()
  const moved = moveRoutine(store.routines, "exercise-1", 1)
  assert.equal(moved[0]?.id, "exercise-2")
  assert.equal(moved[1]?.id, "exercise-1")
  assert.deepEqual(
    moved.map((routine) => routine.order),
    moved.map((_, index) => index),
  )
})

test("validate routine catches empty names and bad windows", () => {
  const routine = createDefaultStore().routines[0]
  assert.ok(routine)
  assert.equal(validateRoutine({ ...routine, name: "  " }), "先寫一個名稱。")
  const part = routine.parts[0]
  assert.ok(part)
  const broken: Routine = {
    ...routine,
    parts: [{ ...part, start: "10:00", end: "09:00" }],
  }
  assert.equal(validateRoutine(broken), "結束時間要晚於開始時間。")
})

test("an older list drops Hobby and keeps a removed question removed", () => {
  const older = {
    version: 1,
    routines: [
      {
        id: "hobby",
        name: "Hobby",
        detail: "",
        color: "rose",
        required: true,
        completion: "all",
        order: 0,
        parts: [
          {
            id: "hobby-minutes",
            label: "时长",
            kind: "minutes",
            targetMinutes: 45,
            start: null,
            end: null,
          },
        ],
      },
    ],
    todos: [],
    days: {},
  }
  const next = normalizeStore(older)
  assert.equal(next?.version, 2)
  assert.equal(next?.routines.some((routine) => routine.id === "hobby"), false)
  assert.equal(next?.routines.some((routine) => routine.id === "cultivate"), false)
  assert.ok(next)

  const checked = normalizeStore({
    version: 2,
    routines: [
      {
        id: "cultivate",
        name: "Have you seized every opportunity to really cultivate?",
        detail: "",
        color: "rose",
        required: true,
        completion: "all",
        order: 0,
        parts: [
          {
            id: "cultivate-done",
            label: "Yes",
            kind: "check",
            targetMinutes: null,
            start: null,
            end: null,
          },
        ],
      },
    ],
    todos: [],
    days: {
      "2026-10-14": {
        checks: { "cultivate-done": true },
        minutes: {},
        notes: {},
      },
    },
  })
  assert.equal(checked?.routines.length, 0)
  assert.deepEqual(checked?.days["2026-10-14"]?.ratings.cultivate, [100])
  assert.equal(checked?.days["2026-10-14"]?.checks["cultivate-done"], undefined)

  const mixed = normalizeStore({
    version: 2,
    routines: createDefaultStore().routines,
    todos: [],
    days: {
      "2026-10-14": {
        checks: {},
        minutes: {},
        notes: {},
        marks: { cultivate: ["tick", "cross"] },
      },
    },
  })
  assert.deepEqual(mixed?.days["2026-10-14"]?.ratings.cultivate, [50])
})

test("normalize keeps a backup and rejects an unknown version", () => {
  const store = createDefaultStore()
  const restored = normalizeStore(JSON.parse(JSON.stringify(store)))
  assert.equal(restored?.routines.length, 7)
  assert.equal(normalizeStore({ version: 3, routines: [] }), null)
  assert.equal(normalizeStore({ hello: true }), null)
})

test("older Exercise 2 and Read FA keep their finished days", () => {
  const older = createDefaultStore()
  older.routines = older.routines.map((routine) => {
    if (routine.id === "exercise-2") {
      return {
        ...routine,
        parts: [
          {
            id: "exercise-2-done",
            label: "完成",
            kind: "check" as const,
            targetMinutes: null,
            start: null,
            end: null,
            optional: false,
            choices: null,
            caption: null,
          },
        ],
      }
    }
    if (routine.id === "read-fa") {
      return {
        ...routine,
        completion: "any" as const,
        parts: [
          {
            id: "fa-lecture",
            label: "1 lecture",
            kind: "check" as const,
            targetMinutes: null,
            start: null,
            end: null,
            optional: false,
            choices: null,
            caption: null,
          },
          {
            id: "fa-hour",
            label: "1 hour",
            kind: "minutes" as const,
            targetMinutes: 60,
            start: null,
            end: null,
            optional: false,
            choices: null,
            caption: null,
          },
        ],
      }
    }
    return routine
  })
  older.days["2026-10-12"] = {
    checks: { "exercise-2-done": true, "fa-lecture": true },
    minutes: { "fa-hour": 40 },
    notes: {},
    ratings: {},
    ratingNotes: {},
  }
  const next = normalizeStore(older)
  const second = next?.routines.find((routine) => routine.id === "exercise-2")
  const reading = next?.routines.find((routine) => routine.id === "read-fa")
  assert.deepEqual(second?.parts[0]?.choices, [30, 60])
  assert.equal(next?.days["2026-10-12"]?.minutes["exercise-2-time"], 30)
  assert.equal(next?.days["2026-10-12"]?.checks["exercise-2-done"], undefined)
  assert.equal(reading?.completion, "any")
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.kind, "check")
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.optional, false)
  assert.equal(reading?.parts.find((part) => part.id === "fa-hour")?.label, "各地講法")
  const log = next?.days["2026-10-12"] ?? emptyLog()
  assert.equal(log.checks["fa-hour"], true)
  assert.equal(routineDone(reading!, log), true)
  assert.equal(routineDone(second!, log), true)
})

test("a new period keeps old days and restarts the streak", () => {
  const store = toggleCheck(createDefaultStore(), "2026-10-12", "exercise-1-done")
  const next = startNewPeriod(store, "2026-10-14")
  assert.equal(next.periodStart, "2026-10-14")
  assert.equal(next.days["2026-10-12"]?.checks["exercise-1-done"], true)
  assert.equal(
    completionStreak((date) => date <= "2026-10-13", "2026-10-14", false, "2026-10-14"),
    0,
  )
  assert.equal(
    completionStreak((date) => date >= "2026-10-10", "2026-10-14", true, "2026-10-14"),
    1,
  )
  const restored = normalizeStore(next)
  assert.equal(restored?.periodStart, "2026-10-14")
  assert.equal(restored?.days["2026-10-12"]?.checks["exercise-1-done"], true)
  assert.equal(normalizeStore(createDefaultStore())?.periodStart, null)
})

test("a finished timer adds its hours toward 500", () => {
  const store = createDefaultStore()
  assert.equal(store.project.bankMinutes, 0)
  const twoHours = finishProjectTimer(store, "2026-10-30", 120)
  assert.equal(twoHours.project.bankMinutes, 120)
  assert.equal(Math.floor(twoHours.project.bankMinutes / 60), 2)
  assert.equal(twoHours.project.hours["2026-10-30"], 120)
  const again = finishProjectTimer(twoHours, "2026-10-31", 60)
  assert.equal(again.project.bankMinutes, 180)
  assert.equal(again.project.hours["2026-10-30"], 120)
  assert.equal(again.project.hours["2026-10-31"], 60)
  const kept = normalizeStore(JSON.parse(JSON.stringify({ ...again, project: { note: again.project.note, links: [], files: [], steps: [], hours: again.project.hours } })))
  assert.equal(kept?.project.bankMinutes, 0)
  assert.equal(kept?.project.hours["2026-10-31"], 60)
})

test("normalize drops a routine whose parts are empty", () => {
  const restored = normalizeStore({
    version: 2,
    routines: [{ id: "x", name: "Empty", parts: [] }],
    todos: [],
    days: {},
  })
  assert.deepEqual(restored?.routines, [])
})
