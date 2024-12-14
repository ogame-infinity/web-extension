import { createFromString } from "./coords.js";

export class Planet {
  _id;
  _coords;
  _name;
  _isMoon;

  set id(id) {
    this._id = parseInt(id);
  }

  get id() {
    return this._id;
  }

  set coords(coords) {
    if (typeof coords === "string") {
      coords = createFromString(coords);
    }

    this._coords = coords;
  }

  get coords() {
    return this._coords;
  }

  set name(name) {
    this._name = name;
  }

  get name() {
    return this._name;
  }

  set isMoon(isMoon) {
    this._isMoon = isMoon;
  }

  get isMoon() {
    return this._isMoon;
  }

  toJSON() {
    return {
      id: this._id,
      name: this._name,
      isMoon: this._isMoon,
      coords: this._coords,
    };
  }
}

function createPlanetFromNodeElement(element) {
  const url = new URL(element.getAttribute("href"));
  const id = url.searchParams.get("cp");

  const parentElement = element.parentNode;
  const coords = parentElement.querySelector(".planet-koords").textContent;

  const isMoon = element.classList.contains("moonlink");

  let name;

  if (isMoon) {
    name = element.querySelector(".icon-moon").getAttribute("alt");
  } else {
    name = element.querySelector(".planet-name").textContent;
  }

  return Object.assign(new Planet(), { id, coords, name, isMoon });
}

export function current() {
  const element = document.querySelector("#planetList .active") ?? document.querySelector("#planetList .planetlink");

  return createPlanetFromNodeElement(element);
}
