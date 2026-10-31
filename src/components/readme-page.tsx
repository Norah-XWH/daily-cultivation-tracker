const QUESTIONS = [
  ["是不是也同樣站在別人的角度上考慮問題了？"],
  ["語氣平和嗎？", "是善的溝通方式嗎？"],
  ["講的道理在不在法上？", "或是用法來掩蓋自己的情緒？"],
]

export function ReadmePage() {
  return (
    <article
      className="flex min-h-full flex-col justify-center bg-[#F5F2E8] px-6 py-16 text-[#0D0D0D]"
      aria-label="ReadMe"
    >
      <ul className="mx-auto flex w-full max-w-[16.5rem] flex-col gap-14">
        {QUESTIONS.map((lines) => (
          <li key={lines[0]} className="flex items-stretch gap-4">
            <span className="w-[3px] shrink-0 bg-[#E3120B]" aria-hidden />
            <p className="text-[1.05rem] leading-8">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </article>
  )
}
