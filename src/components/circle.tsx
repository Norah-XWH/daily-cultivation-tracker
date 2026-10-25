export function Circle({ on, ink }: { on: boolean; ink: string }) {
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full border"
      style={{
        borderColor: ink,
        background: on ? ink : "rgba(255,255,255,0.62)",
        color: "#f7f4ee",
      }}
    >
      {on ? (
        <svg viewBox="0 0 16 16" className="size-4">
          <path
            d="M3.2 8.4 6.4 11.5 12.8 4.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  )
}
