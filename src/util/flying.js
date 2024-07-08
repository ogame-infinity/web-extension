import missionType from "./enum/missionType.js";
import * as needsUtil from "./needs.js";
import OGIData from "./OGIData.js";
import { fromFormattedNumber } from "./numbers.js";

const isOwnPlanet = (coords) => {
  const planetList = document.getElementById("planetList").children;
  let found = false;
  Array.from(planetList).forEach((planet) => {
    const planetKoordsEl = planet.querySelector(".planet-koords");
    if (!planetKoordsEl) {
      return;
    }

    const planetKoords = planetKoordsEl.textContent;

    if (coords === planetKoords) found = true;
  });

  return found;
};

export default function () {
  let met = 0,
    cri = 0,
    deut = 0;
  const fleetCount = {};
  const transports = {};
  const ids = [];
  const planets = {};
  document.querySelectorAll("#eventContent .eventFleet").forEach((line) => {
    const tooltip =
      line.querySelector(".icon_movement .tooltip") || line.querySelector(".icon_movement_reserve .tooltip");
    const id = Number(line.getAttribute("id").split("-")[1]);
    const back = line.getAttribute("data-return-flight") !== "false";
    const type = line.getAttribute("data-mission-type");
    const arrival = new Date(parseInt(line.getAttribute("data-arrival-time")) * 1e3);
    const originCoords = line.querySelector(".coordsOrigin > a").textContent.trim().slice(1, -1);
    const originName = line.querySelector(".originFleet").textContent.trim();
    const destCoords = line.querySelector(".destCoords > a").textContent.trim().slice(1, -1);
    const destName = line.querySelector(".destFleet").textContent.trim();
    const destIsMoon = !!line.querySelector(".destFleet .moon");
    const originIsMoon = !!line.querySelector(".originFleet .moon");
    const origin = originCoords + (originIsMoon ? "M" : "P");
    const dest = destCoords + (destIsMoon ? "M" : "P");
    let own = false;
    OGIData.empire.forEach((planet) => {
      if (planet.coordinates === line.children[4].textContent.trim()) own = true;
    });

    const movement = {
      id: id,
      type: type,
      own: own,
      origin: origin,
      originName: originName,
      dest: dest,
      destName: destName,
      back: back,
      arrival: arrival,
      resDest: false,
      metal: undefined,
      crystal: undefined,
      deuterium: undefined,
      fleet: {},
    };
    if (type == 16 || type == missionType.EXPLORATION) return;
    const expe = {};
    const div = document.createElement("div");
    tooltip && div.html(tooltip.getAttribute("title") || tooltip.getAttribute("data-tooltip-title"));
    let addToTotal = false;
    let noRes = false;
    if (type == missionType.DEPLOYMENT) {
      addToTotal = true;
      movement.resDest = true;
    } else if (type == missionType.TRANSPORT) {
      if (!back) {
        transports[id] = true;
        addToTotal = true;
        movement.resDest = true;
      } else if (id - 1 in transports) {
        noRes = true;
      } else {
        addToTotal = true;
        movement.resDest = true;
      }
    } else if (back) {
      addToTotal = true;
      movement.resDest = true;
    } else {
      addToTotal = false;
      movement.resDest = false;
    }

    const destIsOwnPlanet =
      [missionType.DEPLOYMENT, missionType.TRANSPORT].includes(parseInt(type)) && !back && isOwnPlanet(destCoords);

    const reversal = line.querySelector(".reversal a");
    if (reversal) {
      const clickYes = () => {
        needsUtil.displayLocksByCoords(destCoords, destIsMoon);
      };
      const reversalClick = () => {
        document.getElementById("errorBoxDecisionYes").removeEventListener("click", clickYes);
        document.getElementById("errorBoxDecisionYes").addEventListener("click", clickYes);
      };
      reversal.removeEventListener("click", reversalClick);
      reversal.addEventListener("click", reversalClick);
    }

    div.querySelectorAll('td[colspan="2"]').forEach((tooltip) => {
      const count = Number(fromFormattedNumber(tooltip.nextElementSibling.innerHTML.trim()));
      const name = tooltip.textContent.trim().slice(0, -1);
      const defaultRss = { metal: 0, crystal: 0, deuterium: 0 };
      const id = OGIData.json.shipNames[name];
      if (id) {
        expe[id] ? (expe[id] += count) : (expe[id] = count);
        movement.fleet[id] = count;
        if (addToTotal) fleetCount[id] ? (fleetCount[id] += count) : (fleetCount[id] = count);
      } else {
        if (!planets[originCoords]) {
          planets[originCoords] = { ...defaultRss, planet: { ...defaultRss }, moon: { ...defaultRss } };
        }

        if (destIsOwnPlanet && !planets[destCoords]) {
          planets[destCoords] = { ...defaultRss, planet: { ...defaultRss }, moon: { ...defaultRss } };
        }

        if (name == OGIData.json.resNames[0]) {
          movement.metal = noRes ? 0 : count;
          if (addToTotal) met += count;
          planets[originCoords].metal += movement.metal;

          if (originIsMoon) {
            planets[originCoords].moon.metal += movement.metal;
          } else {
            planets[originCoords].planet.metal += movement.metal;
          }

          if (destIsOwnPlanet) {
            planets[destCoords].metal += movement.metal;

            if (destIsMoon) {
              planets[destCoords].moon.metal += movement.metal;
            } else {
              planets[destCoords].planet.metal += movement.metal;
            }
          }
        }
        if (name == OGIData.json.resNames[1]) {
          movement.crystal = noRes ? 0 : count;
          if (addToTotal) cri += count;
          planets[originCoords].crystal += movement.crystal;

          if (originIsMoon) {
            planets[originCoords].moon.crystal += movement.crystal;
          } else {
            planets[originCoords].planet.crystal += movement.crystal;
          }

          if (destIsOwnPlanet) {
            planets[destCoords].crystal += movement.crystal;

            if (destIsMoon) {
              planets[destCoords].moon.crystal += movement.crystal;
            } else {
              planets[destCoords].planet.crystal += movement.crystal;
            }
          }
        }
        if (name == OGIData.json.resNames[2]) {
          movement.deuterium = noRes ? 0 : count;
          if (addToTotal) deut += count;
          planets[originCoords].deuterium += movement.deuterium;

          if (originIsMoon) {
            planets[originCoords].moon.deuterium += movement.deuterium;
          } else {
            planets[originCoords].planet.deuterium += movement.deuterium;
          }

          if (destIsOwnPlanet) {
            planets[destCoords].deuterium += movement.deuterium;

            if (destIsMoon) {
              planets[destCoords].moon.deuterium += movement.deuterium;
            } else {
              planets[destCoords].planet.deuterium += movement.deuterium;
            }
          }
        }
      }
    });
    ids.push(movement);
  });

  return {
    metal: met,
    crystal: cri,
    deuterium: deut,
    fleet: fleetCount,
    planets: planets,
    ids: ids,
  };
}
