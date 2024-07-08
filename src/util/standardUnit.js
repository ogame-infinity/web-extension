import OGIData from "./OGIData.js";
import { toFormattedNumber } from "./numbers.js";
import { translate } from "./translate.js";

/**
 *
 * @param {Array<number>} amount - Array of ressources 0/met - 1/cri - 2/deut
 * @param {Array<number>|integer} precision - Array of min/max precision and INT of precision
 * @param {bool} units - display units
 * @return {String} sum of cost per resource [M / C / D]
 */
export function standardUnit(amount, precision = null, units = false) {
  if (!Array.isArray(amount)) return;

  const tradeRate = OGIData.options.tradeRate;
  /* 
  @todo : add a global param to provide choice for the base
  const standardUnitBase = OGIData.options.standardUnitBase; 
  */
  const standardUnitBase = 0;

  let standardUnitValue = 0;

  [0, 1, 2].forEach((id) => {
    standardUnitValue += (amount[id] / tradeRate[id]) * tradeRate[standardUnitBase];
  });

  return `${toFormattedNumber(standardUnitValue, precision, units)} ${translate(173 + standardUnitBase)}`;
}

export default {
  standardUnit,
};
