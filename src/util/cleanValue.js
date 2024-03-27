export function cleanValue(value) {
  const sep = LocalizationStrings["thousandSeperator"];
  const dec = LocalizationStrings["decimalPoint"];
  const reg = new RegExp(`${dec}([^${dec}]*)$`, "g");
  let factor = 1;
  if (value.indexOf(LocalizationStrings["unitMilliard"]) > -1) {
    value = value.replace(reg, "|" + "$1");
    value = value.slice(0, -LocalizationStrings["unitMilliard"].length);
    factor = 1e9;
  } else if (value.indexOf(LocalizationStrings["unitMega"]) > -1) {
    value = value.replace(reg, "|" + "$1");
    value = value.slice(0, -LocalizationStrings["unitMega"].length);
    factor = 1e6;
  } else if (value.indexOf(LocalizationStrings["unitKilo"]) > -1) {
    value = value.replace(reg, "|" + "$1");
    value = value.slice(0, -LocalizationStrings["unitKilo"].length);
    factor = 1e3;
  }
  value = value.split(sep).join("");
  return parseInt(value.replace("|", ".") * factor);
}
