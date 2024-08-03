import OGIData from "./OGIData.js";
import { toFormattedNumber } from "./numbers.js";
import { translate } from "./translate.js";

/*
  @todo : add a global param to provide choice for the base
  const standardUnitBase = OGIData.options.standardUnitBase;
  */
const standardUnitBase = 0;

/**
 *
 * @param {Array<number>} amount - Array of ressources 0/met - 1/cri - 2/deut
 * @param {Array<number>} customTradeRate - Array of custom trade rate to override
 * @return {Number} sum of cost for all resource [M / C / D]
 */
function standardUnit(amount, customTradeRate = null) {
  if (!Array.isArray(amount)) return;

  const tradeRate = !Array.isArray(customTradeRate) ? OGIData.options.tradeRate : customTradeRate;

  let standardUnitValue = 0;

  [0, 1, 2].forEach((id) => {
    standardUnitValue += ((amount[id] || 0) / tradeRate[id]) * tradeRate[standardUnitBase];
  });

  /*return `${toFormattedNumber(standardUnitValue, precision, units)} ${translate(173 + standardUnitBase)}`;*/
  return standardUnitValue;
}

/**
 *
 * @return {String} Unit type used for the standardUnit
 */
function unitType(full = false) {
  if (full) return translate(176 + standardUnitBase);
  else return translate(173 + standardUnitBase);
}

export { standardUnit, unitType };
