import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import PlanetType from "../../../util/enum/planetType.js";

class FlightMessagesAnalyzer {
  #logger;
  #messages;

  constructor() {
    this.#logger = getLogger("FlightMessagesAnalyzer");
  }

  support(tabId) {
    return [messagesTabs.BATTLE_REPORT].includes(tabId);
  }

  analyze(messageCallable, tabId) {
    this.#messages = messageCallable();

    this.#parseExpeditionFight();
  }

  #getExpeditionFight() {
    const messages = [];

    this.#messages.forEach((e) => {
      const coords = e.querySelector(".rawMessageData")?.getAttribute("data-raw-coords");

      if (parseInt(coords?.split(":")[2]) !== 16) return;

      messages.push(e);
    });

    return messages;
  }

  #parseExpeditionFight() {
    this.#getExpeditionFight().forEach((message) => {
      const combats = OGIData.combats;
      const expeditionSums = OGIData.expeditionSums;
      const msgId = message.getAttribute("data-msg-id");

      if (combats[msgId]) return;

      const defendersSpaceObject = JSON.parse(
        message.querySelector(".rawMessageData")?.getAttribute("data-raw-defenderspaceobject")
      );

      const result = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-result"));

      combats[msgId] = {
        timestamp: message.querySelector(".rawMessageData")?.getAttribute("data-raw-timestamp"),
        favorited: !!message.querySelector(".icon_favorited"),
        coordinates: {
          ...defendersSpaceObject.coordinates,
          planetType: defendersSpaceObject.type === "moon" ? PlanetType.moon : PlanetType.planet,
        },
        win: result.winner === "defender",
        draw: result.winner === "none",
        isProbes: false,
      };

      OGIData.combats = combats;

      if (result?.totalValueOfUnitsLost[0]?.value === 0) {
        return;
      }

      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const dates = [
        newDate.getDate().toString().padStart(2, "0"),
        (newDate.getMonth() + 1).toString().padStart(2, "0"),
        newDate.getFullYear().toString().slice(2),
      ];

      const datePoint = dates.join(".");

      if (!expeditionSums[datePoint]) {
        expeditionSums[datePoint] = {
          found: [0, 0, 0, 0],
          harvest: [0, 0],
          fleet: {},
          losses: {},
          type: {},
          fuel: 0,
          adjust: [0, 0, 0],
        };
      }

      const rounds = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-combatrounds"));

      const lastRound = rounds.pop();
      const fleets = lastRound?.fleets[0]?.technologies;

      fleets.forEach((fleet) => {
        if (fleet.destroyedTotal === 0) return;

        if (!expeditionSums[datePoint].losses[fleet.technologyId]) {
          expeditionSums[datePoint].losses[fleet.technologyId] = 0;
        }

        expeditionSums[datePoint].losses[fleet.technologyId] += fleet.destroyedTotal;
      });

      OGIData.expeditionSums = expeditionSums;
    });
  }
}

export default FlightMessagesAnalyzer;
