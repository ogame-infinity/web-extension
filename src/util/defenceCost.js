import defenceCosts from "./enum/defenceCosts.js";

/**
 *
 * @param {Array<number>} ships - Array of ship quantity per IDs to sum costs for.
 * @return {Array<number>} sum of cost per resource [M / C / D]
 */
function defenceCost(defence) {
  const defenceRes = {
    metal: 0,
    crystal: 0,
    deuterium: 0,
  };
  if (defence) {
    Object.keys(defenceCosts).forEach((id) => {
      if (defence[id]) {
        defenceRes.metal += defenceCosts[id][0] * defence[id];
        defenceRes.crystal += defenceCosts[id][1] * defence[id];
        defenceRes.deuterium += defenceCosts[id][2] * defence[id];
      }
    });
  }
  return Object.values(defenceRes);
}

export { defenceCost };
