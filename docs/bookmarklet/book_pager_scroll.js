(function () {
  const ITEMS_PER_PAGE = 10;
  const MARKER = "eldPgScroll";

  function findFooter() {
    return document.querySelector("footer");
  }

  function findPagerContainer(footer) {
    if (footer) {
      const pgBoxes = footer.querySelectorAll("div.pg");
      if (pgBoxes.length && pgBoxes[0].parentElement) {
        return pgBoxes[0].parentElement;
      }
      const nav = footer.querySelector("nav.pager");
      if (nav) return nav;
    }
    const navFallback = document.querySelector("nav.pager");
    if (navFallback) return navFallback;

    const onAnchor = document.querySelector("div.pg a.on");
    if (onAnchor) {
      const container = onAnchor.closest("div.pg")?.parentElement;
      if (container) return container;
    }

    const parents = [...document.querySelectorAll("div.pg")]
      .map((pg) => pg.parentElement)
      .filter((parent) => !!parent);
    const uniqueParents = [...new Set(parents)];
    let best = null;
    let bestCount = 0;
    for (const parent of uniqueParents) {
      const count = [...parent.children].filter(
        (child) => child.tagName && child.tagName.toLowerCase() === "div" && child.classList.contains("pg")
      ).length;
      if (count > bestCount) {
        best = parent;
        bestCount = count;
      }
    }
    return bestCount >= 3 ? best : null;
  }

  function findTotalCount(footer) {
    const texts = [...footer.querySelectorAll("p")].map((p) => p.textContent || "");
    for (const text of texts) {
      const normalized = text.replace(/\s+/g, "");
      const withTotal = normalized.match(/全\s*([\d,]+)\s*\/\s*([\d,]+)\s*(?:枚|人|件)?/);
      if (withTotal) {
        return parseInt(withTotal[1].replace(/,/g, ""), 10);
      }
      const totalOnly = normalized.match(/全\s*([\d,]+)\s*(?:枚|人|件)?/);
      if (totalOnly) {
        return parseInt(totalOnly[1].replace(/,/g, ""), 10);
      }
    }
    return null;
  }

  function getCurrentPageIndex(pagerContainer) {
    const currentLabel = pagerContainer?.querySelector("li.on a, a.on")?.textContent?.trim();
    if (currentLabel && /^\d+$/.test(currentLabel)) {
      const page = parseInt(currentLabel, 10);
      if (Number.isFinite(page) && page > 0) {
        return page - 1;
      }
    }
    try {
      const url = new URL(window.location.href);
      const raw = url.searchParams.get("pg");
      const num = raw == null ? 0 : parseInt(raw, 10);
      return Number.isFinite(num) && num >= 0 ? num : 0;
    } catch (_) {
      return 0;
    }
  }

  function resolvePagerBaseUrl(pagerContainer) {
    const link = pagerContainer?.querySelector("a[href*='pg=']");
    if (link && link.href) return link.href;
    return window.location.href;
  }

  function findMaxVisiblePage(pagerContainer) {
    const pageNumbers = [...(pagerContainer?.querySelectorAll("a") || [])]
      .map((a) => (a.textContent || "").trim())
      .filter((text) => /^\d+$/.test(text))
      .map((text) => parseInt(text, 10))
      .filter((num) => Number.isFinite(num) && num > 0);
    if (!pageNumbers.length) return null;
    return Math.max(...pageNumbers);
  }

  function buildUrlForPage(index, baseHref) {
    const url = new URL(baseHref || window.location.href);
    url.searchParams.set("pg", String(index));
    return url.toString();
  }

  function createNavButton(label, targetIndex, baseHref) {
    const div = document.createElement("div");
    div.className = "pg";
    div.style.flex = "0 0 auto";
    div.style.minWidth = "42px";
    const a = document.createElement("a");
    a.textContent = label;
    if (targetIndex !== null) {
      a.href = buildUrlForPage(targetIndex, baseHref);
    }
    div.appendChild(a);
    return div;
  }

  function applyScrollStyle(container, scrollWrap) {
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.gap = "2px";
    container.style.maxWidth = "100%";
    container.style.overflow = "hidden";

    scrollWrap.style.display = "flex";
    scrollWrap.style.gap = "2px";
    scrollWrap.style.overflowX = "auto";
    scrollWrap.style.maxWidth = "100%";
    scrollWrap.style.padding = "0 4px";
    scrollWrap.style.scrollbarWidth = "none";
    scrollWrap.style.msOverflowStyle = "none";
    scrollWrap.style.webkitOverflowScrolling = "touch";
    scrollWrap.style.flexWrap = "nowrap";
    scrollWrap.style.alignItems = "center";
    scrollWrap.style.flex = "1 1 auto";
    scrollWrap.style.minWidth = "0";
  }

  function applyNavPagerStyle(nav, list, scrollWrap, scrollLi) {
    nav.style.maxWidth = "100%";
    nav.style.overflow = "hidden";
    list.style.display = "flex";
    list.style.flexWrap = "nowrap";
    list.style.alignItems = "center";
    list.style.justifyContent = "center";
    list.style.overflowX = "hidden";
    list.style.overflowY = "hidden";
    list.style.webkitOverflowScrolling = "touch";
    list.style.scrollbarWidth = "none";
    list.style.msOverflowStyle = "none";
    list.style.padding = "0";
    list.style.margin = "0";
    list.style.listStyle = "none";
    list.style.width = "100%";

    if (scrollLi) {
      scrollLi.style.flex = "1 1 auto";
      scrollLi.style.minWidth = "0";
      scrollLi.style.display = "flex";
      scrollLi.style.background = "none";
      scrollLi.style.boxShadow = "none";
      scrollLi.style.border = "none";
      scrollLi.style.padding = "0";
      scrollLi.style.margin = "0";
    }

    if (scrollWrap) {
      scrollWrap.style.display = "flex";
      scrollWrap.style.flexWrap = "nowrap";
      scrollWrap.style.alignItems = "center";
      scrollWrap.style.overflowX = "auto";
      scrollWrap.style.overflowY = "hidden";
      scrollWrap.style.webkitOverflowScrolling = "touch";
      scrollWrap.style.scrollbarWidth = "none";
      scrollWrap.style.msOverflowStyle = "none";
      scrollWrap.style.padding = "0 8px";
      scrollWrap.style.margin = "0";
      scrollWrap.style.listStyle = "none";
      scrollWrap.style.width = "max-content";
      scrollWrap.style.background = "none";
    }
  }

  function createNavPagerButton(label, href, liClass, isCurrent, isDisabled) {
    const li = document.createElement("li");
    if (liClass) li.className = liClass;
    li.style.flex = "0 0 auto";
    li.style.minWidth = "42px";
    const a = document.createElement("a");
    a.textContent = label;
    if (isCurrent) a.className = "on";
    if (isDisabled) a.className = "disable";
    if (href && !isCurrent && !isDisabled) a.href = href;
    li.appendChild(a);
    return li;
  }

  function centerCurrent(scrollWrap) {
    const current = scrollWrap.querySelector("a.on");
    if (!current) return;
    const target = current.closest(".pg");
    if (!target) return;
    const wrapRect = scrollWrap.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const targetCenter = targetRect.left + targetRect.width / 2;
    const wrapCenter = wrapRect.left + wrapRect.width / 2;
    const delta = targetCenter - wrapCenter;
    scrollWrap.scrollLeft += delta;
  }

  try {
    const existingStyle = document.getElementById("eld-pg-scroll-style");
    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = "eld-pg-scroll-style";
      style.textContent = ".eld-pg-scroll::-webkit-scrollbar{display:none}";
      document.head.appendChild(style);
    }
    const footer = findFooter();
    const pagerContainer = findPagerContainer(footer);
    if (!pagerContainer) {
      alert("ページャーが見つかりません");
      return;
    }
    if ((footer && footer.dataset[MARKER] === "1") || pagerContainer.dataset[MARKER] === "1") {
      alert("すでに適用済みです");
      return;
    }

    const totalCount = findTotalCount(footer || document.body);
    const maxVisiblePage = findMaxVisiblePage(pagerContainer);
    let totalPages = null;
    if (totalCount && Number.isFinite(totalCount)) {
      totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
    } else if (maxVisiblePage && Number.isFinite(maxVisiblePage)) {
      // 総数が不明な場合は、若い方向を1始まりにし、大きい方向は現表示範囲を上限にする
      totalPages = Math.max(1, maxVisiblePage);
    } else {
      alert("総数が取得できません");
      return;
    }
    const currentPageIndex = getCurrentPageIndex(pagerContainer);
    totalPages = Math.max(totalPages, currentPageIndex + 1);
    const baseHref = resolvePagerBaseUrl(pagerContainer);
    const pgContainer = pagerContainer;

    const isNavPager =
      pgContainer.tagName.toLowerCase() === "nav" && pgContainer.classList.contains("pager");
    const scrollWrap = document.createElement(isNavPager ? "ul" : "div");
    scrollWrap.className = "eld-pg-scroll";

    const prevIndex = currentPageIndex > 0 ? currentPageIndex - 1 : null;
    const nextIndex = currentPageIndex + 1 < totalPages ? currentPageIndex + 1 : null;

    pgContainer.innerHTML = "";
    if (isNavPager) {
      const list = document.createElement("ul");
      for (let page = 1; page <= totalPages; page += 1) {
        const index = page - 1;
        const isCurrent = index === currentPageIndex;
        scrollWrap.appendChild(
          createNavPagerButton(
            String(page),
            buildUrlForPage(index, baseHref),
            isCurrent ? "on" : "",
            isCurrent,
            false
          )
        );
      }
      const scrollLi = document.createElement("li");
      scrollLi.appendChild(scrollWrap);

      list.appendChild(
        createNavPagerButton(
          "«",
          prevIndex == null ? null : buildUrlForPage(prevIndex, baseHref),
          "prev",
          false,
          prevIndex == null
        )
      );
      list.appendChild(scrollLi);
      list.appendChild(
        createNavPagerButton(
          "»",
          nextIndex == null ? null : buildUrlForPage(nextIndex, baseHref),
          "next",
          false,
          nextIndex == null
        )
      );
      applyNavPagerStyle(pgContainer, list, scrollWrap, scrollLi);
      pgContainer.appendChild(list);
    } else {
      for (let page = 1; page <= totalPages; page += 1) {
        const index = page - 1;
        const div = document.createElement("div");
        div.className = "pg";
        div.id = `pgs${index}`;
        div.style.flex = "0 0 auto";
        div.style.minWidth = "42px";
        const a = document.createElement("a");
        a.textContent = String(page);
        if (index === currentPageIndex) {
          a.className = "on";
        } else {
          a.href = buildUrlForPage(index, baseHref);
        }
        div.appendChild(a);
        scrollWrap.appendChild(div);
      }
      applyScrollStyle(pgContainer, scrollWrap);
      pgContainer.appendChild(createNavButton("«", prevIndex, baseHref));
      pgContainer.appendChild(scrollWrap);
      pgContainer.appendChild(createNavButton("»", nextIndex, baseHref));
    }

    if (footer) footer.dataset[MARKER] = "1";
    pagerContainer.dataset[MARKER] = "1";
    requestAnimationFrame(() => centerCurrent(scrollWrap));
  } catch (error) {
    alert("エラー: " + error.message);
  }
})();
