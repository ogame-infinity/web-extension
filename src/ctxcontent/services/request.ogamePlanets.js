import { fetchXml } from "../../util/fetching.js";

export function requestOGamePlanets(universe) {
  const url = new URL(`https://${universe}.ogame.gameforge.com/api/universe.xml`);

  return fetchXml(url, { method: "GET" });
}
