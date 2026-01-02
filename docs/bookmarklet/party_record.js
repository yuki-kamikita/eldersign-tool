(function () {
  const TOOL_URL =
    // "http://localhost:8080/docs/web/party_record.html";
    "https://yuki-kamikita.github.io/eldersign-tool/web/party_record.html";
  const SKILL_LIMIT = 5;

  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function getMonsterName() {
    const header =
      document.querySelector("div.card_d header.card h1") ||
      document.querySelector("header.card h1") ||
      document.querySelector("h1");
    if (!header) return "";
    return normalizeText(header.textContent);
  }

  function getImageUrl() {
    const cardImage =
      document.querySelector("img#card") ||
      document.querySelector("img.card") ||
      document.querySelector("img");
    if (!cardImage) return "";
    return cardImage.src || "";
  }

  function getSkills() {
    const scope = document.querySelector("div.card_d") || document;
    const captions = [...scope.querySelectorAll("table caption")];
    const cap =
      captions.find((c) => c.textContent.trim().startsWith("作戦")) ||
      captions.find((c) => c.textContent.trim() === "スキル");
    if (!cap) return [];
    const table = cap.closest("table");
    if (!table) return [];
    const rows = [...table.querySelectorAll("tbody tr")];
    const skills = [];
    rows.forEach((row) => {
      const link = row.querySelector("a");
      if (!link) return;
      const name = normalizeText(link.textContent);
      if (!name) return;
      skills.push(name);
    });
    return skills.slice(0, SKILL_LIMIT);
  }

  try {
    const name = getMonsterName();
    const imageUrl = getImageUrl();
    const skills = getSkills();

    if (!name && !imageUrl && skills.length === 0) {
      alert("モンスター情報が見つかりません");
      return;
    }

    const params = new URLSearchParams();
    if (name) params.set("name", name);
    if (imageUrl) params.set("img", imageUrl);
    if (skills.length > 0) params.set("skills", skills.join("|"));

    const query = params.toString();
    const url = query ? `${TOOL_URL}?${query}` : TOOL_URL;
    window.open(url, "_blank", "noopener");
  } catch (error) {
    alert("エラー: " + error.message);
  }
})();
