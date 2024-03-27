import { cleanValue } from "../../../../util/cleanValue.js";
import { calcNeededShips } from "../../../../util/calcNeededShips.js";
import ship from "../../../../util/enum/ship.js";

export class SpyReport {
  get date() {
    return this._date;
  }
  get deltaDate() {
    return this._deltaDate;
  }
  get cleanDate() {
    return this._cleanDate;
  }
  get tmpCoords() {
    return this._tmpCoords;
  }
  get resRatio() {
    return this._resRatio;
  }
  get pf() {
    return this._pf;
  }
  get gt() {
    return this._gt;
  }
  get pt() {
    return this._pt;
  }
  get pb() {
    return this._pb;
  }
  get apiKey() {
    return this._apiKey;
  }
  get renta() {
    return this._renta;
  }
  get total() {
    return this._total;
  }
  get deut() {
    return this._deut;
  }
  get crystal() {
    return this._crystal;
  }
  get metal() {
    return this._metal;
  }
  get loot() {
    return this._loot;
  }
  get defense() {
    return this._defense;
  }
  get fleet() {
    return this._fleet;
  }
  get deleteLink() {
    return this._deleteLink;
  }
  get detailLink() {
    return this._detailLink;
  }
  get coordsLink() {
    return this._coordsLink;
  }
  get coords() {
    return this._coords;
  }
  get spyLink() {
    return this._spyLink;
  }
  get activity() {
    return this._activity;
  }
  get status() {
    return this._status;
  }
  get name() {
    return this._name;
  }
  get isMoon() {
    return this._isMoon;
  }
  get attacked() {
    return this._attacked;
  }
  get isFavorited() {
    return this._isFavorited;
  }
  get isNew() {
    return this._isNew;
  }
  get id() {
    return this._id;
  }
  constructor(message) {
    this._id = message.getAttribute("data-msg-id");
    this._isNew = message.classList.contains("msg_new");
    this._isFavorited = message.querySelector(".icon_favorited");
    this._attacked = message.querySelector(".fleetAction.fleetHostile");
    this._isMoon = message.querySelector("figure.moon") ? 3 : 1;

    const data = message.querySelectorAll(".compacting");

    this._name = data[0]
      .querySelectorAll('span[class^="status"]')[0]
      .textContent.replace(/&nbsp;/g, "")
      .trim();

    this._status = data[0]
      .querySelectorAll('span[class^="status"]')[1]
      .textContent.replace(/&nbsp;/g, "")
      .trim();

    this._spyLink = message.querySelector('.msg_actions [onclick*="sendShipsWithPopup"]').getAttribute("onclick");
    const textContent = data[0].querySelector("span.fright").textContent;
    this._activity = parseInt(textContent ? textContent.match(/\d+/)[0] : 60);
    this._coords = /\[.*\]/g.exec(message.querySelector(".msg_title").innerHTML)[0]?.slice(1, -1);
    this._coordsLink = message.querySelector(".msg_title a").href;

    this._detailLink = message.querySelector(".msg_actions a.fright").href;
    this._deleteLink = message.querySelector(".msg_head .fright a .icon_refuse");

    this._fleet = cleanValue(
      data[5].querySelectorAll("span.ctn")[0]?.textContent?.replace(/(\D*)/, "")?.split(" ")[0] || "No Data"
    );

    this._defense = cleanValue(
      data[5].querySelectorAll("span.ctn")[1]?.textContent?.replace(/(\D*)/, "")?.split(" ")[0] || "No Data"
    );

    // Date
    const rawDate = message.querySelector(".msg_date").textContent.split(/\.| /g);
    this._cleanDate = new Date(`${rawDate[2]}-${rawDate[1]}-${rawDate[0]} ${rawDate[3]}`);
    this._deltaDate = Date.now() - this._cleanDate;

    const minutes = this._deltaDate / 6e4;
    const hours = minutes / 60;

    this._date = hours < 1 ? Math.floor(minutes) + " min" : Math.floor(hours) + "h";

    this._loot = data[4].querySelector(".ctn").textContent.replace(/(\D*)/, "").replace(/%/, "");
    this._metal = cleanValue(data[3].querySelectorAll(".resspan")[0].textContent.replace(/(\D*)/, ""));
    this._crystal = cleanValue(data[3].querySelectorAll(".resspan")[1].textContent.replace(/(\D*)/, ""));
    this._deut = cleanValue(data[3].querySelectorAll(".resspan")[2].textContent.replace(/(\D*)/, ""));
    this._total = this._metal + this._crystal + this._deut;
    this._renta = Math.round((this._total * this._loot) / 100);

    const apiKey =
      message.querySelector(".icon_apikey").getAttribute("title") ||
      message.querySelector(".icon_apikey").getAttribute("data-title");
    this._apiKey = apiKey.split("'")[1];

    //////////////////////////////////////////////////////

    this._pb = calcNeededShips({
      moreFret: true,
      fret: ship.EspionnageProbe,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._pt = calcNeededShips({
      moreFret: true,
      fret: ship.SmallCargo,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._gt = calcNeededShips({
      moreFret: true,
      fret: ship.LargeCargo,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._pf = calcNeededShips({
      moreFret: true,
      fret: ship.PathFinder,
      resources: Math.ceil((this._total * this._loot) / 100),
    });

    const resRatio = [this.total / this.metal, this.total / this.crystal, this.total / this.deut];
    this._resRatio = resRatio.map((x) => Math.round((1 / parseInt(x)) * 100));

    let _tmpCoords = this._coords.split(":");
    _tmpCoords = _tmpCoords.map((x) => x.padStart(3, "0"));
    this._tmpCoords = _tmpCoords.join("");
  }
}
