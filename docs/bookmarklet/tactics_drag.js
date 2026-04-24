(() => {
  const ROOT_ID = "__es_tactics_drag_ui";
  const STYLE_ID = "__es_tactics_drag_style";
  const DRAG_THRESHOLD = 6;
  const LONG_PRESS_MS = 320;

  const getSkillId = (row) => {
    const checkbox = row.querySelector('input[type="checkbox"]');
    const sources = [
      checkbox?.getAttribute("onchange"),
      ...Array.from(row.querySelectorAll("a")).map((link) => link.getAttribute("href") || ""),
      row.innerHTML,
    ];
    for (const source of sources) {
      const match = String(source || "").match(/(\d{3,})/);
      if (match) return match[1];
    }
    return "";
  };

  const createStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{
  margin-top:8px;
  -webkit-touch-callout:none;
  touch-action:none;
}
#${ROOT_ID} .es-group{
  margin-bottom:10px;
}
#${ROOT_ID} .es-group table{
  width:100%;
  border-collapse:separate;
  border-spacing:0;
  border-top:none;
}
#${ROOT_ID} .es-group caption{
  font-weight:bold;
  border:none;
  box-shadow:none;
}
#${ROOT_ID} .es-group tbody,
#${ROOT_ID} .es-group tr:first-child th,
#${ROOT_ID} .es-group tr:first-child td{
  border-top:none !important;
}
#${ROOT_ID} .es-group tr + tr th,
#${ROOT_ID} .es-group tr + tr td{
  border-top:2px solid #c31403;
}
#${ROOT_ID} .es-order-cell{
  width:52px;
  text-align:center;
  white-space:nowrap;
  touch-action:none;
}
#${ROOT_ID} .es-name-cell{
  width:auto;
  text-align:center;
  touch-action:none;
}
#${ROOT_ID} .es-handle-cell{
  width:42px;
  text-align:center;
  font-size:22px;
  line-height:1;
  white-space:nowrap;
  touch-action:none;
}
#${ROOT_ID} .es-row{
  touch-action:none;
  -webkit-user-select:none;
  user-select:none;
}
#${ROOT_ID} .es-row.is-dragging{
  opacity:.95;
  box-shadow:0 6px 16px rgba(0,0,0,.28);
}
#${ROOT_ID} .es-row.is-placeholder th,
#${ROOT_ID} .es-row.is-placeholder td{
  background-color:#5a1010;
  color:#bbb;
  height:58px;
}
#${ROOT_ID} .es-name-link{
  display:block;
  color:inherit;
  text-decoration:underline;
}
#${ROOT_ID} .es-name-link small{
  color:inherit;
}
#${ROOT_ID} .es-handle{
  display:inline-block;
  color:inherit;
  font-weight:bold;
  background:none;
  border:none;
  box-shadow:none;
}
#${ROOT_ID} .es-empty td{
  color:#ccc;
  padding:10px 4px;
}
`;
    document.head.appendChild(style);
  };

  const parseSkills = (tableBody) =>
    Array.from(tableBody.querySelectorAll("tr"))
      .map((row, index) => {
        const skillId = getSkillId(row);
        const checkbox = row.querySelector('input[type="checkbox"]');
        const detailLink = row.querySelector("td:last-child a");
        return {
          skillId,
          enabled: Boolean(checkbox?.checked),
          index,
          nameHtml: detailLink?.innerHTML || `スキル${index + 1}`,
          detailHref: detailLink?.getAttribute("href") || "",
        };
      })
      .filter((item) => item.skillId);

  const buildSaveHref = (baseHref, skills) => {
    const url = new URL(baseHref, location.href);
    url.searchParams.set(
      "skl",
      skills.filter((item) => item.enabled).map((item) => item.skillId).join(":"),
    );
    return url.toString();
  };

  const openDetail = (skill) => {
    const href = String(skill.detailHref || "");
    if (!href) return;
    if (/^javascript:/i.test(href)) {
      (0, eval)(href.replace(/^javascript:/i, ""));
      return;
    }
    location.href = href;
  };

  const buildRow = (skill) => {
    const row = document.createElement("tr");
    row.className = "es-row";
    row.dataset.skillId = skill.skillId;

    const orderCell = document.createElement("th");
    orderCell.className = "es-order-cell";
    const order = document.createElement("span");
    orderCell.appendChild(order);

    const nameCell = document.createElement("td");
    nameCell.className = "es-name-cell";
    if (skill.detailHref && /^javascript:/i.test(skill.detailHref)) {
      const link = document.createElement("a");
      link.className = "es-name-link";
      link.href = skill.detailHref;
      link.innerHTML = skill.nameHtml;
      nameCell.appendChild(link);
    } else {
      nameCell.innerHTML = skill.nameHtml;
    }

    const handleCell = document.createElement("td");
    handleCell.className = "es-handle-cell";
    const handle = document.createElement("span");
    handle.className = "es-handle";
    handle.textContent = "☰";
    handleCell.appendChild(handle);

    row.append(orderCell, nameCell, handleCell);
    skill.row = row;
    skill.orderEl = order;
    return row;
  };

  const renderList = (tbody, skills, emptyText, isUsed) => {
    tbody.innerHTML = "";
    if (!skills.length) {
      const row = document.createElement("tr");
      row.className = "es-empty";
      row.innerHTML = `<td colspan="3">${emptyText}</td>`;
      tbody.appendChild(row);
      return;
    }

    skills.forEach((skill, index) => {
      skill.orderEl.textContent = isUsed ? String(index + 1) : "OFF";
      tbody.appendChild(skill.row);
    });
  };

  const render = (state, usedBody, unusedBody, summary, saveAnchor) => {
    const usedSkills = state.skills.filter((skill) => skill.enabled);
    const unusedSkills = state.skills.filter((skill) => !skill.enabled);

    renderList(usedBody, usedSkills, "ここに入れたスキルが使用されます", true);
    renderList(unusedBody, unusedSkills, "ここに入れたスキルは使用しません", false);

    summary.textContent = `使用 ${usedSkills.length}件 / 未使用 ${unusedSkills.length}件`;
    saveAnchor.href = buildSaveHref(state.baseHref, state.skills);
  };

  const enableDrag = (state, root, update) => {
    const lists = Array.from(root.querySelectorAll(".es-skill-list"));
    let drag = null;
    let previousBodyOverflow = "";
    let previousBodyTouchAction = "";

    const clearPressTimer = () => {
      if (!drag?.pressTimer) return;
      clearTimeout(drag.pressTimer);
      drag.pressTimer = null;
    };

    const lockPageScroll = () => {
      previousBodyOverflow = document.body.style.overflow;
      previousBodyTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    };

    const unlockPageScroll = () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.touchAction = previousBodyTouchAction;
    };

    const syncState = () => {
      state.skills = lists.flatMap((list) =>
        Array.from(list.querySelectorAll(".es-row"))
          .map((row) => {
            const skill = state.skills.find((item) => item.row === row);
            if (!skill) return null;
            skill.enabled = list.dataset.group === "used";
            return skill;
          })
          .filter(Boolean),
      );
    };

    const cleanup = () => {
      if (!drag) return;
      clearPressTimer();
      unlockPageScroll();
      drag.row.classList.remove("is-dragging");
      drag.row.style.position = "";
      drag.row.style.left = "";
      drag.row.style.top = "";
      drag.row.style.width = "";
      drag.row.style.pointerEvents = "";
      drag.row.style.zIndex = "";
      if (drag.placeholder.isConnected) {
        drag.placeholder.replaceWith(drag.row);
      }
      drag.row.releasePointerCapture?.(drag.pointerId);
      drag = null;
      syncState();
      update();
    };

    const findListFromPoint = (clientX, clientY) => {
      const target = document.elementFromPoint(clientX, clientY);
      return target?.closest?.(".es-skill-list") || null;
    };

    const placePlaceholder = (list, clientY) => {
      const emptyRow = list.querySelector(".es-empty");
      if (emptyRow) {
        list.insertBefore(drag.placeholder, emptyRow);
        return;
      }
      const rows = Array.from(list.querySelectorAll(".es-row")).filter(
        (row) => row !== drag.row && row !== drag.placeholder,
      );
      const before = rows.find(
        (row) => clientY < row.getBoundingClientRect().top + row.offsetHeight / 2,
      );
      if (before) {
        list.insertBefore(drag.placeholder, before);
      } else {
        list.appendChild(drag.placeholder);
      }
    };

    const startDrag = (event, skill) => {
      const rect = skill.row.getBoundingClientRect();
      const placeholder = document.createElement("tr");
      placeholder.className = "es-row is-placeholder";
      placeholder.innerHTML = '<th>&nbsp;</th><td colspan="2">&nbsp;</td>';
      placeholder.style.height = `${rect.height}px`;

      drag = {
        skill,
        row: skill.row,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        placeholder,
        active: false,
        longPressReady: event.pointerType !== "touch",
        pointerType: event.pointerType || "mouse",
        clickTarget: event.target.closest(".es-name-cell, .es-handle-cell, .es-order-cell"),
      };
      skill.row.setPointerCapture?.(event.pointerId);

      if (!drag.longPressReady) {
        drag.pressTimer = setTimeout(() => {
          if (!drag || drag.skill !== skill || drag.active) return;
          drag.longPressReady = true;
          activateDrag();
        }, LONG_PRESS_MS);
      }
    };

    const activateDrag = () => {
      if (!drag || drag.active) return;
      const rect = drag.row.getBoundingClientRect();
      drag.active = true;
      lockPageScroll();
      drag.row.after(drag.placeholder);
      drag.row.classList.add("is-dragging");
      drag.row.style.position = "fixed";
      drag.row.style.left = `${rect.left}px`;
      drag.row.style.top = `${rect.top}px`;
      drag.row.style.width = `${rect.width}px`;
      drag.row.style.pointerEvents = "none";
      drag.row.style.zIndex = "2147483647";
    };

    const handlePointerMove = (event) => {
      if (!drag) return;
      const movedX = Math.abs(event.clientX - drag.startX);
      const movedY = Math.abs(event.clientY - drag.startY);
      if (!drag.active) {
        if (drag.pointerType === "touch" && !drag.longPressReady) {
          if (movedX >= DRAG_THRESHOLD || movedY >= DRAG_THRESHOLD) {
            clearPressTimer();
            drag.row.releasePointerCapture?.(drag.pointerId);
            drag = null;
          }
          return;
        }
        if (movedX < DRAG_THRESHOLD && movedY < DRAG_THRESHOLD) return;
        clearPressTimer();
        activateDrag();
      }
      event.preventDefault();
      drag.row.style.left = `${event.clientX - drag.offsetX}px`;
      drag.row.style.top = `${event.clientY - drag.offsetY}px`;
      const list = findListFromPoint(event.clientX, event.clientY);
      if (list) placePlaceholder(list, event.clientY);
    };

    const handlePointerEnd = (event) => {
      if (!drag) return;
      if (!drag.active) {
        const skill = drag.skill;
        const clickTarget = drag.clickTarget;
        clearPressTimer();
        drag.row.releasePointerCapture?.(drag.pointerId);
        drag = null;
        if (clickTarget?.classList.contains("es-name-cell")) {
          openDetail(skill);
        }
        return;
      }
      cleanup();
    };

    root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const row = event.target.closest(".es-row");
      if (!row) return;
      const skill = state.skills.find((item) => item.row === row);
      if (!skill) return;
      event.preventDefault();
      startDrag(event, skill);
    });

    root.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".es-row")) {
        event.preventDefault();
      }
    });

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);
  };

  try {
    const originalStatus = document.querySelector("#skd > .status");
    const tableBody = originalStatus?.querySelector("table tbody");
    const saveAnchor = document.querySelector('#btn nav.btn a[href*="cmd=sk"]');
    const message = document.querySelector("article.checktxt p");
    if (!tableBody || !saveAnchor || !message) {
      alert("作戦設定ページで実行してください。");
      return;
    }

    document.getElementById(ROOT_ID)?.remove();
    createStyle();

    const state = {
      baseHref: saveAnchor.getAttribute("href") || location.href,
      skills: parseSkills(tableBody),
    };
    if (!state.skills.length) {
      alert("スキル情報を取得できませんでした。");
      return;
    }

    const root = document.createElement("div");
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="status es-group">
        <table>
          <caption>使用するスキル</caption>
          <tbody class="es-skill-list" data-group="used"></tbody>
        </table>
      </div>
      <div class="status es-group">
        <table>
          <caption>使用しないスキル</caption>
          <tbody class="es-skill-list" data-group="unused"></tbody>
        </table>
      </div>
      <p class="r"><small class="es-summary"></small></p>
    `;

    state.skills.forEach((skill) => buildRow(skill));

    const usedBody = root.querySelector('[data-group="used"]');
    const unusedBody = root.querySelector('[data-group="unused"]');
    const summary = root.querySelector(".es-summary");
    const update = () => render(state, usedBody, unusedBody, summary, saveAnchor);

    enableDrag(state, root, update);
    update();

    message.innerHTML =
      'スキルの優先順位をドラッグで設定してください<br><small>※行をドラッグすると順番を変更できます。<br>※「使用しないスキル」に移動したものは使われません。</small>';
    originalStatus.style.display = "none";
    document.getElementById("skd").appendChild(root);
  } catch (error) {
    alert("エラー: " + error.message);
  }
})();
