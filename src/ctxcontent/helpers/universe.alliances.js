import { requestOGameAlliances } from "../services/request.ogameAlliances.js";

/**
 *
 * @param {string} universe
 * @return {Promise<AllianceInformation>}
 */
export function getAlliances(universe) {
  // TODO: need validation by expiration timestamp
  //

  const alliancePromise = requestOGameAlliances(universe).then(toAllianceResponseMap);
  return alliancePromise.then(toAllianceInformation);
}

/**
 *
 * @param {Map<number, AllianceResponse>} allianceInformation
 * @return {AllianceInformation}
 */
function toAllianceInformation(allianceInformation) {
  const playersIDs = [...allianceInformation.entries()].reduce((acc, [allyID, allyData]) => {
    allyData.players.forEach((playerID) => acc.set(playerID, allyID));
    return acc;
  }, /** @type {Map<number, number>} */ new Map());

  return {
    alliances: allianceInformation,
    players: playersIDs,
  };
}

/**
 *
 * @param {FetchResponse<Document>} response
 * @return {Map<number, AllianceResponse>}
 */
function toAllianceResponseMap(response) {
  // TODO: need save cache expiration timestamp

  const doc = response.document.documentElement;
  return Array.from(doc.childNodes).reduce(
    (acc, node) =>
      acc.set(Number(node.getAttribute("id")), {
        id: Number(node.getAttribute("id")),
        name: node.getAttribute("name"),
        tag: node.getAttribute("tag"),
        players: Array.from(node.childNodes).map((n) => Number(n.getAttribute("id"))),
      }),
    new Map()
  );

  // return Array.from(doc.childNodes).map((node) => ({
  //
  // }));
}

/**
 * @typedef {Object} AllianceResponse
 * @property {number} id - alliance ID
 * @property {string} name
 * @property {string} tag
 * @property {number[]} players
 */

/**
 * @typedef {Object} AllianceInformation
 * @property {Map<number, AllianceResponse>} alliances - alliance response, mapped by alliance ID as key.
 * @property {Map<number, number>} players - map of player and alliance,
 *           mapped by player ID as key and alliance ID as value.
 */
