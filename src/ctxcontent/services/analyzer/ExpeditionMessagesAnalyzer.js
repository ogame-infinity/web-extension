import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";

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
    const res = JSON.parse(localStorage.getItem("ogk-data"));
    const json = res || {};

    this.#getExpeditionsMessages().forEach((e) => {
      const msgId = e.getAttribute("data-msg-id");

      if (json.expeditions && json.expeditions[msgId]) return;

      const type = e.querySelector(".rawMessageData").getAttribute("data-raw-expeditionresult");

      const dateString = e.querySelector(".msgDate").textContent;
      const splittedDate = dateString.split(" ");
      const dateData = splittedDate[0].split(".");
      const datePoint = [dateData[0], dateData[1], dateData[2].slice(2)].join(".");
      const date = [dateData[2].slice(2), dateData[1], dateData[0]].join("/");
      const dateTime = [date, splittedDate[1]].join(" ");
      const resourcesGained = JSON.parse(e.querySelector(".rawMessageData")?.getAttribute("data-raw-resourcesgained"));

      let summary = json.expeditionSums[datePoint] || {
        found: [0, 0, 0, 0],
        harvest: [0, 0],
        losses: {},
        fleet: {},
        type: {},
        adjust: [0, 0, 0],
        fuel: 0,
      };

      if (type === "darkmatter") {
        json.expeditions[msgId] = {
          result: "AM",
          date: new Date(dateTime),
        };

        summary.found[3] += parseInt(Object.values(resourcesGained)[0]);
      } else if (type === "ressources") {
        const resourceType = Object.keys(resourcesGained)[0];
        const typeFormatted = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);
        summary.type[typeFormatted] ? (summary.type[typeFormatted] += 1) : (summary.type[typeFormatted] = 1);

        json.expeditions[msgId] = {
          result: typeFormatted,
          date: new Date(dateTime),
        };

        let key = 0;
        if (resourceType === "crystal") key = 1;
        else if (resourceType === "deuterium") key = 2;

        summary.found[key] += parseInt(Object.values(resourcesGained)[0]);
      } else if (type === "shipwrecks") {
        json.expeditions[msgId] = {
          result: "Fleet",
          date: new Date(dateTime),
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

        json.expeditions[msgId] = {
          result: type,
          date: new Date(dateTime),
        };
      } else if (type === "fleetLost") {
        this.#logger.log("Fleet lost", e);
      }

      json.expeditionSums[datePoint] = summary;

      localStorage.setItem("ogk-data", JSON.stringify(json));
    });
  }
}

export default ExpeditionMessagesAnalyzer;
