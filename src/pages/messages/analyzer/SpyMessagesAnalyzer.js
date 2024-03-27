import { messagesTabs } from "../index.js";
import { getLogger } from "../../../util/logger.js";
import { createDOM } from "../../../util/dom.js";
import { SpyReport } from "./Object/SpyReport.js";
import ship from "../../../util/enum/ship.js";
import { tooltip } from "../../../util/tooltip.js";
import DateTime from "../../../util/dateTime.js";
import { toFormattedNumber } from "../../../util/numbers.js";
import { calcNeededShips } from "../../../util/calcNeededShips.js";

class SpyMessagesAnalyzer {
  #logger;
  #spyReports;

  constructor() {
    this.#logger = getLogger("SpyMessagesAnalyer");
  }

  support(tabId) {
    return messagesTabs.SPY === tabId;
  }

  analyze(messagesElement) {
    this.#spyReports = [];

    messagesElement.forEach((message) => {
      if (!this.#isReport(message)) return;

      this.#spyReports.push(new SpyReport(message));
    });

    if (this.#spyReports.length === 0) return;

    this.#displaySpyTable();
  }

  #isReport(message) {
    return message.querySelector(".msg_content .resspan") !== null;
  }

  #displaySpyTable() {
    const res = JSON.parse(localStorage.getItem("ogk-data"));
    const json = res || {};

    const table = createDOM("table", { class: "ogl-spyTable" });
    this.#spyTableHeader(table, json);

    this.#spyTableBody(table, json);

    const pagination = document.querySelector("#fleetsgenericpage > ul > ul.pagination");
    pagination.parentNode.insertBefore(table, pagination);
  }

  #spyTableHeader(table, json) {
    const thead = createDOM("thead");
    table.appendChild(thead);

    const header = createDOM("tr");
    thead.appendChild(header);

    header.appendChild(createDOM("th", {}, "#"));
    header.appendChild(createDOM("th", { "data-filter": "DATE" }, "Date (*)"));
    header.appendChild(createDOM("th", { "data-filter": "COORDS" }, "Coords"));
    header.appendChild(createDOM("th", {}, "Name (+)"));
    header.appendChild(createDOM("th", { "data-filter": "$" }, "Gain"));
    header.appendChild(createDOM("th", { "data-filter": "FLEET" }, "Fleet"));
    header.appendChild(createDOM("th", { "data-filter": "DEF" }, "Def"));

    const cargoChoice = this.#cargoChoice();
    const cargoSpan = createDOM("span", {
      style: "display: flex",
      class: `ogl-option ogl-fleet-ship choice ogl-fleet-${json.options.spyFret}`,
    });

    const cargo = createDOM("th");

    cargo.addEventListener("mouseover", () => tooltip(cargo, cargoChoice, false, false, 50));

    cargo.appendChild(cargoSpan);
    header.appendChild(cargo);

