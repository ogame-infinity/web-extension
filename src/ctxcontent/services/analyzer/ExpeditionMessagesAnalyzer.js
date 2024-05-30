import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import { createDOM } from "../../../util/dom.js";

class ExpeditionMessagesAnalyzer {
  #logger;
  #messages;

  constructor() {
    this.#logger = getLogger("ExpeditionAnalyzer");
  }

  support(tabId) {
    return [messagesTabs.EXPEDITION].includes(tabId);
  }

  analyze(messageCallable, tabId) {
    this.#messages = messageCallable();

    this.#parseExpeditions();
    this.#parseDiscovery();
  }

  #getExpeditionsMessages() {
    const messages = [];
    this.#messages.forEach((e) => {
      if (!e.querySelector(".rawMessageData")?.hasAttribute("data-raw-expeditionresult")) return;

      messages.push(e);
    });

    return messages;
  }

  #parseExpeditions() {
    const expeditions = OGIData.expeditions;
    const expeditionSums = OGIData.expeditionSums;
    const options = OGIData.options;

    if (!options.fixExpedition) {
      for (let expeditionsKey in expeditions) {
        if (new Date(expeditions[expeditionsKey].date) < new Date("2024-05-28")) continue;
        if (new Date(expeditions[expeditionsKey].date) > new Date("2024-05-31")) continue;

        delete expeditions[expeditionsKey];
      }
      OGIData.expeditions = expeditions;

      for (let expeditionSumsKey in expeditionSums) {
        const dateExploded = expeditionSumsKey.split(".");
        const dateString = `20${dateExploded[2]}-${dateExploded[1]}-${dateExploded[0]}`;

        if (new Date(dateString) < new Date("2024-05-28")) continue;
        if (new Date(dateString) > new Date("2024-05-31")) continue;

        delete expeditionSums[expeditionSumsKey];
      }

      options.fixExpedition = true;
      OGIData.options = options;
      OGIData.expeditionSums = expeditionSums;
    }

    this.#getExpeditionsMessages().forEach((message) => {
      const expeditions = OGIData.expeditions;
      const expeditionSums = OGIData.expeditionSums;
      const msgId = message.getAttribute("data-msg-id");

      const displayLabel = function (message) {
        if (!expeditions[msgId]) return;

        const labels = {
          "ogk-metal": "Metal",
          "ogk-crystal": "Crystal",
          "ogk-deuterium": "Deuterium",
          "ogk-am": "Dark mater",
          "ogk-fleet": "Fleet",
          "ogk-object": "Object",
          "ogk-aliens": "Aliens",
          "ogk-pirates": "Pirates",
          "ogk-late": "Late",
          "ogk-early": "Early",
          "ogk-bhole": "Black hole",
          "ogk-merchant": "Merchant",
          "ogk-void": "Void",
          "ogk-nothing": "Void",
        };
        const classStyle = `ogk-${expeditions[msgId]?.result.toLowerCase()}`;

        const msgTitle = message.querySelector(".msgHeadItem .msgTitle");
        msgTitle.appendChild(createDOM("span", { class: `ogk-label ${classStyle}` }, labels[classStyle]));

        message.classList.add(classStyle);
      };

      if (expeditions && expeditions[msgId]) {
        displayLabel(message);

        return;
      }

      const resourcesGained = JSON.parse(
        message.querySelector(".rawMessageData")?.getAttribute("data-raw-resourcesgained")
      );
      const type = message.querySelector(".rawMessageData").getAttribute("data-raw-expeditionresult");
      const resourceType = resourcesGained ? Object.keys(resourcesGained)[0] : undefined;

      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate()}.${(newDate.getMonth() + 1).toString().padStart(2, "0")}.${newDate
        .getFullYear()
        .toString()
        .slice(2)}`;

      let summary = expeditionSums[datePoint] || {
        found: [0, 0, 0, 0],
        harvest: [0, 0],
        losses: {},
        fleet: {},
        type: {},
        adjust: [0, 0, 0],
        fuel: 0,
      };

      if (type === "darkmatter") {
        expeditions[msgId] = {
          result: "AM",
          date: newDate,
        };

        summary.found[3] += parseInt(Object.values(resourcesGained)[0]);
        summary.type["AM"] ? (summary.type["AM"] += 1) : (summary.type["AM"] = 1);
      } else if (type === "ressources") {
        const typeFormatted = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
        summary.type[typeFormatted] ? (summary.type[typeFormatted] += 1) : (summary.type[typeFormatted] = 1);

        expeditions[msgId] = {
          result: typeFormatted,
          date: newDate,
        };

        let key = 0;
        if (resourceType === "crystal") key = 1;
        else if (resourceType === "deuterium") key = 2;

        summary.found[key] += parseInt(Object.values(resourcesGained)[0]);
      } else if (type === "shipwrecks") {
        expeditions[msgId] = {
          result: "Fleet",
          date: newDate,
        };

        const technologiesGained = JSON.parse(
          message.querySelector(".rawMessageData")?.getAttribute("data-raw-technologiesgained")
        );

        for (const key in technologiesGained) {
          const technology = technologiesGained[key];
          if (!summary.fleet[key]) summary.fleet[key] = 0;

          summary.fleet[key] += technology.amount;
        }

        summary.type["Fleet"] ? (summary.type["Fleet"] += 1) : (summary.type["Fleet"] = 1);
      } else if (type === "navigation") {
        const navigation = JSON.parse(message.querySelector(".rawMessageData")?.getAttribute("data-raw-navigation"));

        const type = parseInt(navigation.returnTimeMultiplier) >= 1 ? "Late" : "Early";
        summary.type[type] ? (summary.type[type] += 1) : (summary.type[type] = 1);

        expeditions[msgId] = {
          result: type,
          date: newDate,
        };
      } else if (type === "nothing") {
        expeditions[msgId] = {
          result: "Void",
          date: newDate,
        };

        summary.type["Void"] ? (summary.type["Void"] += 1) : (summary.type["Void"] = 1);
      } else if (type === "fleetLost") {
        expeditions[msgId] = {
          result: "Bhole",
          date: newDate,
        };

        summary.type["Bhole"] ? (summary.type["Bhole"] += 1) : (summary.type["Bhole"] = 1);
      } else if (type === "items") {
        expeditions[msgId] = {
          result: "Object",
          date: newDate,
        };

        summary.type["Object"] ? (summary.type["Object"] += 1) : (summary.type["Object"] = 1);
      } else if (type === "combat") {
        this.#logger.log("Combat", message);
      }

      displayLabel(message);

      expeditionSums[datePoint] = summary;

      OGIData.expeditions = expeditions;
      OGIData.expeditionSums = expeditionSums;
    });
  }

  #getDiscoveryMessages() {
    const messages = [];
    this.#messages.forEach((e) => {
      if (e.querySelector(".rawMessageData")?.getAttribute("data-raw-messagetype") !== "61") return;

      messages.push(e);
    });

    return messages;
  }

  #parseDiscovery() {
    const messages = this.#getDiscoveryMessages();

    messages.forEach((message) => {
      const discoveries = OGIData.discoveries;
      const discoveriesSums = OGIData.discoveriesSums;

      const msgId = message.getAttribute("data-msg-id");

      if (discoveries && discoveries[msgId]) return;

      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate()}.${(newDate.getMonth() + 1).toString().padStart(2, "0")}.${newDate
        .getFullYear()
        .toString()
        .slice(2)}`;

      const sums = discoveriesSums[datePoint] || {
        found: [0, 0, 0, 0],
        artefacts: 0,
        type: {},
      };

      const type = message.querySelector(".rawMessageData").getAttribute("data-raw-discoverytype");
      let discoveryType = "void";

      if (type === "lifeform-xp") {
        const lifeForm = message.querySelector(".rawMessageData").getAttribute("data-raw-lifeform");
        const experience = parseInt(
          message.querySelector(".rawMessageData").getAttribute("data-raw-lifeformgainedexperience")
        );
        discoveryType = `lifeform${lifeForm}`;

        sums.found[lifeForm - 1] ? (sums.found[lifeForm - 1] += experience) : (sums.found[lifeForm - 1] = experience);
      } else if (type === "artifacts") {
        const artifacts = parseInt(message.querySelector(".rawMessageData").getAttribute("data-raw-artifactsfound"));
        discoveryType = "artefacts";
        sums.artefacts += artifacts;
      }

      sums.type[discoveryType] ? (sums.type[discoveryType] += 1) : (sums.type[discoveryType] = 1);

      discoveriesSums[datePoint] = sums;
      discoveries[msgId] = {
        result: type,
        date: newDate,
        favorited: !!message.querySelector(".icon_favorited"),
      };

      OGIData.discoveries = discoveries;
      OGIData.discoveriesSums = discoveriesSums;
    });
  }
}

export default ExpeditionMessagesAnalyzer;
