-- Migration 019: 同名団体の重複行をマージ
--
-- 同じ大学・団体名で複数行ある場合、最古の1行に partner_contacts を集約し、
-- 残りの行を削除する。
--   - partnership_details: 重複排除して E'\n---\n' で結合
--   - internal_handler:    最初に見つかった非空値を採用
--   - partner_contacts:    全行を flat に連結（name/role/連絡先/logs がすべて空のカードは破棄）
--   - 大学名の比較:        lower(trim(university)) で正規化（全角/半角・大文字小文字・空白）
--
-- 注意:
--   破壊的操作です。Supabase の自動バックアップ（Point-in-Time Recovery）が
--   有効になっていることを確認した上で実行してください。
--   別行で管理したい団体がある場合は適用しないでください。
--
-- 実行前のプレビュー（どの大学が何行重複しているか確認）:
--   select
--     lower(trim(university)) as university_key,
--     count(*) as duplicate_row_count,
--     sum(jsonb_array_length(coalesce(partner_contacts, '[]'::jsonb))) as total_contacts
--   from youth_partnerships
--   where coalesce(trim(university), '') <> ''
--   group by lower(trim(university))
--   having count(*) > 1
--   order by duplicate_row_count desc;

do $$
declare
  grp record;
  keeper_id uuid;
  merged_contacts jsonb;
  merged_handler text;
  merged_details text;
begin
  for grp in
    select lower(trim(university)) as norm_uni,
           min(university) as display_uni
    from youth_partnerships
    where coalesce(trim(university), '') <> ''
    group by lower(trim(university))
    having count(*) > 1
  loop
    -- 最古の行を keeper に
    select id into keeper_id
    from youth_partnerships
    where lower(trim(university)) = grp.norm_uni
    order by created_at asc nulls last, id asc
    limit 1;

    -- 全行の partner_contacts を結合（空コンタクトは除外）
    select coalesce(jsonb_agg(c), '[]'::jsonb) into merged_contacts
    from youth_partnerships yp
    cross join lateral jsonb_array_elements(coalesce(yp.partner_contacts, '[]'::jsonb)) c
    where lower(trim(yp.university)) = grp.norm_uni
      and (
        coalesce(c->>'name', '')      <> '' or
        coalesce(c->>'role', '')      <> '' or
        coalesce(c->>'email', '')     <> '' or
        coalesce(c->>'phone', '')     <> '' or
        coalesce(c->>'line', '')      <> '' or
        coalesce(c->>'messenger', '') <> '' or
        jsonb_array_length(coalesce(c->'logs', '[]'::jsonb)) > 0
      );

    -- 最初の非空 internal_handler
    select internal_handler into merged_handler
    from youth_partnerships
    where lower(trim(university)) = grp.norm_uni
      and coalesce(trim(internal_handler), '') <> ''
    order by created_at asc nulls last, id asc
    limit 1;

    -- partnership_details: 重複排除して区切りで結合
    select string_agg(d, E'\n---\n' order by mn)
    into merged_details
    from (
      select trim(partnership_details) as d, min(created_at) as mn
      from youth_partnerships
      where lower(trim(university)) = grp.norm_uni
        and coalesce(trim(partnership_details), '') <> ''
      group by trim(partnership_details)
    ) t;

    -- keeper を更新
    update youth_partnerships
    set
      university = grp.display_uni,
      partner_contacts = case
        when jsonb_array_length(merged_contacts) > 0 then merged_contacts
        else '[{"name":"","role":"","email":"","phone":"","line":"","messenger":"","logs":[]}]'::jsonb
      end,
      internal_handler = coalesce(merged_handler, internal_handler),
      partnership_details = coalesce(merged_details, partnership_details)
    where id = keeper_id;

    -- 他の行を削除
    delete from youth_partnerships
    where lower(trim(university)) = grp.norm_uni
      and id <> keeper_id;
  end loop;
end $$;
