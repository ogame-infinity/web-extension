/** @typedef {Object} LocalizationStrings */

export function toFormattedNumber(value, precision = null, units = false) {
  const commaSeparator = ["en-US", "en-GB", "ro-RO", "zh-TW"];
  let locale = document.querySelector("#cookiebanner").getAttribute("data-locale");
  if (commaSeparator.includes(locale)) {
    locale = "en-US";
  } else {
    locale = "de-DE";
  }
  if (isNaN(value) || value === undefined || value == null) return undefined;

  if (units) {
    let neg = false;
    if (value < 0) {
      neg = true;
      value *= -1;
    }

    const abbrev = [
      "",
      LocalizationStrings["unitKilo"],
      LocalizationStrings["unitMega"],
      document.querySelector("#cookiebanner").getAttribute("data-locale").substring(0, 2) === "fr"
        ? "G"
        : LocalizationStrings["unitMilliard"],
      "T",
    ];
    const unrangifiedOrder = Math.floor(Math.log10(Math.abs(value)) / 3);
    const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length - 1));
    const suffix = abbrev[order];

    if (precision == null) {
      let significantDigits = 3;
      let maxPrecision = String(value / Math.pow(10, order * 3)).split(".")[1]
        ? String(value / Math.pow(10, order * 3)).split(".")[1].length
        : 0;
      let prevPrecision = Math.max(significantDigits - String(value / Math.pow(10, order * 3)).split(".")[0].length);
      for (let p = Math.min(maxPrecision, prevPrecision); p > 0; p--) {
        if (
          (value / Math.pow(10, order * 3))
            .toLocaleString(locale, {
              minimumFractionDigits: p,
              maximumFractionDigits: p,
            })
            .slice(-1) !== "0"
        ) {
          precision = p;
          break;
        }
      }
    }
    return (
      (neg ? "-" : "") +
      (value / Math.pow(10, order * 3)).toLocaleString(locale, {
        minimumFractionDigits: Array.isArray(precision) && precision[0] != null ? precision[0] : precision,
        maximumFractionDigits: Array.isArray(precision) && precision[1] != null ? precision[1] : precision,
      }) +
      suffix
    );
  } else {
    return value.toLocaleString(locale, {
      minimumFractionDigits: precision ? precision : 0,
      maximumFractionDigits: precision ? precision : 2,
    });
  }
}

export function fromFormattedNumber(value, int = false, noGroup = false) {
  const decimalSeparator = LocalizationStrings["decimalPoint"];
  const groupSeparator = LocalizationStrings["thousandSeperator"];
  let order = 1;
  if (value.includes("T")) {
    order = 1e12;
    value = value.replace("T", "");
  }
  if (value.includes(LocalizationStrings["unitMilliard"])) {
    order = 1e9;
    value = value.replace(LocalizationStrings["unitMilliard"], "");
  }
  if (value.includes(LocalizationStrings["unitMega"])) {
    order = 1e6;
    value = value.replace(LocalizationStrings["unitMega"], "");
  }
  if (value.includes(LocalizationStrings["unitKilo"]) || value.includes("k")) {
    order = 1e3;
    value = value.replace(LocalizationStrings["unitKilo"], "");
  }
  if (!noGroup) value = value.replaceAll(groupSeparator, "");
  value = Number(value.replace(decimalSeparator, "."));
  value *= order;
  return int ? parseInt(value) : value;
}
