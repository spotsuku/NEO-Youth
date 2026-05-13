-- NEO ACADEMIA 2期生 ユースダッシュボード
-- Migration 006: 応募書類データを candidates → youth_candidates へ同期
--
-- 1. youth_candidates に応募書類カラム（pr, contribution, career）を追加
-- 2. candidates テーブルから応募書類データを一括コピー

-- ── カラム追加 ────────────────────────────────
alter table youth_candidates add column if not exists pr text;
alter table youth_candidates add column if not exists contribution text;
alter table youth_candidates add column if not exists career text;

-- ── candidates テーブルから応募書類データを同期 ──────────────
-- motivation が NULL の候補者のみ上書き（004で投入済みデータを保持）
update youth_candidates yc
set
  motivation  = coalesce(yc.motivation, c.motivation),
  pr          = coalesce(yc.pr, c.pr),
  contribution = coalesce(yc.contribution, c.contribution),
  career      = coalesce(yc.career, c.career)
from candidates c
where yc.name = c.name;
