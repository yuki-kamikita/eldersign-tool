(() => {
  const LOCAL_CACHE_KEY_BASE = "eldersign_party_record_cache_v2";
  const LEGACY_KEY = "eldersign_party_record_v1";

  const getCacheKey = (uid) => `${LOCAL_CACHE_KEY_BASE}_${uid || "anonymous"}`;

  const readLegacyStore = (uid, { normalizeStore, buildParty, defaultPartyCount }) => {
    try {
      const raw = localStorage.getItem(getCacheKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return normalizeStore(parsed);
        }
      }

      const baseRaw = localStorage.getItem(LOCAL_CACHE_KEY_BASE);
      if (baseRaw) {
        const baseParsed = JSON.parse(baseRaw);
        if (baseParsed && typeof baseParsed === "object") {
          if (uid) {
            try {
              localStorage.setItem(getCacheKey(uid), baseRaw);
            } catch (error) {
              // ignore cache migration errors
            }
          }
          return normalizeStore(baseParsed);
        }
      }

      const prefix = `${LOCAL_CACHE_KEY_BASE}_`;
      const candidateKeys = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          candidateKeys.push(key);
        }
      }
      if (candidateKeys.length > 0) {
        const preferredSuffixes = ["_anonymous", "_null", "_undefined"];
        let chosen = candidateKeys[0];
        for (const suffix of preferredSuffixes) {
          const hit = candidateKeys.find((key) => key.endsWith(suffix));
          if (hit) {
            chosen = hit;
            break;
          }
        }
        const candidateRaw = localStorage.getItem(chosen);
        if (candidateRaw) {
          const candidateParsed = JSON.parse(candidateRaw);
          if (candidateParsed && typeof candidateParsed === "object") {
            if (uid) {
              try {
                localStorage.setItem(getCacheKey(uid), candidateRaw);
              } catch (error) {
                // ignore cache migration errors
              }
            }
            return normalizeStore(candidateParsed);
          }
        }
      }

      const legacyRaw = localStorage.getItem(LEGACY_KEY);
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed)) {
          return normalizeStore({
            activeParty: 1,
            parties: { 1: buildParty(legacyParsed) },
            partyCount: defaultPartyCount,
            partyNames: {},
          });
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  };

  const writeLegacyCache = (uid, store) => {
    try {
      localStorage.setItem(getCacheKey(uid), JSON.stringify(store));
    } catch (error) {
      // ignore cache errors
    }
  };

  window.EldersignLegacyStorage = {
    readLegacyStore,
    writeLegacyCache,
  };
})();
