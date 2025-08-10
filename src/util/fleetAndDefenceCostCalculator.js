import shipCosts from "./enum/shipCosts.js";
import defenceCosts from "./enum/defenceCosts.js";

class FleetAndDefenceCostCalculator {
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
  CalculateFleetCost(fleet) {
    return this.#calculateCost(fleet, shipCosts);
  }
  CalculateDefenceCost(defence) {
    return this.#calculateCost(defence, defenceCosts);
  }

  #calculateRecyclingYield(costs, rate, includeDeut) {
    let totalMetal = 0;
    let totalCrystal = 0;
    let totalDeut = 0;

    if (costs && rate > 0) {
      for (const cost of costs) {
        totalMetal += cost.resources.metal;
        totalCrystal += cost.resources.crystal;
        totalDeut += cost.resources.deut;
      }
      totalMetal = totalMetal * rate;
      totalCrystal = totalCrystal * rate;
      totalDeut = totalDeut * rate;
    }

    return {
      metal: totalMetal,
      crystal: totalCrystal,
      deut: includeDeut ? totalDeut : 0,
    };
  }

  CalculateRecyclingYieldFleet(fleet, rateFleet, includeDeut) {
    const fleetCosts = this.CalculateFleetCost(fleet);
    return this.#calculateRecyclingYield(fleetCosts, rateFleet, includeDeut);
  }
  CalculateRecyclingYieldDefence(defence, rateDefence, includeDeut) {
    const defenceCosts = this.CalculateDefenceCost(defence);
    return this.#calculateRecyclingYield(defenceCosts, rateDefence, includeDeut);
  }
}
export default new FleetAndDefenceCostCalculator();
