import OGIObserver from "../../util/observer.js";
import { getLogger } from "../../util/logger.js";
import SpyMessagesAnalyzer from "../../ctxcontent/services/analyzer/SpyMessagesAnalyzer.js";
import ExpeditionMessagesAnalyzer from "../../ctxcontent/services/analyzer/ExpeditionMessagesAnalyzer.js";
import FightMessagesAnalyzer from "../../ctxcontent/services/analyzer/FightMessagesAnalyzer.js";
import HarvestMessagesAnalyzer from "../../ctxcontent/services/analyzer/HarvestMessagesAnalyzer.js";

export const messagesTabs = Object.freeze({
  // Name: ID
  // Tab
  FLEETS: 2,
  FAVORITES: 6,
  // SubTab
  SPY: 20,
  BATTLE_REPORT: 21,
  EXPEDITION: 22,
  GROUP_SHIPPING: 23,
  COMMON: 24,
  TRASH: 25,
});

class Messages {
  #current_tab;
  #logger;
  #analyzers;

  constructor() {
    const obs = new OGIObserver();
    this.#logger = getLogger("messages");

    this.#analyzers = [new SpyMessagesAnalyzer(), new ExpeditionMessagesAnalyzer(), new FightMessagesAnalyzer(), new HarvestMessagesAnalyzer()];

    // Observe tab change
    obs(document.querySelector("#messagecontainercomponent"), (elements) => {
      elements.forEach((element) => {
        // We want only if nodes has been added
        if (element.addedNodes.length === 0) return;

        if (!element.target.classList.contains("messagesHolder")) return;

        this.#parseMessages();
      });
    });

    // if messages have been already loaded before observer start
    if (document.querySelector("#messagecontainercomponent #messagewrapper")) {
      this.#parseMessages();
    }
  }

  #checkTab(tabElement) {
    const tabId = parseInt(tabElement?.dataset.subtabId || 0);

    if (!tabId) return;

    if (!Object.values(messagesTabs).includes(tabId)) {
      this.#logger.error("Tab not recognize");

      return;
    }

    return tabElement;
  }

  #currentTab() {
    const currentTab = document.querySelector(
      "#messagecontainercomponent #messagewrapper .tabsWrapper .innerTabItem.active"
    );

    return this.#checkTab(currentTab);
  }

  #tabControls(tabElement) {
    const element = document.querySelector("#messagewrapper .messagesHolder");

    if (!element) {
      this.#logger.error("Control element not found");

      return;
    }

    return element;
  }

  #currentSubTab() {
    if (!this.#currentTab()) return;

    const elementControls = this.#tabControls(this.#currentTab());

    if (!elementControls) return;

    // If no sub tabs
    if (document.querySelectorAll("#messagewrapper .tabsWrapper > .innerTabItem")?.length <= 1) return elementControls;

    const current_sub_tab = elementControls.querySelector("#messagewrapper .tabsWrapper > .innerTabItem.active");

    return this.#checkTab(current_sub_tab);
  }

  #parseMessages() {
    if (!this.#currentTab()) return;

    const tab = this.#currentSubTab() || this.#currentTab();
    const elementContent = this.#tabControls(tab);

    if (!elementContent) return;

    this.#analyzers.forEach((analyzer) => {
      const tabId =
        parseInt(tab.dataset.subtabId) ||
        parseInt(this.#currentTab().dataset.subtabId) ||
        0;
      if (typeof analyzer.clean === "function") analyzer.clean(tabId !== this.#current_tab);
      if (!analyzer.support(tabId)) return;

      analyzer.analyze(() => elementContent.querySelectorAll("div.msg"), tabId);

      this.#current_tab = tabId;
    });
  }
}

export default Messages;
