import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NEO ACADEMIA 2期生 最終面接シート',
  description: 'NEO ACADEMIA 第2期生 選考管理システム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
