import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import PlanetType from "../../../util/enum/planetType.js";
import ship from "../../../util/enum/ship.js";
import * as standardUnit from "../../../util/standardUnit.js";
import { createDOM } from "../../../util/dom.js";
import { fleetCost } from "../../../util/fleetCost.js";
import { toFormattedNumber } from "../../../util/numbers.js";

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

  #addStandardUnit = (combat, message) => {
    if (combat.isProbes || !combat.loot) return;

    const msgTitle = message.querySelector(".msgHeadItem .msgTitle");
    const standardUnitSum =
      standardUnit.standardUnit(combat.loot || [0, 0, 0]) - standardUnit.standardUnit(fleetCost(combat.losses || []));
    const amountDisplay = `${toFormattedNumber(standardUnitSum, [0, 1], true)} ${standardUnit.unitType()}`;

    msgTitle.appendChild(
      createDOM("span", { class: `ogk-label ${standardUnitSum < 0 ? "ogk-negative" : ""}` }, amountDisplay)
    );
  };

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

      if (combats[msgId]) {
        message.classList.add("ogk-expedition");
        this.#addStandardUnit(combats[msgId], message);
        return;
      }

      const defendersSpaceObject = JSON.parse(
        message.querySelector(".rawMessageData")?.getAttribute("data-raw-defenderspaceobject")
      );

      const result = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-result"));

      /*if (result?.totalValueOfUnitsLost[0]?.value === 0) {
        return;
      }*/

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
          harvest: [0, 0, 0],
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
      const losses = {};

      fleets.forEach((fleet) => {
        if (fleet.destroyedTotal === 0) return;

        if (!expeditionSums[datePoint].losses[fleet.technologyId]) {
          expeditionSums[datePoint].losses[fleet.technologyId] = 0;
        }

        expeditionSums[datePoint].losses[fleet.technologyId] += fleet.destroyedTotal;
        losses[fleet.technologyId] = fleet.destroyedTotal;
      });

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
        loot: [0, 0, 0],
        losses,
      };

      message.classList.add("ogk-expedition");

      OGIData.combats = combats;
      OGIData.expeditionSums = expeditionSums;

      this.#addStandardUnit(combats[msgId], message);
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
      const combatsSums = OGIData.combatsSums;
      const msgId = message.getAttribute("data-msg-id");

      if (combats[msgId]) {
        if (combats[msgId].isProbes) {
          message.classList.add("ogk-combat-probes");
        } else if (combats[msgId].draw) {
          message.classList.add("ogk-combat-draw");
        } else if (combats[msgId].win) {
          message.classList.add("ogk-combat-win");
        } else {
          message.classList.add("ogk-combat");
        }

        this.#addStandardUnit(combats[msgId], message);
        return;
      }

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
          harvest: [0, 0, 0],
          losses: {},
          fuel: 0,
          adjust: [0, 0, 0],
          topCombats: [],
          count: 0,
          wins: 0,
          draws: 0,
        };
      }
      combatsSums[datePoint].count += 1;

      const defendersSpaceObject = JSON.parse(
        message.querySelector(".rawMessageData")?.getAttribute("data-raw-defenderspaceobject")
      );

      const result = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-result"));
      const fleets = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-fleets"));
      const probesAccount = { defender: 0, attacker: 0 };
      const fleetPerSide = { defender: [], attacker: [] };
      let accountIsDefender = false;
      let ennemy = null;

      fleets.forEach((fleet) => {
        if (!fleetPerSide[fleet.side][fleet.player.id]) fleetPerSide[fleet.side][fleet.player.id] = [];

        fleetPerSide[fleet.side][fleet.player.id].push({
          fleetId: fleet.fleetId,
          playerId: fleet.player.id,
          player: fleet.player,
        });

        if (fleet.player.id === playerId && fleet.side === "defender") accountIsDefender = true;

        fleet.combatTechnologies.forEach((shipInFleet) => {
          if (shipInFleet.technologyId == ship.EspionageProbe && probesAccount[fleet.side] >= 0)
            probesAccount[fleet.side] += shipInFleet.amount;
          else probesAccount[fleet.side] = -1;
        });
      });

      /* @todo this is wrong if multiple attacker / defender */
      if (accountIsDefender) {
        Object.values(fleetPerSide.attacker).forEach((players) => {
          players.forEach((fleet) => {
            ennemy = fleet.player;
          });
        });
      } else {
        Object.values(fleetPerSide.defender).forEach((players) => {
          players.forEach((fleet) => {
            ennemy = fleet.player;
          });
        });
      }

      const accountIsWinner = result.winner === (accountIsDefender ? "defender" : "attacker");
      const isDraw = result.winner === "none";
      const isProbes =
        (2e3 > probesAccount.defender && probesAccount.defender > 0) ||
        (2e3 > probesAccount.attacker && probesAccount.attacker > 0);

      if (accountIsWinner) combatsSums[datePoint].wins += 1;
      if (isDraw) combatsSums[datePoint].draws += 1;

      const resources = result.loot.resources;

      result.totalValueOfUnitsLost.forEach((side) => {
        if (accountIsDefender && side.side === "attacker") ennemy.losses = side.value;
        if (!accountIsDefender && side.side === "defender") ennemy.losses = side.value;
      });

      const topCombat = {
        debris:
          parseInt(result.debris.resources?.[0]?.total || 0) +
          parseInt(result.debris.resources?.[1]?.total || 0) +
          parseInt(result.debris.resources?.[2]?.total || 0),
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

      const rounds = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-combatrounds"));
      const lastRound = rounds.pop();
      const losses = [];

      lastRound?.fleets.forEach((side) => {
        if (
          fleetPerSide.attacker[playerId]?.some((fleet) => fleet.fleetId === side.fleetId) ||
          fleetPerSide.defender[playerId]?.some((fleet) => fleet.fleetId === side.fleetId)
        )
          side.technologies.forEach((ship) => {
            if (ship.destroyedTotal === 0) return;

            if (!combatsSums[datePoint].losses[ship.technologyId]) combatsSums[datePoint].losses[ship.technologyId] = 0;

            combatsSums[datePoint].losses[ship.technologyId] += ship.destroyedTotal;

            losses[ship.technologyId] = (losses[ship.technologyId] || 0) + ship.destroyedTotal;
          });
      });

      combats[msgId] = {
        timestamp: message.querySelector(".rawMessageData")?.getAttribute("data-raw-timestamp"),
        favorited: !!message.querySelector(".icon_favorited"),
        coordinates: {
          ...defendersSpaceObject.coordinates,
          planetType: defendersSpaceObject.type === "moon" ? PlanetType.moon : PlanetType.planet,
        },
        win: accountIsWinner,
        draw: isDraw,
        isProbes: isProbes,
        loot: [
          resources?.[0].amount * (accountIsWinner ? 1 : -1),
          resources?.[1].amount * (accountIsWinner ? 1 : -1),
          resources?.[2].amount * (accountIsWinner ? 1 : -1),
        ],
        losses,
      };

      if (combats[msgId].isProbes) {
        message.classList.add("ogk-combat-probes");
      } else if (combats[msgId].draw) {
        message.classList.add("ogk-combat-draw");
      } else if (combats[msgId].win) {
        message.classList.add("ogk-combat-win");
      } else {
        message.classList.add("ogk-combat");
      }

      this.#addStandardUnit(combats[msgId], message);

      OGIData.combats = combats;
      OGIData.combatsSums = combatsSums;
    });
  }
}

export default FightMessagesAnalyzer;
