import type { Metadata } from 'next'
import './dashboard.css'

export const metadata: Metadata = {
  title: 'NEO ACADEMIA 2期生 選考ダッシュボード',
  description: 'NEO ACADEMIA 第2期生 選考パイプライン管理',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
