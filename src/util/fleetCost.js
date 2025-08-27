import shipCosts from "./enum/shipCosts.js";

/**
 *
 * @param {Array<number>} ships - Array of ship quantity per IDs to sum costs for.
 * @return {Array<number>} sum of cost per resource [M / C / D]
 */
function fleetCost(ships) {
  const fleetRes = {
    metal: 0,
    crystal: 0,
    deuterium: 0,
  };
  if (ships) {
    Object.keys(shipCosts).forEach((id) => {
      if (ships[id]) {
        fleetRes.metal += shipCosts[id][0] * ships[id];
        fleetRes.crystal += shipCosts[id][1] * ships[id];
        fleetRes.deuterium += shipCosts[id][2] * ships[id];
      }
    });
  }
  return Object.values(fleetRes);
}

export { fleetCost };
