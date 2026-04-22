const cache = new Map();

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
};

const setCache = (key, data) => {
  cache.set(key, {
    data,
    expiry: Date.now() + CACHE_TTL,
  });
};

const clearCache = (key) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

module.exports = {
  getCache,
  setCache,
  clearCache,
};
