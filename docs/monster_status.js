(function () {
  try {
    /* ---------- Lv / MaxLv ---------- */
    const h3 =
      document.querySelector("div.card_d header.card h3") ||
      document.querySelector("h3");
    if (!h3) {
      alert("レベル情報が見つかりません");
      return;
    }

    const mLv = h3.textContent.match(/Lv\s*(\d+)\s*\/\s*(\d+)/i);
    if (!mLv) {
      alert("Lv/最大Lv形式が見つかりません");
      return;
    }

    const level = parseInt(mLv[1], 10);
    const maxLevel = parseInt(mLv[2], 10);

    /* ---------- レアリティ（定数） ---------- */
    const RARITY = Object.freeze({
      BRONZE: "BRONZE",
      SILVER: "SILVER",
      GOLD: "GOLD",
      PLATINUM: "PLATINUM",
    });

    const rarityByMaxLevel = Object.freeze({
      30: RARITY.BRONZE,
      50: RARITY.SILVER,
      70: RARITY.GOLD,
      90: RARITY.PLATINUM,
    });
    const rarity = rarityByMaxLevel[maxLevel] ?? RARITY.BRONZE;

    const growthCoeffByRarity = Object.freeze({
      [RARITY.BRONZE]: 1.0,
      [RARITY.SILVER]: 1.5,
      [RARITY.GOLD]: 2.0,
      [RARITY.PLATINUM]: 2.5,
    });
    const rc = growthCoeffByRarity[rarity] ?? 1.0;

    const expCoeffByRarity = Object.freeze({
      [RARITY.BRONZE]: 1,
      [RARITY.SILVER]: 2,
      [RARITY.GOLD]: 4,
      [RARITY.PLATINUM]: 8,
    });
    const expRarityFactor = expCoeffByRarity[rarity] ?? 1;

    const t = Math.max(0, (level - 1) / (maxLevel - 1));
    const G = 1 + rc * t;
    const sqrtG = Math.sqrt(G);

    /* ---------- Lv1逆算 ---------- */
    function estimateLv1Base(currentTotal, bonus, isHP) {
      if (currentTotal <= 0) return 0;
      if (level <= 1) return Math.max(1, currentTotal - bonus);

      const factor = isHP ? sqrtG : G;
      if (!isFinite(factor) || factor <= 0) return Math.max(1, currentTotal - bonus);

      const approx = currentTotal / factor - bonus;

      let best = Math.max(1, Math.floor(approx));
      let bestDiff = Math.abs(Math.floor((best + bonus) * factor) - currentTotal);
      let maxExact = null;

      const start = Math.max(1, Math.floor(approx) - 50);
      const end = Math.floor(approx) + 50;

      for (let cand = start; cand <= end; cand++) {
        const sim = Math.floor((cand + bonus) * factor);
        const diff = Math.abs(sim - currentTotal);

        if (sim === currentTotal) {
          if (maxExact === null || cand > maxExact) maxExact = cand;
          continue;
        }
        if (diff < bestDiff) {
          bestDiff = diff;
          best = cand;
        }
      }
      return maxExact !== null ? maxExact : best;
    }

    /* ---------- ステータス表 ---------- */
    const cap = [...document.querySelectorAll("div.status table caption")]
      .find(c => c.textContent.trim() === "ステータス");
    if (!cap) {
      alert("モンスター画面で使用してください");
      return;
    }

    const rows = [...cap.closest("table").querySelectorAll("tbody tr")];
    const targets = ["HP", "攻撃", "魔力", "防御", "命中", "敏捷"];

    const lines = [];
    let sumSq = 0, count = 0;

    rows.forEach(tr => {
      const th = tr.querySelector("th");
      if (!th) return;

      const label = th.textContent.trim();
      if (!targets.includes(label)) return;

      const isHP = label === "HP";
      const name = isHP ? "ＨＰ" : label;

      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) return;

      const statText = tds[0].textContent.trim();
      const bonusText = tds[1].textContent.trim();

      const parts = statText.split("/");
      const usedPart = isHP && parts.length >= 2 ? parts[1] : parts[0];
      const currentTotal = parseInt(usedPart.replace(/[^\d\-]/g, ""), 10);
      if (isNaN(currentTotal)) return;

      const m = bonusText.match(/([+-]?\d+)/);
      const bonus = m ? parseInt(m[1], 10) : 0;

      const lv1Base = estimateLv1Base(currentTotal, bonus, isHP);
      if (lv1Base <= 0) return;

      const pct = (bonus / lv1Base) * 100;
      const pctStr = (Math.abs(pct) < 10 ? " " : "") + pct.toFixed(1);

      const basePad = " ".repeat(Math.max(0, 5 - String(lv1Base).length));
      const bonusPad = " ".repeat(Math.max(0, 4 - String(bonus).length));

      lines.push(`${name}:${basePad}${lv1Base}+${bonusPad}${bonus} (+${pctStr}%)`);

      const r = pct / 100;
      sumSq += r * r;
      count++;
    });

    let evalValue = 10.0;
    if (count) {
      const raw = Math.sqrt(sumSq / count) * 200 + 10;
      evalValue = Math.floor(raw * 10) / 10;
    }

    const gradeImg = document.querySelector('img[src*="/img/menu/grade_"]');
    let grade = null;
    if (gradeImg) {
      const gm = gradeImg.src.match(/grade_(\d+)\.png/i);
      if (gm) grade = parseInt(gm[1], 10);
    }

    lines.push("-----------------------");
    lines.push("評価値: " + evalValue.toFixed(1));

    if (grade != null) {
      const baseExp = expRarityFactor * grade * ((level + 4) / 5) * 16;
      const expOther = Math.floor(baseExp);
      const expSame = Math.floor(baseExp * 1.125);
      lines.push(`経験値: 異${expOther} / 同${expSame}`);
    } else {
      lines.push("経験値: 取得失敗");
    }

    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;" +
      "background:rgba(0,0,0,.8);color:#fff;padding:10px 15px;" +
      "border-radius:8px;font-family:monospace;white-space:pre;" +
      "cursor:pointer;font-size:14px;max-width:90%;";
    box.textContent = lines.join("\n");
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
