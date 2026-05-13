-- Migration 010: 説明会参加フラグ追加
alter table youth_candidates add column if not exists attended_session boolean default false;