    header.appendChild(createDOM("th", { class: "ogl-headerColors" }, "-"));
    header.appendChild(createDOM("th", {}, "Actions"));
  }

  #cargoChoice() {
    const res = JSON.parse(localStorage.getItem("ogk-data"));
    const json = res || {};

    const cargoChoice = createDOM("div");

    const smallCargo = cargoChoice.appendChild(
      createDOM("div", { class: `ogl-option ogl-fleet-ship choice ogl-fleet-${ship.SmallCargo}` })
    );
    const largeCargo = cargoChoice.appendChild(
      createDOM("div", { class: `ogl-option ogl-fleet-ship choice ogl-fleet-${ship.LargeCargo}` })
    );
    const pathFinder = cargoChoice.appendChild(
      createDOM("div", { class: `ogl-option ogl-fleet-ship choice ogl-fleet-${ship.PathFinder}` })
    );

    cargoChoice.appendChild(smallCargo);
    cargoChoice.appendChild(largeCargo);
    cargoChoice.appendChild(pathFinder);

    // TODO: save on click

    if (json.ships[ship.EspionnageProbe].cargoCapacity) {
      cargoChoice.classList.add("spio");

      const probe = cargoChoice.appendChild(
        createDOM("div", { class: `ogl-option ogl-fleet-ship choice ogl-fleet-${ship.EspionnageProbe}` })
      );

      cargoChoice.appendChild(probe);
      // TODO: save on click
    }
    return cargoChoice;
  }

  #spyTableBody(table, json) {
    const body = createDOM("tbody");
    table.appendChild(body);

    this.#spyReports.forEach(async (report, index) => {
      const bodyRow = createDOM("tr", { data: "closed" });

      const indexCol = createDOM("td", {}, index + 1);

      if (report.new) {
        indexCol.classList.add("ogi-new");
      }

      if (report.attacked) {
        indexCol.classList.add("ogi-attacked");
      }

      bodyRow.appendChild(indexCol);

      // Date
      const dateDetail = `\n${report.cleanDate.toLocaleDateString()}<br>\n${report.cleanDate.toLocaleTimeString()}<br>\nActivity : ${
        report.activity
      }\n`;
      const dateCol = createDOM(
        "td",
        { class: "tooltipLeft ogl-date", title: dateDetail },
        DateTime.timeSince(report.cleanDate)
      );

      if (report.activity <= 15) dateCol.classList.add("ogl-danger");
      else if (report.activity < 60) dateCol.classList.add("ogl-care");
      else dateCol.classList.add("ogl-good");

      bodyRow.appendChild(dateCol);

      const coordsCol = createDOM("td");
      const coordsColLink = createDOM("a", { href: report.coordsLink });

      const coordsColLinkSpan = createDOM("span", {}, report.coords);
      coordsColLink.appendChild(coordsColLinkSpan);

      if (report.type === 3) {
        const coordsColLinkMoon = createDOM("figure", { class: "planetIcon moon" }, report.coords);
        coordsColLink.appendChild(coordsColLinkMoon);
      }

      coordsCol.appendChild(coordsColLink);
      bodyRow.appendChild(coordsCol);

      const nameCol = createDOM("td", { class: "ogl-name" });
      const classByStatus = {
        "": "status_abbr_active",
        "(i)": "status_abbr_inactive",
        "(I)": "status_abbr_longinactive",
        "(ph)": "status_abbr_honorableTarget",
        "(v)": "status_abbr_vacation",
        "(vi)": "status_abbr_vacation",
      };

      const nameColLink = createDOM("a", { class: classByStatus[report.status] }, `${report.name} ${report.status}`);
      nameCol.appendChild(nameColLink);
      bodyRow.appendChild(nameCol);

      const gainColTitle = createDOM("div");
      const gainColTitleMetal = createDOM(
        "div",
        { class: "ogl-metal" },
        `Metal : ${toFormattedNumber(report.metal, null, true)}`
      );
      const gainColTitleCrystal = createDOM(
        "div",
        { class: "ogl-crystal" },
        `Crystal : ${toFormattedNumber(report.crystal, null, true)}`
      );
      const gainColTitleDeut = createDOM(
        "div",
        { class: "ogl-deut" },
        `Deuterium : ${toFormattedNumber(report.deut, null, true)}`
      );
      const gainColTitleSplitLine = createDOM(
        "div",
        { class: "splitline" },
        `Total : ${toFormattedNumber(report.total, null, true)}`
      );

      gainColTitle.appendChild(gainColTitleMetal);
      gainColTitle.appendChild(gainColTitleCrystal);
      gainColTitle.appendChild(gainColTitleDeut);
      gainColTitle.appendChild(gainColTitleSplitLine);

      const gainCol = createDOM(
        "td",
        { class: "tooltipLeft ogl-lootable", title: gainColTitle.innerHTML },
        toFormattedNumber(report.renta, null, true)
      );

      if (json.options.rvalLimit <= Math.round((report.total * report.loot) / 100)) {
        gainCol.classList.add("ogl-good");
      }

      gainCol.style.background = `linear-gradient(to right, rgba(255, 170, 204, 0.63) ${
        report.resRatio[0]
      }%, rgba(115, 229, 255, 0.78) ${report.resRatio[0]}%\n, rgba(115, 229, 255, 0.78) ${
        report.resRatio[0] + report.resRatio[1]
      }%, rgb(166, 224, 176) ${report.resRatio[2]}%)`;

      bodyRow.appendChild(gainCol);

      const fleetCol = createDOM("td", {}, toFormattedNumber(report.fleet, null, true));
      if (
        Math.round(report.fleet * json.universeSettingsTooltip.debrisFactor) >= json.options.rvalLimit ||
        report.fleet === "No Data"
      ) {
        fleetCol.classList.add("ogl-care");
      }
      bodyRow.appendChild(fleetCol);

      const defCol = createDOM("td", {}, toFormattedNumber(report.defense, null, true));
      if (report.defense > 0 || report.defense == "No Data") defCol.classList.add("ogl-danger");
      bodyRow.appendChild(defCol);

      const shipCol = createDOM("td");
      const splittedCoords = report.coords.split(":");
      const shipId = json.options.spyFret;

      let shipCount = 0;

      if (report.defense === 0 && report.fleet === 0 && shipId === ship.EspionnageProbe) {
        shipCount = report.pb;
      }

      if (shipId === ship.SmallCargo) shipCount = report.pt;
      else if (shipId === ship.LargeCargo) shipCount = report.gt;
      else if (shipId === ship.PathFinder) shipCount = report.pf;

      const fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&am${shipId}=${shipCount}&oglMode=4`;
      const shipLink = createDOM("a", { href: fleetLink }, toFormattedNumber(shipCount));
      shipCol.appendChild(shipLink);
      bodyRow.appendChild(shipCol);

      const colorsCol = createDOM("td");
      const colorsColContent = createDOM("div", {
        class: "ogl-colors",
        "data-coords": report.coords,
        "data-context": "spytable",
      });

      colorsCol.appendChild(colorsColContent);

      /*      dataHelper.getPlayer(report.name).then((player) => {
        if (player.id) {
          // this.stalk(nameColLink, player);
        }
        // this.addMarkerUI(report.coords, colorsColContent, player.id, false);
        if (json.markers[report.coords]) {
          bodyRow.classList.add("ogl-marked");
          bodyRow.setAttribute("data-marked", json.markers[report.coords].color);
        }
      }); */
      bodyRow.appendChild(colorsCol);

      const optCol = createDOM("td", { class: "ogl-spyOptions" });

      const optColButton = createDOM("button", { class: "icon icon_maximize overlay", href: report.detail });
      optCol.appendChild(optColButton);

      const optColSimButton = createDOM("a", { class: "ogl-text-btn" }, "T");
      optColSimButton.addEventListener("click", () => {
        /*if (!json.options.simulator) {
          this.popup(
            null,
            this.createDOM("div", { class: "ogl-warning-dialog overmark" }, this.getTranslatedText(169))
          );
        } else {
          let apiTechData = {
            109: { level: json.technology[109] },
            110: { level: json.technology[110] },
            111: { level: json.technology[111] },
            115: { level: json.technology[115] },
            117: { level: json.technology[117] },
            118: { level: json.technology[118] },
            114: { level: json.technology[114] },
          };
          let coords = this.current.coords.split(":");
          let json = {
            0: [
              {
                class: this.playerClass,
                research: apiTechData,
                planet: {
                  galaxy: coords[0],
                  system: coords[1],
                  position: coords[2],
                },
              },
            ],
          };
          let base64 = btoa(JSON.stringify(json));
          window.open(
            `${json.options.simulator}${this.univerviewLang}?SR_KEY=${report.apiKey}#prefill=${base64}`,
            "_blank"
          );
        }*/
      });
      optCol.appendChild(optColSimButton);

      if (json.options.ptreTK) {
        const optColPtreButton = createDOM("a", { class: "ogl-text-btn" }, "P");
        optCol.appendChild(optColPtreButton);

        optColPtreButton.addEventListener("click", () => {
          /*          ptreService
            .importSpy(json.options.ptreTK, report.apiKey)
            .then((result) => fadeBox(result.message_verbose, result.code != 1))
            .catch((reason) => fadeBox(reason, true)); */
        });
      }

      const optColAttackButton = createDOM("a", { class: "icon ogl-icon-attack" }, "T");
      optColAttackButton.addEventListener("click", () => {
        const fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&oglMode=4`;
        location.href = fleetLink;
      });
      optCol.appendChild(optColAttackButton);

      const optColSpyButton = createDOM("button", { class: "icon icon_eye", onclick: report.spy });
      optCol.appendChild(optColSpyButton);

      const optColDeleteButton = createDOM("button", { class: "icon icon_trash" });
      optColDeleteButton.dataset.id = report.id;
      optColDeleteButton.addEventListener("click", (element) => {
        const msgId = element.target.dataset.id;
        /*        this.autoQueue.enqueue(() =>
          this.deleteMSg(msgId).then((res) => {
            line.remove();
            report.delete.closest("li.msg").remove();
          })
        );
 */
      });
      optCol.appendChild(optColDeleteButton);

      if (
        json.options.autoDeleteEnable &&
        Math.round(report.fleet * json.universeSettingsTooltip.debrisFactor) +
          Math.round((report.total * report.loot) / 100) +
          Math.round(
            report.defense *
              (1 - json.universeSettingsTooltip.repairFactor) *
              json.universeSettingsTooltip.debrisFactorDef
          ) <
          json.options.rvalLimit
      ) {
        optColDeleteButton.click();
      }

      bodyRow.appendChild(optCol);

      body.appendChild(bodyRow);

      const renta = [];
      const ships = [];
      for (let round = 0; round < 6; round++) {
        renta[round] = Math.round((report.total * Math.pow(1 - report.loot / 100, round) * report.loot) / 100);
        ships[round] = calcNeededShips({
          moreFret: true,
          fret: json.options.spyFret,
          resources: Math.ceil((report.total * Math.pow(1 - report.loot / 100, round) * report.loot) / 100),
        });
      }

      if (renta.length > 1)
        gainCol.addEventListener("click", (e) => {
          const line = e.target.parentElement;
          if (line.getAttribute("data") === "expanded") {
            line.setAttribute("data", "closed");
            document.querySelectorAll("tr.spyTable-extended").forEach((e) => e.remove());

            return;
          }
          const expanded = document.querySelector("tr[data = 'expanded']");
          if (expanded) {
            expanded.setAttribute("data", "closed");
            document.querySelectorAll("tr.spyTable-extended").forEach((e) => e.remove());
          }
          line.setAttribute("data", "expanded");
          const nextReport = line.nextElementSibling;
          for (let round = 1; round < renta.length; round++) {
            const extraLine = line.parentNode.insertBefore(createDOM("tr", { class: "spyTable-extended" }), nextReport);
            extraLine.appendChild(createDOM("td"));
            extraLine.appendChild(createDOM("td", { class: "ogl-date" }));
            extraLine.appendChild(createDOM("td"));
            extraLine.appendChild(createDOM("td", { class: "ogl-name" }));
            const extraDetail = `\n<div class="ogl-metal">Metal: ${toFormattedNumber(
              renta[round] * report.resRatio[0],
              null,
              true
            )}</div>\n<div class="ogl-crystal">Crystal: ${toFormattedNumber(
              renta[round] * report.resRatio[1],
              null,
              true
            )}</div>\n<div class="ogl-deut">Deuterium: ${toFormattedNumber(
              renta[round] * report.resRatio[2],
              null,
              true
            )}</div>\n<div class="splitLine"></div>\nTotal: ${toFormattedNumber(renta[round], null, true)}\n`;
            const extraTotal = extraLine.appendChild(
              createDOM(
                "td",
                { class: "tooltipLeft ogl-lootable", title: extraDetail },
                toFormattedNumber(renta[round], null, true)
              )
            );
            extraTotal.style.background = `linear-gradient(to right, rgba(255, 170, 204, 0.63) ${
              report.resRatio[0]
            }%, rgba(115, 229, 255, 0.78) ${report.resRatio[0]}%\n, rgba(115, 229, 255, 0.78) ${
              report.resRatio[0] + report.resRatio[1]
            }%, rgb(166, 224, 176) ${report.resRatio[2]}%)`;
            if (renta[round] >= json.options.rvalLimit) extraTotal.classList.add("ogl-good");

            extraLine.appendChild(createDOM("td"));
            extraLine.appendChild(createDOM("td"));
            const extraFleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&am${shipId}=${ships[round]}&oglMode=4`;
            const extraShip = extraLine.appendChild(createDOM("td"));
            extraShip.appendChild(
              createDOM(
                "a",
                { href: "https://" + window.location.host + window.location.pathname + extraFleetLink },
                toFormattedNumber(ships[round])
              )
            );
            extraLine.appendChild(createDOM("td"));
            extraLine.appendChild(createDOM("td"));
          }
        });
    });
  }
}

export default SpyMessagesAnalyzer;
