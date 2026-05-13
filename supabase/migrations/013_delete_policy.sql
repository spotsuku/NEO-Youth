-- Migration 013: 候補者削除のRLSポリシー追加
create policy "youth_candidates_delete" on youth_candidates for delete using (true);
