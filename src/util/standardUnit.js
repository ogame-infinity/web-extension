import { getOption } from "../ctxpage/conf-options.js";
import { toFormattedNumber } from "./numbers.js";
import Translator from "./translate.js";

/**
 *
 * @param {Array<number>} amount - Array of ressources 0/met - 1/cri - 2/deut
 * @param {Array<number>} customTradeRate - Array of custom trade rate to override
 * @param {bool} disableUnitMode - flag to force the use of MSU if display in Uts
 * @return {Number} sum of cost for all resource [M / C / D]
 */
function standardUnit(amount, customTradeRate = null, disableUnitMode = false) {
  if (!Array.isArray(amount)) return;

  const standardUnitBase = getOption("standardUnitBase");
  const tradeRate = !Array.isArray(customTradeRate) ? getOption("tradeRate") : customTradeRate;
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
  const standardUnitBase = Number(getOption("standardUnitBase"));
  if (full) return Translator.translate(178 + standardUnitBase);
  else return Translator.translate(174 + standardUnitBase);
}

export { standardUnit, unitType };
