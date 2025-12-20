# 求
- 他にあったら便利なツールのネタ
- 感想

# お品書き
### ステータス 詳細表示
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/monster_status.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```

- 個体値の%を計算するやつ
- モンスター画面で使用可能
- TODO: 評価値の説明
- 次のグレードに必要な個体値を追加予定
- 合成経験値を追加予定
- スキル継承率の追加検討中
- Wikiリンクを追加検討中
- セラエノの影響を調査中

<img src="./image/status.png" alt="status" style="width:320px; max-width:100%;">

### バザー 検索ボタン
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/bazaar_search.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```
- バザー検索条件の変更を楽にする
- バザー画面で使用可能
- 初期値がおかしいケースがあることを確認しているけど直す気はあまりない

<img src="./image/bazaar.png" alt="bazaar" style="width:320px; max-width:100%;">

### バザー 全種族・全グレード検索
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/bazaar_all.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```
- 4種族 * 4グレード = 16通りのバザー検索を実行する
- バザー画面で使用可能
- 並び順は出品順のみ
- リクエスト数が増えるため、乱用禁止

### 経験値 表示
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/exp.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```
- 合成時に取得できる経験値を表示する
- バザー・手持ち・合成・ガチャなどのモンスター一覧画面で使用可能
- バザーなら1any当たりの経験値効率表示
- バザーなら経験値効率でソート

<img src="./image/exp.png" alt="exp" style="width:320px; max-width:100%;">

### Wiki 検索
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/wiki_search.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```
- Wikiの検索結果画面を出す
- 検索ワードを範囲指定した状態で使用可能
- 指定なしだと検索ワードを入れる画面になる
- 検索結果遷移後に別のブックマークレット[I'm Feeling Lucky](#im-feeling-lucky)を使用すると検索結果の最上位に飛べる

### I'm Feeling Lucky
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/wiki_feel_lucky.js?d="+new Date().toISOString().slice(0,10);document.head.appendChild(s);})();
```
- Wikiの検索結果の一番上のリンクに飛ぶ
- Wikiの検索結果画面で使用可能
- PCでWiki検索の隣に置いて連打する想定

# 使い方
## PC
- `javascript:(()=>`から始まる一行のスクリプトをコピー
- 適当な画面をブックマークに加える
- 今保存したブックマークを編集
- URLにコピーしたスクリプトを貼りつけて保存
- 使用可能な画面でブックマークを実行
- ブックマークバーに入れておくと使いやすい

## スマホ(Chrome)
- `javascript:(()=>`から始まる一行のスクリプトをコピー
- 適当な画面をブックマークに加える
- 今保存したブックマークを編集
- URLにコピーしたスクリプトを貼りつけて保存
- 使用可能な画面を表示する
- URLをタップ
- ブックマークの名前を入れる
- ブックマークをタップ

※ PCと違ってブックマークからのアクセスだとダメでURLバー経由でないと動かない  
　　ブラウザによって違うとは思うけど
