// このファイルは参照用です。
// 本番データは youth_candidates / youth_sessions / youth_partnerships テーブルに格納されています。
// Supabase SQL Editor で 004_seed_youth.sql / 016_youth_partnerships.sql を実行してください。
//
// ステータス・ヨミの集計色定義（OverviewTab で使用）

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
