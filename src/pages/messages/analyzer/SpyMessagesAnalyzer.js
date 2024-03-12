import { messagesTabs } from "../index.js";
import { getLogger } from "../../../util/logger.js";

class SpyMessagesAnalyzer {
  #logger;
  #messages;
  constructor() {
    this.#logger = getLogger("SpyMessagesAnalyer");
  }
  support(tabId) {
    return messagesTabs.SPY === tabId;
  }
  analyze(messagesElement) {
    // TODO: parse messages element
    this.#messages = [];

    messagesElement.forEach((message) => {
      console.log(message);
    });
  }
}

export default SpyMessagesAnalyzer;
