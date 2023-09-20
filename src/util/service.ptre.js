import { getLogger } from "./logger.js";

const logger = getLogger("service.ptre");

const PTRE_URL = "https://ptre.chez.gg/scripts/";
const abortController = new AbortController();
window.onbeforeunload = () => abortController.abort();

/**
 * @typedef {object} PtreResponse
 * @property {number} code
 * @property {string} message
 * @property {string} message_verbose
 * @property {string} message_debug
 */

/**
 * @param {URLSearchParams} params
 * @param {{[key:string]: any}} data
 * @return {URLSearchParams}
 * @private
 */
function _buildQueryString(params, data = undefined) {
  //const params = new URLSearchParams();
  params.set("tool", "infinity");
  if (data) {
    Object.entries(data).forEach((e) => params.set(e[0], String(e[1])));
  }
}

/**
 * @return {Promise<PtreResponse>}
 */
export function getPlayerInfos(teamKey, cleanPlayerName, playerId, frame) {
  const url = new URL(PTRE_URL.concat("oglight_get_player_infos.php"));
  _buildQueryString(url.searchParams, {
    team_key: teamKey,
    pseudo: cleanPlayerName,
    player_id: playerId,
    input_frame: frame,
  });

  return fetch(url, {
    method: "GET",
    signal: abortController.signal,
    mode: "cors",
  })
    .then((response) => response.json())
    .catch((reason) => {
      logger.error(reason);
      throw reason;
    });
}

/**
 * @return {Promise<PtreResponse>}
 */
export function updateGalaxy(position) {
  const url = new URL(PTRE_URL.concat("api_galaxy_import_infos.php"));
  _buildQueryString(url.searchParams);

  return fetch(url, {
    method: "POST",
    body: JSON.stringify(position),
    signal: abortController.signal,
  })
    .then((response) => response.json())
    .catch((reason) => {
      logger.error(reason);
      throw reason;
    })
    .then((data) => {
      if (data.code !== 1) {
        const msg = "Galaxy import error! ".concat(data.message);
        logger.error(msg);
        return Promise.reject(Error(msg));
      }
      return Promise.resolve(data);
    });
}

/**
 * @return {Promise<PtreResponse>}
 */
export function importPlayerActivity(activity) {
  const url = new URL(PTRE_URL.concat("oglight_import_player_activity.php"));
  _buildQueryString(url.searchParams);

  return fetch(url, {
    method: "POST",
    body: JSON.stringify(activity),
    signal: abortController.signal,
  })
    .then((response) => response.json())
    .catch((reason) => {
      logger.error(reason);
      throw reason;
    })
    .then((data) => {
      if (data.code !== 1) {
        const msg = "Import player activity error! ".concat(data.message);
        logger.error(msg);
        return Promise.reject(new Error(msg));
      }
      return Promise.resolve(data);
    });
}

/**
 * @return {Promise<PtreResponse>}
 */
export function importSpy(teamKey, reportKey) {
  const url = new URL(PTRE_URL.concat("oglight_import.php"));
  _buildQueryString(url.searchParams, {
    team_key: teamKey,
    sr_id: reportKey,
  });

  return fetch(url, {
    method: "GET",
    signal: abortController.signal,
  })
    .then((response) => response.json())
    .catch((reason) => {
      logger.error(reason);
      throw reason;
    })
    .then((data) => {
      if (data.code !== 1) {
        const msg = "Import spy report error! ".concat(data.message);
        logger.error(msg);
        return Promise.reject(new Error(msg));
      }
      return Promise.resolve(data);
    });
}
