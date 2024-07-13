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
    if (tooltip) {
      div.insertAdjacentHTML("afterbegin", tooltip.getAttribute("title") || tooltip.getAttribute("data-tooltip-title"));
    }

    let resourcesOrigin = true;

    if ([missionType.DEPLOYMENT, missionType.TRANSPORT].includes(parseInt(type)) && !back) {
      resourcesOrigin = false;
    }

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

        const addResource = (resourceKey) => {
          movement[resourceKey] = noRes ? 0 : count;
          if (resourcesOrigin) {
            planets[originCoords][resourceKey] += movement[resourceKey];

            if (originIsMoon) {
              planets[originCoords].moon[resourceKey] += movement[resourceKey];
            } else {
              planets[originCoords].planet[resourceKey] += movement[resourceKey];
            }
          }

          if (destIsOwnPlanet) {
            planets[destCoords][resourceKey] += movement[resourceKey];

            if (destIsMoon) {
              planets[destCoords].moon[resourceKey] += movement[resourceKey];
            } else {
              planets[destCoords].planet[resourceKey] += movement[resourceKey];
            }
          }
        };

        if (name == OGIData.json.resNames[0]) {
          addResource("metal");
          if (addToTotal) met += count;
        }

        if (name == OGIData.json.resNames[1]) {
          addResource("crystal");
          if (addToTotal) cri += count;
        }

        if (name == OGIData.json.resNames[2]) {
          addResource("deuterium");
          if (addToTotal) deut += count;
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
