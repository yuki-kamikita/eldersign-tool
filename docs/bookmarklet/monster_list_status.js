(() => {
  const STYLE_ID = "__es_monster_list_status_style";
  const PANEL_ID = "__es_monster_list_status_panel";
  const MENU_ID = "__es_monster_list_status_menu";
  const LINE_CLASS = "es-monster-status-line";
  const REQUEST_DELAY_MS = 200;

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

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
.${LINE_CLASS}{
  margin:2px 0 0;
  font-size:12px;
  line-height:1.35;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:2px 8px;
  clear:both;
}
.${LINE_CLASS}[data-stat-key="error"],
.${LINE_CLASS}[data-stat-key="loading"]{
  display:block;
}
.${LINE_CLASS} span{
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.${LINE_CLASS} span.is-over-threshold{
  color:#a00000;
}
#${MENU_ID}{
  position:fixed;
  bottom:40px;
  left:50%;
  transform:translateX(-50%);
  z-index:99999;
  background:rgba(0,0,0,.8);
  color:#fff;
  padding:8px 10px;
  border-radius:8px;
  font-family:monospace;
  font-size:12px;
  width:calc(100% - 12px);
  max-width:420px;
  display:flex;
  flex-direction:column;
  align-items:stretch;
  position:fixed;
}
@media (max-width: 767px){
  #${MENU_ID}{
    top:72px;
    bottom:auto;
  }
}
#${MENU_ID} button,
#${MENU_ID} input{
  font:inherit;
}
#${MENU_ID} .es-menu-close{
  position:absolute;
  top:0;
  right:0;
  cursor:pointer;
  color:#fff;
  font-size:16px;
  line-height:16px;
  padding:6px 10px;
}
#${MENU_ID} .es-menu-list{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
  align-content:flex-start;
  overflow-y:auto;
  max-height:320px;
  padding-top:8px;
  padding-right:2px;
}
`.trim();
    document.head.appendChild(style);
  };

  const ensurePanel = () => {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;" +
      "background:rgba(0,0,0,.8);color:#fff;padding:10px 12px;" +
      "border-radius:8px;font-family:monospace;font-size:12px;" +
      "max-width:calc(100% - 20px);";
    document.body.appendChild(panel);
    return panel;
  };

  const setPanelText = (text) => {
    ensurePanel().textContent = text;
  };

  const removePanelLater = (ms) => {
    window.setTimeout(() => {
      document.getElementById(PANEL_ID)?.remove();
    }, ms);
  };

  const promptMode = (items) =>
    new Promise((resolve) => {
      document.getElementById(MENU_ID)?.remove();

      const panel = document.createElement("div");
      panel.id = MENU_ID;

      const allButton = document.createElement("button");
      allButton.type = "button";
      allButton.textContent = "すべて";

      const list = document.createElement("div");
      list.className = "es-menu-list";

      const closeButton = document.createElement("span");
      closeButton.className = "es-menu-close";
      closeButton.setAttribute("role", "button");
      closeButton.setAttribute("tabindex", "0");
      closeButton.title = "閉じる";
      closeButton.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">' +
        '<path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

      const finish = (result) => {
        panel.remove();
        resolve(result);
      };

      allButton.addEventListener("click", () => finish({ mode: "all", targetName: "" }));
      closeButton.addEventListener("click", () => finish(null));
      closeButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          finish(null);
        }
      });

      list.appendChild(allButton);

      [...new Set(items.map((li) => getMonsterTypeName(li)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "ja"))
        .forEach((name) => {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = name;
          button.addEventListener("click", () => finish({ mode: "single", targetName: name }));
          list.appendChild(button);
        });

      panel.appendChild(closeButton);
      panel.appendChild(list);
      document.body.appendChild(panel);
    });

  const getListItems = () => Array.from(document.querySelectorAll("nav.block > ul > li"));

  const getMonsterTypeName = (li) => {
    const firstTextLine = Array.from(li.querySelectorAll("p"))
      .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
      .find((text) => /Lv\s*\d+/i.test(text));
    if (!firstTextLine) return "";
    return firstTextLine.replace(/Lv\s*\d+.*$/i, "").trim();
  };

  const getMonsterKindOrder = (li) => {
    const image = li.querySelector('img[src*="/img/mi/"]');
    if (!image || !image.src) return Number.MAX_SAFE_INTEGER;
    const match = image.src.match(/_(\d)g\d+(?:\.\w+)?$/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  const sortList = (items) => {
    const groups = new Map();
    items.forEach((li, index) => {
      const parent = li.parentElement;
      if (!parent) return;
      const list = groups.get(parent) || [];
      list.push({ li, index });
      groups.set(parent, list);
    });

    groups.forEach((entries, ul) => {
      entries.sort((a, b) => {
        const fetchedCompare =
          Number(b.li.dataset.esFetched || 0) -
          Number(a.li.dataset.esFetched || 0);
        if (fetchedCompare !== 0) return fetchedCompare;

        const typeCompare = (a.li.dataset.esMonsterTypeName || "").localeCompare(
          b.li.dataset.esMonsterTypeName || "",
          "ja"
        );
        if (typeCompare !== 0) return typeCompare;

        const aUnitPriceRaw = a.li.dataset.esUnitPriceAnyPerPt;
        const bUnitPriceRaw = b.li.dataset.esUnitPriceAnyPerPt;
        const aUnitPrice = Number(aUnitPriceRaw);
        const bUnitPrice = Number(bUnitPriceRaw);
        const aHasUnitPrice = aUnitPriceRaw !== "" && Number.isFinite(aUnitPrice);
        const bHasUnitPrice = bUnitPriceRaw !== "" && Number.isFinite(bUnitPrice);
        if (aHasUnitPrice && bHasUnitPrice) {
          const unitPriceCompare = aUnitPrice - bUnitPrice;
          if (unitPriceCompare !== 0) return unitPriceCompare;
        } else if (aHasUnitPrice !== bHasUnitPrice) {
          return aHasUnitPrice ? -1 : 1;
        }

        const kindCompare =
          Number(a.li.dataset.esMonsterKindOrder || Number.MAX_SAFE_INTEGER) -
          Number(b.li.dataset.esMonsterKindOrder || Number.MAX_SAFE_INTEGER);
        if (kindCompare !== 0) return kindCompare;

        const evalCompare =
          Number(b.li.dataset.esEvalValue || Number.NEGATIVE_INFINITY) -
          Number(a.li.dataset.esEvalValue || Number.NEGATIVE_INFINITY);
        if (evalCompare !== 0) return evalCompare;

        return a.index - b.index;
      });

      entries.forEach(({ li }) => {
        ul.appendChild(li);
      });
    });
  };

  const findDetailUrl = (li) => {
    const links = Array.from(li.querySelectorAll("a[href]"));
    for (const link of links) {
      try {
        const url = new URL(link.getAttribute("href"), window.location.href);
        const mid = url.searchParams.get("mid");
        if (url.pathname.includes("/mcard_detail") && mid) return url.toString();
        if (mid) return url.toString();
      } catch (_) {
        continue;
      }
    }
    return null;
  };

  const getSalePriceAny = (li) => {
    const priceNode = li.querySelector("p.price");
    if (priceNode) {
      const match = priceNode.textContent.match(/([\d,]+)\s*Any/i);
      if (match) return parseInt(match[1].replace(/,/g, ""), 10);
    }

    const detailUrl = findDetailUrl(li);
    if (!detailUrl) return null;

    try {
      const url = new URL(detailUrl, window.location.href);
      const price = url.searchParams.get("pz");
      if (!price) return null;
      const value = parseInt(price.replace(/,/g, ""), 10);
      return Number.isFinite(value) ? value : null;
    } catch (_) {
      return null;
    }
  };

  const getLevelInfo = (doc) => {
    const h3 = doc.querySelector("div.card_d header.card h3") || doc.querySelector("h3");
    if (!h3) return null;
    const match = h3.textContent.match(/Lv\s*(\d+)\s*\/\s*(\d+)/i);
    if (!match) return null;
    return {
      level: parseInt(match[1], 10),
      maxLevel: parseInt(match[2], 10),
    };
  };

  const getRarity = (maxLevel) => RARITY_BY_MAX_LEVEL[maxLevel] ?? RARITY.BRONZE;

  const getGrowth = (level, maxLevel, rarity) => {
    const rc = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const t = Math.max(0, (level - 1) / (maxLevel - 1));
    const g = 1 + rc * t;
    return { g, sqrtG: Math.sqrt(g) };
  };

  const estimateLv1Base = (currentTotal, bonus, isHp, level, g, sqrtG) => {
    if (currentTotal <= 0) return 0;
    if (level <= 1) return Math.max(1, currentTotal - bonus);

    const factor = isHp ? sqrtG : g;
    if (!Number.isFinite(factor) || factor <= 0) {
      return Math.max(1, currentTotal - bonus);
    }

    const approx = currentTotal / factor - bonus;
    let best = Math.max(1, Math.floor(approx));
    let bestDiff = Math.abs(Math.floor((best + bonus) * factor) - currentTotal);
    let maxExact = null;
    const start = Math.max(1, Math.floor(approx) - 50);
    const end = Math.floor(approx) + 50;

    for (let cand = start; cand <= end; cand += 1) {
      const sim = Math.floor((cand + bonus) * factor);
      const diff = Math.abs(sim - currentTotal);
      if (sim === currentTotal) {
        if (maxExact === null || cand > maxExact) maxExact = cand;
        continue;
      }
      if (diff < bestDiff) {
        best = cand;
        bestDiff = diff;
      }
    }

    return maxExact !== null ? maxExact : best;
  };

  const getStatusRows = (doc) => {
    const caption = Array.from(doc.querySelectorAll("div.status table caption")).find(
      (node) => node.textContent.trim() === "ステータス"
    );
    if (!caption) return null;
    return Array.from(caption.closest("table").querySelectorAll("tbody tr"));
  };

  const collectStats = (rows, level, g, sqrtG) => {
    const statInfo = {};
    let sumSq = 0;

    rows.forEach((tr) => {
      const th = tr.querySelector("th");
      if (!th) return;

      const label = th.textContent.trim();
      if (!TARGETS.includes(label)) return;

      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) return;

      const isHp = label === "HP";
      const statText = tds[0].textContent.trim();
      const bonusText = tds[1].textContent.trim();
      const parts = statText.split("/");
      const usedPart = isHp && parts.length >= 2 ? parts[1] : parts[0];
      const currentTotal = parseInt(usedPart.replace(/[^\d\-]/g, ""), 10);
      if (Number.isNaN(currentTotal)) return;

      const bonusMatch = bonusText.match(/([+-]?\d+)/);
      const bonus = bonusMatch ? parseInt(bonusMatch[1], 10) : 0;
      const base = estimateLv1Base(currentTotal, bonus, isHp, level, g, sqrtG);
      if (base <= 0) return;

      const ratio = bonus / base;
      sumSq += ratio * ratio;
      statInfo[label] = { base, bonus };
    });

    return { statInfo, sumSq };
  };

  const calcEval = (sumSq) => {
    const raw = Math.sqrt(sumSq / 6) * 200 + 10;
    return Math.floor(raw * 10) / 10;
  };

  const formatPercent = (value) => {
    const rounded = Math.round(value * 10) / 10;
    if (Math.abs(rounded - Math.round(rounded)) < 1e-9) return `${Math.round(rounded)}%`;
    return `${rounded.toFixed(1)}%`;
  };

  const formatStatLine = (label, info) => {
    if (!info) return `${label}: 取得失敗`;
    const percent = info.base === 0 ? null : (info.bonus / info.base) * 100;
    const suffix = percent == null ? "" : ` (${formatPercent(percent)})`;
    return `${label}:${info.base}+${info.bonus}${suffix}`;
  };

  const calcUnitPriceAnyPerPt = (salePriceAny, deliveryPointDisplay) => {
    if (salePriceAny == null || deliveryPointDisplay <= 0) return null;
    return Math.round(salePriceAny / deliveryPointDisplay);
  };

  const getLineContainer = (li) => li.querySelector("a") || li;

  const getOrCreateLine = (li, key) => {
    const container = getLineContainer(li);
    let line = container.querySelector(`.${LINE_CLASS}[data-stat-key="${key}"]`);
    if (line) return line;
    line = document.createElement("p");
    line.className = LINE_CLASS;
    line.dataset.statKey = key;
    const anchor = container.querySelector("div[style*=\"clear:both\"]") || container.querySelector("p:last-of-type");
    if (anchor && anchor.parentNode === container) {
      container.insertBefore(line, anchor);
    } else {
      container.appendChild(line);
    }
    return line;
  };

  const renderLoading = (li) => {
    const line = getOrCreateLine(li, "loading");
    line.textContent = "ステータス: 取得中...";
  };

  const clearLoading = (li) => {
    getLineContainer(li).querySelector(`.${LINE_CLASS}[data-stat-key="loading"]`)?.remove();
  };

  const clearError = (li) => {
    getLineContainer(li).querySelector(`.${LINE_CLASS}[data-stat-key="error"]`)?.remove();
  };

  const renderStats = (li, statInfo, deliveryPointDisplay, unitPriceAnyPerPt, experience) => {
    clearLoading(li);
    clearError(li);
    const line = getOrCreateLine(li, "stats");
    line.replaceChildren();

    [
      ["HP", statInfo.HP],
      ["攻", statInfo["攻撃"]],
      ["魔", statInfo["魔力"]],
      ["防", statInfo["防御"]],
      ["命", statInfo["命中"]],
      ["敏", statInfo["敏捷"]],
      ["納品pt", null],
      ["経験値", null],
    ].forEach(([label, info], index) => {
      const cell = document.createElement("span");
      if (index <= 5) {
        cell.textContent = formatStatLine(label, info);
        if (info && info.base > 0 && (info.bonus / info.base) * 100 > 45) {
          cell.classList.add("is-over-threshold");
        }
      } else if (label === "納品pt") {
        if (unitPriceAnyPerPt != null) {
          cell.textContent = `納品pt:${deliveryPointDisplay} (${unitPriceAnyPerPt}any/pt)`;
        } else {
          cell.textContent = `納品pt:${deliveryPointDisplay}`;
        }
      } else {
        cell.textContent = `経験値:${experience}`;
      }
      line.appendChild(cell);
    });
  };

  const renderError = (li, message) => {
    clearLoading(li);
    clearError(li);
    const line = getOrCreateLine(li, "error");
    line.textContent = `ステータス: ${message}`;
  };

  const getGrade = (doc) => {
    const gradeImg = doc.querySelector('img[src*="/img/menu/grade_"]');
    if (!gradeImg) return null;
    const match = gradeImg.src.match(/grade_(\d+)\.png/i);
    return match ? parseInt(match[1], 10) : null;
  };

  const fetchAndParse = async (url) => {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    return new DOMParser().parseFromString(html, "text/html");
  };

  const buildStatusData = (doc) => {
    const levelInfo = getLevelInfo(doc);
    if (!levelInfo) throw new Error("レベル情報なし");

    const rows = getStatusRows(doc);
    if (!rows) throw new Error("ステータス表なし");

    const rarity = getRarity(levelInfo.maxLevel);
    const { g, sqrtG } = getGrowth(levelInfo.level, levelInfo.maxLevel, rarity);
    const { statInfo, sumSq } = collectStats(rows, levelInfo.level, g, sqrtG);
    const rarityCoeff = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const evalValue = calcEval(sumSq);
    const deliveryPoint = evalValue * rarityCoeff;
    const deliveryPointDisplay = Math.floor(deliveryPoint);
    const grade = getGrade(doc);
    if (!Number.isFinite(grade)) throw new Error("グレード情報なし");
    const expRarityFactor = EXP_COEFF_BY_RARITY[rarity] ?? 1;
    const baseExp = expRarityFactor * grade * ((levelInfo.level + 4) / 5) * 16;
    const experience = Math.floor(baseExp * 1.125);

    return { statInfo, deliveryPoint, deliveryPointDisplay, experience, evalValue };
  };

  const main = async () => {
    ensureStyle();

    const items = getListItems();
    if (!items.length) {
      alert("モンスター一覧画面で実行してください");
      return;
    }

    items.forEach((li) => {
      li.dataset.esMonsterTypeName = getMonsterTypeName(li);
      li.dataset.esMonsterKindOrder = String(getMonsterKindOrder(li));
      if (!li.dataset.esFetched) li.dataset.esFetched = "0";
    });

    const selection = await promptMode(items);
    if (!selection) return;

    const targets =
      selection.mode === "single"
        ? items.filter((li) => li.dataset.esMonsterTypeName === selection.targetName)
        : items;

    if (!targets.length) {
      alert("対象のモンスターが見つかりません。");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    setPanelText(`取得中 0/${targets.length}`);

    for (let index = 0; index < targets.length; index += 1) {
      const li = targets[index];
      const detailUrl = findDetailUrl(li);
      if (!detailUrl) {
        errorCount += 1;
        renderError(li, "詳細リンクなし");
        continue;
      }

      renderLoading(li);
      setPanelText(`取得中 ${index + 1}/${targets.length}`);

      try {
        const doc = await fetchAndParse(detailUrl);
        const salePriceAny = getSalePriceAny(li);
        const { statInfo, deliveryPointDisplay, experience, evalValue } = buildStatusData(doc);
        const unitPriceAnyPerPt = calcUnitPriceAnyPerPt(salePriceAny, deliveryPointDisplay);
        renderStats(li, statInfo, deliveryPointDisplay, unitPriceAnyPerPt, experience);
        li.dataset.esFetched = "1";
        li.dataset.esEvalValue = String(evalValue);
        li.dataset.esUnitPriceAnyPerPt =
          unitPriceAnyPerPt == null ? "" : String(unitPriceAnyPerPt);
        successCount += 1;
      } catch (error) {
        errorCount += 1;
        li.dataset.esFetched = "0";
        li.dataset.esEvalValue = "";
        li.dataset.esUnitPriceAnyPerPt = "";
        renderError(li, `取得失敗 (${error.message})`);
      }

      await sleep(REQUEST_DELAY_MS);
    }

    sortList(items);
    setPanelText(`完了 ${successCount}件 / 失敗 ${errorCount}件`);
    removePanelLater(5000);
  };

  main().catch((error) => {
    setPanelText(`エラー: ${error.message}`);
    removePanelLater(5000);
    alert("エラー: " + error.message);
  });
})();
