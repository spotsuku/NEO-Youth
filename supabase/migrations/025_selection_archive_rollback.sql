-- Rollback for 025_selection_archive.sql
-- 実行前に必ずバックアップを取ること。

alter table youth_candidates
  drop column if exists selection_archived_at;
