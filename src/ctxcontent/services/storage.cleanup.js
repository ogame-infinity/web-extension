import { getLogger } from "../../util/logger.js";

const logger = getLogger("storageCleanup");

/** Extension-wide marker (shared by all universes): `{ lastRun: <ms> }`. */
const CLEANUP_STATE_KEY = "ogi-storage-cleanup";
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** A universe not loaded for longer than this is purged; all its data is rebuilt on the next visit. */
const UNIVERSE_STALE_MS = 8 * 24 * 60 * 60 * 1000;

const UNIVERSE_ID = /^s\d+-[a-z]+$/;

/** Every `chrome.storage.local` key owned by a universe. */
const universeKeys = (universe) => [
  universe,
  `ogi-scanned-${universe}`,
  `ogi-galaxy-${universe}`,
  `${universe}-expirations`,
  `${universe}-universe-data-information`,
];

/**
 * @param {string} key
 * @return {string|null} universe owning `key`, or null for extension-wide keys
 */
function universeOfKey(key) {
  if (UNIVERSE_ID.test(key)) return key;
  const prefixed = /^ogi-(?:scanned|galaxy)-(.+)$/.exec(key);
  if (prefixed) return prefixed[1];
  const suffixed = /^(s\d+-[a-z]+)-(?:expirations|universe-data-information)$/.exec(key);
  return suffixed ? suffixed[1] : null;
}

/**
 * Remove every key of the universes (other than `currentUniverse`) whose data was not refreshed
 * for more than UNIVERSE_STALE_MS. The last refresh is `lastUpdate` in the `<universe>` blob,
 * set by DataHelper.refreshPublicApiData() while the universe is played; a universe without a readable
 * `lastUpdate` (orphan keys) is purged too.
 * @param {string} currentUniverse
 * @param {number} [now]
 * @return {Promise<{universe: string, lastUpdate: string|null}[]>} purged universes
 */
export async function purgeStaleUniverses(currentUniverse, now = Date.now()) {
  const storage = chrome.storage.local;
  let all = null;
  let keys;
  // getKeys() (Chrome 130+) avoids loading the galaxy / scanned values, only the blobs are read.
  if (typeof storage.getKeys === "function") {
    keys = await storage.getKeys();
  } else {
    all = await storage.get(null);
    keys = Object.keys(all);
  }

  const others = new Set(keys.map(universeOfKey).filter((u) => u && u !== currentUniverse));
  if (others.size === 0) return [];

  const blobs = all ?? (await storage.get([...others].filter((u) => keys.includes(u))));
  const stale = [];
  for (const universe of others) {
    const lastUpdate = Date.parse(blobs[universe]?.lastUpdate);
    if (Number.isFinite(lastUpdate) && now - lastUpdate <= UNIVERSE_STALE_MS) continue;
    stale.push({ universe, lastUpdate: Number.isFinite(lastUpdate) ? new Date(lastUpdate).toISOString() : null });
  }
  if (stale.length === 0) return [];

  const existing = new Set(keys);
  await storage.remove(stale.flatMap(({ universe }) => universeKeys(universe)).filter((k) => existing.has(k)));
  logger.info(
    `Purged universes not played for 8+ days: ${stale
      .map(({ universe, lastUpdate }) => `${universe} (last update: ${lastUpdate ?? "unknown"})`)
      .join(", ")}`
  );
  return stale;
}

/**
 * @return {Promise<number>} time (ms) of the last daily cleanup run, -1 if it never ran
 */
export async function getLastCleanupTime() {
  const lastRun = (await chrome.storage.local.get(CLEANUP_STATE_KEY))[CLEANUP_STATE_KEY]?.lastRun;
  return Number.isFinite(lastRun) ? lastRun : -1;
}

/**
 * Run purgeStaleUniverses() at most once a day (all universes and tabs share the marker),
 * `delayMs` after the page load so it never competes with the page rendering.
 * @param {string} currentUniverse
 * @param {number} [delayMs]
 */
export function scheduleDailyStorageCleanup(currentUniverse, delayMs = 3 * 60 * 1000) {
  setTimeout(async () => {
    try {
      const storage = chrome.storage.local;
      const lastRun = (await storage.get(CLEANUP_STATE_KEY))[CLEANUP_STATE_KEY]?.lastRun;
      if (Number.isFinite(lastRun) && Date.now() - lastRun < CLEANUP_INTERVAL_MS) return;
      // Marked before the purge so concurrent tabs skip it; a failed write (full storage) must not
      // prevent the purge, which is what frees space.
      await storage.set({ [CLEANUP_STATE_KEY]: { lastRun: Date.now() } }).catch(() => {});
      await purgeStaleUniverses(currentUniverse);
    } catch (err) {
      logger.error("Daily storage cleanup failed", err);
    }
  }, delayMs);
}
