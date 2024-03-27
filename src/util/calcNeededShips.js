import * as Numbers from "./numbers.js";

export function calcNeededShips(options) {
  const res = JSON.parse(localStorage.getItem("ogk-data"));
  const json = res || {};

  options = options || {};
  let resources = [
    Numbers.fromFormattedNumber(document.querySelector("#resources_metal").textContent),
    Numbers.fromFormattedNumber(document.querySelector("#resources_crystal").textContent),
    Numbers.fromFormattedNumber(document.querySelector("#resources_deuterium").textContent),
  ];
  resources = resources.reduce((a, b) => parseInt(a) + parseInt(b));
  if (options.resources || options.resources === 0) resources = options.resources;
  const type = options.fret || json.options.fret;
  const fret = json.ships[type].cargoCapacity;
  let total = resources / fret;
  if (options.moreFret) total *= 107 / 100;
  return Math.ceil(total);
}
