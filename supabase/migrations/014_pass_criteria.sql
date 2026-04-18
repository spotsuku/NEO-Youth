-- Migration 014: 合格基準チェックボックス追加
alter table youth_candidates add column if not exists ob_pass_criteria boolean default false;
