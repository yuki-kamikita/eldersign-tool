ブラウザゲーム『エルダーサイン』のブックマークレット集です

# 求
- 他にあったら便利なツールのネタ
- 感想

# お品書き
### ステータス 詳細表示
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/monster_status.js";document.head.appendChild(s);})();
```

- 個体値の%を計算するやつ
- 開くと最大レベルと次のグレードも出る
- モンスター画面で使用可能
- [ ] スキル継承率の追加検討中
- [ ] セラエノの影響を調査中

#### 評価値
フォールド時のスコア、グレード判定、イベントの納品の基礎ptなどに使用される値  
- フォールド時：評価値切り捨て
- グレード
  - 10以上20未満：C
  - 20以上30未満：CC
  - ︙
  - 100以上：SSS
  - 十の位だけ見ればわかりやすい

<img src="./image/status.png" alt="status" style="width:320px; max-width:100%;">

### コンパニオン 派遣研究力
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/companion.js";document.head.appendChild(s);})();
```

- コンパニオンの研究力表示
- コンパニオン画面で使用可能
- 数字や施設名タップで派遣画面へ遷移

<img src="./image/companion.png" alt="companion" style="width:320px; max-width:100%;">

### バザー 検索ボタン
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/bazaar_search.js";document.head.appendChild(s);})();
```
- バザー検索条件の変更を楽にする
- バザー画面で使用可能
- 初期値がおかしいケースがあることを確認しているけど直す気はあまりない

<img src="./image/bazaar.png" alt="bazaar" style="width:320px; max-width:100%;">

### バザー 全種族・全グレード検索
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/bazaar_all.js";document.head.appendChild(s);})();
```
- 4種族 * 4グレード = 16通りのバザー検索を実行する
- バザー画面で使用可能
- 並び順は出品順のみ
- リクエスト数が増えるため、乱用厳禁

### 経験値 表示
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/exp.js";document.head.appendChild(s);})();
```
- 合成時に取得できる経験値を表示する
- バザー・手持ち・合成・ガチャなどのモンスター一覧画面で使用可能
- バザーなら1any当たりの経験値効率表示
- バザーなら経験値効率でソート

<img src="./image/exp.png" alt="exp" style="width:320px; max-width:100%;">

### Wiki 検索
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/wiki_search.js";document.head.appendChild(s);})();
```
- Wikiの検索結果画面を出す
- モンスター詳細ならモンスター名で検索
- それ以外の画面なら範囲指定した文字で検索
- 指定なしだと検索ワードを入れる画面になる
- 検索結果遷移後に別のブックマークレット[I'm Feeling Lucky](#im-feeling-lucky)を使用すると検索結果の最上位に飛べる

### I'm Feeling Lucky
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/wiki_feel_lucky.js";document.head.appendChild(s);})();
```
- Wikiの検索結果の一番上のリンクに飛ぶ
- Wikiの検索結果画面で使用可能
- PCでWiki検索の隣に置いて連打する想定

### ランクマッチ プレイヤー別対戦表
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/rankmatch.js";document.head.appendChild(s);})();
```
- ランクマッチの対戦表の下にプレイヤー別の対戦結果/予定を表示
- ランクマッチ画面で使用可能
- アルファベットタップでその人の対戦表にジャンプ

### HTML ダウンロード
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/html_download.js";document.head.appendChild(s);})();
```
- 表示中のページHTMLをそのままダウンロード
- 戦闘結果共有などに
- 現状htmlだけダウンロードしているので、本家が消えたらcssが壊れますが、軽い方がいいかなと

### 長いスクリーンショット
```javascript
javascript:(()=>{const s=document.createElement("script");s.src="https://yuki-kamikita.github.io/eldersign_js/screenshot.js";document.head.appendChild(s);})();
```
- 長いページを画面外含めて撮影してPNG保存
- 戦闘結果共有などに
- ある程度のところでページ分け
- 外部ライブラリ(html2canvas)を利用

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
