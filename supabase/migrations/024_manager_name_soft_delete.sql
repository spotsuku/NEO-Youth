-- Migration 024: パートナー責任者名・論理削除
--
-- 023は既に本番適用済みのため、追加分はこの新規マイグレーションで行う。
--
-- 内容:
--   1. youth_partnerships.manager_name（先方の責任者名）
--   2. youth_candidates / youth_partnerships に deleted_at を追加し、
--      物理削除だった DELETE を論理削除へ切り替える（誤操作からの復旧用）。

alter table youth_partnerships
  add column if not exists manager_name text;

alter table youth_candidates
  add column if not exists deleted_at timestamptz;

alter table youth_partnerships
  add column if not exists deleted_at timestamptz;

create index if not exists idx_youth_candidates_deleted_at   on youth_candidates(deleted_at);
create index if not exists idx_youth_partnerships_deleted_at on youth_partnerships(deleted_at);
