(() => {
  const RARITY_MAP = { b: 1, s: 2, g: 4, p: 8 };

  function getRarity(li) {
    const img = li.querySelector('img[src*="https://eldersign.jp/img/mi/"]');
    if (!img) return null;
    const m = img.src.match(/\/mi\/([a-z])\//i);
    return m ? RARITY_MAP[m[1].toLowerCase()] ?? null : null;
  }

  function getGrade(li) {
    const img = li.querySelector('img[src*="grade_"]');
    if (!img) return null;
    const m = img.src.match(/grade_(\d+)\.png/i);
    return m ? Number(m[1]) : null;
  }

  function getLevel(li) {
    const text = li.innerText || '';
    const m = text.match(/Lv\s*(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  function calcBaseExp(r, g, l) {
    return Math.round(r * g * ((l + 4) / 5) * 16);
  }

  function upsertExpP(li, baseExp) {
    let expP = Array.from(li.querySelectorAll('p'))
      .find(p => /経験値\s*[:：]/.test(p.textContent));

    if (!expP) {
      expP = document.createElement('p');
      const ps = li.querySelectorAll('p');
      ps.length ? ps[ps.length - 1].after(expP) : li.appendChild(expP);
    }

    const sameTypeExp = Math.round(baseExp * 1.125);
    expP.textContent = `経験値: 異種族${baseExp} / 同種族${sameTypeExp}`;
  }

  document.querySelectorAll('nav.block li').forEach(li => {
    const r = getRarity(li);
    const g = getGrade(li);
    const l = getLevel(li);
    if (r == null || g == null || l == null) return;
    upsertExpP(li, calcBaseExp(r, g, l));
  });
})();
