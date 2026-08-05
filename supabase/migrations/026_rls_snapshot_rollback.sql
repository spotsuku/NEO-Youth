-- ============================================================================
-- 026_rls_snapshot_rollback.sql
--
-- 目的  : 026 が作成したスナップショット用オブジェクトを削除する。
-- 破壊性: ops スキーマとその中身のみ。public スキーマには一切触れない。
-- 適用  : Supabase SQL Editor に貼り付けて実行
--
-- ⚠️ 実行順序に注意
--    027 を適用済みの状態でこれを先に実行すると、
--    027 を巻き戻す手段（スナップショット）が失われる。
--    027 を戻す必要があるなら、必ず
--      027_rls_authenticated_only_rollback.sql → 026_rls_snapshot_rollback.sql
--    の順で実行すること。
-- ============================================================================

drop function if exists ops.render_create_policy(text, text, text, text, name[], text, text, text);
drop table if exists ops.rls_snapshot_20260805;
drop table if exists ops.rls_enabled_20260805;

-- ops スキーマ自体は他の用途で使う可能性があるため、空のときだけ落とす。
do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ops'
  ) and not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'ops'
  ) then
    execute 'drop schema if exists ops';
    raise notice 'ops スキーマを削除しました';
  else
    raise notice 'ops スキーマに他のオブジェクトが残っているため保持します';
  end if;
end
$$;
