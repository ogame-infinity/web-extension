import OGIData from "./OGIData.js";
import { createDOM } from "./dom.js";
import { toFormattedNumber } from "./numbers.js";
import planetType from "./enum/planetType.js";
import { tooltip } from "./tooltip.js";
import OGIObserver from "./observer.js";
import flying from "./flying.js";
import { translate } from "./translate.js";

const needs = {
  ...OGIData.needs,
};

const obs = new OGIObserver();

export function display() {
  if (document.getElementById("eventboxLoading").style.display === "block") return;

  OGIData.json.flying = flying();
  document.querySelectorAll(".smallplanet").forEach((planet) => {
    const coords = planet.querySelector(".planet-koords")?.textContent;

    if (!coords) return;

    displayLocksByCoords(coords, false);

    if (planet.querySelector(".moonlink")) displayLocksByCoords(coords, true);
  });
}

obs(document.getElementById("eventboxContent"), display, { subtree: false });

function getNeedsResourceByCoords(coords, isMoon) {
  const planetFound = getPlanetByCoords(coords);

  if (planetFound === null) return;

  const needsTarget = isMoon ? needs?.[planetFound.id]?.moon : needs?.[planetFound.id]?.planet;

  if (Object.values(needsTarget).reduce((total, resource) => total + resource, 0) === 0) return;

  return needsTarget;
}

export function getNeedsByCoords(coords, isMoon) {
  const planetFound = getPlanetByCoords(coords);

  if (planetFound === null) return;

  const planet = isMoon ? planetFound.moon : planetFound;
  const needsTarget = getNeedsResourceByCoords(coords, isMoon);

  if (needsTarget === undefined) return;

  const flying = { ...OGIData.json.flying };
  const flyingTarget = isMoon ? flying.planets?.[coords]?.moon : flying.planets?.[coords]?.planet;

  const metal = Math.max((needsTarget?.metal || 0) - (planet?.metal || 0) - (flyingTarget?.metal || 0), 0);
  const crystal = Math.max((needsTarget?.crystal || 0) - (planet?.crystal || 0) - (flyingTarget?.crystal || 0), 0);
  const deuterium = Math.max(
    (needsTarget?.deuterium || 0) - (planet?.deuterium || 0) - (flyingTarget?.deuterium || 0),
    0
  );

  return {
    metal,
    crystal,
    deuterium,
  };
}

export function append(coords, isMoon, resources) {
  const planetFound = getPlanetByCoords(coords);

  if (planetFound === null) return;

  const needsTarget = getNeedsResourceByCoords(coords, isMoon);

  const metal = Math.ceil(Math.max((needsTarget?.metal || 0) + (resources?.metal || 0), 0));
  const crystal = Math.ceil(Math.max((needsTarget?.crystal || 0) + (resources?.crystal || 0), 0));
  const deuterium = Math.ceil(Math.max((needsTarget?.deuterium || 0) + (resources?.deuterium || 0), 0));

  if (isMoon) {
    needs[planetFound.id].moon = {
      metal,
      crystal,
      deuterium,
    };
  } else {
    needs[planetFound.id].planet = {
      metal,
      crystal,
      deuterium,
    };
  }

  OGIData.needs = needs;
}

export function lock(coords, isMoon, needed) {
  const planetFound = getPlanetByCoords(coords);

  if (planetFound === null) return;

  const planet = isMoon ? planetFound.moon : planetFound;
  const planetId = planet?.planetID || planet.id;

  if (!needs[planetId]) {
    needs[planetId] = {
      planetId,
      coords,
      moon: {},
      planet: {},
    };
  }

  append(coords, isMoon, needed);

  displayLocks(planet, isMoon);
}

export function displayLocksByCoords(coords, isMoon) {
  const planetFound = getPlanetByCoords(coords);

  if (planetFound === null) return;

  const planet = isMoon ? planetFound.moon : planetFound;

  displayLocks(planet, isMoon);
}

