import { requestOGamePlanets } from "../services/request.ogamePlanets.js";

/**
 *
 * @param {string} universe
 * @return Promise<PlanetsSnapshot>
 */
export function getPlanets(universe) {
  return requestOGamePlanets(universe).then((response) => {
    const timestamp = parseInt(response.document.documentElement.getAttribute("timestamp"), 10);
    const planetList = toPlanetResponse(response);
    return {
      planets: toPlanetMap(planetList),
      planetList: planetList,
      timestamp: Number.isFinite(timestamp) ? timestamp : -1,
    };
  });
}

/**
 * @param {PlanetResponse[]} planetResponse
 * @return PlayerPlanetsMap
 */
function toPlanetMap(planetResponse) {
  const uniquest = [...new Set(planetResponse.map((p) => p.player))];

  /** @type {PlayerPlanetsMap} */
  const playerPlanets = uniquest.reduce((acc, id) => acc.set(id, []), new Map());

  planetResponse.forEach((planet) => {
    const playerId = planet.player;
    let acc = playerPlanets.get(playerId);
    acc.push(planet);
    playerPlanets.set(playerId, acc);
  });

  return playerPlanets;
}

/**
 *
 * @param {FetchResponse<Document>} response
 * @return PlanetResponse[]
 */
function toPlanetResponse(response) {
  const doc = response.document.documentElement;
  return Array.from(doc.childNodes).map((node) => ({
    id: parseInt(node.getAttribute("id"), 10),
    player: parseInt(node.getAttribute("player"), 10),
    name: node.getAttribute("name"),
    coords: node.getAttribute("coords"),
    moon: parseInt(node?.firstChild?.getAttribute("id") || 0, 0),
  }));
}

/**
 * @typedef {Map<number, PlanetResponse[]>} PlayerPlanetsMap
 */

/**
 * @typedef {Object} PlanetsSnapshot
 * @property {PlayerPlanetsMap} planets - planets grouped by player id
 * @property {PlanetResponse[]} planetList - flat list of every planet in the universe
 * @property {number} timestamp - universe.xml root `timestamp` attribute (unix seconds), -1 if missing
 */

/**
 * @typedef {Object} PlanetResponse
 * @property {number} id - planet ID
 * @property {number} player - player ID
 * @property {string} name
 * @property {string} coords
 * @property {number} moon - moon ID
 */
