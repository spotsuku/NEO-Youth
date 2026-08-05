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

-- ---- テーブルGRANTのスナップショット ----
-- RLSポリシーを狭めても anon ロールのテーブルGRANTは残る。027 でこれを REVOKE
-- するため、現行の付与状態を保存しておく。
-- information_schema.role_table_grants は実行ロールから見える範囲しか返さないので、
-- pg_class.relacl を直接展開して確実に全件取る。
drop table if exists ops.grants_snapshot_20260805;
create table ops.grants_snapshot_20260805 as
select
  n.nspname as table_schema,
  c.relname as table_name,
  case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end as grantee,
  a.privilege_type,
  a.is_grantable,
  now() as captured_at
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(c.relacl) a
where n.nspname = 'public'
  and c.relkind = 'r';

-- ---- デフォルト権限のスナップショット ----
-- Supabase は ALTER DEFAULT PRIVILEGES で「今後作るテーブル」にも anon 権限を
-- 自動付与する設定を持つ。027 でこれも外すため記録しておく。
drop table if exists ops.default_acl_snapshot_20260805;
create table ops.default_acl_snapshot_20260805 as
select
  d.defaclrole::regrole::text as grantor_role,
  coalesce(d.defaclnamespace::regnamespace::text, '(全スキーマ)') as schema_name,
  d.defaclobjtype as object_type,
  d.defaclacl::text as acl,
  now() as captured_at
from pg_default_acl d;

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
  'policy' as kind,
  tablename,
  policyname,
  cmd,
  roles::text,
  case when 'public' = any(roles) or 'anon' = any(roles) then '← 027で変更' else '' end as note
from ops.rls_snapshot_20260805
order by tablename, policyname;

-- anon に付与されているテーブル権限（027 で REVOKE する対象）
select
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as anon_privileges
from ops.grants_snapshot_20260805
where grantee = 'anon'
group by table_name
order by table_name;

-- PUBLIC ロールに権限が付いていないことの確認。
-- ここに行が出る場合、anon から REVOKE しても PUBLIC 経由で権限が残るため
-- 027 だけでは遮断しきれない（その場合は報告して方針を再検討する）。
select
  table_name,
  string_agg(privilege_type, ', ' order by privilege_type) as public_privileges
from ops.grants_snapshot_20260805
where grantee = 'PUBLIC'
group by table_name
order by table_name;
