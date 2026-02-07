(() => {
      const common = window.EldersignToolCommon || {};
      const readNumber = common.readNumber || ((input, fallback = 0) => {
        const value = Number(input && input.value);
        return Number.isFinite(value) ? value : fallback;
      });
      const renderResultPairs = common.renderResultPairs || ((container, pairs, options = {}) => {
        if (!container) return;
        const itemClass = options.itemClass || "result-pair-item";
        const labelClass = options.labelClass || "result-label";
        const valueClass = options.valueClass || "result-value";
        container.innerHTML = "";
        (pairs || []).forEach((pair) => {
          const item = document.createElement("div");
          item.className = itemClass;
          const label = document.createElement("div");
          label.className = labelClass;
          label.textContent = pair && pair.label != null ? String(pair.label) : "";
          const value = document.createElement("div");
          value.className = valueClass;
          value.textContent = pair && pair.value != null ? String(pair.value) : "-";
          item.append(label, value);
          container.appendChild(item);
        });
      });
      const setChipValue = common.setChipValue || ((input, value) => {
        if (!input || value == null) return;
        const strValue = String(value);
        input.value = strValue;
        const group = document.querySelector(`.chip-group[data-chip-target="${input.id}"]`);
        if (!group) return;
        group.querySelectorAll(".chip-button").forEach((button) => {
          const isActive = button.dataset.value === strValue;
          button.classList.toggle("is-active", isActive);
        });
      });
      const bindChipGroups = common.bindChipGroups || ((onChange) => {
        document.querySelectorAll(".chip-group").forEach((group) => {
          group.addEventListener("click", (event) => {
            const button = event.target.closest(".chip-button");
            if (!button || !group.contains(button)) return;
            const targetId = group.dataset.chipTarget;
            if (!targetId) return;
            const input = document.getElementById(targetId);
            if (!input) return;
            setChipValue(input, button.dataset.value);
            if (typeof onChange === "function") onChange(input, button.dataset.value, group);
          });
        });
      });

      const STORAGE_KEY = "eldersign_skill_inherit_bonus";
      const inputs = {
        familyMatch: document.getElementById("family-match"),
        rarity: document.getElementById("rarity"),
        normalSkillList: document.getElementById("normal-skill-list"),
        normalSkillAdd: document.getElementById("normal-skill-add"),
        latentSkillList: document.getElementById("latent-skill-list"),
        latentSkillAdd: document.getElementById("latent-skill-add"),
        currentLv: document.getElementById("current-lv"),
        maxLv: document.getElementById("max-lv"),
        bonusSilver: document.getElementById("bonus-silver"),
        bonusBoost: document.getElementById("bonus-boost"),
        bonusLamp: document.getElementById("bonus-lamp"),
      };

      const outputs = {
        summaryList: document.getElementById("summary-result-list"),
        detailList: document.getElementById("detail-result-list"),
        resultSummary: document.getElementById("result-summary"),
        resultDetail: document.getElementById("result-detail-panel"),
      };

      // 小数1桁で切り捨てる。
      function truncate1(value) {
        return Math.trunc(value * 10) / 10;
      }

      // Lv選択用のselect要素を生成する。
      function buildSkillSelect(value) {
        const select = document.createElement("select");
        for (let i = 1; i <= 10; i += 1) {
          const opt = document.createElement("option");
          opt.value = String(i);
          opt.textContent = String(i);
          select.appendChild(opt);
        }
        if (value != null) select.value = String(value);
        return select;
      }

      // スキル名入力とLv選択・削除ボタンを持つ1行を生成する。
      function createSkillRow(initialValue, nameValue) {
        const row = document.createElement("div");
        row.className = "repeat-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.placeholder = "スキル名";
        if (nameValue) nameInput.value = nameValue;
        const select = buildSkillSelect(initialValue ?? 1);
        row.appendChild(nameInput);
        row.appendChild(select);
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "icon-button";
        remove.setAttribute("aria-label", "削除");
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined";
        icon.textContent = "delete";
        remove.appendChild(icon);
        row.appendChild(remove);
        return { row, nameInput, select, remove };
      }

      // スキル行を追加し、必要なイベントを紐付ける。
      function appendSkillRow(container, initialValue, nameValue) {
        const { row, nameInput, select, remove } = createSkillRow(initialValue, nameValue);
        container.appendChild(row);
        nameInput.addEventListener("input", updateResult);
        select.addEventListener("change", updateResult);
        remove.addEventListener("click", () => {
          row.remove();
          ensureMinRow(container);
          updateResult();
        });
        return row;
      }

      // 行が0件になったとき最低1行を補充する。
      function ensureMinRow(container) {
        if (!container) return;
        if (container.querySelector(".repeat-row")) return;
        appendSkillRow(container, 1, "");
      }

      // 入力行からスキル名とLvの配列を抽出する。
      function getSkillEntries(container) {
        const entries = [];
        container.querySelectorAll(".repeat-row").forEach((row) => {
          const nameInput = row.querySelector("input");
          const select = row.querySelector("select");
          if (!select) return;
          const lv = parseInt(select.value, 10);
          if (!Number.isFinite(lv)) return;
          const name = nameInput ? nameInput.value.trim() : "";
          entries.push({ level: lv, name });
        });
        return entries;
      }

      // レアリティによる固定補正値を返す。
      function calcAlpha(rarity) {
        switch (rarity) {
          case "bronze":
            return 5;
          case "silver":
            return 2;
          default:
            return 0;
        }
      }

      // 各種チェック状態から合計補正値を計算する。
      function calcBonus() {
        let bonus = 0;
        if (inputs.bonusSilver.checked) bonus += 5;
        if (inputs.bonusBoost.checked) bonus += 20;
        if (inputs.bonusLamp.checked) bonus += 45;
        return bonus;
      }

      // 補正チェック状態をlocalStorageから復元する。
      function loadBonusSettings() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (typeof parsed !== "object" || parsed == null) return;
          if (typeof parsed.silver === "boolean") {
            inputs.bonusSilver.checked = parsed.silver;
          }
          if (typeof parsed.boost === "boolean") {
            inputs.bonusBoost.checked = parsed.boost;
          }
          if (typeof parsed.lamp === "boolean") {
            inputs.bonusLamp.checked = parsed.lamp;
          }
        } catch (e) {
          return;
        }
      }

      // URLパラメータの真偽値表現をbooleanへ変換する。
      function parseBooleanParam(value) {
        if (value == null) return null;
        if (value === "1" || value === "true") return true;
        if (value === "0" || value === "false") return false;
        return null;
      }

      // カンマ区切り文字列をスキル名配列へ変換する。
      function parseNameList(value) {
        if (!value) return [];
        return value
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name.length > 0);
      }

      // 指定コンテナへスキル行一覧を再構築する。
      function setSkillList(container, entries) {
        container.innerHTML = "";
        const list = entries.length > 0 ? entries : [{ level: 1, name: "" }];
        list.forEach((entry, index) => {
          appendSkillRow(container, entry.level, entry.name);
        });
      }

      // URLパラメータから画面入力を復元する。
      function applyParams(params) {
        if (!params) return;

        const family = params.get("family");
        if (family === "same" || family === "diff") {
          setChipValue(inputs.familyMatch, family);
        }

        const rarityParam = params.get("rarity");
        if (rarityParam) setChipValue(inputs.rarity, rarityParam);

        const allNames = parseNameList(params.get("skill_name") ?? "");
        const normalNames = parseNameList(params.get("normal_name") ?? "");
        const latentNames = parseNameList(params.get("latent_name") ?? "");
        const normalNameList = normalNames.length > 0 ? normalNames : allNames;
        const latentNameList = latentNames.length > 0 ? latentNames : allNames;

        const normalParam = params.get("normal_lv") ?? "";
        const normalValues = normalParam
          .split(",")
          .map((value) => parseInt(value, 10))
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.max(1, Math.min(10, value)));
        const normalCount = Math.max(normalValues.length, normalNameList.length, 1);
        const normalEntries = Array.from({ length: normalCount }, (_, i) => ({
          level: normalValues[i] ?? 1,
          name: normalNameList[i] ?? "",
        }));
        setSkillList(inputs.normalSkillList, normalEntries);

        const latentParam = params.get("latent_lv") ?? "";
        const latentValues = latentParam
          .split(",")
          .map((value) => parseInt(value, 10))
          .filter((value) => Number.isFinite(value))
          .map((value) => Math.max(1, Math.min(10, value)));
        const latentCount = Math.max(latentValues.length, latentNameList.length, 1);
        const latentEntries = Array.from({ length: latentCount }, (_, i) => ({
          level: latentValues[i] ?? 1,
          name: latentNameList[i] ?? "",
        }));
        setSkillList(inputs.latentSkillList, latentEntries);

        const currentLv = parseInt(params.get("current_lv"), 10);
        if (Number.isFinite(currentLv)) inputs.currentLv.value = String(currentLv);

        const maxLv = parseInt(params.get("max_lv"), 10);
        if (Number.isFinite(maxLv)) setChipValue(inputs.maxLv, maxLv);

        const silver = parseBooleanParam(params.get("bonus_silver"));
        if (silver != null) inputs.bonusSilver.checked = silver;

        const boost = parseBooleanParam(params.get("bonus_boost"));
        if (boost != null) inputs.bonusBoost.checked = boost;

        const lamp = parseBooleanParam(params.get("bonus_lamp"));
        if (lamp != null) inputs.bonusLamp.checked = lamp;
      }

      // 補正チェック状態をlocalStorageへ保存する。
      function saveBonusSettings() {
        const payload = {
          silver: inputs.bonusSilver.checked,
          boost: inputs.bonusBoost.checked,
          lamp: inputs.bonusLamp.checked,
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          return;
        }
      }

      // 継承率の基礎値（補正前）を算出する。
      function calcInheritBase(isSameFamily, isLatent, skillLv, alpha) {
        if (skillLv <= 0) return null;
        if (isSameFamily) {
          return (isLatent ? 6 : 9.5) * skillLv + alpha;
        }
        return (isLatent ? 5 : 9) * skillLv + alpha;
      }

      // 率表示を%文字列に整形する。
      function formatRate(value) {
        if (value == null) return "-";
        return `${value.toFixed(1)}%`;
      }

      // 1スキル分の率計算結果を表示用データへ変換する。
      function buildSkillResult(entry, baseCoeff, alpha, bonus, isSameFamily, isLatent) {
        const lv = entry.level;
        const base = calcInheritBase(isSameFamily, isLatent, lv, alpha);
        const total = base == null ? null : Math.min(100, Math.max(0, truncate1(base + bonus)));
        const name = entry.name;
        const label = name ? `${name} Lv${lv}` : `Lv${lv}`;
        const lvValue = truncate1(lv * baseCoeff).toFixed(1);
        const meta = `スキルLv ${lvValue}% + レアリティ ${alpha}% + 補正 ${truncate1(bonus).toFixed(1)}%`;
        return {
          label,
          rateText: formatRate(total),
          rateValue: total,
          meta,
        };
      }

      // 詳細表示用のフラットな行リストを描画する。
      function renderDetailEntries(listEl, items) {
        listEl.innerHTML = "";
        if (!items || items.length === 0) {
          const empty = document.createElement("div");
          empty.className = "result-detail-entry";
          empty.textContent = "スキルLvを追加してください。";
          listEl.appendChild(empty);
          return;
        }

        items.forEach((itemData) => {
          const item = document.createElement("div");
          item.className = "result-detail-entry";
          if (itemData.dividerBefore) item.classList.add("is-group-divider");

          const row = document.createElement("div");
          row.className = "result-row";

          const label = document.createElement("div");
          label.className = "result-label";
          label.textContent = itemData.label;

          const meta = document.createElement("div");
          meta.className = "result-detail-meta";
          meta.textContent = itemData.meta || "-";

          row.append(label);
          item.append(row, meta);
          listEl.appendChild(item);
        });
      }

      // 出力カードの詳細表示をタップ/キー操作で開閉できるようにする。
      function bindResultAccordion(summaryEl, detailEl) {
        if (!summaryEl || !detailEl) return;
        const toggle = () => {
          const expanded = summaryEl.getAttribute("aria-expanded") === "true";
          summaryEl.setAttribute("aria-expanded", expanded ? "false" : "true");
          detailEl.classList.toggle("is-hidden", expanded);
        };
        summaryEl.addEventListener("click", toggle);
        summaryEl.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggle();
        });
      }

      // 継承率・発現率・早見表ハイライトをまとめて更新する。
      function updateResult() {
        const isSameFamily = inputs.familyMatch.value === "same";
        const alpha = calcAlpha(inputs.rarity.value);
        const bonus = calcBonus();
        const rarityLabelMap = {
          bronze: "銅",
          silver: "銀",
          gold: "金",
        };
        const selectedLabel = rarityLabelMap[inputs.rarity.value];
        const maxLvLabelMap = {
          30: "銅",
          50: "銀",
          70: "金",
          90: "プラチナ",
        };
        const maxLvLabel = maxLvLabelMap[Number(readNumber(inputs.maxLv))] || "";
        document.querySelectorAll("table.note-table tbody tr").forEach((row) => {
          const table = row.closest("table.note-table");
          const tableType = table ? table.dataset.table : "";
          const labelCell = row.querySelector("td");
          const label = labelCell ? labelCell.textContent.trim() : "";
          const targetLabel = tableType === "appearance" ? maxLvLabel : selectedLabel;
          const isMatch =
            label === targetLabel ||
            (targetLabel && (label.startsWith(`${targetLabel}(`) || label.startsWith(targetLabel)));
          row.classList.toggle("is-active", isMatch);
        });
        const normalEntries = getSkillEntries(inputs.normalSkillList);
        const latentEntries = getSkillEntries(inputs.latentSkillList);
        const normalResults = normalEntries.map((entry) =>
          buildSkillResult(entry, 9.5, alpha, bonus, isSameFamily, false)
        );
        const latentResults = latentEntries.map((entry) =>
          buildSkillResult(entry, 6, alpha, bonus, isSameFamily, true)
        );

        const currentLv = readNumber(inputs.currentLv);
        const maxLv = readNumber(inputs.maxLv);
        let appearanceBase = null;
        let appearanceLevel = null;
        if (maxLv > 0) {
          appearanceLevel = (currentLv / maxLv) * 100;
          appearanceBase = appearanceLevel + alpha;
        }

        const appearanceTotal =
          appearanceBase == null
            ? null
            : Math.min(100, Math.max(0, truncate1(appearanceBase + bonus)));

        const summaryPairs = [
          ...normalResults.map((result) => ({
            label: `(通常)${result.label}`,
            value: result.rateText,
          })),
          ...latentResults.map((result) => ({
            label: `(潜在)${result.label}`,
            value: result.rateText,
          })),
          { label: "潜在発現率", value: formatRate(appearanceTotal) },
        ];
        const summaryDividerIndexes = [
          normalResults.length,
          normalResults.length + latentResults.length,
        ];
        const detailItems = [
          ...normalResults.map((result) => ({
            label: `(通常)${result.label}`,
            meta: `${result.meta} = ${result.rateText}`,
            dividerBefore: false,
          })),
          ...latentResults.map((result) => ({
            label: `(潜在)${result.label}`,
            meta: `${result.meta} = ${result.rateText}`,
            dividerBefore: false,
          })),
          {
            label: "潜在発現率",
            meta:
              appearanceBase == null
                ? "現Lv/最高Lvを入力してください。"
                : `レベル ${truncate1(appearanceLevel).toFixed(1)}% + レアリティ ${alpha}% + 補正 ${truncate1(bonus).toFixed(1)}% = ${formatRate(appearanceTotal)}`,
            dividerBefore: false,
          },
        ];
        renderResultPairs(outputs.summaryList, summaryPairs, { itemClass: "result-row" });
        Array.from(outputs.summaryList.querySelectorAll(".result-row")).forEach((row, index) => {
          row.classList.toggle("is-group-divider", summaryDividerIndexes.includes(index));
        });
        if (detailItems[normalResults.length]) detailItems[normalResults.length].dividerBefore = true;
        if (detailItems[normalResults.length + latentResults.length]) {
          detailItems[normalResults.length + latentResults.length].dividerBefore = true;
        }
        renderDetailEntries(outputs.detailList, detailItems);
      }

      [inputs.currentLv].forEach((input) => {
        input.addEventListener("input", updateResult);
        input.addEventListener("change", updateResult);
      });

      bindChipGroups(() => {
        updateResult();
      });

      [inputs.bonusSilver, inputs.bonusBoost, inputs.bonusLamp].forEach((input) => {
        const handler = () => {
          saveBonusSettings();
          updateResult();
        };
        input.addEventListener("input", handler);
        input.addEventListener("click", handler);
        input.addEventListener("change", handler);
      });

      inputs.normalSkillAdd.addEventListener("click", () => {
        appendSkillRow(inputs.normalSkillList, 1, "");
        updateResult();
      });

      inputs.latentSkillAdd.addEventListener("click", () => {
        appendSkillRow(inputs.latentSkillList, 1, "");
        updateResult();
      });

      setSkillList(inputs.normalSkillList, [{ level: 1, name: "" }]);
      setSkillList(inputs.latentSkillList, [{ level: 1, name: "" }]);
      loadBonusSettings();
      setChipValue(inputs.familyMatch, inputs.familyMatch.value);
      setChipValue(inputs.rarity, inputs.rarity.value);
      setChipValue(inputs.maxLv, inputs.maxLv.value);
      bindResultAccordion(outputs.resultSummary, outputs.resultDetail);
      applyParams(new URLSearchParams(window.location.search));
      updateResult();
    })();
