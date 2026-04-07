(() => {
  const common = window.EldersignToolCommon || {};
  const renderResultPairs = common.renderResultPairs || ((container, pairs) => {
    if (!container) return;
    container.innerHTML = "";
    (pairs || []).forEach((pair) => {
      const item = document.createElement("div");
      item.className = "result-row";
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

  const inputs = {
    drawCount: document.getElementById("draw-count"),
    choiceCount: document.getElementById("choice-count"),
    targetRate: document.getElementById("target-rate"),
    hitCount: document.getElementById("hit-count"),
  };
  const resultList = document.getElementById("gacha-result-list");
  const detailList = document.getElementById("gacha-detail-list");
  const resultSummary = document.getElementById("gacha-result-summary");
  const resultDetail = document.getElementById("gacha-result-detail");
  const chart = document.getElementById("gacha-chart");
  const chartNote = document.getElementById("gacha-chart-note");
  const shareTwitter = document.getElementById("share-twitter");
  const STORAGE_KEY = "eldersign_gacha_form_v1";
  const LOG_SQRT_TWO_PI = 0.9189385332046727;
  let lastResult = null;

  // 数値入力を指定範囲に丸めて返す。
  function readClampedNumber(input, fallback, min, max, integer = false) {
    const value = Number(input && input.value);
    const parsed = Number.isFinite(value) ? value : fallback;
    const normalized = integer ? Math.floor(parsed) : parsed;
    return Math.min(max, Math.max(min, normalized));
  }

  // 表示用の小数を不要な末尾ゼロなしで整える。
  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "-";
    return value.toLocaleString("ja-JP", {
      maximumFractionDigits: digits,
    });
  }

  // 確率をパーセント表記に変換する。
  function formatPercent(value) {
    if (!Number.isFinite(value)) return "-";
    if (value > 0 && value < 0.000001) return "<0.0001%";
    return `${(value * 100).toLocaleString("ja-JP", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    })}%`;
  }

  // 階乗の対数をStirling近似つきで返す。
  function logFactorial(n) {
    if (n < 0) return Number.NaN;
    if (n < 2) return 0;
    if (n < 20) {
      let total = 0;
      for (let i = 2; i <= n; i += 1) total += Math.log(i);
      return total;
    }
    return (n + 0.5) * Math.log(n) - n + LOG_SQRT_TWO_PI + 1 / (12 * n) - 1 / (360 * n ** 3);
  }

  // 二項係数の対数を返す。
  function logCombination(n, k) {
    if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
    const compactK = Math.min(k, n - k);
    return logFactorial(n) - logFactorial(compactK) - logFactorial(n - compactK);
  }

  // 二項分布の確率質量を返す。
  function binomialPmf(n, p, k) {
    if (k < 0 || k > n) return 0;
    if (p <= 0) return k === 0 ? 1 : 0;
    if (p >= 1) return k === n ? 1 : 0;
    const logP = logCombination(n, k) + k * Math.log(p) + (n - k) * Math.log1p(-p);
    return Math.exp(logP);
  }

  // 対数配列から安定して合計確率を返す。
  function expLogSum(logValues) {
    const maxLog = Math.max(...logValues);
    if (!Number.isFinite(maxLog)) return 0;
    const sum = logValues.reduce((accumulator, logValue) => accumulator + Math.exp(logValue - maxLog), 0);
    return Math.exp(maxLog) * sum;
  }

  // 二項分布で当たり回数がk以下になる累積確率を返す。
  function binomialCdf(n, p, k) {
    if (k < 0) return 0;
    if (k >= n) return 1;
    if (p <= 0) return 1;
    if (p >= 1) return k >= n ? 1 : 0;

    const lowSide = k < n * p;
    const logs = [];
    if (lowSide) {
      for (let i = 0; i <= k; i += 1) {
        logs.push(logCombination(n, i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
      }
      return expLogSum(logs);
    }

    for (let i = k + 1; i <= n; i += 1) {
      logs.push(logCombination(n, i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
    }
    return Math.max(0, Math.min(1, 1 - expLogSum(logs)));
  }

  // グラフ用に表示する当たり回数の範囲を決める。
  function getChartRange(n, mean, sd, observed) {
    if (n <= 80) return { from: 0, to: n, clipped: false };
    const spread = Math.max(8, Math.ceil(sd * 4));
    const from = Math.max(0, Math.min(observed, Math.floor(mean - spread)));
    const to = Math.min(n, Math.max(observed, Math.ceil(mean + spread)));
    return { from, to, clipped: from > 0 || to < n };
  }

  // 現在の設定で二項分布の棒グラフを描画する。
  function renderChart(n, p, observed, mean, sd) {
    if (!chart) return;
    const context = chart.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = chart.clientWidth || 960;
    const height = chart.clientHeight || 250;
    chart.width = Math.floor(width * dpr);
    chart.height = Math.floor(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--md-sys-surface");
    context.fillRect(0, 0, width, height);

    const range = getChartRange(n, mean, sd, observed);
    const values = [];
    for (let k = range.from; k <= range.to; k += 1) {
      values.push({ k, p: binomialPmf(n, p, k) });
    }

    const pad = { left: 42, right: 14, top: 16, bottom: 34 };
    const innerWidth = Math.max(1, width - pad.left - pad.right);
    const innerHeight = Math.max(1, height - pad.top - pad.bottom);
    const maxValue = Math.max(...values.map((item) => item.p), 0.000001);
    const barWidth = innerWidth / Math.max(values.length, 1);

    context.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--md-sys-outline-variant");
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--md-sys-on-surface-variant");
    context.font = "12px sans-serif";
    context.beginPath();
    context.moveTo(pad.left, pad.top);
    context.lineTo(pad.left, pad.top + innerHeight);
    context.lineTo(pad.left + innerWidth, pad.top + innerHeight);
    context.stroke();
    context.fillText(formatPercent(maxValue), 4, pad.top + 10);
    context.fillText(String(range.from), pad.left, height - 10);
    context.fillText(String(range.to), pad.left + innerWidth - 20, height - 10);

    values.forEach((item, index) => {
      const x = pad.left + index * barWidth;
      const barHeight = (item.p / maxValue) * innerHeight;
      context.fillStyle =
        item.k === observed
          ? getComputedStyle(document.documentElement).getPropertyValue("--md-sys-primary")
          : "rgba(116, 211, 154, 0.75)";
      context.fillRect(x + 1, pad.top + innerHeight - barHeight, Math.max(1, barWidth - 2), barHeight);
    });

    if (chartNote) {
      chartNote.textContent = range.clipped
        ? `${range.from}〜${range.to}回の範囲を表示。色違いの棒が入力した当たりの数。`
        : "色違いの棒が入力した当たりの数。";
    }
  }

  // 詳細行リストを描画する。
  function renderDetails(entries) {
    if (!detailList) return;
    detailList.innerHTML = "";
    entries.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "result-detail-entry";

      const row = document.createElement("div");
      row.className = "result-row";

      const label = document.createElement("div");
      label.className = "result-label";
      label.textContent = entry.label;

      const value = document.createElement("div");
      value.className = "result-detail-value";
      value.textContent = entry.value;

      const meta = document.createElement("div");
      meta.className = "result-detail-meta";
      meta.textContent = entry.meta;

      row.append(label, value);
      item.append(row, meta);
      detailList.appendChild(item);
    });
  }

  // フォーム状態をlocalStorageへ保存する。
  function saveFormState() {
    const state = {};
    Object.entries(inputs).forEach(([key, input]) => {
      if (!input) return;
      state[key] = input.value;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Ignore storage failures (private mode, quota, etc.)
    }
  }

  // 保存済みフォーム状態を復元する。
  function loadFormState() {
    let state = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : null;
    } catch (error) {
      state = null;
    }
    if (!state || typeof state !== "object") return;

    Object.entries(inputs).forEach(([key, input]) => {
      if (!input || !(key in state)) return;
      input.value = String(state[key]);
    });
  }

  // 詳細パネル開閉をトグルする。
  function toggleResultDetailOpen() {
    if (!resultSummary || !resultDetail) return;
    const expanded = resultSummary.getAttribute("aria-expanded") === "true";
    resultSummary.setAttribute("aria-expanded", expanded ? "false" : "true");
    resultDetail.classList.toggle("is-hidden", expanded);
  }

  // 共有URLへ埋め込む現在の入力値をGETパラメータに変換する。
  function buildStateParams(result) {
    const params = new URLSearchParams();
    const source = result || {
      drawCount: readClampedNumber(inputs.drawCount, 0, 0, 10000, true),
      choiceCount: readClampedNumber(inputs.choiceCount, 1, 1, 1000, true),
      targetRate: readClampedNumber(inputs.targetRate, 0, 0, 100, false) / 100,
      hitCount: readClampedNumber(inputs.hitCount, 0, 0, 10000, true),
    };
    params.set("draw", String(source.drawCount));
    params.set("choices", String(source.choiceCount));
    params.set("rate", String(Number((source.targetRate * 100).toFixed(6))));
    params.set("hits", String(source.hitCount));
    return params;
  }

  // 現在の計算条件を含む共有URLを返す。
  function getShareUrl() {
    const url = new URL(window.location.href);
    url.search = buildStateParams(lastResult).toString();
    url.hash = "";
    return url.toString();
  }

  // GETパラメータがある場合は入力欄へ反映する。
  function loadUrlState() {
    const params = new URLSearchParams(window.location.search);
    const paramMap = [
      ["draw", inputs.drawCount],
      ["choices", inputs.choiceCount],
      ["rate", inputs.targetRate],
      ["hits", inputs.hitCount],
    ];
    let loaded = false;
    paramMap.forEach(([name, input]) => {
      if (!input || !params.has(name)) return;
      input.value = params.get(name);
      loaded = true;
    });
    return loaded;
  }

  // 直近の計算結果をTwitter投稿文に変換する。
  function buildShareText(result) {
    if (!result) return "ガチャ結果\n#エルダーサイン #ガチャ";
    return [
      "ガチャ結果",
      `${result.drawCount}×${result.choiceCount} / 排出率${formatPercent(result.targetRate)} / 当たり${result.hitCount}回`,
      `発生率${formatPercent(result.exact)}`,
      "#エルダーサイン #ガチャ",
    ].join("\n");
  }

  // Twitterの投稿画面を現在の計算結果つきで開く。
  function shareResultToTwitter() {
    const params = new URLSearchParams({
      text: buildShareText(lastResult),
      url: getShareUrl(),
    });
    window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener,noreferrer");
  }

  // 入力値から確率値を再計算して表示を更新する。
  function calculate() {
    const drawCount = readClampedNumber(inputs.drawCount, 0, 0, 10000, true);
    const choiceCount = readClampedNumber(inputs.choiceCount, 1, 1, 1000, true);
    const targetRate = readClampedNumber(inputs.targetRate, 0, 0, 100, false) / 100;
    const hitCount = readClampedNumber(inputs.hitCount, 0, 0, drawCount, true);
    const perDrawHitRate = 1 - (1 - targetRate) ** choiceCount;
    const expected = drawCount * perDrawHitRate;
    const sd = Math.sqrt(drawCount * perDrawHitRate * (1 - perDrawHitRate));
    const exact = binomialPmf(drawCount, perDrawHitRate, hitCount);
    const atMost = binomialCdf(drawCount, perDrawHitRate, hitCount);
    const atLeast = 1 - binomialCdf(drawCount, perDrawHitRate, hitCount - 1);
    const zero = binomialPmf(drawCount, perDrawHitRate, 0);
    lastResult = {
      drawCount,
      choiceCount,
      targetRate,
      hitCount,
      perDrawHitRate,
      expected,
      sd,
      exact,
      atMost,
      atLeast,
      zero,
    };

    inputs.drawCount.value = String(drawCount);
    inputs.choiceCount.value = String(choiceCount);
    inputs.hitCount.max = String(drawCount);
    inputs.hitCount.value = String(hitCount);

    renderResultPairs(
      resultList,
      [
        { label: "その結果ちょうど", value: formatPercent(exact) },
        { label: `${hitCount}回以下`, value: formatPercent(atMost) },
        { label: "1回あたり当たり率", value: formatPercent(perDrawHitRate) },
      ],
      { itemClass: "result-row" }
    );

    renderDetails([
      {
        label: `${hitCount}回以上`,
        value: formatPercent(atLeast),
        meta: "入力した当たりの数以上になる確率",
      },
      {
        label: "0回の確率",
        value: formatPercent(zero),
        meta: "当たりの数が0の確率",
      },
      {
        label: "期待値",
        value: `${formatNumber(expected, 3)}回`,
        meta: "平均的な当たり回数",
      },
      {
        label: "標準偏差",
        value: `${formatNumber(sd, 3)}回`,
        meta: "当たり回数のばらつき",
      },
      {
        label: "入力との差",
        value: `${formatNumber(hitCount - expected, 3)}回`,
        meta: "当たりの数 - 期待値",
      },
    ]);

    renderChart(drawCount, perDrawHitRate, hitCount, expected, sd);
    saveFormState();
  }

  Object.values(inputs).forEach((input) => {
    if (!input) return;
    input.addEventListener("input", calculate);
  });

  if (resultSummary) {
    resultSummary.addEventListener("click", toggleResultDetailOpen);
    resultSummary.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      toggleResultDetailOpen();
    });
  }

  if (shareTwitter) {
    shareTwitter.addEventListener("click", shareResultToTwitter);
  }

  window.addEventListener("resize", calculate);

  loadFormState();
  loadUrlState();
  calculate();
})();
