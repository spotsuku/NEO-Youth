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

-- ---- anon のテーブルGRANTを 026 時点の状態へ復元する ----
do $$
declare
  g       record;
  n_granted int := 0;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'ops' and table_name = 'grants_snapshot_20260805'
  ) then
    raise exception 'ops.grants_snapshot_20260805 が存在しません。GRANT を復元できません';
  end if;

  for g in
    select * from ops.grants_snapshot_20260805
    where grantee = 'anon'
    order by table_name, privilege_type
  loop
    -- privilege_type は pg_class.relacl 由来のキーワードなので識別子引用しない。
    -- 想定外の値が入っていた場合は権限文が壊れるより先に弾く。
    if g.privilege_type not in
       ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN') then
      raise exception '未知の権限種別: %', g.privilege_type;
    end if;

    execute format('grant %s on table %I.%I to anon',
                   g.privilege_type, g.table_schema, g.table_name);
    n_granted := n_granted + 1;
  end loop;

  raise notice 'anon へ % 件の権限を復元しました', n_granted;
end
$$;

-- ---- デフォルト権限を復元する ----
-- 026 のスナップショット（ops.default_acl_snapshot_20260805）に記録された
-- 適用前の ACL は参照用。Supabase の既定は新規テーブルへ全権限を付与する設定なので、
-- それに合わせて戻す。厳密な差分復元が必要な場合はスナップショットの acl 列を確認する。
alter default privileges in schema public grant all on tables to anon;

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
