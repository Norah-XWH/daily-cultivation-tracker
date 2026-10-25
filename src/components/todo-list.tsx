"use client"

import { useState, type FormEvent } from "react"
import { Circle } from "@/components/circle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sortTodos } from "@/lib/store"
import type { Todo } from "@/lib/types"

type TodoListProps = {
  todos: Todo[]
  onAdd: (title: string) => void
  onRename: (id: string, title: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export function TodoList({ todos, onAdd, onRename, onToggle, onDelete }: TodoListProps) {
  const [title, setTitle] = useState("")
  const [showDone, setShowDone] = useState(false)
  const ordered = sortTodos(todos)
  const open = ordered.filter((todo) => !todo.done)
  const done = ordered.filter((todo) => todo.done)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    onAdd(title)
    setTitle("")
  }

  return (
    <section className="mt-8" aria-label="可選待辦">
      <h2 className="text-sm font-medium">
        可選 <span className="font-normal text-ink-soft">To-do</span>
      </h2>
      <p className="mt-1 text-sm leading-6 text-ink-soft">這些不計入今天的完成度，做完就勾掉。</p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input
          value={title}
          aria-label="新的待辦"
          placeholder="一件可選的事，例如回一封信"
          onValueChange={setTitle}
          className="h-11 bg-white/55 text-base md:text-base"
        />
        <Button type="submit" className="h-11 shrink-0 px-4" disabled={!title.trim()}>
          添加
        </Button>
      </form>
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">現在沒有未完成的待辦。</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {open.map((todo) => (
            <TodoRow key={todo.id} todo={todo} onRename={onRename} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </ul>
      )}
      {done.length > 0 ? (
        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-2 text-ink-soft"
            aria-expanded={showDone}
            onClick={() => setShowDone((current) => !current)}
          >
            已完成 {done.length}
          </Button>
          {showDone ? (
            <ul className="mt-1 flex flex-col gap-2">
              {done.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  onRename={onRename}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function TodoRow({
  todo,
  onRename,
  onToggle,
  onDelete,
}: {
  todo: Todo
  onRename: (id: string, title: string) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <li className="flex items-center gap-1 rounded-2xl bg-white/45 px-1 ring-1 ring-black/5">
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center"
        aria-pressed={todo.done}
        aria-label={todo.done ? `標為未完成 ${todo.title}` : `完成 ${todo.title}`}
        onClick={() => onToggle(todo.id)}
      >
        <Circle on={todo.done} ink="#4e4942" />
      </button>
      <Input
        value={todo.title}
        aria-label={`待辦 ${todo.title}`}
        onValueChange={(value) => onRename(todo.id, value)}
        onBlur={() => {
          const trimmed = todo.title.trim()
          if (!trimmed) onDelete(todo.id)
          else if (trimmed !== todo.title) onRename(todo.id, trimmed)
        }}
        className="h-11 border-transparent bg-transparent text-base shadow-none md:text-base"
      />
      <Button
        type="button"
        variant="ghost"
        className="h-11 shrink-0 px-2 text-ink-soft"
        onClick={() => onDelete(todo.id)}
      >
        刪除
      </Button>
    </li>
  )
}
