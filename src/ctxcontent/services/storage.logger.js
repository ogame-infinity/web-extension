import { getLogger } from "../../util/logger.js";

/**
 * Single logger for the universe keys of `chrome.storage.local` (`<U>`, `ogi-scanned-<U>`,
 * `ogi-galaxy-<U>`): load, refresh, write, reset, purge. Messages about `ogi-galaxy-<U>` only
 * start with "[galaxyStoragePTRE] ". The galaxy view ingestion (normal gameplay) is not logged.
 */
export const storageLogger = getLogger("universeStorage");
