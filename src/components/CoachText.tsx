import type { ReactNode } from 'react'

/** Renders **bold** inline spans without dangerouslySetInnerHTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**') ? (
      <strong key={i} className="font-bold text-jet">
        {chunk.slice(2, -2)}
      </strong>
    ) : (
      chunk
    ),
  )
}

/** Lightweight markdown for coach replies: headings, bullets, numbered lists, bold. */
export function CoachText({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let list: { ordered: boolean; items: string[] } | null = null

  const flush = () => {
    if (!list) return
    const Tag = list.ordered ? 'ol' : 'ul'
    blocks.push(
      <Tag
        key={blocks.length}
        className={`${list.ordered ? 'list-decimal' : 'list-disc'} pl-5 space-y-0.5 marker:text-jeepney marker:font-bold`}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    )
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const bullet = line.match(/^[-*•]\s+(.*)/)
    const numbered = line.match(/^\d+[.)]\s+(.*)/)
    const heading = line.match(/^#{1,4}\s+(.*)/)

    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (list && list.ordered !== ordered) flush()
      list ??= { ordered, items: [] }
      list.items.push((bullet ?? numbered)![1])
      continue
    }
    flush()
    if (!line) continue
    if (heading) {
      blocks.push(
        <p key={blocks.length} className="font-display uppercase text-sm tracking-tight text-jeepney">
          {heading[1].replace(/\*\*/g, '')}
        </p>,
      )
    } else {
      blocks.push(<p key={blocks.length}>{inline(line)}</p>)
    }
  }
  flush()

  return <div className="space-y-2">{blocks}</div>
}
