/**
 * 計算ツール共通の結果表示スニペット。
 * サマリーは renderResultPairs、詳細はシンプルな行リストで描画する。
 */
const common = window.EldersignToolCommon || {};
const renderResultPairs = common.renderResultPairs;

const resultList = document.getElementById("RESULT_LIST_ID");
const resultDetailList = document.getElementById("RESULT_DETAIL_LIST_ID");
const resultSummary = document.getElementById("RESULT_SUMMARY_ID");
const resultDetail = document.getElementById("RESULT_DETAIL_ID");

renderResultPairs(
  resultList,
  [
    { label: "項目A", value: "-" },
    { label: "項目B", value: "-" },
  ],
  { itemClass: "result-row" }
);

[
  { label: "詳細A", value: "-", meta: "内訳A" },
  { label: "詳細B", value: "-", meta: "内訳B" },
].forEach((entry) => {
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
  resultDetailList.appendChild(item);
});

if (resultSummary && resultDetail) {
  const toggle = () => {
    const expanded = resultSummary.getAttribute("aria-expanded") === "true";
    resultSummary.setAttribute("aria-expanded", expanded ? "false" : "true");
    resultDetail.classList.toggle("is-hidden", expanded);
  };
  resultSummary.addEventListener("click", toggle);
  resultSummary.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggle();
  });
}
