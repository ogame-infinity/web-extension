import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import MessageType from "../../../util/enum/messageType.js";
import ship from "../../../util/enum/ship.js";

class HarvestMessagesAnalyzer {
  #logger;
  #messages;

  constructor() {
    this.#logger = getLogger("HarvestAnalyzer");
  }

  support(tabId) {
    return [messagesTabs.COMMON].includes(tabId);
  }

  analyze(messageCallable, tabId) {
    this.#messages = messageCallable();

    this.#parseHarvestMessages();
  }

  #getHarvestsMessages() {
    const messages = [];
    this.#messages.forEach((message) => {
      if (
        parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-messagetype")) !== MessageType.harvest
      )
        return;

      messages.push(message);
    });

    return messages;
  }

  #parseHarvestMessages() {
    const reaperTechnology = OGIData.ships?.[ship.Reaper] || {};

    const isExpedition = (message) => {
      const coordsAttr = message.querySelector(".rawMessageData")?.getAttribute("data-raw-targetcoordinates");
      const coords = coordsAttr.split(":");

      return parseInt(coords[2]) === 16;
    };

    const isReaper = (message) => {
      const fleetAmount = parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-recycleramount"));
      const capacity = parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-totalcapacity"));
      const harvesterNeeded = Math.ceil(capacity / reaperTechnology?.cargoCapacity);

      return harvesterNeeded === fleetAmount;
    };

    const addClass = (message) => {
      if (isExpedition(message)) {
        message.classList.add("ogk-expedition");
      } else if (isReaper(message)) {
        message.classList.add("ogk-combat");
      } else {
        message.classList.add("ogk-harvest");
      }
    };

    this.#getHarvestsMessages().forEach((message) => {
      const harvests = OGIData.harvests;
      const msgId = message.getAttribute("data-msg-id");

      addClass(message);

      if (harvests[msgId]) return;

      const coordsAttr = message.querySelector(".rawMessageData")?.getAttribute("data-raw-targetcoordinates");
      const harvestedResources = JSON.parse(
        message.querySelector(".rawMessageData").getAttribute("data-raw-recycledresources")
      );
      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate().toString().padStart(2, "0")}.${(newDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${newDate.getFullYear().toString().slice(2)}`;

      if (isExpedition(message)) {
        const expeditionSums = OGIData.expeditionSums;
        if (!expeditionSums[datePoint]) {
          expeditionSums[datePoint] = {
            found: [0, 0, 0, 0],
            harvest: [0, 0, 0],
            fleet: {},
            losses: {},
            type: {},
            fuel: 0,
            adjust: [0, 0, 0],
          };
        }

        // Fix retro compatibility
        if (!expeditionSums[datePoint].harvest[2]) expeditionSums[datePoint].harvest[2] = 0;

        expeditionSums[datePoint].harvest[0] += harvestedResources?.metal || 0;
        expeditionSums[datePoint].harvest[1] += harvestedResources?.crystal || 0;
        expeditionSums[datePoint].harvest[2] += harvestedResources?.deuterium || 0;

        OGIData.expeditionSums = expeditionSums;
      } else {
        const combatsSums = OGIData.combatsSums;

        if (!combatsSums[datePoint]) {
          combatsSums[datePoint] = {
            loot: [0, 0, 0],
            losses: {},
            harvest: [0, 0, 0],
            adjust: [0, 0, 0],
            fuel: 0,
            topCombats: [],
            count: 0,
            wins: 0,
            draws: 0,
          };
        }

        // Fix retro compatibility
        if (!combatsSums[datePoint].harvest[2]) combatsSums[datePoint].harvest[2] = 0;

        combatsSums[datePoint].harvest[0] += harvestedResources?.metal || 0;
        combatsSums[datePoint].harvest[1] += harvestedResources?.crystal || 0;
        combatsSums[datePoint].harvest[2] += harvestedResources?.deuterium || 0;

        OGIData.combatsSums = combatsSums;
      }

      harvests[msgId] = {
        date: newDate,
        metal: harvestedResources?.metal || 0,
        crystal: harvestedResources?.crystal || 0,
        deuterium: harvestedResources?.deuterium || 0,
        coords: coordsAttr,
        combat: isReaper(message),
      };

      OGIData.harvests = harvests;
    });
  }
}

export default HarvestMessagesAnalyzer;
