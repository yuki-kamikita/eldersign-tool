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

  const TOOL_URL = "https://yuki-kamikita.github.io/eldersign-tool/web/skill_inherit.html";
  // const TOOL_URL = "http://localhost:8080/docs/web/skill_inherit.html";

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

  function getCardVariant() {
    const card = document.querySelector("img#card");
    if (!card || !card.src) return null;
    const match = card.src.match(/_(\d)g\d+/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }

  function downgradeRarity(rarity) {
    switch (rarity) {
      case RARITY.PLATINUM:
        return RARITY.GOLD;
      case RARITY.GOLD:
        return RARITY.SILVER;
      case RARITY.SILVER:
        return RARITY.BRONZE;
      default:
        return rarity;
    }
  }

  function getOriginRarity(maxLevel, variant) {
    const current = getRarity(maxLevel);
    if (variant === 0) return current;
    if (variant === 1 || variant === 2) return downgradeRarity(current);
    return current;
  }

  function normalizeName(name) {
    return name.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  }

  function getSkillInfo() {
    const card = document.querySelector("div.card_d");
    const scope = card || document;
    const caps = [...scope.querySelectorAll("table caption")];
    const cap =
      caps.find((c) => c.textContent.trim().startsWith("作戦")) ||
      caps.find((c) => c.textContent.trim() === "スキル");
    if (!cap) return [];

    const table = cap.closest("table");
    if (!table) return [];

    const rows = [...table.querySelectorAll("tbody tr")];
    const skills = [];
    rows.forEach((tr) => {
      const link = tr.querySelector("a");
      if (!link) return;
      const name = normalizeName(link.textContent || "スキル");
      const text = tr.textContent.replace(/\s+/g, " ").trim();
      const lvMatch = text.match(/Lv\s*(\d+)/i);
      if (!lvMatch) return;
      const level = parseInt(lvMatch[1], 10);
      if (!Number.isFinite(level)) return;
      skills.push({ name, level });
    });

    return skills;
  }

  function buildToolUrl(levelInfo, rarity, skills) {
    const params = new URLSearchParams();

    const rarityMap = {
      [RARITY.BRONZE]: "bronze",
      [RARITY.SILVER]: "silver",
      [RARITY.GOLD]: "gold",
      [RARITY.PLATINUM]: "gold",
    };

    const rarityValue = rarityMap[rarity];
    if (rarityValue) params.set("rarity", rarityValue);

    params.set("current_lv", String(levelInfo.level));
    params.set("max_lv", String(levelInfo.maxLevel));

    if (skills.length > 0) {
      const clampLv = (lv) => Math.max(1, Math.min(10, lv));
      const levels = skills.map((skill) => clampLv(skill.level));
      const names = skills.map((skill) => skill.name);
      params.set("normal_lv", levels.join(","));
      params.set("latent_lv", levels.join(","));
      params.set("normal_name", names.join(","));
      params.set("latent_name", names.join(","));
    }

    const query = params.toString();
    return query ? `${TOOL_URL}?${query}` : TOOL_URL;
  }

  try {
    const levelInfo = getLevelInfo();
    if (!levelInfo) return;

    const variant = getCardVariant();
    const rarity = getOriginRarity(levelInfo.maxLevel, variant);
    const skills = getSkillInfo();
    const url = buildToolUrl(levelInfo, rarity, skills);
    window.open(url, "_blank", "noopener");
  } catch (e) {
    alert("エラー: " + e.message);
  }
})();
