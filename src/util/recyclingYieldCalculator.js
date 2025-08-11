import { fleetCost } from "./fleetCost.js";
import { defenceCost } from "./defenceCost.js";

class RecyclingYieldCalculator {
  #calculateCost(items, reference) {
    const costs = [];

    if (items) {
      for (let key of Object.keys(items)) {
        const count = items[key];
        const cost = reference[key];
        const metal = (cost ? cost[0] : 0) * count;
        const crystal = (cost ? cost[1] : 0) * count;
        const deut = (cost ? cost[2] : 0) * count;
        costs.push({ id: key, resources: { metal: metal, crystal: crystal, deut: deut } });
      }
    }

    return costs;
  }

  #calculateRecyclingYield(costs, rate, includeDeut) {
    let totalMetal = 0;
    let totalCrystal = 0;
    let totalDeut = 0;

    if (costs && rate > 0) {
      debugger;
      totalMetal = costs[0] * rate;
      totalCrystal = costs[1] * rate;
      totalDeut = costs[2] * rate;
    }

    return {
      metal: totalMetal,
      crystal: totalCrystal,
      deut: includeDeut ? totalDeut : 0,
    };
  }

  CalculateRecyclingYieldFleet(fleet, rateFleet, includeDeut) {
    return this.#calculateRecyclingYield(fleetCost(fleet), rateFleet, includeDeut);
  }
  CalculateRecyclingYieldDefence(defence, rateDefence, includeDeut) {
    return this.#calculateRecyclingYield(defenceCost(defence), rateDefence, includeDeut);
  }
}
export default new RecyclingYieldCalculator();
