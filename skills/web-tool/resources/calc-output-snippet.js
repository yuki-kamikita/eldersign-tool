/**
 * 計算ツール共通の結果表示スニペット。
 * tool-common.js の renderResultPairs を使って、ラベル/値ペアを同一デザインで描画する。
 */
const common = window.EldersignToolCommon || {};
const renderResultPairs = common.renderResultPairs;

const resultList = document.getElementById("RESULT_LIST_ID");
renderResultPairs(
  resultList,
  [
    { label: "項目A", value: "-" },
    { label: "項目B", value: "-" },
  ],
  { itemClass: "result-row" }
);
