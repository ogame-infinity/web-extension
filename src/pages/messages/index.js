import OGIObserver from "../../util/observer.js";
import { getLogger } from "../../util/logger.js";
import SpyMessagesAnalyzer from "./analyzer/SpyMessagesAnalyzer.js";

export const messagesTabs = Object.freeze({
  // Name: ID
  // Tab
  FLEETS: 2,
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

    this.#analyzers = [new SpyMessagesAnalyzer()];

    // Observe tab change
    obs(document.querySelector(".tabs_wrap.js_tabs"), (elements) => {
      elements.forEach((element) => {
        // We want only if nodes has been added
        if (element.addedNodes.length === 0) return;

        if (!element.target.classList.contains("ui-tabs-panel")) return;

        this.#parseMessages();
      });
    });

    // if messages have been already loaded before observer start
    if (document.querySelector(".tabs_wrap.js_tabs .ui-tabs-panel")) {
      this.#parseMessages();
    }
  }

  checkTab(tabElement) {
    const tabId = parseInt(tabElement?.getAttribute("data-tabid") || 0);

    if (!tabId) return;

    if (!Object.values(messagesTabs).includes(tabId)) {
      this.#logger.error("Tab not recognize");

      return;
    }

    return tabElement;
  }

  #currentTab() {
    const currentTab = document.querySelector(".tabs_wrap.js_tabs > ul.ui-tabs-nav > .ui-tab[aria-selected=true]");

    return this.checkTab(currentTab);
  }

  #tabControls(tabElement) {
    const ariaControls = tabElement.getAttribute("aria-controls");
    const element = document.getElementById(ariaControls);

    if (!element) {
      this.#logger.error("Control element not found", { ariaControls });

      return;
    }

    return element;
  }

  #currentSubTab() {
    if (!this.#currentTab()) return;

    const elementControls = this.#tabControls(this.#currentTab());

    if (!elementControls) return;

    // If no sub tabs
    if (elementControls.querySelector(".ui-tab").length) return elementControls;

    const current_sub_tab = elementControls.querySelector(".ui-tab[aria-selected=true]");

    return this.checkTab(current_sub_tab);
  }

  #parseMessages() {
    if (!this.#currentTab()) return;

    const tab = this.#currentSubTab() || this.#currentTab()
    const elementContent = this.#tabControls(tab);

    if (!elementContent) return;

    const messages = elementContent.querySelectorAll("li.msg");

    if (!messages.length) return;

    this.#analyzers.forEach((analyzer) => {
      if (!analyzer.support(parseInt(tab.getAttribute("data-tabid")) || 0)) return;

      analyzer.analyze(messages);
    });
  }
}

export default Messages;
