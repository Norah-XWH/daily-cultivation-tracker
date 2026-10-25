"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatClockRange } from "@/lib/dates"
import { sanitizeRoutine, uid, validateRoutine } from "@/lib/store"
import { COLORS, getColor } from "@/lib/types"
import type { Part, Routine } from "@/lib/types"

type RoutineEditorProps = {
  draft: Routine | null
  isNew: boolean
  onChange: (routine: Routine) => void
  onClose: () => void
  onSave: (routine: Routine) => void
  onDelete: () => void
}

const fieldClass = "h-11 bg-white/70 text-base md:text-base"

export function RoutineEditor({
  draft,
  isNew,
  onChange,
  onClose,
  onSave,
  onDelete,
}: RoutineEditorProps) {
  const [error, setError] = useState<string | null>(null)

  function change(next: Routine) {
    setError(null)
    onChange(next)
  }

  function patch(partial: Partial<Routine>) {
    if (!draft) return
    change({ ...draft, ...partial })
  }

  function patchPart(id: string, partial: Partial<Part>) {
    if (!draft) return
    change({
      ...draft,
      parts: draft.parts.map((part) => (part.id === id ? { ...part, ...partial } : part)),
    })
  }

  function movePart(id: string, direction: -1 | 1) {
    if (!draft) return
    const index = draft.parts.findIndex((part) => part.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= draft.parts.length) return
    const next = [...draft.parts]
    const current = next[index]
    const neighbor = next[target]
    if (!current || !neighbor) return
    next[index] = neighbor
    next[target] = current
    change({ ...draft, parts: next })
  }

  function addPart(kind: Part["kind"]) {
    if (!draft) return
    const part: Part = {
      id: uid(),
      label: kind === "minutes" ? "計時" : "打卡",
      optional: false,
      choices: null,
      caption: null,
      kind,
      targetMinutes: kind === "minutes" ? 45 : null,
      start: null,
      end: null,
    }
    change({ ...draft, parts: [...draft.parts, part] })
  }

  function save() {
    if (!draft) return
    const message = validateRoutine(draft)
    if (message) {
      setError(message)
      return
    }
    onSave(sanitizeRoutine(draft))
  }

  return (
    <Sheet open={draft != null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent side="bottom" className="gap-0 rounded-t-3xl p-0">
        {draft ? (
          <div className="mx-auto flex h-[min(92dvh,760px)] w-full max-w-md flex-col">
            <SheetHeader className="pr-12">
              <SheetTitle>{isNew ? "加一項" : "調整這項"}</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="routine-name">名稱</Label>
                <Input
                  id="routine-name"
                  value={draft.name}
                  placeholder="例如：散步"
                  onValueChange={(value) => patch({ name: value })}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="routine-detail">補充說明</Label>
                <Textarea
                  id="routine-detail"
                  value={draft.detail}
                  placeholder="可選"
                  onChange={(event) => patch({ detail: event.target.value })}
                  className="min-h-16 bg-white/70 text-base md:text-base"
                />
              </div>
              <div>
                <p className="text-sm font-medium">
                  顏色 <span className="font-normal text-ink-soft">{getColor(draft.color).label}</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      aria-label={color.label}
                      aria-pressed={draft.color === color.id}
                      className="grid size-11 place-items-center rounded-full"
                      style={{
                        background: color.wash,
                        boxShadow:
                          draft.color === color.id
                            ? `inset 0 0 0 2px ${color.ink}`
                            : `inset 0 0 0 1px ${color.line}`,
                      }}
                      onClick={() => patch({ color: color.id })}
                    >
                      <span className="size-4 rounded-full" style={{ background: color.ink, opacity: 0.8 }} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3">
                <span className="text-sm font-medium">算進今天的完成度</span>
                <Switch
                  checked={draft.required}
                  onCheckedChange={(checked) => patch({ required: checked })}
                />
              </label>
              {draft.mode === "rating" ? null : (
              <>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">條目</p>
                {draft.parts.map((part, index) => (
                  <PartFields
                    key={part.id}
                    part={part}
                    canMoveUp={index > 0}
                    canMoveDown={index < draft.parts.length - 1}
                    canDelete={draft.parts.length > 1}
                    onPatch={(partial) => patchPart(part.id, partial)}
                    onMove={(direction) => movePart(part.id, direction)}
                    onDelete={() =>
                      change({ ...draft, parts: draft.parts.filter((item) => item.id !== part.id) })
                    }
                  />
                ))}
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" className="h-11" onClick={() => addPart("check")}>
                    加一條打卡
                  </Button>
                  <Button type="button" variant="outline" className="h-11" onClick={() => addPart("minutes")}>
                    加一條計時
                  </Button>
                </div>
              </div>
              {draft.parts.length > 1 ? (
                <div>
                  <p className="text-sm font-medium">怎樣算完成</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={draft.completion === "all" ? "default" : "outline"}
                      className="h-11"
                      onClick={() => patch({ completion: "all" })}
                    >
                      全部都要
                    </Button>
                    <Button
                      type="button"
                      variant={draft.completion === "any" ? "default" : "outline"}
                      className="h-11"
                      onClick={() => patch({ completion: "any" })}
                    >
                      任意一項
                    </Button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">
                    {draft.completion === "all"
                      ? "每一條都做完，這一項才算完成。FZN 的四個時段就是這樣。"
                      : "做完其中一條就算完成。"}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-ink-soft">只有一條時，做完它就算完成。</p>
              )}
              </>
              )}
            </div>
            <SheetFooter>
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <Button type="button" className="h-11" onClick={save}>
                保存
              </Button>
              {isNew ? null : (
                <Button type="button" variant="destructive" className="h-11" onClick={onDelete}>
                  刪除這項
                </Button>
              )}
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PartFields({
  part,
  canMoveUp,
  canMoveDown,
  canDelete,
  onPatch,
  onMove,
  onDelete,
}: {
  part: Part
  canMoveUp: boolean
  canMoveDown: boolean
  canDelete: boolean
  onPatch: (partial: Partial<Part>) => void
  onMove: (direction: -1 | 1) => void
  onDelete: () => void
}) {
  const preview =
    part.start && part.end && part.end > part.start ? formatClockRange(part.start, part.end) : ""
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/55 p-3 ring-1 ring-black/5">
      <div className="flex flex-col gap-2">
        <Label htmlFor={`part-${part.id}`}>條目名稱</Label>
        <Input
          id={`part-${part.id}`}
          value={part.label}
          onValueChange={(value) => onPatch({ label: value })}
          className={fieldClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={part.kind === "check" ? "default" : "outline"}
          className="h-10"
          onClick={() => onPatch({ kind: "check", targetMinutes: null, choices: null })}
        >
          打卡
        </Button>
        <Button
          type="button"
          variant={part.kind === "minutes" ? "default" : "outline"}
          className="h-10"
          onClick={() => onPatch({ kind: "minutes", targetMinutes: part.targetMinutes ?? 45, choices: null })}
        >
          計時
        </Button>
      </div>
      {part.kind === "minutes" && !(part.choices && part.choices.length > 0) ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`target-${part.id}`}>目標分鐘</Label>
          <Input
            id={`target-${part.id}`}
            inputMode="numeric"
            value={part.targetMinutes == null ? "" : String(part.targetMinutes)}
            onValueChange={(value) => {
              const digits = value.replace(/[^\d]/g, "").slice(0, 3)
              onPatch({ targetMinutes: digits === "" ? null : Number(digits) })
            }}
            className={fieldClass}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`start-${part.id}`}>開始</Label>
          <Input
            id={`start-${part.id}`}
            type="time"
            value={part.start ?? ""}
            onValueChange={(value) => onPatch({ start: value || null })}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`end-${part.id}`}>結束</Label>
          <Input
            id={`end-${part.id}`}
            type="time"
            value={part.end ?? ""}
            onValueChange={(value) => onPatch({ end: value || null })}
            className={fieldClass}
          />
        </div>
      </div>
      {preview ? <p className="text-sm text-ink-soft">頁面上顯示為 {preview}</p> : null}
      <div className="grid grid-cols-3 gap-2">
        <Button type="button" variant="outline" className="h-10" disabled={!canMoveUp} onClick={() => onMove(-1)}>
          上移
        </Button>
        <Button type="button" variant="outline" className="h-10" disabled={!canMoveDown} onClick={() => onMove(1)}>
          下移
        </Button>
        <Button type="button" variant="destructive" className="h-10" disabled={!canDelete} onClick={onDelete}>
          刪除
        </Button>
      </div>
    </div>
  )
}
