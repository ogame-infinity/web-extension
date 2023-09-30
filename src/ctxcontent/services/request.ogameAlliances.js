import { fetchXml } from "../../util/fetching.js";

/**
 *
 * @param {string} universe
 * @return {Promise<FetchResponse<Document>>}
 */
export function requestOGameAlliances(universe) {
  const url = new URL(`https://${universe}.ogame.gameforge.com/api/alliances.xml`);

  return fetchXml(url, { method: "GET" });
}
