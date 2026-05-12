-- Migration 021: 同名団体マージ（社内担当も全バリエーション保持）
--
-- 020 では社内担当 (internal_handler) を「最初の非空値だけ」採用していたため、
-- 行ごとに異なる担当者が入っているケースで他の担当者情報が失われる懸念があった。
--
-- 021 では社内担当を「全行の値を重複排除して、内部の '、' 区切りも分解した上で
-- '、' で連結」する。例:
--   行1: '櫻木彩乃'
--   行2: '三木浩汰'
--   行3: '櫻木彩乃、三木浩汰'
--   → マージ後: '櫻木彩乃、三木浩汰'
--
-- 020 とロジックは同じ（正規化 = regexp_replace で空白除去）。
-- 既に 020 を実行済みの場合、同名団体の重複は無いのでこのマイグレーションは
-- 何もしない（冪等）。重複が残っている場合のみマージが走る。
--
-- 実行前プレビュー:
--   select
--     regexp_replace(lower(university), '[\s　]+', '', 'g') as norm_key,
--     count(*) as row_count,
--     array_agg(distinct internal_handler) as all_handlers,
--     array_agg(distinct trim(partnership_details)) as all_details
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
    select id into keeper_id
    from youth_partnerships
    where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
    order by created_at asc nulls last, id asc
    limit 1;

    -- 先方担当: 空カードを除いて全行から集約
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

    -- 社内担当: 全行の値を '、' で分解 → 重複排除 → '、' で再連結
    select string_agg(distinct piece, '、' order by piece) into merged_handler
    from (
      select trim(unnest(string_to_array(internal_handler, '、'))) as piece
      from youth_partnerships
      where regexp_replace(lower(university), '[\s　]+', '', 'g') = grp.norm_uni
        and coalesce(trim(internal_handler), '') <> ''
    ) t
    where piece <> '';

    -- 提携内容: 重複排除して区切りで結合
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
