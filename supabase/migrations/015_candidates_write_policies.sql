-- Migration 015: candidates テーブルに INSERT/UPDATE ポリシーを追加
--
-- 背景:
--   001_init.sql では candidates に対して RLS を有効化したが、
--   SELECT policy のみ設定し、INSERT/UPDATE policy が無かった。
--   このため、ダッシュボードの「最終面接シート連携」ボタンから
--   youth_candidates → candidates への UPSERT が失敗していた。
--
--   interviews テーブルと同様に、社内ツール用途として全員書き込み可に設定する。
--   将来的に認証を導入する際はここを絞る。

create policy "candidates_insert_all" on candidates
  for insert with check (true);

create policy "candidates_update_all" on candidates
  for update using (true);
