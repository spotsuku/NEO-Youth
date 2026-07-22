-- Rollback for 023_approach_tracking.sql
-- 実行前に必ずバックアップを取ること。024が既に適用済みの場合は先に
-- 024_manager_name_soft_delete_rollback.sql を実行してから、こちらを実行する。

drop trigger if exists youth_candidates_step_history on youth_candidates;
drop function if exists log_step_history();

drop table if exists step_history;
drop table if exists select_options;

alter table youth_candidates
  drop column if exists step,
  drop column if exists entry_year,
  drop column if exists course_length,
  drop column if exists next_action,
  drop column if exists na_due_date,
  drop column if exists na_written_at,
  drop column if exists contact_method,
  drop column if exists inflow_source,
  drop column if exists note,
  drop column if exists partner_id,
  drop column if exists archived;

alter table youth_partnerships
  drop column if exists is_contracted,
  drop column if exists logo_url,
  drop column if exists documents;

drop policy if exists "partner_assets_read"   on storage.objects;
drop policy if exists "partner_assets_insert" on storage.objects;
drop policy if exists "partner_assets_update" on storage.objects;
drop policy if exists "partner_assets_delete" on storage.objects;

delete from storage.buckets where id = 'partner-assets';
