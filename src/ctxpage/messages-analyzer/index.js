import { createDOM } from "../../util/dom.js";
import { getLogger } from "../../util/logger.js";
import { fromFormattedNumber } from "../../util/numbers.js";

const logger = getLogger("message-analyzer");

/**
 * @global
 * @typedef {function} getFormatedDate
 * @param {number} timestamp
 * @param {string} format
 * @return {string}
 */

/**
 * @this {OGInfinity}
 */
function analyzer() {
  if (this.page !== "messages") return;

  let normalized = ["Metal", "Crystal", "Deuterium", "AM"];
  let ressources = this.json.resNames;
  let cyclosName = "";
  const updateTimeZone = () => {
    this.json.options.timeZone &&
      document.querySelectorAll("#content div li.msg").forEach((msg) => {
        const msgDate = msg.querySelector(".msg_date");
        if (!msgDate || msgDate.classList.contains("ogl-ready")) return;

        const serveTimestamp = this.dateStrToDate(msgDate.textContent).getTime();
        const localDateTime = getFormatedDate(serveTimestamp + this.json.timezoneDiff * 1e3, "[d].[m].[Y] [H]:[i]:[s]");

        msgDate.setAttribute("data-server-date", `${serveTimestamp}`);
        msgDate.textContent = localDateTime;
        msgDate.classList.add("ogl-ready");
      });
  };

  /**
   * @typedef {Object} SubAnalizer
   * @property {()=>void} main
   * @property {MutationCallback} change
   */
  /**
   * @typedef {(self: OGInfinity) => SubAnalizer} SubAnalizerBuilder
   */

  class MessageSubTabTrigger {
    /** @type {string} */
    name;

    /** @type {string} */
    #tabQuerySelector;

    /** @type {function(): void} */
    trigger = () => undefined;

    /**
     *
     * @param {string} name
     * @param {string} subTabQuerySelector
     * @param {VoidFunction} trigger
     */
    constructor(name, subTabQuerySelector, trigger = undefined) {
      this.name = name;
      this.trigger = undefined === trigger ? () => undefined : trigger;
      this.#tabQuerySelector = subTabQuerySelector;

      Object.seal(this);
      Object.freeze(this);
    }

    /** @type {Element | undefined} */
    get tab() {
      return document.querySelector(this.#tabQuerySelector);
    }
  }

  class MessageTabTrigger {
    /** @type {string} */
    name;
    /** @type {SubAnalizer}*/
    analizer;
    /** @type {Element}*/
    tab;
    /** @type {Element}*/
    container;

    /**
     * @param {string} name
     * @param {string} tabQuerySelector
     * @param {SubAnalizer} analizer
     */
    constructor(name, tabQuerySelector, analizer = undefined) {
      this.name = name;
      this.analizer = analizer;
      this.tab = document.querySelector(tabQuerySelector);

      if (!this.tab) {
        throw new Error(`Message tab ${tabQuerySelector} not found`);
      }

      const ariaControls = this.tab.getAttribute("aria-controls");
      this.container = document.getElementById(ariaControls);
      if (!this.container) {
        throw new Error(`Message container ${ariaControls} not found`);
      }

      Object.seal(this);
      Object.freeze(this);
    }

    get isTabActive() {
      return this.tab.classList.contains("ui-state-active");
    }

    getActiveSubContainer() {
      let subContainer = this.container.querySelector("div[role=tabpanel][aria-hidden=false]");

      if (subContainer === null && this.container.hasAttribute("role") && this.container.role === "tabpanel") {
        /// This active container no has subtabs, is only one option.
        subContainer = this.container;
      }

      return subContainer;
    }
  }

  /** @type SubAnalizerBuilder */
  const subFleetAnalizerBuilder = (self) => {
    /** @type {MessageSubTabTrigger} */
    let _currentSubTabTrigger = undefined;

    /**
     * @param {MessageSubTabTrigger} subTabTrigger
     */
    const fleetAnalize = (subTabTrigger) => {
      logger.debug("action:%o, [%s]", `messages.fleets.${subTabTrigger.name}`, typeof subTabTrigger.trigger);

      ressources = this.json.resNames;
      if (!this.combats) this.combats = {};
      if (!this.expeditionsIds) this.expeditionsIds = {};
      cyclosName = "";
      for (let i in this.json.shipNames) {
        if (this.json.shipNames[i] == 209) cyclosName = i;
      }

      if (subTabTrigger.trigger) subTabTrigger.trigger();
    };

    const SUBFLEET_EXPEDITIONS_NAME = "expeditions";
    const SUBFLEET_EXPEDITIONS_ID = "#subtabs-nfFleet22";
    /** @type {MessageSubTabTrigger} */
    const subFleet22_Expeditions = (() => {
      const view = (msg, isNew = false) => {
        const id = msg.getAttribute("data-msg-id");
        if (!(this.json.expeditions && this.json.expeditions[id])) return;

        const expeditionData = this.json.expeditions[id];

        if (expeditionData.result === "Unknown") {
          msg.querySelector(".ogl-unknown-warning") ||
            msg
              .querySelector(".msg_actions")
              .appendChild(
                this.createDOM(
                  "div",
                  { class: "ogl-unknown-warning" },
                  `${this.getTranslatedText(112)}` +
                    `<a href="${DISCORD_INVITATION_URL}"> ${this.getTranslatedText(113)}</a>`
                )
              );
        } else if (expeditionData.busy) {
          msg.querySelector(".ogl-warning") ||
            msg.querySelector(".msg_actions").appendChild(
              createDOM("a", {
                class: "ogl-warning tooltipRight ogl-tooltipReady ogl-tooltipInit",
                "data-title": this.getTranslatedText(114),
              })
            );
        }

        const msgExpeditionClass = `ogk-${expeditionData.result.toLowerCase()}`;
        const labels = {
          "ogk-metal": this.getTranslatedText(0, "res", false),
          "ogk-crystal": this.getTranslatedText(1, "res", false),
          "ogk-deuterium": this.getTranslatedText(2, "res", false),
          "ogk-am": this.getTranslatedText(3, "res", false),
          "ogk-fleet": this.getTranslatedText(63, "text", false),
          "ogk-object": this.getTranslatedText(78, "text", false),
          "ogk-aliens": this.getTranslatedText(79, "text", false),
          "ogk-pirates": this.getTranslatedText(80, "text", false),
          "ogk-late": this.getTranslatedText(81, "text", false),
          "ogk-early": this.getTranslatedText(82, "text", false),
          "ogk-bhole": this.getTranslatedText(71, "text", false),
          "ogk-merchant": this.getTranslatedText(84, "text", false),
          "ogk-void": this.getTranslatedText(83, "text", false),
        };
        const msgTitle = msg.querySelector(".msg_head .msg_title");
        msgTitle.append(
          " ",
          createDOM("span", { class: `ogk-label ${msgExpeditionClass}` }, labels[msgExpeditionClass])
        );
        msg.classList.add(msgExpeditionClass);
      };

      const callback = () => {
        let id = document.querySelector("li[id=subtabs-nfFleet22].ui-state-active").getAttribute("aria-controls");
        document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
          let id = msg.getAttribute("data-msg-id");
          let content = msg.querySelector("span.msg_content");
          let date = msg.querySelector(".msg_date").textContent;
          let textContent = content.innerText;
          let coords = msg.querySelector(".msg_title a");
          if (coords) {
            coords = coords.textContent.slice(1, -1);
            if (coords.split(":")[2] == 16) {
              if (id in this.json.expeditions && this.json.expeditions[id].result) {
                if (msg.querySelector(".icon_favorited")) {
                  this.json.expeditions[id].favorited = true;
                  this.json.expeditions[id].date = new Date();
                } else {
                  this.json.expeditions[id].favorited = false;
                }

                view(msg, true);
                return;
              } else if (id in this.expeditionsIds) {
                return;
              }
              this.expeditionsIds[id] = true;
              let content = msg.querySelector("span.msg_content");
              let date = msg.querySelector(".msg_date").textContent;
              let textContent = content.innerText;
              dataHelper.getExpeditionType(textContent).then((type) => {
                date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
                let sums = this.json.expeditionSums[date];
                if (!sums) {
                  sums = {
                    found: [0, 0, 0, 0],
                    harvest: [0, 0],
                    losses: {},
                    fleet: {},
                    type: {},
                    adjust: [0, 0, 0],
                    fuel: 0,
                  };
                }
                let objectNode = content.querySelector("a");
                if (objectNode) {
                  this.json.result = "Object";
                  this.json["object"] = objectNode.textContent;
                  type = "Object";
                }
                ressources.forEach((res, i) => {
                  if (textContent.includes(res)) {
                    let regex = new RegExp("[0-9]{1,3}(.[0-9]{1,3})*", "gm");
                    let found = textContent.match(regex);
                    if (found) {
                      type = normalized[i];
                      sums.found[i] += fromFormatedNumber(found[0], true);
                    }
                  }
                });
                let fleetMatches = textContent.match(/.*: [1-9].*/gm);
                fleetMatches &&
                  !normalized.includes(type) &&
                  fleetMatches.forEach((result) => {
                    let split = result.split(": ");
                    type = "Fleet";
                    let id = this.json.shipNames[split[0]];
                    let count = Number(split[1]);
                    sums.fleet[id] ? (sums.fleet[id] += count) : (sums.fleet[id] = count);
                  });
                if (type != "Unknown") {
                  sums.type[type] ? (sums.type[type] += 1) : (sums.type[type] = 1);
                }
                this.json.expeditionSums[date] = sums;
                this.json.expeditions[id] = {
                  result: type,
                  date: new Date(this.dateStrToDate(date)),
                  favorited: msg.querySelector(".icon_favorited") ? true : false,
                };

                view(msg, false);

                this.saveData();
              });
            }
            // For Discovers
            else {
              if (!this.json.discoveries[id]) {
                date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
                let lfFound = ["lifeform1", "lifeform2", "lifeform3", "lifeform4"];
                let sums = this.json.discoveriesSums[date];
                if (!sums) {
                  sums = {
                    found: [0, 0, 0, 0],
                    artefacts: 0,
                    type: {},
                  };
                }
                let type = "void";

                lfFound.forEach((raceType, i) => {
                  let str = "." + raceType;
                  let objectNode = content.querySelector(str);
                  if (objectNode) {
                    type = raceType;
                    let found = content.innerHTML.match(/[0-9]{4,}/gm);
                    console.log(`type: ${raceType}: ${found}`);
                    if (found) {
                      let count = Number(found[0]);
                      sums.found[i] ? (sums.found[i] += count) : (sums.found[i] = count);
                    }
                  }
                });

                let artefactMatches = textContent.match(/.*: [0-9].*/gm);
                artefactMatches &&
                  artefactMatches.forEach((result) => {
                    let split = result.split(": ");
                    type = "artefacts";
                    let count = Number(split[1]);
                    sums.artefacts ? (sums.artefacts += count) : (sums.artefacts = count);
                  });
                if (type != "Unknown") {
                  sums.type[type] ? (sums.type[type] += 1) : (sums.type[type] = 1);
                }
                this.json.discoveriesSums[date] = sums;
                this.json.discoveries[id] = {
                  result: type,
                  date: new Date(this.dateStrToDate(date)),
                  favorited: msg.querySelector(".icon_favorited") ? true : false,
                };
                msg.classList.add("ogk-" + this.json.discoveries[id].result.toLowerCase());
                this.saveData();
              } else {
                msg.classList.add("ogk-" + this.json.discoveries[id].result.toLowerCase());
              }
            }
          }
        });
      };

      return new MessageSubTabTrigger(SUBFLEET_EXPEDITIONS_NAME, SUBFLEET_EXPEDITIONS_ID, callback);
    })();

    const SUBFLEET_COMBAT_NAME = "combatReports";
    const SUBFLEET_COMBAT_ID = "#subtabs-nfFleet21";
    /** @type {MessageSubTabTrigger} */
    const subFleet21_CombatReports = (() => {
      const callback = () => {
        let id = document.querySelector("li[id=subtabs-nfFleet21].ui-state-active").getAttribute("aria-controls");
        document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg, ix) => {
          setTimeout(() => {
            let id = msg.getAttribute("data-msg-id");
            let isCR = msg.querySelector(".msg_actions .icon_nf_link");
            if (!isCR) {
              msg.classList.add("ogk-combat-contact");
            }
            if (id in this.json.combats) {
              if (msg.querySelector(".icon_favorited")) {
                this.json.combats[id].favorited = true;
                this.json.combats[id].date = new Date();
              } else {
                this.json.combats[id].favorited = false;
              }
              if (this.json.combats[id].coordinates.position == 16) {
                msg.classList.add("ogk-expedition");
              } else if (this.json.combats[id].isProbes) {
                msg.classList.add("ogk-combat-probes");
              } else if (this.json.combats[id].draw) {
                msg.classList.add("ogk-combat-draw");
              } else if (this.json.combats[id].win) {
                msg.classList.add("ogk-combat-win");
              } else {
                msg.classList.add("ogk-combat");
              }
            } else if (id in this.combats) {
              return;
            } else {
              this.combats[id] = true;
              this.fetchAndConvertRC(id).then((cr) => {
                if (cr === null) return;
                let date = getFormatedDate(cr.timestamp, "[d].[m].[y]");
                if (cr.coordinates.position == 16) {
                  if (!this.json.expeditionSums[date]) {
                    this.json.expeditionSums[date] = {
                      found: [0, 0, 0, 0],
                      harvest: [0, 0],
                      fleet: {},
                      losses: {},
                      type: {},
                      fuel: 0,
                      adjust: [0, 0, 0],
                    };
                  }
                  for (let [key, value] of Object.entries(cr.losses)) {
                    if (this.json.expeditionSums[date].losses[key]) {
                      this.json.expeditionSums[date].losses[key] += value;
                    } else {
                      this.json.expeditionSums[date].losses[key] = value;
                    }
                  }
                } else {
                  if (!this.json.combatsSums[date]) {
                    this.json.combatsSums[date] = {
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
                  if (!cr.isProbes) {
                    if (cr.win) this.json.combatsSums[date].wins += 1;
                    if (cr.draw) this.json.combatsSums[date].draws += 1;
                    this.json.combatsSums[date].count += 1;
                    this.json.combatsSums[date].topCombats.push({
                      debris: cr.debris.metalTotal + cr.debris.crystalTotal,
                      loot: (cr.loot.metal + cr.loot.crystal + cr.loot.deuterium) * (cr.win ? 1 : -1),
                      ennemi: cr.ennemi.name,
                      losses: cr.ennemi.losses,
                    });
                    this.json.combatsSums[date].topCombats.sort(
                      (a, b) => b.debris + Math.abs(b.loot) - (a.debris + Math.abs(a.loot))
                    );
                    if (this.json.combatsSums[date].topCombats.length > 3) {
                      this.json.combatsSums[date].topCombats.pop();
                    }
                  }
                  if (cr.win) {
                    this.json.combatsSums[date].loot[0] += cr.loot.metal;
                    this.json.combatsSums[date].loot[1] += cr.loot.crystal;
                    this.json.combatsSums[date].loot[2] += cr.loot.deuterium;
                  } else {
                    this.json.combatsSums[date].loot[0] -= cr.loot.metal;
                    this.json.combatsSums[date].loot[1] -= cr.loot.crystal;
                    this.json.combatsSums[date].loot[2] -= cr.loot.deuterium;
                  }
                  for (let [key, value] of Object.entries(cr.losses)) {
                    if (this.json.combatsSums[date].losses[key]) {
                      this.json.combatsSums[date].losses[key] += value;
                    } else {
                      this.json.combatsSums[date].losses[key] = value;
                    }
                  }
                }
                if (cr.coordinates.position == 16) {
                  msg.classList.add("ogk-expedition");
                } else if (cr.isProbes) {
                  msg.classList.add("ogk-combat-probes");
                } else if (cr.draw) {
                  msg.classList.add("ogk-combat-draw");
                } else if (cr.win) {
                  msg.classList.add("ogk-combat-win");
                } else {
                  msg.classList.add("ogk-combat");
                }
                this.json.combats[id] = {
                  timestamp: cr.timestamp,
                  favorited: msg.querySelector(".icon_favorited") ? true : false,
                  coordinates: cr.coordinates,
                  win: cr.win,
                  draw: cr.draw,
                  isProbes: cr.isProbes,
                };
                this.saveData();
              });
            }
          }, ix * 50);
        });
      };

      return new MessageSubTabTrigger(SUBFLEET_COMBAT_NAME, SUBFLEET_COMBAT_ID, callback);
    })();

    const SUBFLEET_OTHERS_NAME = "others";
    const SUBFLEET_OTHERS_ID = "#subtabs-nfFleet24";
    /** @type {MessageSubTabTrigger} */
    const subFleet24_Others = (() => {
      const callback = () => {
        let id = document.querySelector("li[id=subtabs-nfFleet24].ui-state-active").getAttribute("aria-controls");
        document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
          let id = msg.getAttribute("data-msg-id");
          if (id in this.json.harvests) {
            if (this.json.harvests[id].coords.split(":")[2] == 16) {
              msg.classList.add("ogk-expedition");
            } else {
              if (this.json.harvests[id].combat) {
                msg.classList.add("ogk-combat");
              } else {
                msg.classList.add("ogk-harvest");
              }
            }
            return;
          }
          let date = msg.querySelector(".msg_date").textContent;
          date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
          let coords = msg.querySelector(".msg_title a");
          if (coords) {
            let content = msg.querySelector(".msg_content").innerText;
            coords = coords.textContent.slice(1, -1);
            let matches = content.match(/[0-9.,]*[0-9]/gm);
            let met = fromFormattedNumber(matches[matches.length - 3]);
            let cri = fromFormattedNumber(matches[matches.length - 2]);
            /* @TODO let deu = fromFormattedNumber(matches[matches.length - 1]); */
            let combat = false;
            if (coords.split(":")[2] == 16) {
              msg.classList.add("ogk-expedition");
            } else {
              if (content.includes(cyclosName)) {
                msg.classList.add("ogk-harvest");
              } else {
                msg.classList.add("ogk-harvest-combat");
                combat = true;
              }
            }
            if (coords.split(":")[2] == 16) {
              if (!this.json.expeditionSums[date]) {
                this.json.expeditionSums[date] = {
                  found: [0, 0, 0, 0],
                  harvest: [0, 0],
                  fleet: {},
                  losses: {},
                  type: {},
                  fuel: 0,
                  adjust: [0, 0, 0],
                };
              }
              this.json.expeditionSums[date].harvest[0] += met;
              this.json.expeditionSums[date].harvest[1] += cri;
            } else {
              if (!this.json.combatsSums[date]) {
                this.json.combatsSums[date] = {
                  loot: [0, 0, 0],
                  losses: {},
                  harvest: [0, 0],
                  adjust: [0, 0, 0],
                  fuel: 0,
                  topCombats: [],
                  count: 0,
                  wins: 0,
                  draws: 0,
                };
              }
              this.json.combatsSums[date].harvest[0] += met;
              this.json.combatsSums[date].harvest[1] += cri;
            }
            this.json.harvests[id] = {
              date: new Date(this.dateStrToDate(date)),
              metal: met,
              crystal: cri,
              coords: coords,
              combat: combat,
            };
            this.saveData();
          }
        });
      };

      return new MessageSubTabTrigger(SUBFLEET_OTHERS_NAME, SUBFLEET_OTHERS_ID, callback);
    })();

    /** @type {MessageSubTabTrigger[]} */
    const tabsNavigation = [subFleet22_Expeditions, subFleet21_CombatReports, subFleet24_Others];
    Object.seal(tabsNavigation);
    Object.freeze(tabsNavigation);

    /** @return {MessageSubTabTrigger|undefinded} */
    function getActiveSubTabTrigger() {
      return tabsNavigation.filter((e) => e.tab.classList.contains("ui-state-active")).shift();
    }

    function main() {
      let activeSubTabTrigger = getActiveSubTabTrigger();
      _currentSubTabTrigger = activeSubTabTrigger;
      if (!activeSubTabTrigger) return undefined;

      logger.debug("action:messages.fleets, sub:%o", activeSubTabTrigger.name);
      fleetAnalize(activeSubTabTrigger);
    }

    function change(mutation, observer) {
      if (!_currentSubTabTrigger) return;

      logger.debug("action:%o, [mutation]", `messages.fleets.${_currentSubTabTrigger.name}`);
      fleetAnalize(_currentSubTabTrigger);
    }

    return { main, change: change };
  };

  /** @type {MessageTabTrigger[]} */
  const MainTabs = [
    new MessageTabTrigger("fleets", "#tabs-nfFleets", subFleetAnalizerBuilder(this)),
    new MessageTabTrigger("communications", "#tabs-nfCommunication", undefined),
    new MessageTabTrigger("economy", "#tabs-nfEconomy", undefined),
    new MessageTabTrigger("universe", "#tabs-nfUniverse", undefined),
    new MessageTabTrigger("system", "#tabs-nfSystem", undefined),
    new MessageTabTrigger("favorites", "#tabs-nfFavorites", undefined),
  ];

  class MainMessagesMutations {
    /** @type {MessageTabTrigger} */
    #currentTabTrigger;
    /** @type {()=>boolean} */
    #predicate;
    /** @type {MutationObserver?} */
    #subTabObserver;
    /** @type {MutationObserver} */
    #tabObserver;

    /**
     * @param {()=>boolean} runPredicate - Indicates if the mutation can be carried out.
     */
    constructor(runPredicate) {
      this.#currentTabTrigger = undefined;
      this.#subTabObserver = undefined;
      this.#predicate = runPredicate;

      this.#tabObserver = new MutationObserver((mutations, observer) => {
        this.#disconectSubTab();
        if (!this.#predicate()) return;

        updateTimeZone();

        this.#currentTabTrigger = this.getActiveTab();
        if (!this.#currentTabTrigger) return;

        this.#connectSubTab();
        logger.debug("action:%o, sub:%o", "messages", this.#currentTabTrigger.name);
        if (this.#currentTabTrigger.analizer) {
          setTimeout(this.#currentTabTrigger.analizer.main, 1);
        }
      });
    }

    #connectSubTab() {
      this.#subTabObserver = new MutationObserver((mutations, observer) => {
        updateTimeZone();

        if (this.#currentTabTrigger && this.#currentTabTrigger.analizer) {
          setTimeout(this.#currentTabTrigger.analizer.change(mutations, observer), 1);
        }
      });

      this.#subTabObserver.observe(this.#currentTabTrigger.getActiveSubContainer(), { childList: true });
    }

    #disconectSubTab() {
      if (!this.#subTabObserver) return;
      this.#subTabObserver.disconnect();
      this.#subTabObserver = undefined;
    }

    observe(target, options = undefined) {
      this.#tabObserver.observe(target, options);
    }

    /** @return {MessageTabTrigger | undefined} */
    getActiveTab() {
      return MainTabs.filter((v) => v.isTabActive).shift();
    }
  }

  const loadShadow = document.querySelector(".ajax_load_shadow");
  const mainMutations = new MainMessagesMutations(() => window.getComputedStyle(loadShadow).display === "none");
  mainMutations.observe(loadShadow, { attributes: true });
}

export default analyzer;
