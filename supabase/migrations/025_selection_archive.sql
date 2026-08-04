-- Migration 025: 選考パイプラインのアーカイブ
--
-- 背景: 2期生の募集・選考が締め切られたため、ダッシュボードの選考系タブ
-- （概要／候補者／面談記録／選考フロー／オンボーディング／説明会）を
-- デフォルト非表示にし、切替で過去の選考データを閲覧できるようにする。
-- アプローチ管理・学校連携は選考サイクルと無関係に年間通して継続する
-- 活動のため対象外。既存の `archived`（アプローチ管理専用）とは
-- 用途が異なるため別カラムとする。

alter table youth_candidates
  add column if not exists selection_archived_at timestamptz;

create index if not exists idx_youth_candidates_selection_archived_at
  on youth_candidates(selection_archived_at);
