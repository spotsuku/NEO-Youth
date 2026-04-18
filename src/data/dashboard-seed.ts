// このファイルは参照用です。
// 本番データは youth_candidates / youth_sessions テーブルに格納されています。
// Supabase SQL Editor で 004_seed_youth.sql を実行してください。
//
// ステータス・ヨミの集計色定義（OverviewTab で使用）

import type { Partnership } from '@/types/dashboard'

export const STATUS_COLORS: Record<string, string> = {
  '応募完了': 'var(--grn)',
  '説明会・イベント参加済': 'var(--blu)',
  'アプローチ中': 'var(--gold)',
  '3期生候補': '#7b2d8e',
  '対応不要': 'var(--bd2)',
  '未接触': 'var(--bd)',
  '参加確定': 'var(--grn)',
  '特別選考付与': 'var(--gold)',
}

export const YOMI_COLORS: Record<string, string> = {
  SS: 'var(--grn)',
  S: 'var(--blu)',
  AA: 'var(--gold)',
  A: 'var(--mu)',
}

// 団体連携（大学・団体との提携管理）初期データ
// 編集内容はブラウザの localStorage に保存されます。
export const PARTNERSHIPS: Partnership[] = [
  {
    id: 'p-1',
    university: '九州大学',
    partnerContacts: [
      { name: '田中 一郎', role: '共創学部 准教授' },
      { name: '佐藤 花子', role: 'キャリア支援センター' },
    ],
    internalHandler: '三木浩汰',
    contact: {
      email: 'tanaka@kyushu-u.ac.jp',
      phone: '092-000-0000',
      line: 'kyudai_tanaka',
      messenger: '',
    },
    partnershipDetails: '授業連携・インターン紹介・共同イベント開催',
    logs: [
      { date: '2026-02-14', content: '共創学部1年生向け授業で三木が講演実施（テーマ：起業家精神）' },
      { date: '2026-03-10', content: 'キャリア支援センターでNEO ACADEMIA説明会を実施' },
    ],
  },
  {
    id: 'p-2',
    university: '九州産業大学',
    partnerContacts: [
      { name: '山田 太郎', role: '芸術学部 教授' },
    ],
    internalHandler: '橡木彩乃',
    contact: {
      email: 'yamada@kyusan-u.ac.jp',
      phone: '092-111-1111',
      line: '',
      messenger: 'yamada.taro',
    },
    partnershipDetails: 'アート・デザイン領域での連携、ポートフォリオ講座',
    logs: [
      { date: '2026-03-07', content: '芸術学部学生向け説明会を開催' },
    ],
  },
  {
    id: 'p-3',
    university: '立命館アジア太平洋大学',
    partnerContacts: [
      { name: '鈴木 美咲', role: 'サステナビリティ観光学部 講師' },
    ],
    internalHandler: '三木浩汰',
    contact: {
      email: 'suzuki@apu.ac.jp',
      phone: '',
      line: '',
      messenger: '',
    },
    partnershipDetails: '地方創生領域での共同プロジェクト検討',
    logs: [],
  },
]
