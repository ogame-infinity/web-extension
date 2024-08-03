import OGIData from "./OGIData.js";
import { toFormattedNumber } from "./numbers.js";
import { translate } from "./translate.js";

/*
  @todo : add a global param to provide choice for the base
  const standardUnitBase = OGIData.options.standardUnitBase;
  if -1 : base = self for each AKA rate of 1/1/1
  */
const standardUnitBase = 0;

/**
 *
 * @param {Array<number>} amount - Array of ressources 0/met - 1/cri - 2/deut
 * @param {Array<number>} customTradeRate - Array of custom trade rate to override
 * @param {bool} disableUnitMode - flag to force the use of MSU if display in Uts
 * @return {Number} sum of cost for all resource [M / C / D]
 */
function standardUnit(amount, customTradeRate = null, disableUnitMode = false) {
  if (!Array.isArray(amount)) return;

  const tradeRate = !Array.isArray(customTradeRate) ? OGIData.options.tradeRate : customTradeRate;
  const tradeBase = disableUnitMode ? 0 : standardUnitBase; /* Force as MSU */

  let standardUnitValue = 0;

  [0, 1, 2].forEach((id) => {
    standardUnitValue += ((amount[id] || 0) / tradeRate[id]) * tradeRate[tradeBase < 0 ? id : tradeBase];
  });

  return standardUnitValue;
}

/**
 *
 * @return {String} Unit type used for the standardUnit
 */
function unitType(full = false) {
  if (full) return translate(178 + standardUnitBase);
  else return translate(174 + standardUnitBase);
}

export { standardUnit, unitType };
