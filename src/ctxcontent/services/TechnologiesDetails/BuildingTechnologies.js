import defense from "../../../util/enum/defense.js";
import ship from "../../../util/enum/ship.js";
import { createDOM } from "../../../util/dom.js";
import { translate } from "../../../util/translate.js";
import { lock } from "../../../util/needs.js";
import * as time from "../../../util/time.js";
import OGIData from "../../../util/OGIData.js";

class BuildingTechnologies {
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
    return !Object.values({ ...defense, ...ship }).includes(technology);
  }

  apply(technology, content) {
    const informationElement = content.querySelector("#technologydetails .building");
    const controlsElement = createDOM("div", { class: "ogk-tech-controls" });

    informationElement.appendChild(controlsElement);

    const costsElement = content.querySelector(".costs");
    const nextLevel = content.querySelector(".level").getAttribute("data-value");

    costsElement.appendChild(this.#titleDiv(nextLevel));

    const lockElement = createDOM("a", { class: "icon icon_lock" });
    informationElement.appendChild(lockElement);

    const currentPlanet = (
      document.querySelector("#planetList .active") ?? document.querySelector("#planetList .planetlink")
    ).parentNode;

    lockElement.addEventListener("click", () => {
      console.error("Waiting missing");
      return;
      lock(
        currentPlanet.querySelector(".planet-koords").textContent,
        !!currentPlanet.querySelector(".moonlink") && currentPlanet.querySelector(".moonlink.active"),
        this.#missing,
        technology
      );
    });

    this.#display(content);
  }

  #titleDiv(nextLevel) {
    const div = createDOM("div", { class: "ogk-titles" });

    const head = createDOM("div");
    head.innerHTML = "Level ";

    const currentLevelElement = createDOM("strong");
    currentLevelElement.innerHTML = nextLevel;

    head.append(currentLevelElement);

    div.appendChild(head);
    div.appendChild(createDOM("div", { class: "ogi-level-target" }));
    div.appendChild(createDOM("div", {}, translate(39)));

    return div;
  }

  #display(content) {
    const timeElement = content.querySelector(".build_duration time");
    const baseTime = time.getTimeFromISOString(timeElement.getAttribute("datetime"));

    timeElement.textContent = formatTimeWrapper(baseTime * value, 2, true, " ", false, "");

    const currentDate = new Date();
    const timeZoneChange = OGIData.json.options.timeZone ? 0 : OGIData.json.timezoneDiff;
    const finishDate = new Date(currentDate.getTime() + (baseTime * value - timeZoneChange) * 1e3);
    const dateTxt = getFormatedDate(finishDate.getTime(), "[d].[m] - [G]:[i]:[s]");
    timeElement.appendChild(createDOM("div", { class: "ogl-date" }, dateTxt));

    const resourcesKeys = ["metal", "crystal", "deuterium"];

    const technology = this.#getTechno();

  }

  #getTechno() {
    const rawURL = new URL(window.location.href);
    const page = rawURL.searchParams.get("component") || rawURL.searchParams.get("page");

    if (["research", "lfresearch"].includes(page)) {
      return this.#research();
    }

    return this.#building();
  }

  #research() {
    return undefined;
  }

  #building() {
    return undefined;
  }
}

export default BuildingTechnologies;
