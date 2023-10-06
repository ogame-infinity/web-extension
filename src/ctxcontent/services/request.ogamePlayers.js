import { fetchXml } from "../../util/fetching.js";

/**
 *
 * @param {string} universe sub part of domain server. Ejm: s1-es, s180-us
 * @return {Promise<FetchResponse<Document>>} XML
 */
export function requestOGamePlayers(universe) {
  const url = new URL(`https://${universe}.ogame.gameforge.com/api/players.xml`);

  return fetchXml(url, { method: "GET" });
}
