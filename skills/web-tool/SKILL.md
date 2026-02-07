---
name: web-tool
description: エルダーサイン向けWebツールの新規作成/編集/整理を行うためのスキル。`docs/web/` 配下のHTML作成・修正、必要に応じた `docs/*.js` の追加・更新、`docs/index.html` へのリンク追加、`docs/theme.css` との整合が必要な作業で使う。
---

# Webツール

## 概要

ブラウザで使うWebツールを `docs/web/` 配下に作成・編集し、ツール集に追加するための作業手順を整理する。

## 重要ファイル

- `docs/web/*.html`
- `docs/index.html`
- `docs/theme.css`
- `docs/image/`
- `docs/firebase.js`

## 手順

1. ツールの目的と配置場所を決め、`docs/web/<name>.html` または `docs/web/<name>/index.html` を作成・編集する。
2. HTMLで `../theme.css` を読み込み、ツール集と同じテーマを適用する。
3. `.css` や `.js` を別ファイルから読み込む場合、修正時は `?v1` のようなクエリ末尾をインクリメントして更新を明示する。
4. 共有機能が必要なら `docs/firebase.js` をES moduleとして読み込む。
5. UIは既存のスタイルに合わせ、ページ破壊を避ける配置と `z-index` を意識する。
6. `docs/index.html` にツールへのリンクカードを追加・更新する。
7. 必要に応じて `docs/image/` にスクリーンショットを追加する。
8. 対象ページで手動確認する。

## 注意点

- Firebaseのローカル設定は `docs/firebase.config.local.js` に置き、公開対象に入れない。
- `docs/` 配下はすべて公開対象なので、機密情報やローカル専用の設定は置かない。
