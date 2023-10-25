import { requestOGamePlanets } from "../services/request.ogamePlanets.js";

/**
 *
 * @param {string} universe
 * @return Promise<PlayerPlanetsMap>
 */
export function getPlanets(universe) {
  const planetResponse = requestOGamePlanets(universe).then(toPlanetResponse);
  return planetResponse.then(toPlanetMap);
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
    moon: node.hasChildNodes(),
  }));
}

/**
 * @typedef {Map<number, PlanetResponse[]>} PlayerPlanetsMap
 */

/**
 * @typedef {Object} PlanetResponse
 * @property {number} id - planet ID
 * @property {number} player - player ID
 * @property {string} name
 * @property {string} coords
 * @property {boolean} moon
 */
