import { cleanValue } from "../../../../util/cleanValue.js";
import { calcNeededShips } from "../../../../util/calcNeededShips.js";
import ship from "../../../../util/enum/ship.js";
import planetType from "../../../../util/enum/planetType.js";

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
  get planetTargetType() {
    return this._planetTargetType;
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
    this._planetTargetType = parseInt(
      message.querySelector(".rawMessageData").getAttribute("data-raw-targetplanettype") || planetType.planet
    );

    this._name = message
      .getAttribute("data-messages-filters-playername")
      .replace(/&nbsp;/g, "")
      .trim();

    this._status = "";

/*    this._status = message
      .getAttribute("data-messages-filters-status")
      .replace(/&nbsp;/g, "")
      .replace(/-/g, "")
      .trim();
*/
    this._spyLink = message.querySelector('.msg_actions [onclick*="sendShipsWithPopup"]').getAttribute("onclick");
    const textContent = message.getAttribute("data-messages-filters-activity");
    this._activity = parseInt(textContent.match(/\d+/) ? textContent.match(/\d+/)[0] : 60);
    this._coords = /\[.*\]/g.exec(message.getAttribute("data-messages-filters-coordinates"))[0]?.slice(1, -1);
    this._coordsLink = message.querySelector(".msgTitle a")?.href || "#";

    this._detailLink = message.querySelector(".msg_actions message-footer-details a.fright").href;
    this._deleteLink = message.querySelector(".msgHead .msgDeleteBtn");

    this._fleet = cleanValue(
      message
        .querySelector(".fleetInfo > .shipsTotal")
        ?.getAttribute("data-tooltip-title")
        .match(/[\d.]+/)[0] || "No Data"
    );
    this._defense = cleanValue(
      message
        .querySelector(".defenseInfo > .defenseTotal")
        ?.getAttribute("data-tooltip-title")
        .match(/[\d.]+/)[0] || "No Data"
    );

    // Date
    const rawDate = message.getAttribute("data-messages-filters-datetime").split(/\.| /g);
    this._cleanDate = new Date(`${rawDate[2]}-${rawDate[1]}-${rawDate[0]} ${rawDate[3]}`);
    this._deltaDate = Date.now() - this._cleanDate;

    const minutes = this._deltaDate / 6e4;
    const hours = minutes / 60;

    this._date = hours < 1 ? Math.floor(minutes) + " min" : Math.floor(hours) + "h";

    this._loot = message.getAttribute("data-messages-filters-loot").replace(/(\D*)/, "").replace(/%/, "");
    this._metal = cleanValue(message.getAttribute("data-messages-filters-metal").replace(/(\D*)/, ""));
    this._crystal = cleanValue(message.getAttribute("data-messages-filters-crystal").replace(/(\D*)/, ""));
    this._deut = cleanValue(message.getAttribute("data-messages-filters-deuterium").replace(/(\D*)/, ""));
    this._total = this._metal + this._crystal + this._deut;
    this._renta = Math.round((this._total * this._loot) / 100);

    this._apiKey = message.querySelector(".rawMessageData").getAttribute("data-raw-hashcode");

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

    const resRatio = [this.metal / this.total, this.crystal / this.total, this.deut / this.total];
    this._resRatio = resRatio.map((x) => Math.round(x * 100));

    let _tmpCoords = this._coords.split(":");
    _tmpCoords = _tmpCoords.map((x) => x.padStart(3, "0"));
    this._tmpCoords = _tmpCoords.join("");
  }
}
