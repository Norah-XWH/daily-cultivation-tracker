import assert from "node:assert/strict"
import { test } from "node:test"
import { addDays } from "./dates"
import { buildHistory } from "./history"
import { createDefaultStore, setRating, toggleCheck } from "./store"

test("history skips empty past days and still counts an empty today", () => {
  const today = "2026-10-14"
  let store = toggleCheck(createDefaultStore(), "2026-10-12", "exercise-1-done")
  store = setRating(store, "2026-10-12", "cultivate", 0, 80)
  const report = buildHistory(store.routines, store.days, today, "30")

  assert.equal(report.points.length, 30)
  assert.equal(report.points.find((point) => point.date === "2026-10-11")?.score, null)
  assert.equal(report.points.find((point) => point.date === "2026-10-12")?.score, 1 / 8 + 0.8 / 8)
  assert.equal(report.points.find((point) => point.date === today)?.score, 0)
  assert.equal(report.logged, 1)
  assert.equal(report.todayCountsEmpty, true)
  assert.equal(report.completeDays, 0)
  assert.equal(report.previous, null)
  assert.equal(report.recent, (1 / 8 + 0.8 / 8) / 2)

  const cultivate = report.routines.find((routine) => routine.id === "cultivate")
  assert.equal(cultivate?.samples, 1)
  assert.equal(cultivate?.average, 0.8)
  const exercise = report.routines.find((routine) => routine.id === "exercise-1")
  assert.equal(exercise?.samples, 2)
  assert.equal(exercise?.average, 0.5)
})

test("all span starts at the first record and keeps the latest year", () => {
  const today = "2026-10-14"
  const started = toggleCheck(createDefaultStore(), "2026-09-20", "exercise-1-done")
  const report = buildHistory(started.routines, started.days, today, "all")
  assert.equal(report.points[0]?.date, "2026-09-20")
  assert.equal(report.points.at(-1)?.date, today)
  assert.deepEqual(
    report.months.filter((month) => month.average != null).map((month) => month.label),
    ["9月", "10月"],
  )

  const long = toggleCheck(createDefaultStore(), "2020-01-01", "exercise-1-done")
  const capped = buildHistory(long.routines, long.days, today, "all")
  assert.equal(capped.points.length, 366)
  assert.equal(capped.points[0]?.date, addDays(today, -365))
  assert.equal(capped.points.at(-1)?.date, today)
})

test("the latest week is compared with the week before it", () => {
  const today = "2026-10-14"
  const routines = createDefaultStore().routines.map((routine) => ({
    ...routine,
    required: routine.id === "exercise-1",
  }))
  let store = createDefaultStore()
  store = { ...store, routines }
  for (const date of ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]) {
    store = toggleCheck(store, date, "exercise-1-done")
  }
  for (const date of ["2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13"]) {
    store = toggleCheck(store, date, "exercise-1-done")
  }
  const report = buildHistory(store.routines, store.days, today, "30")
  assert.equal(report.previous, 1)
  assert.equal(report.recent, 6 / 7)
})
