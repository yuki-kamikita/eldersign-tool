(() => {
  const scope = window;
  const common = (scope.EldersignToolCommon = scope.EldersignToolCommon || {});

  // input要素の値を数値として安全に読む。変換不可ならfallbackを返す。
  common.readNumber = (input, fallback = 0) => {
    const value = Number(input && input.value);
    return Number.isFinite(value) ? value : fallback;
  };

  // hidden inputとchip表示状態を同期する共通処理。
  common.setChipValue = (input, value, root = document) => {
    if (!input || value == null) return;
    const stringValue = String(value);
    input.value = stringValue;
    const group = root.querySelector(`.chip-group[data-chip-target="${input.id}"]`);
    if (!group) return;
    group.querySelectorAll(".chip-button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.value === stringValue);
    });
  };

  // chip-groupのクリックイベントを束ね、値反映と再計算コールバックを行う。
  common.bindChipGroups = (onChange, root = document) => {
    root.querySelectorAll(".chip-group").forEach((group) => {
      group.addEventListener("click", (event) => {
        const button = event.target.closest(".chip-button");
        if (!button || !group.contains(button)) return;
        const targetId = group.dataset.chipTarget;
        if (!targetId) return;
        const input = root.getElementById(targetId);
        if (!input) return;
        common.setChipValue(input, button.dataset.value, root);
        if (typeof onChange === "function") onChange(input, button.dataset.value, group);
      });
    });
  };

  // ラベル/値ペア配列を受け取り、結果表示DOMを宣言的に再描画する。
  common.renderResultPairs = (container, pairs, options = {}) => {
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
  };
})();