function displayLocks(planet, isMoon) {
  const planetId = planet?.planetID || planet.id;

  if (!planetId) return;

  const element = document.querySelector(`#myPlanets #planet-${planetId}`);

  if (!element) return;

  const planetNeeds = needs[planetId];

  const selector = isMoon ? ".ogl-moonLock" : ":not(.ogl-moonLock)";

  element.querySelectorAll(`.ogl-sideLock${selector}`).forEach((e) => e.remove());

  if (
    !planetNeeds ||
    (typeof planetNeeds?.moon?.metal === "undefined" && typeof planetNeeds?.planet?.metal === "undefined")
  ) {
    return;
  }

  const icon = createLockIcon(planet, isMoon);
  if (icon) element.appendChild(icon);

  const sidePlanetDiv = document.querySelector("div#cutty") || document.querySelector("div#norm");

  sidePlanetDiv.querySelectorAll(".ogl-sideLockRemove").forEach((e) => e.remove());

  if (sidePlanetDiv.querySelector(".ogl-sideLock")) {
    const deleteAllEmpty = createDOM("button", { class: "ogl-sideLockRemove tooltip" });
    const deleteAllFilled = createDOM("button", { class: "ogl-sideLockRemove ogl-sideLockRemoveFilled tooltip" });
    sidePlanetDiv.append(deleteAllEmpty, deleteAllFilled);
    const deleteAll = (condition) => {
      for (const key in needs) {
        const need = needs[key];
        const needPlanet = getNeedsByCoords(needs[key].coords, false);
        const needMoon = getNeedsByCoords(needs[key].coords, true);

        if (needMoon && condition(needMoon)) {
          needs[key].moon = {};
          displayLocks(getPlanetByCoords(need.coords).moon, true);
        }

        if (needPlanet && condition(needPlanet)) {
          needs[key].planet = {};
          displayLocks(getPlanetByCoords(need.coords), false);
        }

        if (typeof needs[key]?.moon?.metal === "undefined" && typeof needs[key]?.planet?.metal === "undefined") {
          delete needs[key];
        }
      }

      if (!document.querySelector("#myPlanets .ogl-sideLock")) {
        sidePlanetDiv.querySelectorAll("button.ogl-sideLockRemove").forEach((button) => button.remove());
      }

      OGIData.needs = needs;
    };

    deleteAllEmpty.addEventListener("click", () => {
      deleteAll((missing) => Object.values(missing).reduce((total, resource) => total + resource, 0) !== 0);
    });
    deleteAllFilled.addEventListener("click", () => {
      deleteAll((missing) => Object.values(missing).reduce((total, resource) => total + resource, 0) === 0);
    });
  }
}

function createLockIcon(planet, isMoon) {
  const planetId = planet?.planetID || planet.id;
  const btn = createDOM("button", { class: "ogl-sideLock tooltip tooltipClose tooltipLeft" });

  if (isMoon) {
    btn.classList.add("ogl-moonLock");
  }

  const coords = planet.coordinates.replace(/(\[|\])/g, "");
  const needsTarget = getNeedsByCoords(coords, isMoon);

  if (typeof needsTarget?.metal === "undefined") return;

  const filled = needsTarget.metal === 0 && needsTarget.crystal === 0 && needsTarget.deuterium === 0;

  if (filled) {
    btn.classList.add("ogl-sideLockFilled");
  }

  const tooltipContent = createDOM("div");
  tooltipContent.appendChild(createDOM("div", { style: "width: 75px" }, translate(39)));
  tooltipContent.appendChild(createDOM("hr"));
  tooltipContent.appendChild(
    createDOM("div", { class: "ogl-metal" }, toFormattedNumber(Math.max(0, needsTarget.metal), null, true))
  );
  tooltipContent.appendChild(
    createDOM("div", { class: "ogl-crystal" }, toFormattedNumber(Math.max(0, needsTarget.crystal), null, true))
  );
  tooltipContent.appendChild(
    createDOM("div", { class: "ogl-deut" }, toFormattedNumber(Math.max(0, needsTarget.deuterium), null, true))
  );
  tooltipContent.appendChild(createDOM("hr"));

  const deleteBtn = tooltipContent.appendChild(createDOM("div", { style: "width: 75px;", class: "icon icon_against" }));
  deleteBtn.addEventListener("click", () => {
    if (!isMoon) {
      OGIData.needs[planetId].planet = {};
    } else {
      OGIData.needs[planetId].moon = {};
    }

    OGIData.needSync = true;
    document.querySelector(".ogl-tooltip .close-tooltip").click();
    displayLocks(planet, isMoon);

    const sidePlanetDiv = document.querySelector("div#cutty") || document.querySelector("div#norm");
    if (!document.querySelector("#myPlanets .ogl-sideLock")) {
      sidePlanetDiv.querySelectorAll("button.ogl-sideLockRemove").forEach((button) => button.remove());
    }
  });

  btn.addEventListener("mouseover", () => {
    tooltip(btn, tooltipContent, false, { left: true });
  });

  btn.addEventListener("click", () => {
    const coords = planet.coordinates.replace(/(\[|\])/g, "").split(":");
    const fleetLink = new URLSearchParams({
      page: "ingame",
      component: "fleetdispatch",
      galaxy: coords[0],
      system: coords[1],
      position: coords[2],
      type: isMoon ? planetType.moon : planetType.planet,
      mission: 1,
      oglMode: 2,
    });

    window.location.href = `?${fleetLink.toString()}`;
  });

  return btn;
}

function getPlanetByCoords(coords) {
  for (const planet of OGIData.empire) {
    if (planet.coordinates === `[${coords}]`) return planet;
  }

  return null;
}
