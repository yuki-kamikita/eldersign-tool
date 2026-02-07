---
name: bookmarklet
description: エルダーサイン向けブックマークレットの新規作成/編集/整理を行うためのスキル。`docs/bookmarklet/*.js` のIIFEスクリプト作成・修正、`docs/bookmarklet/index.html` への一覧追加、`data-bookmarklet` 生成、必要に応じた `README.md` と `docs/image/` の更新が発生する作業で使う。
---

# ブックマークレット

## 概要

エルダーサインのゲーム画面で実行するブックマークレットを作成・編集・配布するための作業手順を整理する。

## 重要ファイル

- `docs/bookmarklet/*.js`
- `docs/bookmarklet/index.html`
- `docs/bookmarklet/`
- `README.md`

## 手順

1. 目的と対象画面を確認し、必要なDOMや動作条件を洗い出す。
2. `docs/bookmarklet/<name>.js` を作成または編集する。
3. 例外は `try/catch` で握り、ユーザーに分かる文言で通知する。
4. `docs/bookmarklet/index.html` の一覧にカードを追加・更新する。
5. 新規追加・ファイル名変更・機能追加のときは `README.md` のブックマークレット記載を更新する。
6. 対象ページで手動確認する。

## ブックマークレットURLテンプレート

```text
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign-tool/bookmarklet/<file>.js";document.head.appendChild(s);})();
```

## 注意点

- `docs/*.js` は自己完結のIIFE形式を維持し、ビルドや外部依存を追加しない。
- 対象はブラウザ内実行（DOM 操作 / fetch 等）なので Node 専用 API は使わない。
- UI 追加は既存のスタイルに合わせ、ページ破壊を避けるために `z-index` や固定配置を配慮する。
