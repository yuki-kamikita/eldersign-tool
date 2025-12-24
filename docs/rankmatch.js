(() => {
  const matchTable = document.querySelector("table.match");
  if (!matchTable) {
    alert("対戦表が見つかりません。");
    return;
  }

  const nameMap = {};
  const memberTable = document.querySelector("table.rank");
  if (memberTable) {
    memberTable.querySelectorAll("tr").forEach((row) => {
      const letterCell = row.querySelector("th.no");
      const nameCell = row.querySelector("td.n a.name");
      if (!letterCell || !nameCell) return;
      const letter = letterCell.textContent.trim();
      const name = nameCell.textContent.trim();
      if (letter) nameMap[letter] = { name, href: nameCell.href };
    });
  }

  const headerRow = matchTable.querySelector("tr");
  const headerLetters = Array.from(headerRow.querySelectorAll("th.no")).map(
    (cell) => cell.textContent.trim(),
  );
  const rowIdFor = (letter) => `rankmatch-summary-${letter}`;
  const linkToRow = (letter) => {
    const anchor = document.createElement("a");
    anchor.href = `#${rowIdFor(letter)}`;
    anchor.textContent = letter;
    anchor.style.color = "inherit";
    return anchor;
  };

  headerRow.querySelectorAll("th.no").forEach((cell) => {
    const letter = cell.textContent.trim();
    if (!letter) return;
    cell.textContent = "";
    cell.appendChild(linkToRow(letter));
  });
  const memberLetters = document.querySelectorAll("table.rank th.no");
  memberLetters.forEach((cell) => {
    const letter = cell.textContent.trim();
    if (!letter) return;
    cell.textContent = "";
    cell.appendChild(linkToRow(letter));
  });

  const rows = Array.from(matchTable.querySelectorAll("tr")).slice(1);
  const matchesByPlayer = {};
  const statusByPlayer = {};

  const normalizeStatus = (cell) => {
    const link = cell.querySelector("a");
    const raw = (link ? link.textContent : cell.textContent).trim();
    if (!raw) return null;
    if (raw === "○") return { label: "勝ち", cls: "win", href: link?.href };
    if (raw === "×") return { label: "負け", cls: "loss", href: link?.href };
    if (raw === "△") return { label: "引き分け", cls: "draw", href: link?.href };
    if (raw === "次") return { label: "次", cls: "next", href: null };
    if (raw === "-" || raw === "‐" || raw === "ー")
      return { label: "未対戦", cls: "pending", href: null };
    return { label: raw, cls: "pending", href: link?.href };
  };

  rows.forEach((row) => {
    const rowLetterCell = row.querySelector("th.no");
    if (!rowLetterCell) return;
    const rowLetter = rowLetterCell.textContent.trim();
    rowLetterCell.textContent = "";
    rowLetterCell.appendChild(linkToRow(rowLetter));
    const cells = Array.from(row.children).slice(1);
    const list = [];
    const statusMap = {};

    cells.forEach((cell, idx) => {
      const colLetter = headerLetters[idx];
      if (!colLetter || colLetter === rowLetter) return;
      const status = normalizeStatus(cell);
      if (!status) return;
      list.push({ opponent: colLetter, status });
      statusMap[colLetter] = status;
    });

    matchesByPlayer[rowLetter] = list;
    statusByPlayer[rowLetter] = statusMap;
  });

  const buildSchedule = (letters) => {
    if (letters.length < 2) return {};
    const anchor = letters[0];
    const rest = letters.slice(1).reverse();
    const circle = [anchor, ...rest];
    const rounds = letters.length - 1;
    const schedule = {};
    letters.forEach((letter) => {
      schedule[letter] = [];
    });

    let current = circle.slice();
    for (let r = 0; r < rounds; r += 1) {
      for (let i = 0; i < letters.length / 2; i += 1) {
        const left = current[i];
        const right = current[current.length - 1 - i];
        schedule[left].push(right);
        schedule[right].push(left);
      }
      const fixed = current[0];
      const rotating = current.slice(1);
      const last = rotating.pop();
      current = [fixed, last, ...rotating];
    }

    return schedule;
  };

  const scheduleByPlayer = buildSchedule(headerLetters);
  const mismatchNotes = [];
  const getStatusLabel = (status) => status?.label;
  const isResult = (status) =>
    status && (status.cls === "win" || status.cls === "loss" || status.cls === "draw");

  headerLetters.forEach((letter) => {
    const statusMap = statusByPlayer[letter] || {};
    const playedCount = Object.values(statusMap).filter(isResult).length;
    const nextOpponent = Object.entries(statusMap).find(
      ([, status]) => getStatusLabel(status) === "次",
    )?.[0];
    const predicted = scheduleByPlayer[letter]?.[playedCount] || null;
    if (nextOpponent && predicted && nextOpponent !== predicted) {
      const playerName = nameMap[letter]?.name || letter;
      const nextName = nameMap[nextOpponent]?.name || nextOpponent;
      const predictedName = nameMap[predicted]?.name || predicted;
      mismatchNotes.push(
        `${letter}:${playerName} 次=${nextOpponent}:${nextName} 予測=${predicted}:${predictedName}`,
      );
    }
  });

  const existing = document.getElementById("rankmatch-player-summary");
  if (existing) existing.remove();

  const styleId = "rankmatch-player-summary-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent =
      "#rankmatch-player-summary{margin:8px auto;max-width:280px;font-size:small;}" +
      "#rankmatch-player-summary h2{margin:8px 0;text-align:center;}" +
      "#rankmatch-player-summary p{margin:4px 0;text-align:center;}" +
      "#rankmatch-player-summary table{width:100%;border-collapse:collapse;margin:6px 0;border:1px solid #8f2a2a;background-color:#210202;}" +
      "#rankmatch-player-summary th,#rankmatch-player-summary td{border:1px solid #8f2a2a;padding:2px 4px;}" +
      "#rankmatch-player-summary th{background-color:#b03939;color:#590b0b;}" +
      "#rankmatch-player-summary .player-title{background-color:#b03939;color:#590b0b;text-align:center;}" +
      "#rankmatch-player-summary .col-day{width:1.6em;text-align:center;}" +
      "#rankmatch-player-summary .col-letter{width:1.6em;text-align:center;}" +
      "#rankmatch-player-summary .col-name{text-align:left;}" +
      "#rankmatch-player-summary .col-status{width:4.8em;text-align:center;}" +
      "#rankmatch-player-summary .status-win{color:#7bd56f;}" +
      "#rankmatch-player-summary .status-loss{color:#ff6b6b;}" +
      "#rankmatch-player-summary .status-draw{color:#f5c542;}" +
      "#rankmatch-player-summary .status-next{color:#7db5ff;}" +
      "#rankmatch-player-summary .status-pending{color:#b08989;}";
    document.head.appendChild(style);
  }

  const summary = document.createElement("section");
  summary.id = "rankmatch-player-summary";

  const title = document.createElement("h2");
  title.textContent = "プレイヤー別 対戦表";
  summary.appendChild(title);

  const legend = document.createElement("p");
  legend.textContent = "勝ち/負け/引き分け/次/未対戦";
  summary.appendChild(legend);

  if (mismatchNotes.length) {
    const warning = document.createElement("p");
    warning.textContent = `予測と一致しない次の対戦: ${mismatchNotes.join(" / ")}`;
    summary.appendChild(warning);
  }

  headerLetters.forEach((letter) => {
    const statusMap = statusByPlayer[letter];
    const scheduleOrder = scheduleByPlayer[letter];
    if (!statusMap || !scheduleOrder) return;

    const playerInfo = nameMap[letter];
    const playerLabel = playerInfo
      ? `${letter}: ${playerInfo.name}`
      : `${letter}`;

    const table = document.createElement("table");
    const headRow = document.createElement("tr");
    const headCell = document.createElement("th");
    headCell.colSpan = 4;
    headCell.className = "player-title";

    if (playerInfo) {
      headCell.appendChild(document.createTextNode(`${letter}: `));
      const nameLink = document.createElement("a");
      nameLink.href = playerInfo.href;
      nameLink.textContent = playerInfo.name;
      nameLink.style.color = "inherit";
      headCell.appendChild(nameLink);
    } else {
      headCell.appendChild(document.createTextNode(letter));
    }

    headRow.appendChild(headCell);
    table.appendChild(headRow);

    const days = ["月", "火", "水", "木", "金", "土"];
    const times = ["午前", "午後"];

    scheduleOrder.forEach((opponent, roundIndex) => {
      const status = statusMap[opponent] || { label: "未対戦", cls: "pending" };
      const row = document.createElement("tr");
      const dayCell = document.createElement("td");
      const opponentLetterCell = document.createElement("td");
      const opponentNameCell = document.createElement("td");
      const statusCell = document.createElement("td");

      const opponentInfo = nameMap[opponent];
      dayCell.className = "col-day";
      opponentLetterCell.className = "col-letter";
      opponentNameCell.className = "col-name";
      statusCell.className = `col-status status-${status.cls}`;
      opponentLetterCell.appendChild(linkToRow(opponent));
      if (opponentInfo?.href) {
        const opponentLink = document.createElement("a");
        opponentLink.href = opponentInfo.href;
        opponentLink.textContent = opponentInfo.name;
        opponentLink.style.color = "inherit";
        opponentNameCell.appendChild(opponentLink);
      } else {
        opponentNameCell.textContent = opponentInfo ? opponentInfo.name : "";
      }

      const dayIndex = Math.floor(roundIndex / 2);
      const timeIndex = roundIndex % 2;
      const roundLabel =
        days[dayIndex] && times[timeIndex]
          ? `${days[dayIndex]}曜${times[timeIndex]}`
          : "";
      if (roundLabel) {
        const dayLabel = days[dayIndex];
        if (timeIndex === 0 || dayIndex === days.length - 1) {
          dayCell.textContent = dayLabel;
          if (timeIndex === 0 && dayIndex < days.length - 1) {
            dayCell.rowSpan = 2;
          }
        }
      }
      if (status.href) {
        const statusLink = document.createElement("a");
        statusLink.href = status.href;
        statusLink.textContent = status.label;
        statusLink.style.color = "inherit";
        statusCell.appendChild(statusLink);
      } else {
        statusCell.textContent = status.label;
      }

      if (dayCell.textContent) {
        row.appendChild(dayCell);
      }
      row.appendChild(opponentLetterCell);
      row.appendChild(opponentNameCell);
      row.appendChild(statusCell);
      table.appendChild(row);
    });

    table.id = rowIdFor(letter);
    summary.appendChild(table);
  });

  matchTable.insertAdjacentElement("afterend", summary);
})();
