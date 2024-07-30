import { getLogger } from "../../../util/logger.js";
import { messagesTabs } from "../../../ctxpage/messages/index.js";
import OGIData from "../../../util/OGIData.js";
import MessageType from "../../../util/enum/messageType.js";
import { toFormattedNumber } from "../../../util/numbers.js";
import { createDOM } from "../../../util/dom.js";
import * as standardUnit from "../../../util/standardUnit.js";

class TradeMessagesAnalyzer {
  #logger;
  #messages;

  constructor() {
    this.#logger = getLogger("TradeAnalyzer");
  }

  support(tabId) {
    return [messagesTabs.GROUP_SHIPPING].includes(tabId);
  }

  analyze(messageCallable, tabId) {
    this.#messages = messageCallable();

    this.#parseTradeMessages();
  }

  #getTradesMessages() {
    const messages = [];
    this.#messages.forEach((message) => {
      if (
        parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-messagetype")) !==
          MessageType.transport ||
        (parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-sourceplayerid")) === playerId &&
          parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-targetplayerid")) === playerId)
      )
        return;

      messages.push(message);
    });

    return messages;
  }

  #parseTradeMessages() {
    const addStandardUnit = (trade, message) => {
      const msgTitle = message.querySelector(".msgHeadItem .msgTitle");
      const standardUnitSum = standardUnit.standardUnit(trade.loot || [0, 0, 0]);
      const amountDisplay = `${toFormattedNumber(standardUnitSum, [0, 1], true)} ${standardUnit.unitType()}`;

      msgTitle.appendChild(
        createDOM("span", { class: `ogk-label ${standardUnitSum < 0 ? "ogi-negative" : ""}` }, amountDisplay)
      );
    };

    this.#getTradesMessages().forEach((message) => {
      const trades = { ...OGIData.trades };
      const msgId = message.getAttribute("data-msg-id");

      if (trades[msgId]) {
        addStandardUnit(trades[msgId], message);
        return;
      }

      const isIncomingRessources =
        parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-sourceplayerid")) !== playerId;
      const cargo = JSON.parse(message.querySelector(".rawMessageData").getAttribute("data-raw-cargo"));
      const newDate = new Date(message.querySelector(".rawMessageData").getAttribute("data-raw-date"));
      const datePoint = `${newDate.getDate().toString().padStart(2, "0")}.${(newDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${newDate.getFullYear().toString().slice(2)}`;

      const tradesSums = { ...OGIData.tradesSums };

      if (!tradesSums[datePoint]) {
        tradesSums[datePoint] = {
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

      /*OGIData.tradesSums = tradesSums;*/

      trades[msgId] = {
        date: newDate,
        loot: [
          cargo.metal * (isIncomingRessources ? 1 : -1),
          cargo.crystal * (isIncomingRessources ? 1 : -1),
          cargo.deuterium * (isIncomingRessources ? 1 : -1),
        ],
        sourceplayerid: parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-sourceplayerid")),
        targetplayerid: parseInt(message.querySelector(".rawMessageData")?.getAttribute("data-raw-targetplayerid")),
      };

      addStandardUnit(trades[msgId], message);

      /*OGIData.trades = trades;*/
    });
  }
}

export default TradeMessagesAnalyzer;
