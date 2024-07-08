import shipCosts from "./enum/shipCosts.js";

/**
 *
 * @param {Array<number>} ships - Array of ship quantity per IDs to sum costs for.
 * @return {Array<number>} sum of cost per resource [M / C / D]
 */
export function fleetCost(ships) {
  const fleetRes = [0, 0, 0];

  Object.keys(shipCosts).forEach((id) => {
    if (ships[id]) {
      fleetRes[0] += shipCosts[id][0] * ships[id];
      fleetRes[1] += shipCosts[id][1] * ships[id];
      fleetRes[2] += shipCosts[id][2] * ships[id];
    }
  });
  return fleetRes;
}

export default {
  fleetCost,
};
