import OGIData from "../OGIData.js";
import { BuildItem } from "./buildItem.js";
import { current as currentPlanet } from "./planet.js";
import buildItemStatus from "../enum/buildItemStatus.js";
import military from "../enum/military.js";

class BuildList {
  _list = [];

  constructor() {
    this._list = Object.values(OGIData.buildList || []).map((item) => Object.assign(new BuildItem(), item));
  }

  add(technologyId, target) {
    const buildItem = new BuildItem();

    const planet = currentPlanet();

    const item = this.findBy(planet, technologyId);

    if (!item) {
      Object.assign(buildItem, { technologyId, target, planet });

      this.list.push(buildItem);
    }

    if (item) {
      item.target = target;
    }

    this.#save();
  }

  clean() {
    const planet = currentPlanet();

    document.querySelectorAll("#technologies .technology .level").forEach((level) => {
      const technologyElement = level.closest(".technology");
      const technologyId = parseInt(technologyElement.getAttribute("data-technology"));
      const target = parseInt(level.getAttribute("data-value"));

      for (const buildItem in this.list) {
        const item = this.list[buildItem];

        if (item.technologyId !== technologyId || planet.id !== item.planet.id) {
          continue;
        }

        if (target === item.target - 1) {
          item.status = technologyElement.querySelector("time-counter")
            ? buildItemStatus.IN_PROGRESS
            : buildItemStatus.WAITING;
        }

        if (item.target > target) {
          continue;
        }

        delete this._list[buildItem];
        break;
      }

      this.#save();
    });
  }

  #save() {
    OGIData.buildList = { ...this.list };
  }

  listen() {
    const planet = currentPlanet();
    const listener = (event) => {
      const technologyId = parseInt(event.currentTarget.getAttribute("data-technology"));
      let target;
      const technologyDetails = event.currentTarget.closest("#technologydetails");

      if (!technologyDetails) {
        target = parseInt(event.currentTarget.parentNode.querySelector(".level").getAttribute("data-value")) + 1;
      } else {
        const input = technologyDetails.querySelector("#build_amount");

        if (input) {
          target = parseInt(Math.min(input.value, input.getAttribute("max")));
        } else {
          target = parseInt(technologyDetails.querySelector(".level").getAttribute("data-value"));
        }
      }

      target = target || 1;

      for (const buildItem in this.list) {
        const item = this.list[buildItem];

        if (item.technologyId !== technologyId || planet.id !== item.planet.id) {
          continue;
        }

        if (Object.values(military).includes(technologyId)) {
          this.#listenMilitary(buildItem, target);
        } else {
          this.#listenCommon(buildItem, target);
        }

        break;
      }

      this.#save();
    };

    document.querySelectorAll("button.upgrade").forEach((button) => {
      button.removeEventListener("click", listener);
      button.addEventListener("click", listener);
    });
  }

  #listenCommon(buildItem, target) {
    const item = this.list[buildItem];

    if (item.target > target) {
      return;
    }

    this.list[buildItem].status = buildItemStatus.IN_PROGRESS;
  }

  #listenMilitary(buildItem, target) {
    const item = this.list[buildItem];

    item.target -= target;

    if (item.target <= 0) {
      delete this._list[buildItem];
    }
  }

  get list() {
    return this._list;
  }

  findBy(planet, technologyId) {
    const list = this.list.filter((item) => item.technologyId === technologyId && item.planet.id === planet.id);

    return list.length ? list[0] : null;
  }
}

const buildList = new BuildList();

export default buildList;

buildList.listen();
buildList.clean();
