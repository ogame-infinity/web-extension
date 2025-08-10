import { cleanValue } from "../../../../util/cleanValue.js";
import { calcNeededShips } from "../../../../util/calcNeededShips.js";
import * as DOM from "../../../../util/dom.js";
import ship from "../../../../util/enum/ship.js";
import planetType from "../../../../util/enum/planetType.js";
import Translator from "../../../../util/translate.js";
import OGIData from "../../../../util/OGIData.js";
import FleetAndDefenceCostCalculator from "../../../../util/fleetAndDefenceCostCalculator.js";
import * as standardUnit from "../../../../util/standardUnit.js";
import { toFormattedNumber } from "../../../../util/numbers.js";

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
  get statusCssClass() {
    return this._statusCssClass;
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
  get targetIsSelf() {
    return this._targetIsSelf;
  }
  constructor(message) {
    this._id = message.getAttribute("data-msg-id");
    this._targetIsSelf =
      message.querySelector(`.rawMessageData[data-raw-targetplayerid="${OGIData.playerId}"]`) !== null;
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
    const classList = message.querySelector(".playerName > span:last-child")?.classList;
    if (classList) {
      const classes = Array.from(classList);
      this._statusCssClass = classes.find((c) => c.substring(0, 12) === "status_abbr_");

      if (message.querySelectorAll(`.playerName > span.${this._statusCssClass}`).length === 2) {
        this._status = message.querySelector(`.playerName > span.${this._statusCssClass}:last-child`)?.textContent;
      }
    }

    this._spyLink = message.querySelector('.msg_actions [onclick*="sendShipsWithPopup"]').getAttribute("onclick");
    const textContent = message.getAttribute("data-messages-filters-activity");
    this._activity = parseInt(textContent.match(/\d+/) ? textContent.match(/\d+/)[0] : 60);
    this._coords = /\[.*\]/g.exec(message.getAttribute("data-messages-filters-coordinates"))[0]?.slice(1, -1);
    this._coordsLink = message.querySelector(".msgTitle a")?.href || "#";

    this._detailLink = message.querySelector(".msg_actions message-footer-details a.fright")?.href;

    // TODO: after 11.16.0, modify fleet& defense to obtain values directly of data raw. no need of regex & cleanValue
    const fleet = message.getAttribute("data-messages-filters-fleet");
    const defense = message.getAttribute("data-messages-filters-defense");
    const regExp = new RegExp(`[\\d${LocalizationStrings["thousandSeperator"]}]+`);

    if (fleet === "-") {
      this._fleet = "No data";
    } else if (fleet === "0") {
      this._fleet = "0";
    } else if (message.querySelector(".rawMessageData").getAttribute("data-raw-fleetvalue")) {
      this._fleet = cleanValue(message.querySelector(".rawMessageData").getAttribute("data-raw-fleetvalue"));
    } else {
      // @deprecated
      this._fleet = cleanValue(
        regExp.exec(message.querySelector(".fleetInfo > .shipsTotal")?.getAttribute("data-tooltip-title"))?.[0] || ""
      );
    }

    if (defense === "-") {
      this._defense = "No data";
    } else if (defense === "0") {
      this._defense = "0";
    } else if (message.querySelector(".rawMessageData").getAttribute("data-raw-defensevalue")) {
      this._defense = cleanValue(message.querySelector(".rawMessageData").getAttribute("data-raw-defensevalue"));
    } else {
      // @deprecated
      this._defense = cleanValue(
        regExp.exec(message.querySelector(".defenseInfo > .defenseTotal")?.getAttribute("data-tooltip-title"))?.[0] ||
          ""
      );
    }

    // Date
    const timestamp = message.querySelector(".rawMessageData").getAttribute("data-raw-timestamp");
    this._cleanDate = new Date();
    this._cleanDate.setTime(timestamp * 1000);
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
      fret: ship.EspionageProbe,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._pt = calcNeededShips({
      moreFret: true,
      fret: ship.SmallCargoShip,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._gt = calcNeededShips({
      moreFret: true,
      fret: ship.LargeCargoShip,
      resources: Math.ceil((this._total * this._loot) / 100),
    });
    this._pf = calcNeededShips({
      moreFret: true,
      fret: ship.Pathfinder,
      resources: Math.ceil((this._total * this._loot) / 100),
    });

    const resRatio = [this.metal / this.total, this.crystal / this.total, this.deut / this.total];
    this._resRatio = resRatio.map((x) => Math.round(x * 100));

    let _tmpCoords = this._coords.split(":");
    _tmpCoords = _tmpCoords.map((x) => x.padStart(3, "0"));
    this._tmpCoords = _tmpCoords.join("");

    if (this._targetIsSelf) {
      this.#DecorateAsTargetIsSelf(message);
    }
  }

  #DecorateAsTargetIsSelf(message) {
    message.classList.add("ogl-spyReportTargetIsSelf");

    const fleet = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-fleet"));
    const defence = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-defense"));

    const recyclingYieldFleet = FleetAndDefenceCostCalculator.CalculateRecyclingYieldFleet(
      fleet,
      OGIData.universeSettingsTooltip.debrisFactor,
      OGIData.universeSettingsTooltip.deuteriumInDebris
    );
    const amountFleet = [recyclingYieldFleet.metal, recyclingYieldFleet.crystal, recyclingYieldFleet.deut];
    const standardUnitSumFleet = standardUnit.standardUnit(amountFleet);

    const recyclingYieldDefence = FleetAndDefenceCostCalculator.CalculateRecyclingYieldDefence(
      defence,
      OGIData.universeSettingsTooltip.debrisFactorDef,
      OGIData.universeSettingsTooltip.deuteriumInDebris
    );
    const amountDefence = [recyclingYieldDefence.metal, recyclingYieldDefence.crystal, recyclingYieldDefence.deut];
    const standardUnitSumDefence = standardUnit.standardUnit(amountDefence);

    const totalStandardUnitSum = standardUnitSumFleet + standardUnitSumDefence;

    // If the standard unit sum is above the limit, display warning labels
    if (totalStandardUnitSum >= OGIData.options.rvalSelfLimit) {
      const msgTitle = message.querySelector(".msgHeadItem .msgTitle");

      const totalAmountDisplay = `${toFormattedNumber(totalStandardUnitSum, [0, 1], true)} ${standardUnit.unitType()}`;

      const warningLabel = DOM.createDOM("span", {}, `${Translator.translate(65)}:`);
      warningLabel.appendChild(DOM.createDOM("span", { class: "ogk-label ogi-warning" }, totalAmountDisplay));

      msgTitle.appendChild(warningLabel);

      // ogame table display for fleet
      if (standardUnitSumFleet > 0) {
        const fleetAmountDisplay = `${toFormattedNumber(
          standardUnitSumFleet,
          [0, 1],
          true
        )} ${standardUnit.unitType()}`;
        const msgFilteredHeaderFleet = message.querySelector(
          ".msgFilteredHeaderRow .msgFilteredHeaderCell.msgFilteredHeaderCell_fleetValue"
        );
        if (msgFilteredHeaderFleet) {
          msgFilteredHeaderFleet.removeChild(msgFilteredHeaderFleet.firstChild);
          msgFilteredHeaderFleet.appendChild(
            DOM.createDOM("span", { class: "ogk-label ogi-warning" }, `${fleetAmountDisplay}`)
          );
        }
      }
      // ogame table display for defence
      if (standardUnitSumDefence > 0) {
        const defenceAmountDisplay = `${toFormattedNumber(
          standardUnitSumDefence,
          [0, 1],
          true
        )} ${standardUnit.unitType()}`;
        const msgFilteredHeaderDefence = message.querySelector(
          ".msgFilteredHeaderRow .msgFilteredHeaderCell.msgFilteredHeaderCell_defenseValue"
        );
        if (msgFilteredHeaderDefence) {
          msgFilteredHeaderDefence.removeChild(msgFilteredHeaderDefence.firstChild);
          msgFilteredHeaderDefence.appendChild(
            DOM.createDOM("span", { class: "ogk-label ogi-warning" }, `${defenceAmountDisplay}`)
          );
        }
      }
    }

    // Add button for seeing report
    const msgFooterActions = message.querySelector(".messageContentWrapper > .msg_actions > message-footer-actions");
    if (msgFooterActions) {
      const searchParams = new URLSearchParams({
        page: "componentOnly",
        component: "messagedetails",
        messageId: this.id,
      });

      const seeReportButton = DOM.createDOM("button", {
        class: "custom_btn tooltip seeReportButton overlay",
        href: `${OGIData.universeUrl}/game/index.php?${searchParams.toString()}`,
        title: Translator.translate(188),
      });
      seeReportButton.appendChild(DOM.createDOM("span", { class: "seeReportIcon" }));

      const gradientButton = DOM.createDOM("gradient-button", { sq28: null });
      gradientButton.appendChild(seeReportButton);

      msgFooterActions.prepend(gradientButton);
    }
  }
}
