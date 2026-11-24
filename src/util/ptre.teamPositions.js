import * as ptreService from "./service.ptre.js";
import OgamePageData from "./OgamePageData.js";
import OGIData from "./OGIData.js";
import { pageContextRequest } from "./service.callbackEvent.js";
import { getLogger } from "./logger.js";

const logger = getLogger("ptre.teamPositions");
const universe = window.location.host.replace(/\D/g, "");

/** Minimum delay between two automatic requests for the same player (same as OGLight). */
const PLAYER_FETCH_DELAY_MS = 60 * 60 * 1000;

/**
 * Ask PTRE for the positions of `playerId` seen by the team and add the new ones to the local
 * `scannedPlanets` (content script, see DataHelper.importPtrePositions()).
 *
 * At most one request per player every PLAYER_FETCH_DELAY_MS unless `force`. The last request
 * time of each player is kept in `OGIData.ptreGalaxyFetch` (survives page loads) and expired
 * entries are dropped on each call, so the map only holds players requested within the delay.
 *
 * @param {number|string} playerId
 * @param {boolean} [force] - ignore the delay (sync button)
 * @return {Promise<number>} number of positions added locally (0 when skipped or nothing new)
 */
export async function fetchTeamPositions(playerId, force = false) {
  const teamKey = OGIData.options.ptreTK;
  playerId = Number(playerId);
  if (!teamKey || !(playerId > 0)) return 0;

  const now = Date.now();
  const stored = OGIData.ptreGalaxyFetch;
  const fetched = Object.fromEntries(Object.entries(stored).filter(([, ts]) => now - ts < PLAYER_FETCH_DELAY_MS));
  if (!force && fetched[playerId]) {
    if (Object.keys(fetched).length !== Object.keys(stored).length) OGIData.ptreGalaxyFetch = fetched;
    return 0;
  }
  // Recorded before the request: a failing call must not be retried on every page load.
  fetched[playerId] = now;
  OGIData.ptreGalaxyFetch = fetched;

  const result = await ptreService.getGalaxyInfos(OgamePageData.gameLang, universe, teamKey, playerId);
  if (result?.code !== 1) {
    logger.warn(`PTRE team positions for ${playerId}: ${result?.message}`);
    return 0;
  }
  const { response: added } = await pageContextRequest(
    "ptre",
    "importTeamPositions",
    playerId,
    result.galaxy_array || []
  );
  if (OGIData.options.ptreDebugLogs) {
    logger.debug(`PTRE team positions for ${playerId}: ${result.message} | ${added} added locally`);
  }
  return added || 0;
}
