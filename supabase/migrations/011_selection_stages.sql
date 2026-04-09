-- Migration 011: 選考ステータス拡張 + 不合格記録カラム
-- 書類選考・グループ面接・最終面接・保留を追加
-- どこで落ちたか（rejected_at）と理由（rejected_reason）を記録

alter table youth_candidates add column if not exists rejected_at text;
  -- 不合格になったステージ: 書類選考 / グループ面接 / 最終面接 etc.
alter table youth_candidates add column if not exists rejected_reason text;
  -- 不合格理由・メモ
