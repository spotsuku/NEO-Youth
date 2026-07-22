-- Rollback for 024_manager_name_soft_delete.sql
-- 実行前に必ずバックアップを取ること。

alter table youth_partnerships
  drop column if exists manager_name,
  drop column if exists deleted_at;

alter table youth_candidates
  drop column if exists deleted_at;
