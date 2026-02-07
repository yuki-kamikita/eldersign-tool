(() => {
  const LOCAL_CACHE_KEY_BASE = "eldersign_party_record_cache_v2";
  const V2_KEY = "eldersign_party_record_v2";

  const getCacheKey = (uid) => `${LOCAL_CACHE_KEY_BASE}_${uid || "anonymous"}`;

  const readLegacyStore = (uid, { normalizeStore, isAnonymous }) => {
    if (!isAnonymous) return null;
    try {
      const v2Raw = localStorage.getItem(V2_KEY);
      if (!v2Raw) return null;
      const v2Parsed = JSON.parse(v2Raw);
      if (!v2Parsed || typeof v2Parsed !== "object") return null;
      if (uid) {
        try {
          localStorage.setItem(getCacheKey(uid), v2Raw);
        } catch (error) {
          // ignore cache migration errors
        }
      }
      return normalizeStore(v2Parsed);
    } catch (error) {
      return null;
    }
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
