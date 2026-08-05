-- ============================================================================
-- 027_rls_authenticated_only_rollback.sql
--
-- 目的  : 027 を巻き戻し、026 で保存した時点のポリシー定義に完全に戻す。
-- 前提  : 026_rls_snapshot.sql を適用済みで、ops.rls_snapshot_20260805 が残っていること。
-- 適用  : Supabase SQL Editor に貼り付けて実行
--
-- ⚠️ 巻き戻すと anon キー単体で全テーブルの読み書きが再び可能になる。
--    2期テーブルには実名・連絡先が入っており、対象に高校生を含む。
--    切り戻すのは「027 が原因で業務が止まった」場合に限定し、
--    切り戻した状態を放置しないこと。
-- ============================================================================

do $$
declare
  r     record;
  n_restored int := 0;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'ops' and table_name = 'rls_snapshot_20260805'
  ) then
    raise exception 'ops.rls_snapshot_20260805 が存在しません。026 のスナップショットなしでは巻き戻せません';
  end if;

  -- スナップショットに載っているポリシーを、当時のロール構成で作り直す。
  for r in
    select * from ops.rls_snapshot_20260805 order by tablename, policyname
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    execute ops.render_create_policy(
      r.schemaname, r.tablename, r.policyname,
      r.permissive, r.roles, r.cmd, r.qual, r.with_check
    );
    n_restored := n_restored + 1;
  end loop;

  raise notice '% 件のポリシーを 026 時点の定義へ復元しました', n_restored;
end
$$;

-- ---- 027 が追加で有効化した RLS を元に戻す ----
-- 026 のスナップショットで rls_enabled = false だったテーブルのみ無効化する。
do $$
declare t record;
begin
  for t in
    select s.tablename
    from ops.rls_enabled_20260805 s
    join pg_class c on c.relname = s.tablename
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
    where s.rls_enabled = false and c.relrowsecurity = true
  loop
    execute format('alter table public.%I disable row level security', t.tablename);
    raise notice 'RLS を無効化（026時点の状態へ復元）: %', t.tablename;
  end loop;
end
$$;

-- ---- 復元結果の確認 ----
select
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
