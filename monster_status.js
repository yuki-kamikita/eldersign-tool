(function () {
  try {
    // 「ステータス」テーブルを探す
    var capEls = Array.prototype.slice.call(
      document.querySelectorAll('div.status table caption')
    );
    var cap = capEls.find(function (c) {
      return c.textContent.trim() === 'ステータス';
    });

    if (!cap) {
      alert('ステータス表が見つかりませんでした');
      return;
    }

    var table = cap.closest('table');
    var rows = Array.prototype.slice.call(
      table.querySelectorAll('tbody tr')
    );

    // 対象ステータス
    var targets = ['HP', '攻撃', '魔力', '防御', '命中', '敏捷'];
    var results = [];

    rows.forEach(function (tr) {
      var th = tr.querySelector('th');
      if (!th) return;

      var label = th.textContent.trim();
      if (targets.indexOf(label) === -1) return;

      var tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;

      var valText = tds[0].textContent.trim();   // 例: "2086/2086" or "300"
      var bonusText = tds[1].textContent.trim(); // 例: "(+186)" or "(+0)"

      // 現在値（HPの場合は「/」より前だけ見る）
      var currentStr = valText.split('/')[0].replace(/[^\d\-]/g, '');
      var current = parseInt(currentStr, 10);
      if (isNaN(current)) return;

      // プラス値 "(+186)" → 186
      var m = bonusText.match(/([+-]?\d+)/);
      var bonus = m ? parseInt(m[1], 10) : 0;

      var base = current - bonus;          // 基礎ステータス
      var percent = base !== 0 ? bonus / base * 100 : 0;
      var percentStr = base !== 0 ? percent.toFixed(1) : '0.0';

      // 表示用テキスト
      results.push(
        label +
        ': 基礎' + base +
        ' 現在' + current +
        ' 上昇' + bonus +
        ' (+' + percentStr + '%)'
      );
    });

    if (results.length === 0) {
      alert('対象ステータスが見つかりませんでした');
    } else {
      alert(results.join('\n'));
    }
  } catch (e) {
    alert('エラー: ' + e.message);
  }
})();
