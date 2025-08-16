import defenceCosts from "./enum/defenceCosts.js";

/**
 *
 * @param {Array<number>} ships - Array of ship quantity per IDs to sum costs for.
 * @return {Array<number>} sum of cost per resource [M / C / D]
 */
function defenceCost(ships) {
  const defenceRes = {
    metal: 0,
    crystal: 0,
    deuterium: 0,
  };

  Object.keys(defenceCosts).forEach((id) => {
    if (ships[id]) {
      defenceRes.metal += defenceCosts[id][0] * ships[id];
      defenceRes.crystal += defenceCosts[id][1] * ships[id];
      defenceRes.deuterium += defenceCosts[id][2] * ships[id];
    }
  });
  return Object.values(defenceRes);
}

export { defenceCost };
