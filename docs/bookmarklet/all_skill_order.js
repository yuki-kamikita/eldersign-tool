(() => {
  // 連続アクセスの間隔(ms)
  const DELAY_MS = 700;
  // 進捗表示パネルのID
  const PANEL_ID = "__es_all_skill_order_panel";
  const SKILL_ORDER_API = "ElderSignSkillOrder";
  const SCRIPT_BASE_URL = document.currentScript?.src
    ? new URL(".", document.currentScript.src).toString()
    : "https://yuki-kamikita.github.io/eldersign-tool/bookmarklet/";
  const MAX_SKILL_COUNT = 5;
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

  // 全角/半角スペースを含む前後の空白を除去
  const normalizeName = (name) => name.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");

  // URLにクエリを追加/更新
  const appendParam = (href, key, value) => {
    try {
      const url = new URL(href, location.href);
      url.searchParams.set(key, value);
      return url.toString();
    } catch (err) {
      return href;
    }
  };

  // 末尾の識別アルファベット(A〜H)を削除した名前
  const getBaseMonsterName = (name) => {
    const trimmed = normalizeName(name || "");
    return trimmed.replace(/[\s\u3000]*[A-IＡ-Ｉ]$/g, "").trim();
  };

  // 末尾の識別アルファベット(A〜H)を取得
  const extractSuffixLetter = (name) => {
    const trimmed = normalizeName(name || "");
    const m = trimmed.match(/([A-IＡ-Ｉ])$/);
    if (!m) return null;
    const c = m[1];
    return String.fromCharCode(c.charCodeAt(0) & 0xffdf);
  };

  // 個体番号を表示名に変換
  const getVariantLabel = (value) => {
    if (value == null) return "";
    if (value === 0) return "原";
    return `亜${value}`;
  };

  const buildDupSet = (rows) => {
    const counts = new Map();
    rows.forEach((row) => {
      counts.set(row.baseName, (counts.get(row.baseName) || 0) + 1);
    });
    const dupSet = new Set();
    counts.forEach((count, baseName) => {
      if (count >= 2) dupSet.add(baseName);
    });
    return dupSet;
  };

  const getRarity = (maxLevel) => RARITY_BY_MAX_LEVEL[maxLevel] ?? RARITY.BRONZE;

  const getGrowth = (level, maxLevel, rarity) => {
    const rc = GROWTH_COEFF_BY_RARITY[rarity] ?? 1.0;
    const t = Math.max(0, (level - 1) / (maxLevel - 1));
    const G = 1 + rc * t;
    return { G, sqrtG: Math.sqrt(G) };
  };

  const estimateLv1Base = (currentTotal, bonus, isHP, level, G, sqrtG) => {
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
  };

  const estimateLv1HpCandidates = (maxHp, level, rarityMaxLevel) => {
    if (!Number.isFinite(maxHp) || maxHp <= 0) return new Set();
    if (!Number.isFinite(level) || level <= 1) return new Set([maxHp]);
    if (!Number.isFinite(rarityMaxLevel) || level > rarityMaxLevel) return new Set();

    const rarity = getRarity(rarityMaxLevel);
    const { G, sqrtG } = getGrowth(level, rarityMaxLevel, rarity);
    const lv1Hp = estimateLv1Base(maxHp, 0, true, level, G, sqrtG);
    return lv1Hp > 0 ? new Set([lv1Hp]) : new Set();
  };

  const hasIntersection = (left, right) => {
    if (!left?.size || !right?.size) return false;
    for (const value of left) {
      if (right.has(value)) return true;
    }
    return false;
  };

  const unionSize = (left, right) => {
    const merged = new Set(left || []);
    (right || []).forEach((value) => merged.add(value));
    return merged.size;
  };

  // モンスターが未登録なら追加して返す
  const ensureMonster = (map, name, suffix) => {
    const key = `${name}__${suffix || ""}`;
    if (!map.has(key)) {
      map.set(key, {
        name,
        suffix,
        variant: null,
        level: null,
        rarityMaxLevel: null,
        maxHp: null,
        lv1HpCandidates: new Set(),
        imageUrl: null,
        p0Skills: new Set(),
        actionSkills: new Set(),
      });
    }
    return map.get(key);
  };

  // スキルをモンスターに追加
  const addSkill = (map, name, suffix, variant, rarityMaxLevel, skill, isP0, imageUrl) => {
    if (!skill) return;
    const m = ensureMonster(map, name, suffix);
    if (variant != null && m.variant == null) {
      m.variant = variant;
    }
    if (rarityMaxLevel != null && m.rarityMaxLevel == null) {
      m.rarityMaxLevel = rarityMaxLevel;
      m.lv1HpCandidates = estimateLv1HpCandidates(m.maxHp, m.level, m.rarityMaxLevel);
    }
    if (m.imageUrl == null && imageUrl) {
      m.imageUrl = imageUrl;
    }
    if (isP0) {
      m.p0Skills.add(skill);
    } else {
      m.actionSkills.add(skill);
    }
  };

  const loadSkillOrderApi = () => {
    if (window[SKILL_ORDER_API]) return Promise.resolve(window[SKILL_ORDER_API]);
    if (window.__ES_SKILL_ORDER_LOADING) return window.__ES_SKILL_ORDER_LOADING;

    window.__ES_SKILL_ORDER_NO_AUTO_RUN = true;
    window.__ES_SKILL_ORDER_LOADING = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("skill_order.js", SCRIPT_BASE_URL).toString();
      script.onload = () => {
        delete window.__ES_SKILL_ORDER_NO_AUTO_RUN;
        if (window[SKILL_ORDER_API]) {
          resolve(window[SKILL_ORDER_API]);
          return;
        }
        reject(new Error("skill_order.js の読み込みに失敗しました。"));
      };
      script.onerror = () => {
        delete window.__ES_SKILL_ORDER_NO_AUTO_RUN;
        reject(new Error("skill_order.js の読み込みに失敗しました。"));
      };
      document.head.appendChild(script);
    });
    return window.__ES_SKILL_ORDER_LOADING;
  };

  const getRowsFromInfo = (info) => {
    return info.order
      .map((name) => info.map.get(name))
      .filter(Boolean)
      .map((m) => ({
        rawName: m.name,
        baseName: getBaseMonsterName(m.name),
        level: m.level,
        maxHp: m.maxHp,
      }));
  };

  const convertSkillOrderInfo = (info, dupSet, maxTurn) => {
    const map = new Map();
    info.order.forEach((rawName) => {
      const source = info.map.get(rawName);
      if (!source) return;
      const baseName = getBaseMonsterName(source.name);
      const suffix = extractSuffixLetter(source.name);
      const name = dupSet.has(baseName) ? baseName : source.name;
      const useSuffix = dupSet.has(baseName) ? suffix : null;
      const target = ensureMonster(map, name, useSuffix);
      if (source.level != null) target.level = source.level;
      if (source.maxHp != null) {
        target.maxHp = source.maxHp;
        target.lv1HpCandidates = estimateLv1HpCandidates(
          target.maxHp,
          target.level,
          target.rarityMaxLevel,
        );
      }

      const p0Details =
        source.turnDetails?.[0] || (source.turns?.[0] || []).map((skill) => ({ skill }));
      p0Details.forEach((detail) => {
        addSkill(map, name, useSuffix, null, null, detail.skill, true, null);
      });

      for (let turn = 1; turn <= maxTurn; turn += 1) {
        const details =
          source.turnDetails?.[turn] || (source.turns?.[turn] || []).map((skill) => ({ skill }));
        details.forEach((detail) => {
          addSkill(
            map,
            name,
            useSuffix,
            detail.variant ?? null,
            detail.rarityMaxLevel ?? null,
            detail.skill,
            false,
            detail.imageUrl || null,
          );
        });
      }
    });
    return map;
  };

  // 戦闘結果HTMLを解析して左右のモンスター情報を返す
  const parseBattle = (html) => {
    const api = window[SKILL_ORDER_API];
    if (!api) throw new Error("skill_order.js が読み込まれていません。");

    let parsed;
    try {
      parsed = api.parseBattleHtml(html);
    } catch (err) {
      return null;
    }

    const leftRows = getRowsFromInfo(parsed.leftInfo);
    const rightRows = getRowsFromInfo(parsed.rightInfo);
    const dupSet = buildDupSet([...leftRows, ...rightRows]);

    return {
      leftMap: convertSkillOrderInfo(parsed.leftInfo, dupSet, parsed.maxTurn),
      rightMap: convertSkillOrderInfo(parsed.rightInfo, dupSet, parsed.maxTurn),
    };
  };

  // 簡易スリープ
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // 進捗表示パネルを作成
  const buildPanel = () => {
    document.getElementById(PANEL_ID)?.remove();
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.style.cssText =
      "position:fixed;top:10px;right:10px;z-index:99999;" +
      "background:rgba(0,0,0,.8);color:#fff;padding:10px 12px;" +
      "border-radius:8px;font-family:monospace;font-size:12px;" +
      "max-width:calc(100% - 20px);";
    panel.textContent = "準備中...";
    document.body.appendChild(panel);
    return panel;
  };

  // CSV用のエスケープ
  const csvEscape = (value) => {
    const text = value == null ? "" : String(value);
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  // CSVをダウンロード
  const downloadCsv = (rows, filename) => {
    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  try {
    const matchTable = document.querySelector("table.match");
    if (!matchTable) {
      alert("ランクマッチの対戦表で実行してください。");
      return;
    }

    // ランク表からプレイヤー名と並び順を取得
    const memberTable = document.querySelector("table.rank");
    const memberOrder = [];
    const nameByLetter = new Map();
    const letterByName = new Map();
    if (memberTable) {
      memberTable.querySelectorAll("tr").forEach((row) => {
        const letterCell = row.querySelector("th.no");
        const nameCell = row.querySelector("td.n a.name");
        if (!letterCell || !nameCell) return;
        const letter = letterCell.textContent.trim();
        const name = normalizeName(nameCell.textContent);
        if (!letter || !name) return;
        nameByLetter.set(letter, name);
        letterByName.set(name, letter);
        if (!memberOrder.includes(name)) memberOrder.push(name);
      });
    }

    // 対戦表のヘッダ(A〜L)を取得
    const headerRow = matchTable.querySelector("tr");
    const headerLetters = Array.from(headerRow.querySelectorAll("th.no")).map((cell) =>
      cell.textContent.trim(),
    );
    const letterIndex = new Map();
    headerLetters.forEach((letter, idx) => {
      if (letter) letterIndex.set(letter, idx);
    });

    // 対戦リンクを集める(重複を除いた66戦)
    const rows = Array.from(matchTable.querySelectorAll("tr")).slice(1);
    const matches = [];
    const seen = new Set();

    rows.forEach((row) => {
      const rowLetterCell = row.querySelector("th.no");
      if (!rowLetterCell) return;
      const rowLetter = rowLetterCell.textContent.trim();
      const rowIdx = letterIndex.get(rowLetter);
      if (rowIdx == null) return;
      const cells = Array.from(row.children).slice(1);
      cells.forEach((cell, idx) => {
        const colLetter = headerLetters[idx];
        const colIdx = letterIndex.get(colLetter);
        if (colIdx == null) return;
        // 反対側の重複を避けるため上三角のみ
        if (rowIdx >= colIdx) return;
        const link = cell.querySelector("a");
        if (!link) return;
        const key = `${rowLetter}-${colLetter}`;
        if (seen.has(key)) return;
        seen.add(key);
        matches.push({
          leftLetter: rowLetter,
          rightLetter: colLetter,
          url: appendParam(link.href, "t", "1"),
        });
      });
    });

    if (!matches.length) {
      alert("取得できる対戦リンクがありません。");
      return;
    }

    // 進捗パネルと結果格納
    const panel = buildPanel();
    const total = matches.length;
    const errors = [];
    // playerName -> Map(monsterName -> {levels, skills})
    const results = new Map();

    // プレイヤーの結果Mapを確保
    const ensurePlayer = (name) => {
      if (!results.has(name)) results.set(name, new Map());
      return results.get(name);
    };

    // HPとスキル上限で同一個体か判定
    const isSameInstance = (instance, incoming, matchIndex) => {
      // 同一戦闘内でABCが違う場合は別個体扱い
      if (
        matchIndex === instance.lastSeen &&
        instance.suffix &&
        incoming.suffix &&
        instance.suffix !== incoming.suffix
      ) {
        return false;
      }
      // 原種/亜種が違うなら別個体
      if (
        instance.variant != null &&
        incoming.variant != null &&
        instance.variant !== incoming.variant
      ) {
        return false;
      }
      // 同一モンスターが同時に覚えられるアクティブスキルは5つまで
      if (unionSize(instance.actionSkills, incoming.actionSkills) > MAX_SKILL_COUNT) {
        return false;
      }
      const hasHpInfo = instance.lv1HpCandidates?.size && incoming.lv1HpCandidates?.size;
      if (hasHpInfo) {
        return hasIntersection(instance.lv1HpCandidates, incoming.lv1HpCandidates);
      }
      return true;
    };

    // 戦闘結果のモンスター情報をプレイヤーに統合
    const mergePlayerMap = (playerName, map, matchIndex, matchUrl) => {
      const player = ensurePlayer(playerName);
      map.forEach((m) => {
        const key = m.name;
        if (!player.has(key)) player.set(key, []);
        const instances = player.get(key);
        const incoming = {
          name: m.name,
          suffix: m.suffix,
          variant: m.variant,
          level: m.level ?? null,
          rarityMaxLevel: m.rarityMaxLevel ?? null,
          maxHp: m.maxHp ?? null,
          lv1HpCandidates: new Set(m.lv1HpCandidates || []),
          imageUrl: m.imageUrl || null,
          p0Skills: new Set(m.p0Skills),
          actionSkills: new Set(m.actionSkills),
          lastLevel: m.level ?? null,
          lastSeen: matchIndex,
          url: matchUrl,
        };

        let merged = false;
        for (const inst of instances) {
          if (!isSameInstance(inst, incoming, matchIndex)) continue;
          incoming.p0Skills.forEach((skill) => inst.p0Skills.add(skill));
          incoming.actionSkills.forEach((skill) => inst.actionSkills.add(skill));
          if (!inst.urls) inst.urls = new Set();
          if (incoming.url) inst.urls.add(incoming.url);
          if (incoming.level != null) {
            inst.maxLevel =
              inst.maxLevel == null ? incoming.level : Math.max(inst.maxLevel, incoming.level);
            inst.lastLevel = incoming.level;
          }
          if (incoming.variant != null) {
            inst.variant = incoming.variant;
          }
          if (incoming.rarityMaxLevel != null) {
            inst.rarityMaxLevel = incoming.rarityMaxLevel;
          }
          if (incoming.maxHp != null) {
            inst.maxHp = incoming.maxHp;
          }
          incoming.lv1HpCandidates.forEach((hp) => inst.lv1HpCandidates.add(hp));
          if (incoming.imageUrl && !inst.imageUrl) {
            inst.imageUrl = incoming.imageUrl;
          }
          inst.lastSeen = matchIndex;
          merged = true;
          break;
        }

        if (!merged) {
          instances.push({
            name: m.name,
            suffix: m.suffix,
            variant: m.variant,
            rarityMaxLevel: incoming.rarityMaxLevel,
            maxHp: incoming.maxHp,
            lv1HpCandidates: new Set(incoming.lv1HpCandidates),
            imageUrl: incoming.imageUrl,
            p0Skills: new Set(incoming.p0Skills),
            actionSkills: new Set(incoming.actionSkills),
            maxLevel: incoming.level ?? null,
            lastLevel: incoming.level ?? null,
            lastSeen: matchIndex,
            urls: incoming.url ? new Set([incoming.url]) : new Set(),
          });
        }
      });
    };

    (async () => {
      await loadSkillOrderApi();

      // 66試合を順次取得
      for (let i = 0; i < matches.length; i += 1) {
        const match = matches[i];
        panel.textContent = `取得中 ${i + 1}/${total}`;
        try {
          const response = await fetch(match.url, { credentials: "include" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const html = await response.text();
          const parsed = parseBattle(html);
          if (!parsed) {
            errors.push(`${match.leftLetter}-${match.rightLetter}: 未完了`);
          } else {
            // 左右はA〜Lの若い順で固定する
            const leftKey = nameByLetter.get(match.leftLetter) || match.leftLetter;
            const rightKey = nameByLetter.get(match.rightLetter) || match.rightLetter;
            mergePlayerMap(rightKey, parsed.leftMap, i, match.url);
            mergePlayerMap(leftKey, parsed.rightMap, i, match.url);
          }
        } catch (err) {
          errors.push(`${match.leftLetter}-${match.rightLetter}: ${err.message}`);
        }
        await sleep(DELAY_MS);
      }

      // CSV形式で出力
      const urlHeaders = [];
      for (let i = 1; i <= 11; i += 1) {
        urlHeaders.push(`url${String(i).padStart(2, "0")}`);
      }
      const rows = [
        ["player", "letter", "出場回数", "monster", "level", "variant", "image", "A(アクティブ)", "P(コンパニオン)", ...urlHeaders],
      ];
      const playerNames = memberOrder.length ? memberOrder.slice() : [];
      // 結果ページからしか取れなかったプレイヤーも含める
      Array.from(results.keys()).forEach((name) => {
        if (!playerNames.includes(name)) playerNames.push(name);
      });
      playerNames.forEach((playerName) => {
        const monsters = results.get(playerName);
        if (!monsters) return;
        Array.from(monsters.entries()).forEach(([monsterName, instances]) => {
          const sorted = instances.slice().sort((a, b) => {
            const aLabel = a.variant ?? -1;
            const bLabel = b.variant ?? -1;
            return aLabel - bLabel;
          });
          sorted.forEach((monster, index) => {
            const displayName =
              sorted.length > 1 ? `${monsterName} (${index + 1})` : monsterName;
            const level = monster.maxLevel != null ? monster.maxLevel : "";
            const variantLabel = getVariantLabel(monster.variant);
            const p0 = Array.from(monster.p0Skills).sort().join(" / ");
            const action = Array.from(monster.actionSkills).sort().join(" / ");
            const imageCell = monster.imageUrl ? monster.imageUrl : "";
            const urlList = Array.from(monster.urls || []);
            const appearances = urlList.length;
            const urlColumns = [];
            for (let i = 0; i < 11; i += 1) {
              urlColumns.push(urlList[i] || "");
            }
            rows.push([
              playerName,
              letterByName.get(playerName) || "",
              appearances,
              displayName,
              level,
              variantLabel,
              imageCell,
              action,
              p0,
              ...urlColumns,
            ]);
          });
        });
      });

      // ファイル名に日時を付与
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        "_",
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
      ].join("");
      downloadCsv(rows, `rankmatch_skill_list_${stamp}.csv`);

      // 完了通知
      panel.textContent = `完了: ${total}件 / エラー: ${errors.length}`;
      if (errors.length) {
        console.warn("取得エラー", errors);
      }
      setTimeout(() => panel.remove(), 5000);
    })().catch((err) => {
      panel.textContent = `エラー: ${err.message}`;
      alert("エラー: " + err.message);
    });
  } catch (err) {
    alert("エラー: " + err.message);
  }
})();
