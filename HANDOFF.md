# NEO-Youth 引き継ぎメモ

作成日: 2026-08-04 のセッションで実施した作業のまとめ。別のClaudeアカウント/セッションに引き継ぐための情報を集約しています。

## プロジェクト概要

NEO ACADEMIA（NEOA）の2期生募集・選考を管理する社内CRM。元は「最終面接シート」（`/` ルート、32名採点用の単機能ページ）だったが、106コミットを経て候補者パイプライン管理・学校連携・アプローチ（見込み客）管理を含む本格的な採用CRM（`/dashboard`、8タブ）に成長している。

- リポジトリ: GitHub `spotsuku/NEO-Youth`（ローカル: `~/dev/NEO-Youth`）
- スタック: Next.js 14.2.5 (App Router) + TypeScript + Supabase (Postgres/Storage) + Vercel
- デプロイ: Vercelの GitHub 連携で `main` push → 自動デプロイ（Vercelプロジェクト自体はユーザー側アカウントで管理、私からは直接アクセスできない）

## 今回のセッションでやったこと（時系列）

1. **開発環境セットアップ**
   - `.env.example` を新規作成（リポジトリに欠けていた）
   - `.env.local` にSupabaseの値を設定（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`）
   - **重要**: Vercel側の `SUPABASE_SERVICE_ROLE_KEY` が誤って anon key と同じ値に設定されていた不具合を発見・ユーザーが修正済み。正しい値は Supabase Project Settings → API → `service_role`（新形式キー: `sb_secret_...`）

2. **選考パイプラインのアーカイブ機能**（2期生の選考締切に伴う）
   - `youth_candidates.selection_archived_at timestamptz` を追加（マイグレーション `supabase/migrations/025_selection_archive.sql` + rollback）
   - 既存の `archived`（アプローチ管理専用）とは別軸。選考系6タブ（概要/候補者/面談記録/選考フロー/オンボーディング/説明会）はこのカラムでデフォルト非表示、トグルで過去データ閲覧可
   - アプローチ管理・学校連携は対象外（年間通して継続する活動のため）
   - 一括アーカイブAPI: `POST /api/youth/candidates/bulk-archive`（冪等、来年以降も使い回せる）
   - 61名分を実際にアーカイブ済み（データは削除していない、`selection_archived_at`をnullに戻せば復元可能）

3. **デザイン全面刷新**（NEO CAMPUS Design System準拠、ゼロから作り直し）
   - 参考: `design.md`（Playful professional / Foundation・Adventure二層構造のデザインシステム）+ 実プロトタイプのスクリーンショット（NEO CAMPUS本体の画面）
   - **重要な学び**: 最初はCSS変数の値だけ差し替える「配色の載せ替え」をやって却下された。ユーザーの要求は「ゼロから作れ、バックエンドは固定」——マークアップ構造ごと作り直すこと
   - `src/app/dashboard/dashboard.css` を新規に書き直し（design.mdのコンポーネント語彙: App Shell、Hero、Sticker、Information/Quest/State カード、Primary Button、XP bar、Stepper、Kanban、Master-Detail）
   - 8タブ全てのJSXを書き換え（**バックエンド/API/state管理は一切変更なし**、`return(...)`以下のマークアップのみ差し替え）。並列サブエージェント5体に分担させて実施
   - その後、実プロトタイプ画像を参考にサイドバー（ピル型ナビ＋アイコン）・Hero（ステッカー＋右パネル）・Kanbanカード（バッジ）の質感を強化
   - マスコットキャラクター（ペロっぺ）は素材がないため未実装
   - ボタン類に「押し込み」インタラクション（`:active`でtranslateY+box-shadow圧縮）を追加
   - サイドバーを「概要 → 募集活動（アプローチ/説明会/学校連携）→ 候補者 → 選考フロー → 面談（面談記録/面談シート）→ オンボーディング」のグループ構造に再編
   - 旧「/」面接シートページへの導線は、サイドバー常設リンクを廃止し「面談記録」タブ内のボタンに変更

## ハマったポイント・ノウハウ

- **devサーバーのHMRが壊れる**: 長時間・大量のファイル編集をしていると、CSSが正しく反映されず背景が真っ黒になる現象が複数回発生。`.next`ディレクトリを削除してdevサーバーを再起動すると直る。
  ```bash
  lsof -ti :3010 | xargs kill -9
  rm -rf .next && npm run dev -- -p 3010
  ```
- **GitHub push権限**: `gh auth status` で複数アカウントがログイン済みだった（`YUZY742`と`ymatsushita-creator`）。`spotsuku/NEO-Youth`への書き込み権限があるのは`ymatsushita-creator`側。push前に必ず切り替える:
  ```bash
  gh auth switch --hostname github.com --user ymatsushita-creator
  ```
- **`supabase db push`のCLIリンクがこのリポジトリに存在しない**: マイグレーションはSupabase SQL Editorへの手動貼り付けで適用する運用（001〜025まで全てこの方式）
- **Vercelプロジェクトの所在**: ローカルのVercel CLI（`yuzy742`アカウント）にはNEO-Youthのプロジェクトが見当たらなかった。別アカウント（ユーザーID `SAjWv1mjFzxDPwBuJ6NQLURz`）で管理されている。環境変数の確認・修正はユーザー自身にVercelダッシュボードで行ってもらう必要がある
- **型定義の抜け**: `deleted_at`（マイグレーション024で追加済みのDBカラム）が`YouthCandidate`型に定義されておらず、本番ビルドが型エラーで失敗したことがあった。DBカラムを追加したら型定義も必ず同期させること

## CSSクラス語彙（`src/app/dashboard/dashboard.css`）

新デザインシステムの主要クラス。今後UIを追加・修正する際はこれらを再利用する:

- **Layout**: `.shell` `.shell-sidebar` `.shell-nav-item`(+`.active`) `.shell-nav-group-label` `.shell-nav-subitem` `.shell-bottomnav` `.shell-page`
- **Hero**: `.hero` `.hero-body` `.hero-eyebrow` `.hero-title` `.hero-sub` `.hero-panel`
- **Sticker**: `.sticker`(+`.mint/.sun/.sky`)
- **Buttons**: `.btn` + `.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-danger`/`.btn-sm`、`.btn-chip`(+`.active`)
- **Cards**: `.card-info`（データ密度が高い場所）、`.card-quest`（選べる/actionableな項目、太枠+硬い影）、`.card-state`（色付きの状態タイル、+`.mint/.sun/.pink/.sky/.danger`）
- **Forms**: `.field` `.field-label` `.input` `.select` `.textarea`、インライン編集セルは `.cell-input` `.cell-select`
- **Table**: `.table-wrap` `.table` `.table-check`
- **Progress**: `.xp-track`/`.xp-fill`(+`.mint`)、`.stepper`系、`.data-bar-*`系（実データの棒グラフ用、色は単色のまま）
- **Kanban**: `.kanban` `.kanban-col` `.kanban-card.card-quest` `.kc-badge` `.kc-name` `.kc-sub`
- **Master-detail**: `.split` `.split-side` `.split-list-item`(+`.active`)
- **Modal**: `.modal-overlay` `.modal` `.modal-close` `.modal-actions`

色トークンは `src/app/globals.css` の `:root` で定義（`--neo-pink/-sun/-mint/-sky/-purple` 等のadventure色、`--bg/--ink/--mu/--bd`等のfoundation色は名前を維持しつつ新パレットにマッピング済み）。

## 未対応・今後の課題

- **README.md が古い**: 面接シート単機能時代の説明のまま。8タブ構成のCRMになった現状を反映していない
- **Next.js 14.2.5 に既知の脆弱性**（`npm audit`で critical含む5件）。パッチ版へのアップグレード未実施
- **テストが一切ない**
- **旧「/」面接シートページ（`InterviewDashboard.tsx`/`Sidebar.tsx`/`CandidateSheet.tsx`）はデザイン刷新の対象外のまま**。色トークンは共有しているので自動的に配色は更新されているが、構造的な作り直しはしていない
- **モバイル幅（850px以下）でのボトムナビ動作の実機確認は簡易的にしか行っていない**
- **アプローチ管理・学校連携のJSX書き換えは並列サブエージェントによるもの**なので、細部の見た目に多少の粒度差がある可能性がある（一通り目視確認はしたが、隅々までは見ていない）

## よく使うコマンド

```bash
cd ~/dev/NEO-Youth
npm run dev -- -p 3010          # 開発サーバー（3010番ポート推奨、他プロジェクトと衝突しないように）
npx tsc --noEmit                # 型チェックのみ（速い）
npm run build                   # 本番ビルド確認
gh auth switch --hostname github.com --user ymatsushita-creator  # push前に必須
git push origin main
```
