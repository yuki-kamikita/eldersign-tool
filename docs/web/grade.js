(() => {
      const common = window.EldersignToolCommon || {};
      const renderResultPairs = common.renderResultPairs || ((container, pairs) => {
        if (!container) return;
        container.innerHTML = "";
        (pairs || []).forEach((pair) => {
          const item = document.createElement("div");
          item.className = "result-pair-item";
          const label = document.createElement("div");
          label.className = "result-label";
          label.textContent = pair && pair.label != null ? String(pair.label) : "";
          const value = document.createElement("div");
          value.className = "result-value";
          value.textContent = pair && pair.value != null ? String(pair.value) : "-";
          item.append(label, value);
          container.appendChild(item);
        });
      });

      const STAT_KEYS = [
        { key: "hp", label: "HP" },
        { key: "atk", label: "攻撃" },
        { key: "mag", label: "魔力" },
        { key: "def", label: "防御" },
        { key: "hit", label: "命中" },
        { key: "agi", label: "敏捷" },
      ];

      const inputs = {};
      const pctEls = {};

      // 要素IDから対象DOMを取得する。
      function getInput(id) {
        return document.getElementById(id);
      }

      // input値を数値として安全に読み取る。
      function readNumber(input) {
        const v = Number(input.value);
        return Number.isFinite(v) ? v : 0;
      }

      // 評価値をグレード表記へ変換する。
      function calcGradeLabel(evalValue) {
        if (evalValue == null) return "-";
        if (evalValue < 10) return "-";
        if (evalValue < 20) return "C";
        if (evalValue < 30) return "CC";
        if (evalValue < 40) return "CCC";
        if (evalValue < 50) return "B";
        if (evalValue < 60) return "BB";
        if (evalValue < 70) return "BBB";
        if (evalValue < 80) return "A";
        if (evalValue < 90) return "AA";
        if (evalValue < 100) return "AAA";
        return "SSS";
      }

      // 比率二乗和から評価値を算出する。
      function calcEvalFromSumSq(sumSq) {
        const raw = Math.sqrt(sumSq / 6) * 200 + 10;
        if (!Number.isFinite(raw)) return null;
        return raw;
      }

      // 各ステータスの個体値比率二乗和を計算する。
      function calcSumSq(stats) {
        let sumSq = 0;
        for (const stat of stats) {
          if (stat.base > 0) {
            const r = stat.bonus / stat.base;
            sumSq += r * r;
          }
        }
        return sumSq;
      }

      // 指定ステータスのみ伸ばした場合に目標評価へ届く最小個体値を探索する。
      function findMinBonus(stats, targetEval, targetKey) {
        const target = stats.find((stat) => stat.key === targetKey);
        if (!target || target.base <= 0) return null;

        let sumOther = 0;
        for (const stat of stats) {
          if (stat.key === targetKey) continue;
          if (stat.base <= 0) continue;
          const r = stat.bonus / stat.base;
          sumOther += r * r;
        }

        const k = (targetEval - 10) / 200;
        const need = Math.max(0, 6 * k * k - sumOther);
        let start = Math.max(
          target.bonus,
          Math.ceil(Math.sqrt(need) * target.base) - 3
        );

        for (let b = start; b <= target.bonus + 20000; b++) {
          const sumSq = sumOther + (b / target.base) * (b / target.base);
          const ev = calcEvalFromSumSq(sumSq);
          if (ev != null && ev >= targetEval) return b;
        }
        return null;
      }

      // 目標評価に必要な個体値一覧を描画する。
      function renderNeedList(listEl, stats, targetEval, isInteractive) {
        listEl.innerHTML = "";
        const items = [];

        for (const stat of stats) {
          const minBonus = findMinBonus(stats, targetEval, stat.key);
          if (minBonus == null) continue;
          const delta = minBonus - stat.bonus;
          items.push({
            key: stat.key,
            label: stat.label,
            minBonus,
            delta,
            base: stat.base,
          });
        }

        if (items.length === 0) {
          const li = document.createElement("li");
          li.textContent = "基礎ステータスを入力してください。";
          listEl.appendChild(li);
          return;
        }

        items.forEach((item) => {
          const li = document.createElement("li");
          const pct = item.base > 0 ? (item.minBonus / item.base) * 100 : 0;
          const pctStr = Number.isFinite(pct) ? pct.toFixed(1) : "-";
          const title = document.createElement("strong");
          title.textContent = item.label;
          const detail = document.createElement("span");
          detail.textContent = `+${item.minBonus} (${pctStr}%) / あと${item.delta}`;
          li.appendChild(title);
          li.appendChild(detail);
          if (isInteractive) {
            li.classList.add("is-clickable");
            li.dataset.key = item.key;
            li.dataset.minBonus = String(item.minBonus);
          }
          listEl.appendChild(li);
        });

        if (isInteractive) {
          listEl.onclick = (event) => {
            const target = event.target.closest("li");
            if (!target || !target.dataset.key) return;
            const key = target.dataset.key;
            const minBonus = Number(target.dataset.minBonus);
            const input = inputs[`bonus-${key}`];
            if (!input || !Number.isFinite(minBonus)) return;
            input.value = String(minBonus);
            updateResult();
          };
        } else {
          listEl.onclick = null;
        }
      }

      // 入力値から評価結果・割合表示・必要個体値一覧を更新する。
      function updateResult() {
        const stats = STAT_KEYS.map((stat) => ({
          key: stat.key,
          label: stat.label,
          base: readNumber(inputs[`base-${stat.key}`]),
          bonus: readNumber(inputs[`bonus-${stat.key}`]),
        }));

        const sumSq = calcSumSq(stats);
        const evalRaw = calcEvalFromSumSq(sumSq);
        const evalValue = evalRaw == null ? null : Math.floor(evalRaw * 10) / 10;
        const gradeValue = calcGradeLabel(evalValue);
        const resultList = getInput("grade-result-list");
        const evalDisplay = evalValue == null ? "-" : evalValue.toFixed(1);
        const gradeDisplay = evalValue == null ? "-" : gradeValue;
        renderResultPairs(
          resultList,
          [
            { label: "評価値", value: evalDisplay },
            { label: "現在グレード", value: gradeDisplay },
          ],
          { itemClass: "result-row" }
        );

        stats.forEach((stat) => {
          const pctEl = pctEls[`pct-${stat.key}`];
          if (!pctEl) return;
          if (stat.base > 0) {
            const pct = (stat.bonus / stat.base) * 100;
            pctEl.textContent = `${pct.toFixed(1)}%`;
          } else {
            pctEl.textContent = "-";
          }
        });

        const nextTarget =
          evalValue == null ? 10 : Math.max(10, (Math.floor(evalValue / 10) + 1) * 10);
        renderNeedList(
          getInput("next-grade-list"),
          stats,
          Math.min(nextTarget, 100),
          true
        );
        renderNeedList(getInput("sss-grade-list"), stats, 100, false);
      }

      // 入力イベントとDOM参照を初期化する。
      function bindInputs() {
        const targets = [
          getInput("monster-name"),
          getInput("monster-kind"),
        ];

        for (const stat of STAT_KEYS) {
          const baseId = `base-${stat.key}`;
          const bonusId = `bonus-${stat.key}`;
          const pctId = `pct-${stat.key}`;
          inputs[baseId] = getInput(baseId);
          inputs[bonusId] = getInput(bonusId);
          pctEls[pctId] = getInput(pctId);
          targets.push(inputs[baseId], inputs[bonusId]);
        }

        targets.forEach((el) => {
          el.addEventListener("input", updateResult);
        });

      }

      bindInputs();
      updateResult();
    })();
