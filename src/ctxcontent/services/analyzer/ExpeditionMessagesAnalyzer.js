import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";

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
    this.#getExpeditionsMessages().forEach((e) => {
      const msgId = e.getAttribute("data-msg-id");
      const expeditions = OGIData.expeditions;
      const expeditionSums = OGIData.expeditionSums;

      if (expeditions && expeditions[msgId]) return;

      const type = e.querySelector(".rawMessageData").getAttribute("data-raw-expeditionresult");

      const newDate = new Date(e.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate()}.${(newDate.getMonth() + 1).toString().padStart(2, "0")}.${newDate.getFullYear().toString().slice(2)}`;
      const resourcesGained = JSON.parse(e.querySelector(".rawMessageData")?.getAttribute("data-raw-resourcesgained"));

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
      } else if (type === "ressources") {
        const resourceType = Object.keys(resourcesGained)[0];
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
          e.querySelector(".rawMessageData")?.getAttribute("data-raw-technologiesgained")
        );

        for (const key in technologiesGained) {
          const technology = technologiesGained[key];
          if (!summary.fleet[key]) summary.fleet[key] = 0;

          summary.fleet[key] += technology.amount;
        }

        summary.type["Fleet"] ? (summary.type["Fleet"] += 1) : (summary.type["Fleet"] = 1);
      } else if (type === "navigation") {
        const navigation = JSON.parse(e.querySelector(".rawMessageData")?.getAttribute("data-raw-navigation"));

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
        this.#logger.log("Combat", e);
      }

      expeditionSums[datePoint] = summary;

      OGIData.expeditions = expeditions;
      OGIData.expeditionSums = expeditionSums;
    });
  }
}

export default ExpeditionMessagesAnalyzer;
