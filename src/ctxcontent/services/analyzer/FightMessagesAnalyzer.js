import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import PlanetType from "../../../util/enum/planetType.js";

class FightMessagesAnalyzer {
  #logger;
  #messages;

  constructor() {
    this.#logger = getLogger("FightMessagesAnalyzer");
  }

  support(tabId) {
    return [messagesTabs.BATTLE_REPORT].includes(tabId);
  }

  analyze(messageCallable, tabId) {
    this.#messages = messageCallable();

    this.#parseExpeditionFight();
    this.#parseFight();
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

  #getFight() {
    const messages = [];

    this.#messages.forEach((e) => {
      const element = e.querySelector(".rawMessageData");
      const coords = element?.getAttribute("data-raw-coords");
      const hashcode = element?.getAttribute("data-raw-hashcode");

      if (parseInt(coords?.split(":")[2]) === 16) return; // Expedition fight
      if (hashcode === "") return; // If hashcode is empty, spy not come back

      messages.push(e);
    });

    return messages;
  }

  #parseFight() {
    this.#getFight().forEach((message) => {
      const combats = OGIData.combats;
      const combatsSums = OGIData.comatsSum;
      const msgId = message.getAttribute("data-msg-id");

      if (combats[msgId]) return;

      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const dates = [
        newDate.getDate().toString().padStart(2, "0"),
        (newDate.getMonth() + 1).toString().padStart(2, "0"),
        newDate.getFullYear().toString().slice(2),
      ];

      const datePoint = dates.join(".");

      if (!combatsSums[datePoint]) {
        combatsSums[datePoint] = {
          loot: [0, 0, 0],
          harvest: [0, 0],
          losses: {},
          fuel: 0,
          adjust: [0, 0, 0],
          topCombats: [],
          count: 0,
          wins: 0,
          draws: 0,
        };
      }

      const defendersSpaceObject = JSON.parse(
        message.querySelector(".rawMessageData")?.getAttribute("data-raw-defenderspaceobject")
      );

      const result = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-result"));
      const fleets = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-fleets"));
      let ennemy = null;

      fleets.forEach((side) => {
        if (side.player.id !== playerId) ennemy = side.player;
      });

      const accountIsDefender = defendersSpaceObject.owner.id === playerId;
      const accountIsWinner = result.winner === (accountIsDefender ? "defender" : "attacker");
      const isDraw = result.winner === "none";

      if (accountIsWinner) combatsSums[datePoint].wins += 1;
      if (isDraw) combatsSums[datePoint].draws += 1;

      const resources = result.loot.resources;
      const topCombat = {
        debris:
          parseInt(result.debris?.[0].total || 0) +
          parseInt(result.debris?.[1].total || 0) +
          parseInt(result.debris?.[2].total || 0),
        loot: (resources?.[0].amount + resources?.[1].amount + resources?.[2].amount) * (accountIsWinner ? 1 : -1),
        ennemi: ennemy?.name,
        losses: ennemy?.losses,
      };

      combatsSums[datePoint].topCombats.push(topCombat);

      combatsSums[datePoint].topCombats.sort((a, b) => b.debris + Math.abs(b.loot) - (a.debris + Math.abs(a.loot)));

      if (combatsSums[datePoint].topCombats.length > 3) {
        combatsSums[datePoint].topCombats.pop();
      }

      combatsSums[datePoint].loot[0] += resources?.[0].amount * (accountIsWinner ? 1 : -1);
      combatsSums[datePoint].loot[1] += resources?.[1].amount * (accountIsWinner ? 1 : -1);
      combatsSums[datePoint].loot[2] += resources?.[2].amount * (accountIsWinner ? 1 : -1);

      combats[msgId] = {
        timestamp: message.querySelector(".rawMessageData")?.getAttribute("data-raw-timestamp"),
        favorited: !!message.querySelector(".icon_favorited"),
        coordinates: {
          ...defendersSpaceObject.coordinates,
          planetType: defendersSpaceObject.type === "moon" ? PlanetType.moon : PlanetType.planet,
        },
        win: accountIsWinner,
        draw: isDraw,
        isProbes: false,
      };

      console.log(combats[msgId], datePoint, combatsSums[datePoint]);
    });
  }
}

export default FightMessagesAnalyzer;
