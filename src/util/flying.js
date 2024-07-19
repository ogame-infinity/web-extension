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

const hasLifeforms = document.querySelector(".lifeform") != null;

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

    const metalRow = hasLifeforms ? -4 : -3;
    const crystalRow = hasLifeforms ? -3 : -2;
    const deuteriumRow = hasLifeforms ? -2 : -1;

    // Ships
    const fleetDataRow = Array.from(div.querySelectorAll("tr"));

    fleetDataRow.slice(1, metalRow - 1).forEach((shipRow) => {
      if (!shipRow.querySelector("td:nth-child(2)")) return;

      const shipName = shipRow.querySelector("td:nth-child(1)")?.textContent.trim().slice(0, -1);
      const shipCounter = fromFormattedNumber(shipRow.querySelector("td:nth-child(2)")?.textContent.trim());
      const id = OGIData.json.shipNames[shipName];

      if (!id) {
        return;
      }

      expe[id] ? (expe[id] += shipCounter) : (expe[id] = shipCounter);
      movement.fleet[id] = shipCounter;
      if (addToTotal) fleetCount[id] ? (fleetCount[id] += shipCounter) : (fleetCount[id] = shipCounter);
    });

    const defaultRss = { metal: 0, crystal: 0, deuterium: 0 };
    if (!planets[originCoords]) {
      planets[originCoords] = { ...defaultRss, planet: { ...defaultRss }, moon: { ...defaultRss } };
    }

    if (destIsOwnPlanet && !planets[destCoords]) {
      planets[destCoords] = { ...defaultRss, planet: { ...defaultRss }, moon: { ...defaultRss } };
    }

    const addResource = (resourceKey, count) => {
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

    // Resources
    const metal = fromFormattedNumber(fleetDataRow.slice(metalRow, metalRow + 1)?.[0]?.querySelector("td:nth-child(2)")?.textContent);
    addResource("metal", metal);
    if (addToTotal) met += metal;

    const crystal = fromFormattedNumber(fleetDataRow.slice(crystalRow, crystalRow + 1)?.[0]?.querySelector("td:nth-child(2)")?.textContent);
    addResource("crystal", crystal);
    if (addToTotal) cri += crystal;

    const deuterium = fromFormattedNumber(fleetDataRow.slice(deuteriumRow, deuteriumRow + 1)?.[0]?.querySelector("td:nth-child(2)")?.textContent);
    addResource("deuterium", deuterium);
    if (addToTotal) deut += deuterium;

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
