import shipCosts from "./enum/shipCosts.js";
import resource from "./enum/resource.js";

/**
 *
 * @param {Array<number>} ships - Array of ship quantity per IDs to sum costs for.
 * @return {Array<number>} sum of cost per resource [M / C / D]
 */
function fleetCost(ships) {
  const fleetRes = {
    [resource.Metal]: 0,
    [resource.Crystal]: 0,
    [resource.Deuterium]: 0,
  };

  Object.keys(shipCosts).forEach((id) => {
    if (ships[id]) {
      fleetRes[resource.Metal] += shipCosts[id][resource.Metal] * ships[id];
      fleetRes[resource.Crystal] += shipCosts[id][resource.Crystal] * ships[id];
      fleetRes[resource.Deuterium] += shipCosts[id][resource.Deuterium] * ships[id];
    }
  });
  return Object.values(fleetRes);
}

export { fleetCost };
