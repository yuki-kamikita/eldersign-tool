(() => {
  // 連続アクセスの間隔(ms)
  const DELAY_MS = 700;
  // 進捗表示パネルのID
  const PANEL_ID = "__es_all_skill_order_panel";

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

  // <br> 区切りを保持したテキスト配列を抽出
  const getLinesFromElement = (el) => {
    const lines = [];
    let current = "";

    const flush = () => {
      const text = current.trim();
      if (text) lines.push(text);
      current = "";
    };

    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        current += node.textContent || "";
        return;
      }
      if (node.nodeName === "BR") {
        flush();
        return;
      }
      current += node.textContent || "";
    });

    flush();
    return lines;
  };

  // "名前 LvX" から名前だけを抜き出す
  const parseNameLine = (line) => {
    const nameMatch = line.match(/^(.*)\s+Lv\d+/);
    return normalizeName(nameMatch ? nameMatch[1] : line);
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

  // 画像URLから個体番号を取得(_0g4.png の "0")
  const extractVariantNumber = (src) => {
    if (!src) return null;
    const m = String(src).match(/_(\d+)g\d+\.png/i);
    if (!m) return null;
    const value = parseInt(m[1], 10);
    return Number.isNaN(value) ? null : value;
  };

  // 個体番号を表示名に変換
  const getVariantLabel = (value) => {
    if (value == null) return "";
    if (value === 0) return "原種";
    return `亜種${value}`;
  };

  // "LvX" からレベルを抽出
  const parseLevel = (line) => {
    const m = line.match(/Lv\s*(\d+)/i);
    return m ? parseInt(m[1], 10) : null;
  };

  // 陣営のセルからモンスター一覧を取得
  const parsePartyCell = (td) => {
    const rows = [];
    const ps = td.querySelectorAll("p");
    ps.forEach((p) => {
      const lines = getLinesFromElement(p);
      if (!lines.length) return;
      const nameLine = lines[0];
      const rawName = parseNameLine(nameLine);
      const baseName = getBaseMonsterName(rawName);
      rows.push({ rawName, baseName, level: parseLevel(nameLine) });
    });
    return rows;
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

  const buildPartyMonsters = (rows, dupSet) => {
    return rows.map((row) => {
      const suffix = extractSuffixLetter(row.rawName);
      if (dupSet.has(row.baseName)) {
        return { name: row.baseName, suffix, level: row.level };
      }
      return { name: normalizeName(row.rawName), suffix: null, level: row.level };
    });
  };

  // モンスター名をキーにしたMapを作成
  const buildMonsterMap = (list) => {
    const map = new Map();
    list.forEach((m) => {
      if (!m.name) return;
      const key = `${m.name}__${m.suffix || ""}`;
      map.set(key, {
        name: m.name,
        suffix: m.suffix,
        variant: null,
        level: m.level ?? null,
        imageUrl: null,
        p0Skills: new Set(),
        actionSkills: new Set(),
      });
    });
    return map;
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
        imageUrl: null,
        p0Skills: new Set(),
        actionSkills: new Set(),
      });
    }
    return map.get(key);
  };

  // スキルをモンスターに追加
  const addSkill = (map, name, suffix, variant, skill, isP0, imageUrl) => {
    if (!skill) return;
    const m = ensureMonster(map, name, suffix);
    if (variant != null && m.variant == null) {
      m.variant = variant;
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

  // "○○の攻撃！スキル名" などから行動者とスキルを抽出
  const extractSkillFromEm = (text) => {
    const t = text.trim();
    const attackMatch = t.match(/^(.+?)の攻撃！(.*)$/);
    if (attackMatch) {
      const actor = normalizeName(attackMatch[1]);
      const suffix = extractSuffixLetter(attackMatch[1]);
      let skill = attackMatch[2].trim();
      if (skill.endsWith("！")) skill = skill.slice(0, -1).trim();
      if (!skill) return { actor, suffix, skill: null };
      return { actor, suffix, skill };
    }
    const generalMatch = t.match(/^(.+?)の.+?！(.*)$/);
    if (generalMatch) {
      const actor = normalizeName(generalMatch[1]);
      const suffix = extractSuffixLetter(generalMatch[1]);
      let skill = generalMatch[2].trim();
      if (skill.endsWith("！")) skill = skill.slice(0, -1).trim();
      if (!skill) return { actor, suffix, skill: null };
      return { actor, suffix, skill };
    }
    return null;
  };

  // 支援系のスキル名を抽出
  const extractSupportSkill = (text) => {
    const t = text.trim();
    const m = t.match(/！([^！]+)！/);
    if (m) return m[1].trim();
    const parts = t.split("！");
    if (parts.length >= 2) return parts[1].trim();
    return null;
  };

  // 支援効果っぽい行だけを判定
  const isSupportEffectLine = (line) => {
    if (!line) return false;
    if (!line.includes("は")) return false;
    if (/(効果が無かった|抵抗した|回避した|なんともない|倒れた|解けた)/.test(line))
      return false;
    if (/ダメージ！/.test(line)) return false;
    return /！$/.test(line);
  };

  // "A vs B" から左右のプレイヤー名を取得
  const getPartyTitles = (doc) => {
    const h1 = doc.querySelector("section.btl header.btl h1");
    if (!h1) return { left: "", right: "" };
    const parts = h1.textContent.split("vs");
    if (parts.length < 2) return { left: "", right: "" };
    return {
      left: normalizeName(parts[0]),
      right: normalizeName(parts[1]),
    };
  };

  // 戦闘結果HTMLを解析して左右のモンスター情報を返す
  const parseBattle = (html) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const turnSections = Array.from(doc.querySelectorAll("section.turn"));
    if (!turnSections.length) return null;

    const firstTurn = turnSections[0];
    const partyTable = firstTurn.querySelector("table.party");
    if (!partyTable) return null;

    const partyCells = partyTable.querySelectorAll("tbody tr td");
    if (partyCells.length < 2) return null;

    const leftRows = parsePartyCell(partyCells[0]);
    const rightRows = parsePartyCell(partyCells[1]);
    const dupSet = buildDupSet([...leftRows, ...rightRows]);
    const leftMonsters = buildPartyMonsters(leftRows, dupSet);
    const rightMonsters = buildPartyMonsters(rightRows, dupSet);
    const leftMap = buildMonsterMap(leftMonsters);
    const rightMap = buildMonsterMap(rightMonsters);

    const getVariantFromRound = (roundEl) => {
      let node = roundEl.previousElementSibling;
      while (node) {
        if (node.tagName === "H5") {
          const img = node.querySelector("img");
          return extractVariantNumber(img?.src || "");
        }
        if (node.tagName === "HEADER") break;
        node = node.previousElementSibling;
      }
      return null;
    };

    const getImageFromRound = (roundEl) => {
      let node = roundEl.previousElementSibling;
      while (node) {
        if (node.tagName === "H5") {
          const img = node.querySelector("img");
          return img?.src || "";
        }
        if (node.tagName === "HEADER") break;
        node = node.previousElementSibling;
      }
      return "";
    };

    // 開幕前の支援スキルを抽出
    const preTurnRounds = Array.from(doc.querySelectorAll("p.round")).filter(
      (p) => !p.closest("section.turn"),
    );
    preTurnRounds.forEach((p) => {
      const em = p.querySelector("em");
      if (!em) return;
      const skill = extractSupportSkill(em.textContent);
      if (!skill) return;

      const lines = getLinesFromElement(p);
      const added = new Set();
      lines.forEach((line) => {
        if (!isSupportEffectLine(line)) return;
        const m = line.match(/^(.+?)は(.+?)！$/);
        if (!m) return;
        const rawTarget = normalizeName(m[1]);
        const baseTarget = getBaseMonsterName(rawTarget);
        const suffix = extractSuffixLetter(rawTarget);
        const leftKey = dupSet.has(baseTarget)
          ? `${baseTarget}__${suffix || ""}`
          : `${rawTarget}__`;
        const rightKey = dupSet.has(baseTarget)
          ? `${baseTarget}__${suffix || ""}`
          : `${rawTarget}__`;
        const targetKey = leftMap.has(leftKey) ? leftKey : rightKey;
        if (added.has(targetKey)) return;
        if (leftMap.has(targetKey)) {
          const name = dupSet.has(baseTarget) ? baseTarget : rawTarget;
          const useSuffix = dupSet.has(baseTarget) ? suffix : null;
          addSkill(leftMap, name, useSuffix, null, skill, true, null);
          added.add(targetKey);
        } else if (rightMap.has(targetKey)) {
          const name = dupSet.has(baseTarget) ? baseTarget : rawTarget;
          const useSuffix = dupSet.has(baseTarget) ? suffix : null;
          addSkill(rightMap, name, useSuffix, null, skill, true, null);
          added.add(targetKey);
        }
      });
    });

    // 各ターンの行動ログからスキルを抽出
    turnSections.forEach((section) => {
      const rounds = section.querySelectorAll("p.round");
      rounds.forEach((p) => {
        const variant = getVariantFromRound(p);
        const imageUrl = getImageFromRound(p);
        const ems = p.querySelectorAll("em");
        let parsed = null;
        for (const em of ems) {
          parsed = extractSkillFromEm(em.textContent);
          if (parsed) break;
        }
        if (!parsed || !parsed.actor || !parsed.skill) return;
        const baseActor = getBaseMonsterName(parsed.actor);
        const leftKey = dupSet.has(baseActor)
          ? `${baseActor}__${parsed.suffix || ""}`
          : `${parsed.actor}__`;
        const rightKey = dupSet.has(baseActor)
          ? `${baseActor}__${parsed.suffix || ""}`
          : `${parsed.actor}__`;
        const key = leftMap.has(leftKey) ? leftKey : rightKey;
        if (leftMap.has(key)) {
          const name = dupSet.has(baseActor) ? baseActor : parsed.actor;
          const useSuffix = dupSet.has(baseActor) ? parsed.suffix : null;
          addSkill(leftMap, name, useSuffix, variant, parsed.skill, false, imageUrl);
        } else if (rightMap.has(key)) {
          const name = dupSet.has(baseActor) ? baseActor : parsed.actor;
          const useSuffix = dupSet.has(baseActor) ? parsed.suffix : null;
          addSkill(rightMap, name, useSuffix, variant, parsed.skill, false, imageUrl);
        }
      });
    });

    return {
      leftMap,
      rightMap,
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
    if (memberTable) {
      memberTable.querySelectorAll("tr").forEach((row) => {
        const letterCell = row.querySelector("th.no");
        const nameCell = row.querySelector("td.n a.name");
        if (!letterCell || !nameCell) return;
        const letter = letterCell.textContent.trim();
        const name = normalizeName(nameCell.textContent);
        if (!letter || !name) return;
        nameByLetter.set(letter, name);
        if (!memberOrder.includes(name)) memberOrder.push(name);
      });
    }

    // 名前の揺れを吸収するための参照Map
    const nameLookup = new Map();
    memberOrder.forEach((name) => {
      nameLookup.set(normalizeName(name), name);
    });

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

    // スキルの重なり具合で同一個体か判定
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
      if (instance.variant != null && incoming.variant != null && instance.variant !== incoming.variant) {
        return false;
      }
      // 重複判定はアクティブスキルのみを使用する
      const a = instance.actionSkills;
      const b = incoming.actionSkills;
      const minSize = Math.min(a.size, b.size);
      let overlap = 0;
      a.forEach((skill) => {
        if (b.has(skill)) overlap += 1;
      });
      if (minSize === 0 && b.size === 0) return false;
      const overlapEnough = overlap >= Math.ceil(minSize / 2);
      if (!overlapEnough) return false;
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
          imageUrl: m.imageUrl || null,
          p0Skills: new Set(m.p0Skills),
          actionSkills: new Set(m.actionSkills),
          lastLevel: m.level ?? null,
          lastSeen: matchIndex,
          url: matchUrl,
        };

        let merged = false;
        if (incoming.actionSkills.size > 0) {
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
            if (incoming.imageUrl && !inst.imageUrl) {
              inst.imageUrl = incoming.imageUrl;
            }
            inst.lastSeen = matchIndex;
            merged = true;
            break;
          }
        } else if (instances.length > 0) {
          // アクティブスキルが未判明なら既存に混ぜる
          const inst = instances[0];
          incoming.p0Skills.forEach((skill) => inst.p0Skills.add(skill));
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
          if (incoming.imageUrl && !inst.imageUrl) {
            inst.imageUrl = incoming.imageUrl;
          }
          inst.lastSeen = matchIndex;
          merged = true;
        }

        if (!merged) {
          instances.push({
            name: m.name,
          suffix: m.suffix,
          variant: m.variant,
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
        ["player", "出場回数", "monster", "level", "variant", "image", "A(アクティブ)", "P(コンパニオン)", ...urlHeaders],
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
    })();
  } catch (err) {
    alert("エラー: " + err.message);
  }
})();
