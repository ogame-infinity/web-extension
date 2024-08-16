import defense from "../../../util/enum/defense.js";
import ship from "../../../util/enum/ship.js";
import OGIData from "../../../util/OGIData.js";
import { createDOM } from "../../../util/dom.js";
import { translate } from "../../../util/translate.js";
import { toFormattedNumber } from "../../../util/numbers.js";
import * as time from "../../../util/time.js";
import { lock } from "../../../util/needs.js";

class WeaponsTechnologies {
  #missing;

  constructor() {
    this.#missing = {
      energyDiv: undefined,
      base: undefined,
      metal: 0,
      crystal: 0,
      deuterium: 0,
    };
  }

  support(technology) {
    return Object.values({ ...defense, ...ship }).includes(technology);
  }

  apply(technology, content) {
    const currentPlanet = (
      document.querySelector("#planetList .active") ?? document.querySelector("#planetList .planetlink")
    ).parentNode;

    const technologyData = {
      energyDiv: undefined,
      base: undefined,
    };

    const elemTechnologyDetailsContent = document.getElementById("technologydetails_content");
    const costsElement = elemTechnologyDetailsContent.querySelector(".costs");

    costsElement.appendChild(this.#titleDiv());

    if (technology === ship.Crawler) {
      technologyData.energyDiv = content.querySelector(".additional_energy_consumption span");
      technologyData.base =
        technologyData.energyDiv.getAttribute("data-value") *
        (1 - OGIData.json?.lifeformBonus?.crawlerBonus?.consumption || 1);
    } else if (technology === ship.SolarSatellite) {
      technologyData.energyDiv = document.querySelector(".energy_production span");
      technologyData.base = technologyData.energyDiv.querySelector("span").getAttribute("data-value");
    }

    const informationElement = createDOM("div", { class: "ogk-tech-controls" });

    const lockElement = createDOM("a", { class: "icon icon_lock" });
    informationElement.appendChild(lockElement);

    const helpNode = elemTechnologyDetailsContent.querySelector(".txt_box .details").cloneNode(true);
    informationElement.appendChild(helpNode);

    document.querySelector("#technologydetails .sprite_large").appendChild(informationElement);

    const inputElement = elemTechnologyDetailsContent.querySelector(".build_amount input");

    inputElement.removeAttribute("onkeyup");

    const isMobile = "ontouchstart" in document.documentElement;

    inputElement[isMobile ? "oninput" : "onkeyup"] = (event) => {
      let value = Math.max(inputElement.value?.match("^[0-9]+")?.[0] || 0, 1);

      // If K is pressed
      if (event.keyCode === 75) {
        value *= 1e3;
      }

      inputElement.value = value;

      this.#display(elemTechnologyDetailsContent, costsElement, inputElement.value);
    };

    elemTechnologyDetailsContent.querySelector(".maximum").addEventListener("click", () => {
      this.#display(elemTechnologyDetailsContent, costsElement, inputElement.getAttribute("max"));
    });

    this.#display(elemTechnologyDetailsContent, costsElement, 1);

    lockElement.addEventListener("click", () => {
      lock(
        currentPlanet.querySelector(".planet-koords").textContent,
        !!currentPlanet.querySelector(".moonlink") && currentPlanet.querySelector(".moonlink.active"),
        this.#missing,
        technology
      );
    });

    return technologyData;
  }

  #titleDiv() {
    const div = createDOM("div", { class: "ogk-titles" });

    const head = createDOM("div");
    head.innerHTML = "&nbsp;";

    div.appendChild(head);
    div.appendChild(createDOM("div", {}, translate(40)));
    div.appendChild(createDOM("div", {}, translate(39)));

    return div;
  }

  #display(elemTechnologyDetailsContent, costsElement, value) {
    const resourcesKeys = ["metal", "crystal", "deuterium"];

    resourcesKeys.forEach((resourceKey) => {
      const resourceElement = costsElement.querySelector(`.${resourceKey}`);

      if (!resourceElement) return;

      const resourceNeeded = parseInt(resourceElement?.getAttribute("data-value") || 0);
      const resourcesNeeded = resourceNeeded * value;
      const missingResource = Math.min(0, (resourcesBar.resources?.[resourceKey].amount || 0) - resourcesNeeded);

      this.#missing[resourceKey] = resourcesNeeded;

      resourceElement.textContent = toFormattedNumber(resourceNeeded, null, true);

      resourceElement.appendChild(
        createDOM(
          "div",
          {
            class: "ogk-sum tooltip",
            "data-title": toFormattedNumber(resourcesNeeded, 0),
          },
          toFormattedNumber(resourcesNeeded, null, true)
        )
      );

      resourceElement.appendChild(
        createDOM(
          "div",
          {
            class: missingResource !== 0 ? "overmark tooltip" : "tooltip",
            "data-title": toFormattedNumber(missingResource, 0),
          },
          toFormattedNumber(missingResource, null, true)
        )
      );
    });

    const timeElement = elemTechnologyDetailsContent.querySelector(".build_duration time");
    const baseTime = time.getTimeFromISOString(timeElement.getAttribute("datetime"));

    timeElement.textContent = formatTimeWrapper(baseTime * value, 2, true, " ", false, "");

    const currentDate = new Date();
    const timeZoneChange = OGIData.json.options.timeZone ? 0 : OGIData.json.timezoneDiff;
    const finishDate = new Date(currentDate.getTime() + (baseTime * value - timeZoneChange) * 1e3);
    const dateTxt = getFormatedDate(finishDate.getTime(), "[d].[m] - [G]:[i]:[s]");
    timeElement.appendChild(createDOM("div", { class: "ogl-date" }, dateTxt));
  }
}

export default WeaponsTechnologies;
