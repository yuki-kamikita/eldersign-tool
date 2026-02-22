(function () {
  const RARITY = Object.freeze({
    BRONZE: "BRONZE",
    SILVER: "SILVER",
    GOLD: "GOLD",
    PLATINUM: "PLATINUM",
  });

  const RARITY_BY_MAX_LEVEL = Object.freeze({
    30: RARITY.BRONZE,
    50: RARITY.SILVER,
    70: RARITY.GOLD,
    90: RARITY.PLATINUM,
  });

  const GROWTH_COEFF_BY_RARITY = Object.freeze({
    [RARITY.BRONZE]: 1.0,
    [RARITY.SILVER]: 1.5,
    [RARITY.GOLD]: 2.0,
    [RARITY.PLATINUM]: 2.5,
  });

  const EXP_COEFF_BY_RARITY = Object.freeze({
    [RARITY.BRONZE]: 1,
    [RARITY.SILVER]: 2,
    [RARITY.GOLD]: 4,
    [RARITY.PLATINUM]: 8,
  });

  const TARGETS = ["HP", "攻撃", "魔力", "防御", "命中", "敏捷"];
  // const GRADE_TOOL_URL = "https://yuki-kamikita.github.io/eldersign-tool/web/grade.html";
  const GRADE_TOOL_URL = "http://localhost:8080/docs/web/grade.html";

  function getLevelInfo() {
    const h3 =
      document.querySelector("div.card_d header.card h3") ||
      document.querySelector("h3");
    if (!h3) {
      alert("レベル情報が見つかりません");
      return null;
    }

    const mLv = h3.textContent.match(/Lv\s*(\d+)\s*\/\s*(\d+)/i);
    if (!mLv) {
      alert("Lv/最大Lv形式が見つかりません");
      return null;
    }

    return { level: parseInt(mLv[1], 10), maxLevel: parseInt(mLv[2], 10) };
  }

  function getRarity(maxLevel) {
    return RARITY_BY_MAX_LEVEL[maxLevel] ?? RARITY.BRONZE;
  }

  function getGrowth(level, maxLevel, rarity) {
    const rc = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const t = Math.max(0, (level - 1) / (maxLevel - 1));
    const G = 1 + rc * t;
    return { G, sqrtG: Math.sqrt(G) };
  }

  function estimateLv1Base(currentTotal, bonus, isHP, level, G, sqrtG) {
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

  function getStatusRows() {
    const cap = [...document.querySelectorAll("div.status table caption")].find(
      (c) => c.textContent.trim() === "ステータス"
    );
    if (!cap) {
      alert("モンスター画面で使用してください");
      return null;
    }
    return [...cap.closest("table").querySelectorAll("tbody tr")];
  }

  function collectStats(rows, level, G, sqrtG) {
    const lines = [];
    let sumSq = 0;
    const statInfo = {};

    rows.forEach((tr) => {
      const th = tr.querySelector("th");
      if (!th) return;

      const label = th.textContent.trim();
      if (!TARGETS.includes(label)) return;

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

      const base = estimateLv1Base(currentTotal, bonus, isHP, level, G, sqrtG);
      if (base <= 0) return;

      const r = bonus / base;
      const pct = r * 100;

      const pctStr = String(pct.toFixed(1)).padStart(4, " ");
      const basePad = " ".repeat(Math.max(0, 5 - String(base).length));
      const bonusPad = " ".repeat(Math.max(0, 4 - String(bonus).length));

      lines.push(`${name}:${basePad}${base}+${bonusPad}${bonus} (${pctStr}%)`);

      sumSq += r * r;
      statInfo[label] = { name, base, bonus, r, current: currentTotal };
    });

    return { lines, sumSq, statInfo };
  }

  function calcEval(sumSq) {
    const raw = Math.sqrt(sumSq / 6) * 200 + 10;
    return Math.floor(raw * 10) / 10;
  }

  function formatNumber(value) {
    if (!isFinite(value)) return "";
    if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
    return value.toFixed(1);
  }

  function getBazaarPriceAny() {
    const priceNode = document.querySelector("article.checktxt em");
    if (priceNode) {
      const m = priceNode.textContent.match(/([\d,]+)\s*Any/i);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    }

    const listingNode = document.querySelector("p.belt");
    if (listingNode) {
      const m = listingNode.textContent.match(/バザーに\s*([\d,]+)\s*Anyで出品中です/i);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
    }

    const allText = document.body ? document.body.textContent : "";
    const textMatch = allText && allText.match(/出品金額は\s*([\d,]+)\s*Any/i);
    if (textMatch) return parseInt(textMatch[1].replace(/,/g, ""), 10);
    const listingTextMatch = allText && allText.match(/バザーに\s*([\d,]+)\s*Anyで出品中です/i);
    if (listingTextMatch) return parseInt(listingTextMatch[1].replace(/,/g, ""), 10);

    const scriptText = [...document.querySelectorAll("script")]
      .map((s) => s.textContent || "")
      .join("\n");
    const scriptMatch = scriptText.match(/confirm\.set\([^)]*?"([\d,]+)\s*Anyで購入します/i);
    if (scriptMatch) return parseInt(scriptMatch[1].replace(/,/g, ""), 10);

    return null;
  }

  function getGrade() {
    const gradeImg = document.querySelector('img[src*="/img/menu/grade_"]');
    if (!gradeImg) return null;
    const gm = gradeImg.src.match(/grade_(\d+)\.png/i);
    return gm ? parseInt(gm[1], 10) : null;
  }

  function getMonsterName() {
    const h2 =
      document.querySelector("div.card_d header.card h2") ||
      document.querySelector("h2");
    if (!h2) return null;
    return h2.textContent.replace(/\s+/g, " ").trim();
  }

  function getMonsterKind() {
    const card = document.querySelector("img#card");
    if (!card || !card.src) return null;
    const m = card.src.match(/_([0-9])g\d+/i);
    if (!m) return null;
    switch (m[1]) {
      case "0":
        return "原種";
      case "1":
        return "亜種1";
      case "2":
        return "亜種2";
      case "3":
        return "亜種3";
      default:
        return null;
    }
  }

  function buildGradeToolUrl(statInfo) {
    if (!statInfo) return null;
    const params = new URLSearchParams();

    const name = getMonsterName();
    const kind = getMonsterKind();
    if (name) params.set("name", name);
    if (kind) params.set("kind", kind);

    const keyMap = {
      HP: "hp",
      攻撃: "atk",
      魔力: "mag",
      防御: "def",
      命中: "hit",
      敏捷: "agi",
    };

    for (const label of TARGETS) {
      const info = statInfo[label];
      if (!info) continue;
      const key = keyMap[label];
      if (!key) continue;
      params.set(`${key}_base`, String(info.base));
      params.set(`${key}_bonus`, String(info.bonus));
    }

    const query = params.toString();
    return query ? `${GRADE_TOOL_URL}?${query}` : GRADE_TOOL_URL;
  }

  function buildMaxLevelLines(statInfo, maxLevel, rarity) {
    const rc = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const Gmax = 1 + rc;
    const sqrtGmax = Math.sqrt(Gmax);

    const pad5 = (n) => " ".repeat(Math.max(0, 5 - String(n).length));
    const pad4 = (n) => " ".repeat(Math.max(0, 4 - String(n).length));

    const lines = [];
    let maxAgi = null;
    lines.push("-----------------------");
    lines.push(`Lv1->${maxLevel}(最大)時のステータス`);
    for (const label of TARGETS) {
      const info = statInfo[label];
      if (!info) continue;

      const factor = label === "HP" ? sqrtGmax : Gmax;
      const lv1status = info.base + info.bonus
      const maxTotal = Math.floor(lv1status * factor);
      if (label === "敏捷") maxAgi = maxTotal;

      lines.push(
        `${info.name}:${pad5(lv1status)}${lv1status} ->${pad5(maxTotal)}${maxTotal}`
      );
    }
    if (maxAgi != null) {
      const maxActionValue = Math.sqrt(maxAgi * 2000);
      lines.push(`行動値: ${Math.round(maxActionValue)}`);
    }

    return lines;
  }

  function buildNextGradeLines(statInfo, evalValue) {
    const currentTens = Math.floor(evalValue / 10);
    const target = (currentTens + 1) * 10;

    function rawEval(sumR2) {
      return Math.sqrt(sumR2 / 6) * 200 + 10;
    }

    function sumR2Override(label, newB) {
      let s = 0;
      for (const k of TARGETS) {
        const info = statInfo[k];
        if (!info) continue;
        const b = k === label ? newB : info.bonus;
        const r = b / info.base;
        s += r * r;
      }
      return s;
    }

    function findMin(label) {
      const info = statInfo[label];
      if (!info) return null;

      let S = 0;
      for (const k of TARGETS) {
        if (k === label) continue;
        const o = statInfo[k];
        if (o) S += o.r * o.r;
      }

      const k = (target - 10) / 200;
      const need = Math.max(0, 6 * k * k - S);
      let start = Math.max(info.bonus, Math.ceil(Math.sqrt(need) * info.base) - 3);

      for (let b = start; b <= info.bonus + 20000; b++) {
        if (rawEval(sumR2Override(label, b)) >= target) return b;
      }
      return null;
    }

    const pad4 = (n) => String(n).padStart(4, " ");
    const pad3 = (n) => String(n).padStart(3, " ");
    const padPct = (x) => String(x.toFixed(1)).padStart(4, " ");

    const lines = [];
    lines.push("-----------------------");
    lines.push("次のグレードになるには");
    for (const label of TARGETS) {
      const info = statInfo[label];
      if (!info) continue;

      const b = findMin(label);
      if (b == null) continue;

      const pct = (b / info.base) * 100;
      const delta = b - info.bonus;

      lines.push(`${info.name}: +${pad4(b)}(${padPct(pct)}%) あと${pad3(delta)}`);
    }

    return lines;
  }

  function renderPanel(lines, moreLines, gradeUrl) {
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;background:rgba(0,0,0,.8);" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "color:#fff;padding:10px 15px;border-radius:8px;font-family:monospace;" +
      "font-size:14px;max-width:90%;";

    function appendLines(target, list) {
      list.forEach((line, index) => {
        if (index > 0) target.appendChild(document.createTextNode("\n"));
        if (index === 0 && /^\S.*\((原種|亜種[1-3])\)$/.test(line)) {
          const centered = document.createElement("span");
          centered.textContent = line;
          centered.style.cssText = "display:block;text-align:center;";
          target.appendChild(centered);
          return;
        }
        if (gradeUrl && line === "次のグレードになるには") {
          const link = document.createElement("a");
          link.href = gradeUrl;
          link.target = "_blank";
          link.rel = "noopener";
          link.textContent = line;
          link.style.cssText = "text-decoration:underline;color:inherit;cursor:pointer;";
          link.onclick = (e) => {
            e.stopPropagation();
          };
          target.appendChild(link);
          return;
        }
        target.appendChild(document.createTextNode(line));
      });
    }

    const pre = document.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre;";
    appendLines(pre, lines);
    box.appendChild(pre);

    const toggleWrap = document.createElement("div");
    toggleWrap.style.cssText = "margin-top:8px;text-align:right;";
    box.appendChild(toggleWrap);

    const toggle = document.createElement("a");
    toggle.href = "#";
    toggle.textContent = "もっと見る";
    toggle.style.cssText = "font-size:12px;cursor:pointer;text-decoration:underline;color:inherit;";
    toggleWrap.appendChild(toggle);

    let opened = false;
    toggle.onclick = (e) => {
      e.preventDefault();
      if (opened) return;
      const nextPre = document.createElement("pre");
      nextPre.style.cssText = "margin:8px 0 0;white-space:pre;";
      appendLines(nextPre, moreLines);
      box.appendChild(nextPre);
      toggleWrap.remove();
      opened = true;
    };

    box.onclick = (e) => {
      if (e.target === toggle) return;
      box.remove();
    };
    document.body.appendChild(box);
  }

  try {
    const levelInfo = getLevelInfo();
    if (!levelInfo) return;

    const { level, maxLevel } = levelInfo;
    const rarity = getRarity(maxLevel);
    const { G, sqrtG } = getGrowth(level, maxLevel, rarity);
    const expRarityFactor = EXP_COEFF_BY_RARITY[rarity] ?? 1;

    const rows = getStatusRows();
    if (!rows) return;

    const { lines, sumSq, statInfo } = collectStats(rows, level, G, sqrtG);
    const evalValue = calcEval(sumSq);
    const grade = getGrade();
    const monsterName = getMonsterName();
    const monsterKind = getMonsterKind();
    const rarityCoeff = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const deliveryPoint = evalValue * rarityCoeff;
    const deliveryPointDisplay = Math.floor(deliveryPoint);
    const bazaarPriceAny = getBazaarPriceAny();

    if (monsterName && monsterKind) {
      lines.unshift(`${monsterName}(${monsterKind})`);
    }

    lines.push("-----------------------");
    lines.push("現在ステータス準拠");
    lines.push("評価値: " + evalValue.toFixed(1));
    if (bazaarPriceAny != null && deliveryPointDisplay > 0) {
      const unitPrice = bazaarPriceAny / deliveryPoint;
      const unitPriceRounded = Math.round(unitPrice);
      lines.push(`納品pt: ${deliveryPointDisplay} (${unitPriceRounded}any/pt)`);
    } else {
      lines.push(`納品pt: ${deliveryPointDisplay}`);
    }

    if (grade != null) {
      const baseExp = expRarityFactor * grade * ((level + 4) / 5) * 16;
      const expO = Math.floor(baseExp);
      const expS = Math.floor(baseExp * 1.125);
      lines.push(`経験値: 異${expO} / 同${expS}`);
    } else {
      lines.push("経験値: 取得失敗");
    }

    const agiInfo = statInfo["敏捷"];
    if (agiInfo) {
      const agility = agiInfo.current;
      const actionValue = Math.sqrt(agility * 2000);
      lines.push(`行動値: ${Math.round(actionValue)}`);
    }

    const maxLevelLines = buildMaxLevelLines(statInfo, maxLevel, rarity);
    const nextGradeLines = buildNextGradeLines(statInfo, evalValue);
    const moreLines = [...maxLevelLines, ...nextGradeLines];
    const gradeUrl = buildGradeToolUrl(statInfo);
    renderPanel(lines, moreLines, gradeUrl);
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
