import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import { createDOM } from "../../../util/dom.js";
import { toFormattedNumber } from "../../../util/numbers.js";

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
      const datePoint = `${newDate.getDate().toString().padStart(2, "0")}.${(newDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${newDate.getFullYear().toString().slice(2)}`;

      let summary = expeditionSums[datePoint] || {
        found: [0, 0, 0, 0],
        harvest: [0, 0, 0],
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
      } else if (type === "trader") {
        expeditions[msgId] = {
          result: "Merchant",
          date: newDate,
        };

        summary.type["Merchant"] ? (summary.type["Merchant"] += 1) : (summary.type["Merchant"] = 1);
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

      const displayLabel = function (message) {
        if (!discoveries[msgId]) return;

        const labels = {
          "ogk-lifeform1": "Humans",
          "ogk-lifeform2": "Rock’tal",
          "ogk-lifeform3": "Mechas",
          "ogk-lifeform4": "Kaelesh",
          "ogk-artefacts": "Artefacts",
          "ogk-void": "Void",
        };

        const classStyle = `ogk-${discoveries[msgId]?.result?.toLowerCase()}`;

        const msgTitle = message.querySelector(".msgHeadItem .msgTitle");
        msgTitle.appendChild(createDOM("span", { class: `ogk-label ${classStyle}` }, labels[classStyle]));

        if (discoveries[msgId]?.result != "void") {
          const classStyleSize = `ogk-size-${discoveries[msgId]?.size || "normal"}`;
          msgTitle.appendChild(
            createDOM(
              "span",
              { class: `ogk-label ${classStyleSize}` },
              toFormattedNumber(discoveries[msgId]?.amount || 0, 0, true)
            )
          );
        }

        message.classList.add(classStyle);
      };

      if (discoveries && discoveries[msgId]) {
        displayLabel(message);

        return;
      }

      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate().toString().padStart(2, "0")}.${(newDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${newDate.getFullYear().toString().slice(2)}`;

      const sums = discoveriesSums[datePoint] || {
        found: [0, 0, 0, 0],
        artefacts: 0,
        type: {},
      };

      const discoveryType = message.querySelector(".rawMessageData").getAttribute("data-raw-discoverytype");
      let ogiDiscoveryType = "void";
      let amount = 0;

      if (discoveryType === "lifeform-xp") {
        const lifeForm = message.querySelector(".rawMessageData").getAttribute("data-raw-lifeform");
        const experience = parseInt(
          message.querySelector(".rawMessageData").getAttribute("data-raw-lifeformgainedexperience")
        );
        ogiDiscoveryType = `lifeform${lifeForm}`;
        amount = experience;

        sums.found[lifeForm - 1] ? (sums.found[lifeForm - 1] += experience) : (sums.found[lifeForm - 1] = experience);
      } else if (discoveryType === "artifacts") {
        const artifacts = parseInt(message.querySelector(".rawMessageData").getAttribute("data-raw-artifactsfound"));
        ogiDiscoveryType = "artefacts";
        amount = artifacts;
        sums.artefacts += artifacts;
      }

      sums.type[ogiDiscoveryType] ? (sums.type[ogiDiscoveryType] += 1) : (sums.type[ogiDiscoveryType] = 1);

      discoveriesSums[datePoint] = sums;
      discoveries[msgId] = {
        result: ogiDiscoveryType,
        size: message.querySelector(".rawMessageData").getAttribute("data-raw-artifactssize") || "normal",
        amount: amount,
        date: newDate,
        favorited: !!message.querySelector(".icon_favorited"),
      };

      displayLabel(message);
      OGIData.discoveries = discoveries;
      OGIData.discoveriesSums = discoveriesSums;
    });
  }
}

export default ExpeditionMessagesAnalyzer;
