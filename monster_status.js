(function () {
  try {
    /* ---------- Lv / MaxLv ---------- */
    var h3 = document.querySelector('div.card_d header.card h3') || document.querySelector('h3');
    if (!h3) return alert('モンスター画面で使用してください');

    var mLv = h3.textContent.match(/Lv\s*(\d+)\s*\/\s*(\d+)/i);
    if (!mLv) return alert('Lv/最大Lv形式が見つかりません');

    var level = +mLv[1];
    var maxLevel = +mLv[2];

    /* ---------- レアリティ係数 ---------- */
    var rc = ({30:1, 50:1.5, 70:2, 90:2.5})[maxLevel] ?? 1;
    var t = Math.max(0, (level - 1) / (maxLevel - 1));
    var G = 1 + rc * t;
    var sqrtG = Math.sqrt(G);

    /* ---------- Lv1逆算 ---------- */
    function estimateLv1Base(currentTotal, bonus, isHP) {
      if (currentTotal <= 0) return 0;
      if (level <= 1) return Math.max(1, currentTotal - bonus);

      var factor = isHP ? sqrtG : G;
      var approx = currentTotal / factor - bonus;

      var best = Math.max(1, Math.floor(approx));
      var bestDiff = Math.abs(Math.floor((best + bonus) * factor) - currentTotal);

      for (var v = best - 50; v <= best + 50; v++) {
        if (v <= 0) continue;
        var sim = Math.floor((v + bonus) * factor);
        var diff = Math.abs(sim - currentTotal);
        if (sim === currentTotal) return v;
        if (diff < bestDiff) {
          bestDiff = diff;
          best = v;
        }
      }
      return best;
    }

    /* ---------- ステータス表 ---------- */
    var cap = [...document.querySelectorAll('div.status table caption')]
      .find(c => c.textContent.trim() === 'ステータス');
    if (!cap) return alert('ステータス表が見つかりませんでした');

    var rows = [...cap.closest('table').querySelectorAll('tbody tr')];
    var targets = ['HP', '攻撃', '魔力', '防御', '命中', '敏捷'];

    var lines = [];
    var sumSq = 0, count = 0;

    rows.forEach(tr => {
      var th = tr.querySelector('th');
      if (!th) return;

      var label = th.textContent.trim();
      if (!targets.includes(label)) return;

      var isHP = (label === 'HP');
      var name = isHP ? 'ＨＰ' : label;

      var tds = tr.querySelectorAll('td');
      if (tds.length < 2) return;

      var statText = tds[0].textContent.trim();   // HPなら "2086/2086"
      var bonusText = tds[1].textContent.trim();  // "(+186)"

      // ★ここが修正：HPは「最大値」（/の右側）を使う
      var parts = statText.split('/');
      var usedPart = isHP && parts.length >= 2 ? parts[1] : parts[0];
      var currentTotal = parseInt(usedPart.replace(/[^\d\-]/g, ''), 10);
      if (isNaN(currentTotal)) return;

      var m = bonusText.match(/([+-]?\d+)/);
      var bonus = m ? parseInt(m[1], 10) : 0;

      var lv1 = estimateLv1Base(currentTotal, bonus, isHP);
      if (lv1 <= 0) return;

      var pct = bonus / lv1 * 100;
      var pctStr = (pct < 10 ? ' ' : '') + pct.toFixed(1);

      var basePad = ' '.repeat(Math.max(0, 5 - String(lv1).length));
      var bonusPad = ' '.repeat(Math.max(0, 4 - String(bonus).length));

      lines.push(`${name}:${basePad}${lv1}+${bonusPad}${bonus} (+${pctStr}%)`);

      var r = pct / 100;
      sumSq += r * r;
      count++;
    });

    lines.push('-----------------------');
    var ev = count ? Math.sqrt(sumSq / count) * 200 + 10 : 10;
    lines.push('評価値: ' + ev.toFixed(1));

    var box = document.createElement('div');
    box.style.cssText =
      'position:fixed;top:10px;right:10px;z-index:99999;' +
      'background:rgba(0,0,0,.8);color:#fff;padding:10px 15px;' +
      'border-radius:8px;font-family:monospace;white-space:pre;' +
      'cursor:pointer;font-size:14px;max-width:90%;';
    box.textContent = lines.join('\n');
    box.onclick = () => box.remove();
    document.body.appendChild(box);

  } catch (e) {
    alert('エラー: ' + e.message);
  }
})();
