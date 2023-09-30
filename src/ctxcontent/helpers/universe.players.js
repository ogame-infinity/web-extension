import { requestOGamePlayers } from "../services/request.ogamePlayers.js";

/** @type {PlayerResponse} */
export const DEFAULT_PLAYER = {
  name: "<?>",
  alliance: null,
  status: "",
  id: -1,
};

/**
 * @param {string} universe
 * @return {Promise<Map<number, PlayerResponse>>}
 */
export function getPlayers(universe) {
  // TODO: need validation by expiration timestamp
  //
  const responsePromise = requestOGamePlayers(universe).then(toPlayerResponse);
  return responsePromise.then(toPlayerInformation);
}

/**
 *
 * @param {PlayerResponse[]} players
 * @return {Map<number, PlayerResponse>}
 */
function toPlayerInformation(players) {
  return players.reduce((acc, player) => acc.set(player.id, player), new Map());
}

/**
 *
 * @param {FetchResponse<Document>} response
 * @return {PlayerResponse[]}
 */
function toPlayerResponse(response) {
  // TODO: need save cache expiration timestamp

  const doc = response.document.documentElement;
  return Array.from(doc.childNodes).map((node) => ({
    id: parseInt(node.getAttribute("id"), 10),
    name: node.getAttribute("name"),
    alliance: node.hasAttribute("alliance") ? parseInt(node.getAttribute("alliance"), 10) : null,
    status: node.getAttribute("status") ?? "",
  }));
}

/**
 * @typedef {Object} PlayerResponse
 * @property {number} id - player ID
 * @property {string} name
 * @property {number|null} alliance
 * @property {string} status
 */
