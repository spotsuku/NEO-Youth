-- ============================================================================
-- 026_rls_snapshot.sql
--
-- 目的  : 027 を適用する前に、現行の RLS ポリシー定義を DB 内へそのまま保存する。
--         これがロールバックの唯一の正となる。
-- 破壊性: なし（新規スキーマ / 新規テーブル / 新規関数のみ）
-- 適用  : Supabase SQL Editor に貼り付けて実行
-- 前提  : なし。027 より先に必ず実行すること。
--
-- なぜマイグレーションSQLからの再構成ではなく pg_policies を取るのか:
--   001〜025 は SQL Editor への手貼り運用で適用されてきたため、
--   ファイルに残っていない手作業の変更が混ざっている可能性がある。
--   実データベースの状態を正として取ることで取りこぼしを防ぐ。
-- ============================================================================

create schema if not exists ops;

-- ops スキーマは PostgREST の公開対象（既定は public, graphql_public）に
-- 含まれないため、このスナップショットは REST API から読めない。

-- ---- ポリシー定義のスナップショット ----
drop table if exists ops.rls_snapshot_20260805;
create table ops.rls_snapshot_20260805 as
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check,
  now() as captured_at
from pg_policies
where schemaname = 'public';

-- ---- RLS の有効/強制フラグのスナップショット ----
drop table if exists ops.rls_enabled_20260805;
create table ops.rls_enabled_20260805 as
select
  c.relname as tablename,
  c.relrowsecurity   as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  now() as captured_at
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r';

-- ---- CREATE POLICY 文を組み立てる共通関数 ----
-- 027 と 026/027 の各ロールバックで共用する。
-- qual / with_check が null の場合は該当句を出力しない
-- （SELECT は USING のみ、INSERT は WITH CHECK のみ、等に自然に対応する）。
create or replace function ops.render_create_policy(
  p_schema     text,
  p_table      text,
  p_policy     text,
  p_permissive text,
  p_roles      name[],
  p_cmd        text,
  p_qual       text,
  p_with_check text
) returns text
language plpgsql
immutable
as $fn$
declare
  stmt text;
begin
  stmt := format(
    'create policy %I on %I.%I as %s for %s to %s',
    p_policy,
    p_schema,
    p_table,
    case upper(p_permissive) when 'RESTRICTIVE' then 'restrictive' else 'permissive' end,
    case upper(p_cmd) when 'ALL' then 'all' else lower(p_cmd) end,
    (select string_agg(quote_ident(r::text), ', ') from unnest(p_roles) as r)
  );

  if p_qual is not null then
    stmt := stmt || format(' using (%s)', p_qual);
  end if;

  if p_with_check is not null then
    stmt := stmt || format(' with check (%s)', p_with_check);
  end if;

  return stmt || ';';
end
$fn$;

-- ---- 保存結果の確認 ----
-- 027 適用前のロール構成を目視確認するための出力。
-- roles に public / anon が含まれる行が、027 で authenticated に狭められる対象。
select
  tablename,
  policyname,
  cmd,
  roles,
  case when 'public' = any(roles) or 'anon' = any(roles) then '← 027で変更' else '' end as note
from ops.rls_snapshot_20260805
order by tablename, policyname;
