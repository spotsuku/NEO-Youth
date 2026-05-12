-- Migration 020: 同名団体マージ（全角/半角スペースを無視する強化版）
--
-- 019 では lower(trim(university)) で正規化していたが、
-- trim() は ASCII 空白しか除去しないため、
-- 末尾全角スペース「九州大学　」や中黒入りなどが別キー扱いになって残った。
--
-- 020 は regexp_replace で「すべての空白文字（半角/全角/タブ/改行）」を除去してから比較する。
--
-- 例:
--   '九州大学'         → '九州大学'
--   '九州大学 '        → '九州大学'
--   '九州大学　'       → '九州大学'  (全角空白除去)
--   ' 九州 大学 '      → '九州大学'  (内部空白も除去)
--
-- 内部空白の除去は意図的（"九 州大学" のような typo も合体する）。
-- これが過剰なら regexp_replace を '^\s+|\s+$' (両端のみ) に変えること。
--
-- 実行前プレビュー（どのキーに何件あるか確認）:
--   select
--     regexp_replace(lower(university), '[\s　]+', '', 'g') as norm_key,
--     count(*) as row_count,
--     array_agg(distinct university) as actual_names
--   from youth_partnerships
--   where coalesce(trim(university), '') <> ''
--   group by 1
--   having count(*) > 1
--   order by row_count desc;

do $$
declare
  grp record;
  keeper_id uuid;
  merged_contacts jsonb;
  merged_handler text;
  merged_details text;
begin
  for grp in
    select
      regexp_replace(lower(university), '[\s　]+', '', 'g') as norm_uni,
      (array_agg(university order by length(trim(university)) desc, created_at asc))[1] as display_uni
    from youth_partnerships
    where coalesce(trim(university), '') <> ''
    group by regexp_replace(lower(university), '[\s　]+', '', 'g')
    having count(*) > 1
  loop
    -- 最古の行を keeper に
    select id into keeper_id
    from youth_partnerships
    where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
    order by created_at asc nulls last, id asc
    limit 1;

    -- partner_contacts を全行分連結（空カードは除外）
    select coalesce(jsonb_agg(c), '[]'::jsonb) into merged_contacts
    from youth_partnerships yp
    cross join lateral jsonb_array_elements(coalesce(yp.partner_contacts, '[]'::jsonb)) c
    where regexp_replace(lower(yp.university), '[\s　]+', '', 'g') = grp.norm_uni
      and (
        coalesce(c->>'name', '')      <> '' or
        coalesce(c->>'role', '')      <> '' or
        coalesce(c->>'email', '')     <> '' or
        coalesce(c->>'phone', '')     <> '' or
        coalesce(c->>'line', '')      <> '' or
        coalesce(c->>'messenger', '') <> '' or
        jsonb_array_length(coalesce(c->'logs', '[]'::jsonb)) > 0
      );

    -- internal_handler: 最初の非空値
    select internal_handler into merged_handler
    from youth_partnerships
    where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
      and coalesce(trim(internal_handler), '') <> ''
    order by created_at asc nulls last, id asc
    limit 1;

    -- partnership_details: 重複排除して区切りで結合
    select string_agg(d, E'\n---\n' order by mn) into merged_details
    from (
      select trim(partnership_details) as d, min(created_at) as mn
      from youth_partnerships
      where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
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

    -- 他行を削除
    delete from youth_partnerships
    where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
      and id <> keeper_id;
  end loop;
end $$;
