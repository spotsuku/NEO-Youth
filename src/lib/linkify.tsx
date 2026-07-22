// 備考欄などのテキスト内URLをクリック可能なリンクとして表示する
// （フル機能のリッチテキストエディタは導入せず、表示時にURLだけ検出する）

const URL_RE = /(https?:\/\/[^\s]+)/g

export function Linkify({ text }: { text: string | null | undefined }) {
  if (!text) return null
  // split with a single capturing group puts matched URLs at odd indices
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
