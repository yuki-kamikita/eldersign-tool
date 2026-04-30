(() => {
  const ROOT_ID = "__es_book_sort_drag_ui";
  const STYLE_ID = "__es_book_sort_drag_style";
  const DRAG_THRESHOLD = 6;
  const LONG_PRESS_MS = 320;
  const PER_PAGE = 10;

  const toUrl = (href) => {
    try {
      return new URL(href, location.href);
    } catch (_) {
      return null;
    }
  };

  const getSortKind = (href) => {
    const url = toUrl(href);
    if (!url) return null;
    if (/\/sort_comp(?:\.php)?$/i.test(url.pathname)) {
      return {
        itemName: "コンパニオン",
        idParam: "cid",
        detailPath: /\/ccard_detail(?:\.php)?$/i,
        defaultSortUrl: "https://eldersign.jp/sort_comp.php?pg=0&r=0",
      };
    }
    if (/\/sort_mons(?:\.php)?$/i.test(url.pathname)) {
      return {
        itemName: "モンスター",
        idParam: "mid",
        detailPath: /\/mcard_detail(?:\.php)?$/i,
        defaultSortUrl: "https://eldersign.jp/sort_mons.php?pg=0&r=0",
      };
    }
    return null;
  };

  const getPageKind = () => {
    const hrefs = Array.from(document.querySelectorAll("a[href]")).map(
      (link) => link.getAttribute("href") || "",
    );
    for (const href of hrefs) {
      const kind = getSortKind(href);
      if (kind) return kind;
    }
    const locationKind = getSortKind(location.href);
    if (locationKind) return locationKind;
    const formAction = document.querySelector('form[name="sortform"]')?.getAttribute("action") || "";
    const formUrl = toUrl(formAction);
    const cmd = formUrl?.searchParams.get("cmd") || new URL(location.href).searchParams.get("cmd") || "";
    if (cmd === "m") {
      return {
        itemName: "モンスター",
        idParam: "mid",
        detailPath: /\/mcard_detail(?:\.php)?$/i,
        defaultSortUrl: "https://eldersign.jp/sort_mons.php?pg=0&r=0",
      };
    }
    return {
      itemName: "コンパニオン",
      idParam: "cid",
      detailPath: /\/ccard_detail(?:\.php)?$/i,
      defaultSortUrl: "https://eldersign.jp/sort_comp.php?pg=0&r=0",
    };
  };

  const getParam = (href, name) => toUrl(href)?.searchParams.get(name) || "";

  const getItemIdFromHref = (href, idParam) => {
    const url = toUrl(href);
    if (!url) return "";
    return url.searchParams.get(idParam) || "";
  };

  const createStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
#${ROOT_ID}{
  margin:8px 0;
  -webkit-touch-callout:none;
  touch-action:pan-y;
}
#${ROOT_ID} .es-note{
  text-align:center;
  margin:8px 10px;
  color:#ddd;
  font-size:85%;
}
#${ROOT_ID} nav.block{
  margin-top:0;
}
#${ROOT_ID} .es-row{
  position:relative;
  display:flex;
  align-items:stretch;
  gap:6px;
  touch-action:pan-y;
  -webkit-user-select:none;
  user-select:none;
}
#${ROOT_ID} .es-row > a{
  flex:1 1 auto;
  min-width:0;
  padding-right:44px;
  cursor:grab;
}
#${ROOT_ID} .es-row.is-dragging{
  opacity:.96;
  box-shadow:0 6px 16px rgba(0,0,0,.35);
}
#${ROOT_ID} .es-row.is-dragging .es-actions{
  visibility:hidden;
}
#${ROOT_ID} .es-row.is-placeholder{
  min-height:82px;
  border:2px dashed #e3300f;
  box-sizing:border-box;
  background:rgba(90,16,16,.75);
  margin:6px 0;
}
#${ROOT_ID} .es-row.is-placeholder::before{
  content:"ここに移動";
  display:block;
  color:#fff;
  text-align:center;
  padding:28px 0;
  font-weight:bold;
}
#${ROOT_ID} .es-handle{
  position:absolute;
  right:calc(78px + 14px);
  top:8px;
  z-index:1;
  min-width:30px;
  line-height:28px;
  border-radius:5px;
  color:#fff;
  background:rgba(0,0,0,.55);
  text-align:center;
  font-weight:bold;
  pointer-events:auto;
  touch-action:none;
  cursor:grab;
}
#${ROOT_ID} .es-actions{
  flex:0 0 78px;
  display:flex;
  flex-direction:column;
  align-self:stretch;
  gap:0;
}
#${ROOT_ID} .es-move-button{
  flex:1 1 0;
  width:100%;
  min-height:0;
  border:1px solid #100;
  border-radius:5px;
  color:#fff;
  background:#2f2b1d;
  box-shadow:0 1px 2px rgba(0,0,0,.45), inset 0 1px 1px rgba(255,255,255,.25);
  font:inherit;
  font-size:75%;
  line-height:1;
  cursor:pointer;
}
#${ROOT_ID} .es-move-button + .es-move-button{
  margin-top:4px;
}
#${ROOT_ID} .es-move-button:disabled{
  opacity:.45;
  cursor:default;
}
#${ROOT_ID} .es-selected-label{
  margin:8px 10px 4px;
  text-align:center;
  font-size:85%;
  color:#f5d3c9;
}
#${ROOT_ID} .es-status{
  text-align:center;
  margin:8px 10px;
  color:#f5d3c9;
  font-size:85%;
}
`;
    document.head.appendChild(style);
  };

  const cloneItem = (li, itemId, source) => {
    const cloned = li.cloneNode(true);
    cloned.classList.add("es-row");
    cloned.dataset.itemId = itemId;
    cloned.dataset.source = source;
    cloned.querySelectorAll("a").forEach((link) => {
      link.removeAttribute("href");
      link.classList.remove("disable");
    });
    const handle = document.createElement("span");
    handle.className = "es-handle";
    handle.textContent = "☰";
    const actions = document.createElement("span");
    actions.className = "es-actions";
    const topButton = document.createElement("button");
    topButton.type = "button";
    topButton.className = "es-move-button";
    topButton.dataset.move = "top";
    topButton.textContent = "一番上へ";
    const bottomButton = document.createElement("button");
    bottomButton.type = "button";
    bottomButton.className = "es-move-button";
    bottomButton.dataset.move = "bottom";
    bottomButton.textContent = "一番下へ";
    actions.append(topButton, bottomButton);
    cloned.append(handle, actions);
    return cloned;
  };

  const findCurrentPage = () => {
    const current = document.querySelector("footer li.on a, footer a.on");
    const text = current?.textContent?.trim();
    if (text && /^\d+$/.test(text)) return Math.max(0, Number(text) - 1);
    const raw = new URL(location.href).searchParams.get("pg");
    const value = raw == null ? 0 : parseInt(raw, 10);
    return Number.isNaN(value) || value < 0 ? 0 : value;
  };

  const findBaseHref = (kind) => {
    const links = Array.from(document.querySelectorAll("a[href]"));
    const insert = links.find((link) => {
      const href = link.getAttribute("href") || "";
      return getSortKind(href)?.idParam === kind.idParam && getParam(href, "cmd") === "i";
    });
    if (insert) return insert.getAttribute("href") || "";

    const sort = links.find((link) => getSortKind(link.getAttribute("href") || "")?.idParam === kind.idParam);
    if (sort) return sort.getAttribute("href") || "";

    if (getSortKind(location.href)?.idParam === kind.idParam) return location.href;
    return kind.defaultSortUrl;
  };

  const buildMoveHref = (state, itemId, insertIndex) => {
    const url = toUrl(state.baseHref) || new URL(state.kind.defaultSortUrl, location.href);
    let page = state.currentPage;
    let tid = insertIndex;
    if (state.isExpanded) {
      page = Math.min(Math.floor(insertIndex / PER_PAGE), Math.floor((state.items.length - 1) / PER_PAGE));
      tid = insertIndex - page * PER_PAGE;
    }
    url.searchParams.set("cmd", "i");
    url.searchParams.set(state.kind.idParam, itemId);
    url.searchParams.set("tid", String(tid));
    url.searchParams.set("pg", String(page));
    if (!url.searchParams.has("r")) url.searchParams.set("r", "0");
    return url.toString();
  };

  const getOfficialInsertIndex = (state, itemId, insertIndex) => {
    const originalIndex = state.items.findIndex((item) => item.itemId === itemId);
    if (originalIndex < 0) return insertIndex;
    return insertIndex > originalIndex ? insertIndex + 1 : insertIndex;
  };

  const getSelectedItemId = (kind) => {
    const urlItemId = new URL(location.href).searchParams.get(kind.idParam);
    if (urlItemId && urlItemId !== "0") return urlItemId;
    const insert = Array.from(document.querySelectorAll("a[href]")).find((link) => {
      const href = link.getAttribute("href") || "";
      return getSortKind(href)?.idParam === kind.idParam && getParam(href, "cmd") === "i";
    });
    return insert ? getItemIdFromHref(insert.getAttribute("href") || "", kind.idParam) : "";
  };

  const collectSortPage = (kind) => {
    const blocks = Array.from(document.querySelectorAll("nav.block"));
    const insertBlock = blocks.find((block) =>
      Array.from(block.querySelectorAll("a[href]")).some((link) => {
        const href = link.getAttribute("href") || "";
        return getSortKind(href)?.idParam === kind.idParam && getParam(href, "cmd") === "i";
      }),
    );
    if (!insertBlock) return null;

    const selectedItemId = getSelectedItemId(kind);
    const items = [];

    Array.from(insertBlock.querySelectorAll("li")).forEach((li) => {
      const link = li.querySelector("a[href]");
      const href = link?.getAttribute("href") || "";
      const disabled = li.querySelector("a.disable");
      if (disabled && selectedItemId) {
        items.push({
          itemId: selectedItemId,
          source: "selected",
          node: cloneItem(li, selectedItemId, "selected"),
        });
        return;
      }
      if (getSortKind(href)?.idParam !== kind.idParam || getParam(href, "cmd") !== "s") return;
      const itemId = getItemIdFromHref(href, kind.idParam);
      if (!itemId) return;
      items.push({ itemId, source: "list", node: cloneItem(li, itemId, "list") });
    });

    const selectedBlock = blocks.find((block) => block !== insertBlock && block.querySelector("a.disable"));
    if (!items.some((item) => item.source === "selected") && selectedBlock && selectedItemId) {
      const selectedLi = selectedBlock.querySelector("li");
      if (selectedLi) {
        items.unshift({
          itemId: selectedItemId,
          source: "selected",
          node: cloneItem(selectedLi, selectedItemId, "selected"),
        });
      }
    }

    if (!items.length) return null;
    return {
      mode: "sort",
      insertBefore: selectedBlock || insertBlock,
      hide: [selectedBlock, insertBlock].filter(Boolean),
      kind,
      items,
    };
  };

  const collectBookPage = (kind) => {
    const blocks = Array.from(document.querySelectorAll("nav.block"));
    const listBlock = blocks.find((block) =>
      Array.from(block.querySelectorAll("li > a[href]")).some((link) =>
        kind.detailPath.test(toUrl(link.getAttribute("href") || "")?.pathname || ""),
      ),
    );
    if (!listBlock) return null;
    const items = Array.from(listBlock.querySelectorAll("li"))
      .map((li) => {
        const link = li.querySelector("a[href]");
        const href = link?.getAttribute("href") || "";
        const url = toUrl(href);
        if (!url || !kind.detailPath.test(url.pathname)) return null;
        const itemId = url.searchParams.get(kind.idParam) || "";
        if (!itemId) return null;
        return { itemId, source: "list", node: cloneItem(li, itemId, "list") };
      })
      .filter(Boolean);
    if (!items.length) return null;
    return {
      mode: "book",
      insertBefore: listBlock,
      hide: [listBlock],
      kind,
      items,
    };
  };

  const buildUi = (state) => {
    document.getElementById(ROOT_ID)?.remove();
    createStyle();

    const root = document.createElement("div");
    root.id = ROOT_ID;
    const note = document.createElement("p");
    note.className = "es-note";
    note.textContent =
      state.mode === "sort"
        ? `移動したい${state.kind.itemName}を長押しして、移動先へドラッグしてください。`
        : `${state.kind.itemName}を長押しして移動先へドラッグすると並び替えを実行します。`;
    const block = document.createElement("nav");
    block.className = "block";
    const list = document.createElement("ul");
    list.className = "es-list";
    state.items.forEach((item) => list.appendChild(item.node));
    block.appendChild(list);
    const status = document.createElement("p");
    status.className = "es-status";
    root.append(note, block, status);
    state.insertBefore.parentNode.insertBefore(root, state.insertBefore);
    state.hide.forEach((element) => {
      element.style.display = "none";
    });
    return { root, list, status };
  };

  const enableDrag = (state, root, list, status) => {
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

    const rows = () =>
      Array.from(list.querySelectorAll(".es-row")).filter(
        (row) => row !== drag?.row && row !== drag?.placeholder,
      );

    const syncState = () => {
      state.items = Array.from(list.querySelectorAll(".es-row"))
        .map((row) => state.items.find((item) => item.node === row))
        .filter(Boolean);
    };

    const setStatus = (message) => {
      status.textContent = message;
      clearTimeout(setStatus.timer);
      if (message) {
        setStatus.timer = setTimeout(() => {
          status.textContent = "";
        }, 3200);
      }
    };

    const updateButtons = () => {
      const currentRows = Array.from(list.querySelectorAll(".es-row"));
      currentRows.forEach((row, index) => {
        const topButton = row.querySelector('[data-move="top"]');
        const bottomButton = row.querySelector('[data-move="bottom"]');
        if (topButton) topButton.disabled = state.busy || index === 0;
        if (bottomButton) bottomButton.disabled = state.busy || index === currentRows.length - 1;
      });
    };

    const applyMove = async (href, afterSave) => {
      state.busy = true;
      updateButtons();
      setStatus("保存中...");
      try {
        const response = await fetch(href, { credentials: "include" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.baseHref = href;
        afterSave?.();
        syncState();
        updateButtons();
        setStatus("保存しました");
      } catch (error) {
        setStatus("");
        alert("並び替えの保存に失敗しました: " + error.message);
      } finally {
        state.busy = false;
        updateButtons();
      }
    };

    const placePlaceholder = (clientY) => {
      const before = rows().find(
        (row) => clientY < row.getBoundingClientRect().top + row.offsetHeight / 2,
      );
      if (before) {
        list.insertBefore(drag.placeholder, before);
      } else {
        list.appendChild(drag.placeholder);
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

    const cleanup = () => {
      if (!drag) return null;
      clearPressTimer();
      unlockPageScroll();
      const { row, placeholder } = drag;
      row.classList.remove("is-dragging");
      row.style.position = "";
      row.style.left = "";
      row.style.top = "";
      row.style.width = "";
      row.style.pointerEvents = "";
      row.style.zIndex = "";
      if (placeholder.isConnected) {
        placeholder.replaceWith(row);
      }
      row.releasePointerCapture?.(drag.pointerId);
      const result = drag;
      drag = null;
      return result;
    };

    const startDrag = (event, row) => {
      const rect = row.getBoundingClientRect();
      const placeholder = document.createElement("li");
      placeholder.className = "es-row is-placeholder";
      placeholder.style.height = `${rect.height}px`;

      drag = {
        row,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        placeholder,
        active: false,
        longPressReady: event.pointerType !== "touch",
        pointerType: event.pointerType || "mouse",
      };
      row.setPointerCapture?.(event.pointerId);
      if (!drag.longPressReady) {
        drag.pressTimer = setTimeout(() => {
          if (!drag || drag.row !== row || drag.active) return;
          drag.longPressReady = true;
          activateDrag();
        }, LONG_PRESS_MS);
      }
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
      if (document.elementFromPoint(event.clientX, event.clientY)?.closest(`#${ROOT_ID}`)) {
        placePlaceholder(event.clientY);
      }
    };

    const handlePointerEnd = () => {
      if (!drag) return;
      if (!drag.active) {
        cleanup();
        return;
      }
      const itemId = drag.row.dataset.itemId;
      const insertIndex = Array.from(list.children)
        .filter(
          (row) =>
            row === drag.placeholder ||
            (row.classList?.contains("es-row") &&
              !row.classList.contains("is-dragging")),
        )
        .indexOf(drag.placeholder);
      const result = cleanup();
      if (!result || insertIndex < 0) return;
      const officialIndex = getOfficialInsertIndex(state, itemId, insertIndex);
      applyMove(buildMoveHref(state, itemId, officialIndex));
    };

    const handleTouchMove = (event) => {
      if (drag?.active) event.preventDefault();
    };

    const moveByButton = (row, direction) => {
      if (state.busy) return;
      const currentRows = Array.from(list.querySelectorAll(".es-row"));
      const originalIndex = currentRows.indexOf(row);
      if (originalIndex < 0) return;
      const targetIndex = direction === "top" ? 0 : currentRows.length - 1;
      if (originalIndex === targetIndex) return;
      const itemId = row.dataset.itemId;
      const officialIndex = getOfficialInsertIndex(state, itemId, targetIndex);
      applyMove(buildMoveHref(state, itemId, officialIndex), () => {
        if (direction === "top") {
          list.insertBefore(row, currentRows[0]);
        } else {
          list.appendChild(row);
        }
      });
    };

    root.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".es-move-button")) return;
      if (state.busy) return;
      if (event.button !== 0) return;
      const row = event.target.closest(".es-row");
      if (!row || row.classList.contains("is-placeholder")) return;
      if (event.pointerType !== "touch" && event.pointerType !== "pen") {
        event.preventDefault();
      }
      startDrag(event, row);
    });
    root.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".es-row")) event.preventDefault();
    });
    root.addEventListener("click", (event) => {
      const button = event.target.closest(".es-move-button");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const row = button.closest(".es-row");
      if (!row) return;
      moveByButton(row, button.dataset.move);
    });
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerEnd);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    updateButtons();
  };

  try {
    const kind = getPageKind();
    const collected = collectSortPage(kind) || collectBookPage(kind);
    if (!collected) {
      alert("ブックの一覧画面、または並び替え画面で実行してください。");
      return;
    }

    const state = {
      ...collected,
      baseHref: findBaseHref(kind),
      currentPage: findCurrentPage(),
      isExpanded:
        collected.mode === "book" &&
        (document.body.dataset.esBookExpanded === "1" || collected.items.length > PER_PAGE),
    };

    const { root, list, status } = buildUi(state);
    enableDrag(state, root, list, status);

    const message = document.querySelector("article.checktxt p");
    if (message && state.mode === "sort") {
      message.textContent = `移動したい${state.kind.itemName}を長押しして、移動先へドラッグしてください`;
    }
  } catch (error) {
    alert("エラー: " + error.message);
  }
})();
