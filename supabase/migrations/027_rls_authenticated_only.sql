-- ============================================================================
-- 027_rls_authenticated_only.sql
--
-- 目的  : public（= anon を含む）向けの全ポリシーを authenticated 限定に狭める。
--         対象は2期テーブルを含む public スキーマの全テーブル。
-- 破壊性: 既存ポリシーの差し替え。DROP TABLE / DROP COLUMN / 型変更は含まない。
--         026 のスナップショットから完全に巻き戻せる。
-- 前提  : 026_rls_snapshot.sql を適用済みであること（未適用なら例外で停止する）。
-- 適用  : Supabase SQL Editor に貼り付けて実行
--
-- 設計方針:
--   変更するのは「ロール」だけ。cmd / USING / WITH CHECK は一切変更しない。
--   スナップショットから1行ずつ読んで同名・同条件で作り直すので、
--   権限が意図せず広がることがない（例: DELETE ポリシーが無かったテーブルに
--   DELETE が生えることはない）。
--
-- 適用後の期待される挙動:
--   anon の SELECT → 200 だが 0 件（適用可能なポリシーが無いため行が見えない）
--   anon の INSERT / UPDATE / DELETE → 401 / 403（RLS 違反）
--   service_role → 変化なし（RLS を設計上バイパスするため）
--
-- ⚠️ 重要: service_role は RLS をバイパスする。2期アプリのデータアクセス20ファイルは
--    すべて service_role を使っているため、このマイグレーションでは
--    https://neo-youth.vercel.app の公開状態は解消されない。
--    公開停止は Vercel 側の Deployment Protection もしくは認証実装で対処する。
-- ============================================================================

do $$
declare
  r         record;
  new_roles name[];
  n_changed int := 0;
  n_kept    int := 0;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'ops' and table_name = 'rls_snapshot_20260805'
  ) then
    raise exception '026_rls_snapshot.sql を先に適用してください（スナップショットが存在しません）';
  end if;

  for r in
    select * from ops.rls_snapshot_20260805 order by tablename, policyname
  loop
    -- public / anon を authenticated に置き換える。
    -- service_role など明示指定されたロールはそのまま残す。
    select array_agg(distinct x order by x) into new_roles
    from (
      select case
               when role_name::text in ('public', 'anon') then 'authenticated'
               else role_name::text
             end::name as x
      from unnest(r.roles) as role_name
    ) t;

    if new_roles = r.roles then
      n_kept := n_kept + 1;
    else
      n_changed := n_changed + 1;
    end if;

    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    execute ops.render_create_policy(
      r.schemaname, r.tablename, r.policyname,
      r.permissive, new_roles, r.cmd, r.qual, r.with_check
    );
  end loop;

  raise notice 'ポリシーを authenticated に狭めました: 変更 % 件 / 変更なし % 件', n_changed, n_kept;
end
$$;

-- ---- RLS が全テーブルで有効であることを念のため保証する ----
-- （既に有効なので実質 no-op。将来テーブルが増えたときの取りこぼし防止）
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    raise notice 'RLS を有効化: %', t.relname;
  end loop;
end
$$;

-- ---- 適用結果の確認 ----
-- すべての行の roles が {authenticated}（または service_role 併記）になっていること。
-- public / anon が残っていれば想定外なので調査する。
select
  tablename,
  policyname,
  cmd,
  roles,
  case when 'public' = any(roles) or 'anon' = any(roles) then '⚠️ anon が残存' else 'OK' end as status
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
