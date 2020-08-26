let keyPrefix = "ogkush-";

var dataHelper = (function () {
  var requestId = 0;

  function expedition(message) {
    let rid = requestId++;
    return new Promise(function (resolve, reject) {
      var listener = function (evt) {
        if (evt.detail.requestId == rid) {
          // Deregister self
          window.removeEventListener("ogi-expedition-rep", listener);
          resolve(evt.detail.type);
        }
      };
      window.addEventListener("ogi-expedition-rep", listener);
      var payload = { requestId: rid, message: message };
      window.dispatchEvent(
        new CustomEvent("ogi-expedition", { detail: payload })
      );
    });
  }

  function Get(id) {
    let rid = requestId++;
    return new Promise(function (resolve, reject) {
      var listener = function (evt) {
        if (evt.detail.requestId == rid) {
          // if (!evt.detail.player.name) {
          // alert("NAME MISSING");
          // console.log(evt.detail.player);
          // }
          // Deregister self
          window.removeEventListener("ogi-players-rep", listener);
          resolve(evt.detail.player);
        }
      };

      window.addEventListener("ogi-players-rep", listener);

      var payload = { requestId: rid, id: id };

      window.dispatchEvent(new CustomEvent("ogi-players", { detail: payload }));
    });
  }

  function filter(name, alliance) {
    let rid = requestId++;
    return new Promise(function (resolve, reject) {
      var listener = function (evt) {
        if (evt.detail.requestId == rid) {
          // Deregister self
          window.removeEventListener("ogi-filter-rep", listener);
          resolve(evt.detail.players);
        }
      };

      window.addEventListener("ogi-filter-rep", listener);

      var payload = { requestId: rid, name: name, alliance: alliance };

      window.dispatchEvent(new CustomEvent("ogi-filter", { detail: payload }));
    });
  }

  return {
    getExpeditionType: expedition,
    getPlayer: Get,
    filter: filter,
  };
})();

let dotted = (value) => {
  return parseInt(value).toLocaleString("de-DE");
};

let redirect = localStorage.getItem("ogl-redirect");
if (redirect && redirect.indexOf("https") > -1) {
  localStorage.setItem("ogl-redirect", false);
  window.location.href = redirect;
}

// goodbye tooltips
(function goodbyeTipped() {
  if (typeof Tipped !== "undefined") {
    Tipped = {
      create: function () {
        return false;
      },
      read: function () {
        return false;
      },
      hide: function () {
        return false;
      },
      remove: function () {
        return false;
      },
      show: function (t) {
        return false;
      },
      hideAll: function () {
        return false;
      },
      visible: function () {
        return false;
      },
      refresh: function () {
        return false;
      },
    };
  } else requestAnimationFrame(() => goodbyeTipped());
})();

// Not ideal but easy to use
Element.prototype.empty = function (e) {
  while (this.firstChild) this.removeChild(this.firstChild);
};

// Used to avoid the innerHTML issue
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Safely_inserting_external_content_into_a_page
Element.prototype.html = function (html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, `text/html`);
  const tags = parsed.getElementsByTagName(`body`);
  this.innerHTML = ``;
  let nodes = tags[0].childNodes;
  for (let i = 0; i < nodes.length; i++) {
    this.appendChild(nodes[i].cloneNode(true));
  }
};

let SHIP_COSTS = {
  202: [2, 2, 0],
  203: [6, 6, 0],
  204: [3, 1, 0],
  205: [6, 4, 0],
  206: [20, 7, 2],
  207: [45, 15, 0],
  208: [10, 20, 10],
  209: [10, 6, 2],
  210: [0, 1, 0],
  211: [50, 25, 15],
  212: [0, 2, 0.5],
  213: [60, 50, 15],
  214: [5000, 4000, 1000],
  215: [30, 40, 15],
  218: [85, 55, 20],
  219: [8, 15, 8],
};

let PLAYER_CLASS_EXPLORER = 3;
let PLAYER_CLASS_WARRIOR = 2;
let PLAYER_CLASS_MINER = 1;
let PLAYER_CLASS_NONE = 0;

class OGInfinity {
  constructor() {
    this.commander = player.hasCommander;
    this.rawURL = new URL(window.location.href);
    this.page =
      this.rawURL.searchParams.get("component") ||
      this.rawURL.searchParams.get("page");
    if (document.querySelector("#characterclass .explorer")) {
      this.playerClass = PLAYER_CLASS_EXPLORER;
    } else if (document.querySelector("#characterclass .warrior")) {
      this.playerClass = PLAYER_CLASS_WARRIOR;
    } else if (document.querySelector("#characterclass .miner")) {
      this.playerClass = PLAYER_CLASS_MINER;
    } else {
      this.playerClass = PLAYER_CLASS_NONE;
    }

    this.mode = this.rawURL.searchParams.get("oglMode") || 0; // 0=default; 1=transpo; 2=lock; 3=autoHarvest; 4=raid;
    this.planetList = document.querySelectorAll(".smallplanet");
    this.isMobile = "ontouchstart" in document.documentElement;
    this.eventAction = this.isMobile ? "touchstart" : "mouseenter";
    this.universe = window.location.host.replace(/\D/g, "");

    this.geologist = document.querySelector(".geologist.on") ? true : false;

    this.highlighted = false;
    this.tooltipList = {};

    this.current = {};
    this.current.planet = (
      document.querySelector(".smallplanet .active") ||
      document.querySelector(".smallplanet .planetlink")
    ).parentNode;
    this.current.coords = this.current.planet
      .querySelector(".planet-koords")
      .textContent.slice(1, -1);
    this.current.hasMoon = this.current.planet.querySelector(".moonlink")
      ? true
      : false;
    this.current.isMoon =
      this.current.hasMoon &&
      this.current.planet.querySelector(".moonlink.active")
        ? true
        : false;
  }

  init() {
    let res = JSON.parse(localStorage.getItem("ogk-data"));
    // get data & init default values
    this.json = res || {};

    this.json.welcome = this.json.welcome === false ? false : true;
    this.json.empire = this.json.empire || [];
    this.json.jumpGate = this.json.jumpGate || {};
    this.json.searchHistory = this.json.searchHistory || [];
    this.json.watchList = this.json.watchList || {};
    this.json.expeditions = this.json.expeditions || {};
    this.json.combats = this.json.combats || {};
    this.json.harvests = this.json.harvests || {};
    this.json.evolution = this.json.evolution || {};
    this.json.playerSearch = this.json.playerSearch || "";
    this.json.currentExpes = this.json.currentExpes || [];
    this.json.combatsSums = this.json.combatsSums || {};
    this.json.expeditionSums = this.json.expeditionSums || {};
    this.json.flying = this.json.flying || {
      metal: 0,
      crystal: 0,
      deuterium: 0,
      fleet: [],
    };
    this.json.coordsHistory = this.json.coordsHistory || [];
    this.json.trashsimSettings = this.json.trashsimSettings || false;
    this.json.topScore = this.json.topScore || 0;
    this.json.shipNames = this.json.shipNames || false;
    this.json.resNames = this.json.resNames || false;
    this.json.apiTechData = this.json.apiTechData || {};
    this.json.ptFret = this.json.ptFret || 5000;
    this.json.gtFret = this.json.gtFret || 25000;
    this.json.pfFret = this.json.pfFret || 10000;
    this.json.cyFret = this.json.cyFret || 20000;
    this.json.pbFret = this.json.pbFret || 0;
    this.json.autoHarvest = this.json.autoHarvest || ["0:0:0", 3];
    this.json.myMines = this.json.myMines || {};
    this.json.myActivities = this.json.myActivities || {};
    this.json.sideStalk = this.json.sideStalk || [];
    this.json.markers = this.json.markers || {};
    this.json.locked = this.json.locked || {};
    this.json.missing = this.json.missing || {};
    this.json.targetTabs = this.json.targetTabs || { g: 1, s: 0 };
    this.json.spyProbes = this.json.spyProbes || 5;
    this.json.openTooltip = this.json.openTooltip || false;
    this.json.tech114 = this.json.tech114 || 0;
    this.json.tech113 = this.json.tech113 || 0;
    this.json.tech122 = this.json.tech122 || 0;
    this.json.tchat = this.json.tchat || false;
    this.json.lastResUpdate = this.json.lastResUpdate || new Date();
    this.json.myRes = this.json.myRes || {};
    this.json.timezoneDiff = this.json.timezoneDiff || 0;

    this.json.options = this.json.options || {};
    this.json.options.dispatcher =
      this.json.options.dispatcher === true ? true : false;
    this.json.options.sideStalkVisible =
      this.json.options.sideStalkVisible === false ? false : true;
    this.json.options.eventBoxExps =
      this.json.options.eventBoxExps === false ? false : true;
    this.json.options.eventBoxKeep =
      this.json.options.eventBoxKeep === true ? true : false;
    this.json.options = this.json.options || {};
    this.json.options.empire = this.json.options.empire === true ? true : false;
    this.json.options.targetList =
      this.json.options.targetList === true ? true : false;
    this.json.options.fret = this.json.options.fret || 202;
    this.json.options.spyFret = this.json.options.spyFret || 202;
    this.json.options.harvestMission = this.json.options.harvestMission || 4;
    this.json.options.foreignMission = this.json.options.foreignMission || 3;
    this.json.options.expeditionMission =
      this.json.options.expeditionMission || 15;

    this.json.options.activitytimers =
      this.json.options.activitytimers === true ? true : false;
    this.json.options.spyFilter = this.json.options.spyFilter || "DATE";
    this.json.options.rvalLimit =
      this.json.options.rvalLimit || 400000 * this.json.speed;
    this.json.options.spyTableEnable =
      this.json.options.spyTableEnable === false ? false : true;
    this.json.options.compactViewEnable =
      this.json.options.compactViewEnable === false ? false : true;
    this.json.options.autoDeleteEnable =
      this.json.options.autoDeleteEnable === true ? true : false;
    this.json.options.kept = this.json.options.kept || {};
    this.json.options.defaultKept = this.json.options.defaultKept || {};
    this.json.options.hiddenTargets = this.json.options.hiddenTargets || {};

    this.gameLang = document
      .querySelector('meta[name="ogame-language"]')
      .getAttribute("content");

    this.isLoading = false;
  }

  start() {
    this.updateServerSettings();

    if (!this.json.resNames) {
      this.json.resNames = [];
      this.json.resNames[0] = resourcesBar.resources.metal.tooltip.split(
        "|"
      )[0];
      this.json.resNames[1] = resourcesBar.resources.crystal.tooltip.split(
        "|"
      )[0];
      this.json.resNames[2] = resourcesBar.resources.deuterium.tooltip.split(
        "|"
      )[0];
      this.json.resNames[3] = resourcesBar.resources.darkmatter.tooltip.split(
        "|"
      )[0];
    }

    if (this.page == "fleetdispatch") {
      if (!this.json.shipNames) {
        this.json.shipNames = {};
        for (let id in fleetDispatcher.fleetHelper.shipsData) {
          let name = fleetDispatcher.fleetHelper.shipsData[id].name;
          this.json.shipNames[name] = id;
        }
      }

      fleetDispatcher.apiTechData.forEach((tech) => {
        this.json.apiTechData[tech[0]] = tech[1];
        if (tech[0] == 114) this.json.tech114 = tech[1];
      });

      console.log(this.json.apiTechData);

      this.json.ptFret =
        fleetDispatcher.fleetHelper.shipsData[202].baseCargoCapacity;
      this.json.gtFret =
        fleetDispatcher.fleetHelper.shipsData[203].baseCargoCapacity;
      this.json.pfFret =
        fleetDispatcher.fleetHelper.shipsData[219].baseCargoCapacity;
      this.json.pbFret =
        fleetDispatcher.fleetHelper.shipsData[210].baseCargoCapacity;
      this.json.cyFret =
        fleetDispatcher.fleetHelper.shipsData[209].baseCargoCapacity;

      this.saveData();

      this.current.resources = {
        metal: fleetDispatcher.metalOnPlanet,
        crystal: fleetDispatcher.crystalOnPlanet,
        deut: fleetDispatcher.deuteriumOnPlanet,
      };
    }

    document.querySelectorAll(".moonlink").forEach((elem) => {
      elem.classList.add("tooltipLeft");
      elem.classList.remove("tooltipRight");
    });

    this.saveData();

    document.querySelector("#pageContent").style.width = "1200px";
    this.sideOptions();
    this.minesLevel();
    this.resourceDetail();
    this.eventBox();
    this.neededCargo();
    this.preselectShips();
    this.harvest();
    // this.autoHarvest();
    this.expedition();
    this.expeditionMessages();
    this.cleanupMessages();
    this.quickPlanetList();
    this.activitytimers();
    this.sideStalk();
    this.checkDebris();
    this.spyTable();

    this.checkInputs();
    this.keyboardActions();
    this.betterTooltip();
    this.utilities();
    this.loopUtilities();
    this.chat();
    this.uvlinks();
    this.flyingFleet();
    this.betterHighscore();
    this.overviewDates();

    this.sideLock();
    this.jumpGate();
    this.topBarUtilities();
    this.fleetDispatcher();
    this.betterFleetDispatcher();
    this.technoDetail();
    this.updateEmpireData();
    this.onGalaxyUpdate();
    this.timeZone();

    let storage = this.getLocalStorageSize();
    if (storage.total > 4.5) {
      // this.settings();
      this.purgeLocalStorage();
    }

    if (this.json.welcome) {
      if (this.page == "fleetdispatch") {
        this.welcome();
      } else {
        window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=fleetdispatch`;
      }
    }
  }

  timeZone() {
    if (!this.json.timezoneDiff && timeZoneDiffSeconds) {
      this.json.timezoneDiff = timeZoneDiffSeconds;
      this.saveData();
    }
    timeDiff = timeDiff + this.json.timezoneDiff * 1000;
    let hourDiff = this.json.timezoneDiff / 60 / 60;
    hourDiff != 0 &&
      $(".ogk-ping").prepend(
        this.createDOM(
          "span",
          { style: "color: white" },
          `(${hourDiff > 0 ? "+" : ""}${hourDiff}h) `
        )
      );
  }

  updateEmpireData() {
    if (
      isNaN(new Date(this.json.lastEmpireUpdate)) ||
      new Date() - new Date(this.json.lastEmpireUpdate) > 5 * 60 * 1000 ||
      this.json.needsUpdate
    ) {
      this.updateInfo();
    }

    let stageForUpdate = () => {
      this.json.needsUpdate = true;
      this.saveData();
    };
    setInterval(() => {
      // Adding a listner on all buttons that can invalidate empire's data
      document
        .querySelectorAll(
          ".scrap_it, .build-it_wrap, button.upgrade, .abortNow, .build-faster, .og-button.submit, .abort_link, .js_executeJumpButton"
        )
        .forEach((btn) => {
          if (!btn.classList.contains("ogk-ready")) {
            btn.classList.add("ogk-ready");
            btn.addEventListener("click", () => {
              stageForUpdate();
            });
          }
        });
    }, 100);
  }

  overviewDates() {
    // display the date when the building/tech/ship/def end
    document
      .querySelectorAll(
        "#buildingCountdown, #researchCountdown, #shipyardCountdown2"
      )
      .forEach((timer) => {
        let timeLeft = 0;

        if (timer.getAttribute("id") == "buildingCountdown") {
          timeLeft = restTimebuilding * 1000;
        } else if (timer.getAttribute("id") == "researchCountdown") {
          timeLeft = restTimeresearch * 1000;
        } else if (timer.getAttribute("id") == "shipyardCountdown2") {
          timeLeft = restTimeship2 * 1000;
        }

        let newDate = new Date(Date.now() + timeLeft);

        timer.parentNode.appendChild(
          this.createDOM(
            "div",
            { class: "ogl-date" },
            getFormatedDate(
              newDate.getTime(),
              "<strong> [G]:[i]:[s] </strong> - [d].[m]"
            )
          )
        );
      });
  }

  minesLevel() {
    if (this.page == "overview") {
      let maxTemp;
      let splits = textContent[3].split("°C").join("").split(" ");
      splits.reverse().forEach((item) => {
        let parsed = parseInt(item);
        if (!maxTemp || maxTemp < parsed) maxTemp = parsed;
      });
      if (this.json.myMines[this.current.coords]) {
        this.json.myMines[this.current.coords].temperature = maxTemp;
      } else {
        this.json.myMines[this.current.coords] = { temperature: maxTemp };
      }
    }
    let coords = this.current.coords + (this.current.isMoon ? "M" : "P");
    let div = this.createDOM("div");
    let metalBox = document.querySelector("#metal_box");
    let title =
      metalBox.getAttribute("data-title") || metalBox.getAttribute("title");
    let metalStorage, crystalStorage, deuteriumStorage;
    if (title) {
      div.html(
        metalBox.getAttribute("data-title") || metalBox.getAttribute("title")
      );

      metalStorage = this.removeNumSeparator(
        div.querySelectorAll("span")[1].innerText
      );
      let crystalBox = document.querySelector("#crystal_box");
      div.html(
        crystalBox.getAttribute("data-title") ||
          crystalBox.getAttribute("title")
      );
      crystalStorage = this.removeNumSeparator(
        div.querySelectorAll("span")[1].innerText
      );
      let deutBox = document.querySelector("#deuterium_box");
      div.html(
        deutBox.getAttribute("data-title") || deutBox.getAttribute("title")
      );
      deuteriumStorage = this.removeNumSeparator(
        div.querySelectorAll("span")[1].innerText
      );
    }

    if (!this.json.myRes[coords]) {
      this.json.myRes[coords] = {};
    }

    this.json.myRes[coords].metal = parseInt(
      document.querySelector("#resources_metal").getAttribute("data-raw")
    );
    this.json.myRes[coords].crystal = parseInt(
      document.querySelector("#resources_crystal").getAttribute("data-raw")
    );
    this.json.myRes[coords].deuterium = parseInt(
      document.querySelector("#resources_deuterium").getAttribute("data-raw")
    );

    metalStorage && (this.json.myRes[coords].metalStorage = metalStorage);
    crystalStorage && (this.json.myRes[coords].crystalStorage = crystalStorage);
    deuteriumStorage &&
      (this.json.myRes[coords].deuteriumStorage = deuteriumStorage);

    this.json.myRes[coords].lastUpdate = new Date();
    this.json.myRes[coords].invalidate = false;

    this.saveData();

    if (this.page == "supplies" && !this.current.isMoon) {
      let metal = document
        .querySelector(".technology.metalMine .level")
        .getAttribute("data-value");
      let crystal = document
        .querySelector(".technology.crystalMine .level")
        .getAttribute("data-value");
      let deut = document
        .querySelector(".technology.deuteriumSynthesizer .level")
        .getAttribute("data-value");

      let crawlers = document
        .querySelector(".technology.resbuggy .amount")
        .getAttribute("data-value");

      let mines = this.json.myMines[this.current.coords];

      mines = {
        metal: metal,
        crystal: crystal,
        deuterium: deut,
        crawlers: crawlers,
        temperature: mines ? mines.temperature : undefined,
        energy: parseInt(document.querySelector("#resources_energy").innerText),
      };

      this.json.myMines[this.current.coords] = mines;
      this.saveData();

      if (!mines.temperature) {
        document.location = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=overview`;
      }
    }

    this.planetList.forEach((planet) => {
      let coords = planet
        .querySelector(".planet-koords")
        .textContent.slice(1, -1);

      let metal = 0,
        crystal = 0,
        deut = 0;
      if (this.commander) {
        this.json.empire.forEach((planet) => {
          if (planet.coordinates.slice(1, -1) == coords) {
            metal = planet[1];
            crystal = planet[2];
            deut = planet[3];
          }
        });
      } else {
        metal =
          (this.json.myMines[coords] && this.json.myMines[coords].metal) || "?";
        crystal =
          (this.json.myMines[coords] && this.json.myMines[coords].crystal) ||
          "?";
        deut =
          (this.json.myMines[coords] && this.json.myMines[coords].deuterium) ||
          "?";
      }

      let div = this.createDOM("div", { class: "ogl-mines" });
      div.textContent = `${metal}-${crystal}-${deut}`;
      planet.querySelector(".planetlink").appendChild(div);
    });
  }

  technoDetail() {
    if (
      this.page == "research" ||
      this.page == "supplies" ||
      this.page == "facilities" ||
      this.page == "shipyard" ||
      this.page == "defenses"
    ) {
      let nanites = 0;
      let robotics = 0;
      let lock;
      let lockListener;

      if (this.page == "research") {
        this.json.tech113 = Number(
          document
            .querySelector('.technology[data-technology="113"] .level')
            .getAttribute("data-value")
        );
        this.json.tech122 = Number(
          document
            .querySelector('.technology[data-technology="122"] .level')
            .getAttribute("data-value")
        );
      }

      let currentEnergy = this.removeNumSeparator(
        document.querySelector("#resources_energy").innerText
      );

      function getTimeFromString(str) {
        var regexStr = str.match(/[a-z]+|[^a-z]+/gi);
        let time = 0;
        for (let i = 0; i < regexStr.length; i++) {
          let num = Number(regexStr[i]);
          if (!isNaN(num)) {
            if (regexStr[i + 1] == "M") num *= 60;
            if (regexStr[i + 1] == "H") num *= 60 * 60;
            if (regexStr[i + 1] == "DT") num *= 60 * 60 * 24;
            time += num;
            i++;
          }
        }
        return time;
      }

      let currentRes = [
        document
          .querySelector("#resources_metal")
          .innerText.split(".")
          .join(""),
        document
          .querySelector("#resources_crystal")
          .innerText.split(".")
          .join(""),
        document
          .querySelector("#resources_deuterium")
          .innerText.split(".")
          .join(""),
      ];

      let technocrat = document.querySelector(".technocrat.on") ? true : false;
      let labs = 0;
      let that = this;

      let updateResearchDetails = (technoId, baselvl, tolvl) => {
        let durationDiv = document.querySelector(".build_duration");
        let timeDiv = document.querySelector(".build_duration time");

        let timeSumDiv =
          durationDiv.querySelector(".build_duration .ogk-sum") ||
          durationDiv.appendChild(that.createDOM("time", { class: "ogk-sum" }));

        let resSum = [0, 0, 0, 0];
        let timeSum = 0;
        for (let i = baselvl; i < tolvl; i++) {
          let techno;
          if (that.page == "research") {
            techno = that.research(
              technoId,
              i,
              labs,
              technocrat,
              that.playerClass == 3
            );
          } else if (that.page == "supplies" || that.page == "facilities") {
            techno = that.building(technoId, i, robotics, nanites);
          }

          resSum[0] += techno.cost[0];
          resSum[1] += techno.cost[1];
          resSum[2] += techno.cost[2];
          resSum[3] += techno.cost[3];
          timeSum += techno.time;
        }
        let techno;
        if (that.page == "research") {
          techno = that.research(
            technoId,
            tolvl,
            labs,
            technocrat,
            that.playerClass == 3
          );
        } else if (that.page == "supplies" || that.page == "facilities") {
          techno = that.building(technoId, tolvl, robotics, nanites);
        }

        resSum[0] += techno.cost[0];
        resSum[1] += techno.cost[1];
        resSum[2] += techno.cost[2];
        resSum[3] += techno.cost[3];
        timeSum += techno.time;

        if (that.page == "supplies") {
          let consDiv = document.querySelector(
            ".additional_energy_consumption span"
          );
          let prodDiv =
            (document.querySelector(".narrow") &&
              document.querySelector(".ogk-production")) ||
            document
              .querySelector(".narrow")
              .appendChild(that.createDOM("li", { class: "ogk-production" }));

          let energyDiv = document.querySelector(".energy_production span");

          if (consDiv) {
            let currentProd = that.production(technoId, baselvl - 1, false);
            let baseProd = that.production(technoId, tolvl, false);
            let baseCons = that.consumption(technoId, baselvl - 1);
            let currentCons = that.consumption(technoId, tolvl);

            let diff = currentEnergy - (currentCons - baseCons);
            consDiv.html(
              `<span>${(currentCons - baseCons).toLocaleString(
                "de-DE"
              )}<span class="${
                diff < 0 ? "overmark" : "undermark"
              }"> (${diff.toLocaleString("de-DE")})</span></span>`
            );

            prodDiv.html(
              `<strong>Production :</strong> <span class="value">${parseInt(
                baseProd
              ).toLocaleString("de-DE")} <span class="bonus"> (+${parseInt(
                baseProd - currentProd
              ).toLocaleString("de-DE")})</span></span>`
            );
          }
          if (energyDiv) {
            let currentProd = that.production(technoId, baselvl - 1, false);
            let baseProd = that.production(technoId, tolvl, false);
            energyDiv.html(
              `<span class="value">${parseInt(baseProd).toLocaleString(
                "de-DE"
              )} <span class="bonus"> (+${parseInt(
                baseProd - currentProd
              ).toLocaleString("de-DE")})</span></span>`
            );
          }
        }

        timeDiv.innerText = formatTimeWrapper(
          techno.time * 60 * 60,
          2,
          true,
          " ",
          false,
          ""
        );
        let currentDate = new Date();
        let finishDate = new Date(
          currentDate.getTime() + techno.time * 60 * 60 * 1000
        );

        timeDiv.appendChild(
          this.createDOM(
            "div",
            { class: "ogl-date" },
            getFormatedDate(
              finishDate.getTime(),
              "<strong>[d].[m]</strong> - [G]:[i]:[s]"
            )
          )
        );

        if (baselvl != tolvl) {
          timeSumDiv.innerText = formatTimeWrapper(
            timeSum * 60 * 60,
            2,
            true,
            " ",
            false,
            ""
          );
          finishDate = new Date(
            currentDate.getTime() + timeSum * 60 * 60 * 1000
          );
          timeSumDiv.appendChild(
            this.createDOM(
              "div",
              { class: "ogl-date" },
              getFormatedDate(
                finishDate.getTime(),
                "<strong>[d].[m]</strong> - [G]:[i]:[s]"
              )
            )
          );
        } else {
          timeSumDiv.innerText = "";
        }
        let missing = [];
        if (techno.cost[0] != 0) {
          let metal = document.querySelector(".costs .metal");
          metal.innerText = that.formatToUnits(techno.cost[0]);
          metal.setAttribute(
            "data-title",
            parseInt(techno.cost[0]).toLocaleString("de-DE")
          );
          if (baselvl != tolvl) {
            metal.appendChild(
              that.createDOM(
                "li",
                { class: "ogk-sum" },
                that.formatToUnits(resSum[0])
              )
            );
          }
          missing[0] = Math.min(0, currentRes[0] - resSum[0]);
          metal.appendChild(
            that.createDOM(
              "li",
              { class: missing[0] != 0 ? "overmark" : "" },
              that.formatToUnits(missing[0])
            )
          );
        }
        if (techno.cost[1] != 0) {
          let crystal = document.querySelector(".costs .crystal");
          crystal.innerText = that.formatToUnits(techno.cost[1]);
          crystal.setAttribute(
            "data-title",
            parseInt(techno.cost[1]).toLocaleString("de-DE")
          );
          if (baselvl != tolvl) {
            crystal.appendChild(
              that.createDOM(
                "li",
                { class: "ogk-sum" },
                that.formatToUnits(resSum[1])
              )
            );
          }
          missing[1] = Math.min(0, currentRes[1] - resSum[1]);
          crystal.appendChild(
            that.createDOM(
              "li",
              { class: missing[1] != 0 ? "overmark" : "" },
              that.formatToUnits(missing[1])
            )
          );
        }

        if (techno.cost[2] != 0) {
          let deuterium = document.querySelector(".costs .deuterium");
          deuterium.innerText = that.formatToUnits(techno.cost[2]);
          deuterium.setAttribute(
            "data-title",
            parseInt(techno.cost[2]).toLocaleString("de-DE")
          );
          if (baselvl != tolvl) {
            deuterium.appendChild(
              that.createDOM(
                "li",
                { class: "ogk-sum" },
                that.formatToUnits(resSum[2])
              )
            );
          }
          missing[2] = Math.min(0, currentRes[2] - resSum[2]);
          deuterium.appendChild(
            that.createDOM(
              "li",
              { class: missing[2] != 0 ? "overmark" : "" },
              that.formatToUnits(missing[2])
            )
          );
        }
        if (techno.cost[3] != 0) {
          let energy = document.querySelector(".costs .energy");
          if (energy) {
            energy.innerText = that.formatToUnits(techno.cost[3]);
            energy.setAttribute(
              "data-title",
              parseInt(techno.cost[3]).toLocaleString("de-DE")
            );
            if (baselvl != tolvl) {
              energy.appendChild(
                that.createDOM(
                  "li",
                  { class: "ogk-sum" },
                  that.formatToUnits(resSum[3])
                )
              );
            }
            // In that case, we need the all energy prod
            let tooltip =
              document.querySelector("#energy_box").getAttribute("title") ||
              document.querySelector("#energy_box").getAttribute("data-title");
            let div = that.createDOM("div");
            div.html(tooltip);
            let prod = div.querySelectorAll("span")[1].innerText.substring(1);

            missing[3] = Math.min(0, that.removeNumSeparator(prod) - resSum[3]);
            energy.appendChild(
              that.createDOM(
                "li",
                { class: missing[3] != 0 ? "overmark" : "" },
                that.formatToUnits(missing[3])
              )
            );
          }
        }

        lockListener = () => {
          let coords = that.current.coords + (that.current.isMoon ? "M" : "P");
          if (!that.json.missing[coords]) {
            that.json.missing[coords] = [0, 0, 0];
          }
          [0, 1, 2].forEach((i) => {
            if (missing[i]) {
              that.json.missing[coords][i] =
                that.json.missing[coords][i] - parseInt(missing[i]);
            }
          });

          that.saveData();
          that.sideLock(true);
        };
      };

      // Changing Ogame's function to add a callback
      technologyDetails.show = function (technologyId) {
        let element = $(
          ".technology.hasDetails[data-technology=" + technologyId + "]"
        );
        let elemTechnologyDetailsWrapper = $("#technologydetails_wrapper");
        let elemTechnologyDetailsContent = $("#technologydetails_content");
        let elemTechnologyDetails = $("#technologydetails");
        elemTechnologyDetailsWrapper.toggleClass("slide-up", true);
        elemTechnologyDetailsWrapper.toggleClass("slide-down", false);
        let locationIndicator = elemTechnologyDetailsContent.ogameLoadingIndicator();
        locationIndicator.show();
        $.ajax({
          url: this.technologyDetailsEndpoint,
          data: {
            technology: technologyId,
          },
        }).done(function (data) {
          let json = $.parseJSON(data);

          $(".showsDetails").removeClass("showsDetails");
          element.closest(".hasDetails").addClass("showsDetails");
          locationIndicator.hide();
          let anchor = $("header[data-anchor=technologyDetails]");
          if (elemTechnologyDetails.length > 0) {
            removeTooltip(elemTechnologyDetails.find(getTooltipSelector()));
            elemTechnologyDetails.replaceWith(json.content[json.target]);
            elemTechnologyDetails
              .addClass(anchor.data("technologydetails-size"))
              .offset(anchor.offset());
          } else {
            elemTechnologyDetailsContent.append(json.content[json.target]);
            elemTechnologyDetails
              .addClass(anchor.data("technologydetails-size"))
              .offset(anchor.offset());
          }
          localStorage.setItem("detailsOpen", true);
          // techID is magically defined by setting data in the .html; not
          // always so we check it
          // and set it to harmless 0 as default. This is used for the repair
          // dock.
          $(document).trigger(
            "ajaxShowElement",
            typeof technologyId === "undefined" ? 0 : technologyId
          );

          let costDiv = document.querySelector(".costs");
          let titleDiv = costDiv.appendChild(
            that.createDOM("div", { class: "ogk-titles" })
          );

          let tree = document.querySelector(".technology_tree");
          let clone = tree.cloneNode(true);
          tree.style.display = "none";
          clone.innerText = "";
          document.querySelector(".description").appendChild(clone);

          let timeDiv = document.querySelector(".build_duration time");
          let baseTime = getTimeFromString(timeDiv.getAttribute("datetime"));

          if (
            [
              202,
              203,
              208,
              209,
              210,
              204,
              205,
              206,
              219,
              207,
              215,
              211,
              212,
              217,
              213,
              218,
              214,
              401,
              402,
              403,
              404,
              405,
              406,
              407,
              408,
              502,
              503,
            ].includes(technologyId)
          ) {
            let energyDiv;
            let base = 50;
            let cargoValue;
            if (technologyId == 217) {
              energyDiv = document.querySelector(
                ".additional_energy_consumption span"
              );
            } else if (technologyId == 212) {
              energyDiv = document.querySelector(".energy_production span");
              base = energyDiv.querySelector("span").getAttribute("data-value");
            }

            titleDiv.appendChild(that.createDOM("div", {}, "&#8205;"));
            titleDiv.appendChild(that.createDOM("div", {}, "Total"));
            titleDiv.appendChild(that.createDOM("div", {}, "Missing"));

            let resDivs = [
              costDiv.querySelector(".metal"),
              costDiv.querySelector(".crystal"),
              costDiv.querySelector(".deuterium"),
            ];

            let baseCost = [
              resDivs[0] ? resDivs[0].getAttribute("data-value") : 0,
              resDivs[1] ? resDivs[1].getAttribute("data-value") : 0,
              resDivs[2] ? resDivs[2].getAttribute("data-value") : 0,
            ];

            let infoDiv = document
              .querySelector("#technologydetails .sprite")
              .appendChild(
                that.createDOM("div", { class: "ogk-tech-controls" })
              );

            lock = infoDiv.appendChild(
              that.createDOM("a", { class: "icon icon_lock" })
            );
            lock.addEventListener("click", () => {
              lockListener();
            });
            let helpNode = document
              .querySelector(".txt_box .details")
              .cloneNode(true);
            infoDiv.appendChild(helpNode);

            let input = document.querySelector(".build_amount input");
            let updateShipDetails = (value) => {
              let missing = [];
              resDivs.forEach((div, index) => {
                if (!div) return;
                let tot = value * baseCost[index];
                let min = Math.min(0, currentRes[index] - tot);
                missing[index] = min;
                div.innerText = that.formatToUnits(baseCost[index]);
                div.appendChild(
                  that.createDOM(
                    "div",
                    { class: "ogk-sum" },
                    that.formatToUnits(tot)
                  )
                );
                div.appendChild(
                  that.createDOM(
                    "div",
                    { class: min != 0 ? "overmark" : "" },
                    that.formatToUnits(min)
                  )
                );
              });
              timeDiv.innerText = formatTimeWrapper(
                baseTime * value,
                2,
                true,
                " ",
                false,
                ""
              );
              let currentDate = new Date();
              let finishDate = new Date(
                currentDate.getTime() + baseTime * value * 1000
              );
              timeDiv.appendChild(
                that.createDOM(
                  "div",
                  { class: "ogl-date" },
                  getFormatedDate(
                    finishDate.getTime(),
                    "<strong>[d].[m]</strong> - [G]:[i]:[s]"
                  )
                )
              );

              if (technologyId == 212) {
                let diff = Number(currentEnergy) + value * base;
                energyDiv.html(
                  (value * base).toLocaleString("de-DE") +
                    `<span class="${
                      diff < 0 ? "overmark" : "undermark"
                    }"> (${diff.toLocaleString("de-DE")})</span>`
                );
              } else if (technologyId == 217) {
                let diff = Number(currentEnergy) - value * base;
                energyDiv.html(
                  (value * base).toLocaleString("de-DE") +
                    `<span class="${
                      diff < 0 ? "overmark" : "undermark"
                    }"> (${diff.toLocaleString("de-DE")})</span>`
                );
              }
              lockListener = () => {
                let coords =
                  that.current.coords + (that.current.isMoon ? "M" : "P");
                if (!that.json.missing[coords]) {
                  that.json.missing[coords] = [0, 0, 0];
                }
                [0, 1, 2].forEach((i) => {
                  if (missing[i]) {
                    that.json.missing[coords][i] =
                      that.json.missing[coords][i] - parseInt(missing[i]);
                  }
                });

                that.saveData();
                that.sideLock(true);
              };
            };
            input.onkeyup = () => {
              let value = 1;
              if (input.value <= 0 || isNaN(Number(input.value))) {
                input.value = "";
              } else {
                value = input.value;
              }
              updateShipDetails(value);
            };
            updateShipDetails(1);

            document.querySelector(".maximum") &&
              document
                .querySelector(".maximum")
                .addEventListener("click", () => {
                  updateShipDetails(Number(input.getAttribute("max")));
                });
          } else {
            let infoDiv = document
              .querySelector("#technologydetails .sprite")
              .appendChild(
                that.createDOM("div", { class: "ogk-tech-controls" })
              );
            let baseLvl = Number(
              document.querySelector(".level").getAttribute("data-value")
            );
            let tolvl = baseLvl;

            let lvl = titleDiv.appendChild(
              that.createDOM("div", {}, `Lvl <strong>${baseLvl}</strong>`)
            );
            let lvlFromTo = titleDiv.appendChild(that.createDOM("div", {}, ``));
            titleDiv.appendChild(that.createDOM("div", {}, "Missing"));

            let helpNode = document
              .querySelector(".txt_box .details")
              .cloneNode(true);

            lock = infoDiv.appendChild(
              that.createDOM("a", { class: "icon icon_lock" })
            );
            lock.addEventListener("click", () => {
              lockListener();
            });

            let initTime = getTimeFromString(
              document
                .querySelector(".build_duration time")
                .getAttribute("datetime")
            );
            initTime = formatTimeWrapper(initTime, 2, true, " ", false, "");

            if (that.page == "research") {
              labs = that.getLabs(
                technologyId,
                baseLvl,
                initTime,
                technocrat,
                that.playerClass == 3
              );
            } else if (that.page == "supplies" || that.page == "facilities") {
              let lvls = that.getRobotsNanites(technologyId, baseLvl, initTime);
              robotics = lvls.robotics;
              nanites = lvls.nanites;
            }

            updateResearchDetails(technologyId, baseLvl, tolvl);
            let previous = infoDiv.appendChild(
              that.createDOM("a", { class: "icon icon_skip_back" })
            );
            let lvlSpan = infoDiv.appendChild(
              that.createDOM("span", { class: "ogk-lvl" }, tolvl)
            );
            let next = infoDiv.appendChild(
              that.createDOM("a", { class: "icon icon_skip" })
            );
            let textLvl = document.querySelector(".costs p");
            next.addEventListener("click", () => {
              tolvl += 1;
              updateResearchDetails(technologyId, baseLvl, tolvl);
              lvlSpan.innerText = tolvl;
              textLvl.innerText = textLvl.innerText.replace(tolvl - 1, tolvl);
              lvl.html(`Lvl <strong>${tolvl}</strong>`);
              lvlFromTo.html(
                `<strong>${baseLvl}</strong>-<strong>${tolvl}</strong>`
              );
            });
            previous.addEventListener("click", () => {
              if (tolvl == baseLvl) return;
              tolvl -= 1;
              updateResearchDetails(technologyId, baseLvl, tolvl);
              lvlSpan.innerText = tolvl;
              lvl.html(`Lvl <strong>${tolvl}</strong>`);
              lvlFromTo.html(
                `<strong>${baseLvl}</strong>-<strong>${tolvl}</strong>`
              );
              if (tolvl == baseLvl) {
                lvlFromTo.html(``);
              }
            });
            infoDiv.appendChild(helpNode);
          }
        });
      };
    }
  }

  onFleetSent(callback) {
    FleetDispatcher.prototype.submitFleet3 = function (force) {
      force = force || false;

      let that = this;

      let params = {};
      this.appendTokenParams(params);
      this.appendShipParams(params);
      this.appendTargetParams(params);
      this.appendCargoParams(params);
      this.appendPrioParams(params);
      params.mission = this.mission;
      params.speed = this.speedPercent;
      params.retreatAfterDefenderRetreat =
        this.retreatAfterDefenderRetreat === true ? 1 : 0;
      params.union = this.union;
      if (force) params.force = force;
      params.holdingtime = this.getHoldingTime();

      this.startLoading();

      $.post(this.sendFleetUrl, params, function (response) {
        let data = JSON.parse(response);

        that.updateToken(data.fleetSendingToken || "");

        // request successful
        if (data.success === true) {
          fadeBox(data.message, false);

          callback();

          setTimeout(function () {
            window.location = data.redirectUrl;
          }, 50);
        }
        // request failed
        else {
          that.stopLoading();

          // @TODO display confirmation popup to infringe bashlimit rules
          if (
            data.responseArray &&
            data.responseArray.limitReached &&
            !data.responseArray.force
          ) {
            errorBoxDecision(
              that.loca.LOCA_ALL_NETWORK_ATTENTION,
              that.locadyn.localBashWarning,
              that.loca.LOCA_ALL_YES,
              that.loca.LOCA_ALL_NO,
              function () {
                that.submitFleet3(true);
              }
            );
          } else {
            that.displayErrors(data.errors);
          }
        }
      });
    };
  }

  keepOnPlanetDialog(coords, btn) {
    let kept;
    if (coords) {
      kept = this.json.options.kept[coords];
    }
    if (!kept) kept = this.json.options.defaultKept;

    let container = this.createDOM("div");
    if (coords) {
      container.appendChild(
        this.createDOM(
          "h1",
          { style: "text-align: center; font-weight: 800" },
          this.current.coords + (this.current.isMoon ? " (Moon)" : " (Planet)")
        )
      );
      container.appendChild(this.createDOM("hr"));
    }

    let box = this.createDOM("div", { class: "ogk-keep-dialog" });
    box.appendChild(this.createDOM("h1", {}, "Resources to keep on planets"));
    let prod = box.appendChild(
      this.createDOM("div", { class: "ogk-adjust-grid" })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon metal"></a>`
      )
    );
    let metInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput metal",
        type: "text",
        value: kept[0] || 0,
      })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon crystal"></a>`
      )
    );
    let criInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput crystal",
        type: "text",
        value: kept[1] || 0,
      })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon deuterium"></a>`
      )
    );

    let deutInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput deuterium",
        type: "text",
        value: kept[2] || 0,
      })
    );

    box.appendChild(this.createDOM("hr"));
    box.appendChild(this.createDOM("h1", {}, "Ships to keep on planets"));

    let fleet = box.appendChild(
      this.createDOM("div", { class: "ogk-bhole-grid" })
    );

    let inputs = [];

    [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
      (id) => {
        fleet.appendChild(
          this.createDOM("a", {
            class: "ogl-option ogl-fleet-ship ogl-fleet-" + id,
          })
        );
        let input = fleet.appendChild(
          this.createDOM("input", {
            class: "ogl-formatInput",
            type: "text",
            data: id,
            value: kept[id] || 0,
          })
        );
        inputs.push(input);
      }
    );

    if (!btn) {
      btn = box.appendChild(
        this.createDOM("button", { class: "btn_blue" }, "Save")
      );
    }

    btn.addEventListener("click", () => {
      kept = {};
      inputs.forEach((input) => {
        let id = Number(input.getAttribute("data"));
        let amount = this.removeNumSeparator(input.value);
        if (amount > 0) {
          kept[id] = amount;
        }
      });

      kept[0] = Number(this.removeNumSeparator(metInput.value));
      kept[1] = Number(this.removeNumSeparator(criInput.value));
      kept[2] = Number(this.removeNumSeparator(deutInput.value));

      if (coords) {
        this.json.options.kept[coords] = kept;
      } else {
        this.json.options.defaultKept = kept;
      }
      this.saveData();
      document.querySelector(".ogl-dialog .close-tooltip").click();
      location.reload();
    });

    container.appendChild(box);

    return container;
  }

  initUnionCombat(union) {
    if (this.unionInterval) {
      clearInterval(this.unionInterval);
    } else {
      this.delayDiv = document
        .querySelector(".briefing h2")
        .appendChild(this.createDOM("span", { class: "ogk-delay" }));
      this.delayDiv2 = document
        .querySelector("#roundup ul")
        .appendChild(this.createDOM("div", { class: "ogk-delay" }));
      this.delayDiv3 = document
        .querySelector("#continueToFleet2")
        .appendChild(this.createDOM("div", { class: "ogk-delay" }));
      this.delayTimeDiv = document
        .querySelector("#fleetBriefingPart1_2 li:first-of-type .value")
        .appendChild(this.createDOM("div", { class: "undermark" }));
      this.delayTimeDiv2 = document
        .querySelector("#fleet3 #arrivalTime")
        .parentElement.appendChild(
          this.createDOM("div", { class: "undermark" })
        );
      this.delayTimeDiv3 = document
        .querySelector("#fleet1 .ogl-info")
        .appendChild(
          this.createDOM("div", {
            class: "undermark",
            style: "position: absolute;left: 65px;",
          })
        );
    }

    let end = 0;
    let update = () => {
      let diff = union.time * 1000 - serverTime.getTime();
      let maxDelay = diff * 0.3;
      let str = getFormatedTime(maxDelay / 1000);

      let flighDiff = fleetDispatcher.getDuration() - diff / 1000;

      end = maxDelay / 1000 - flighDiff;
      let abs = Math.abs(end);

      this.delayDiv.innerText =
        end > 0 ? getFormatedTime(abs) : getFormatedTime(0);
      this.delayDiv2.innerText =
        end > 0 ? getFormatedTime(abs) : getFormatedTime(0);
      this.delayDiv3.innerText =
        end > 0 ? getFormatedTime(abs) : getFormatedTime(0);

      let format = getFormatedTime(flighDiff >= 0 ? flighDiff : 0);
      this.delayTimeDiv.innerText = "+" + format;
      this.delayTimeDiv2.innerText = "+" + format;
      this.delayTimeDiv3.innerText = "+" + format;
    };

    // fleetDispatcher.hasValidTarget = () => {
    //   if (end <= 0) return false;
    //   return old();
    // };
    fleetDispatcher.refreshFleet2();
    update();
    this.unionInterval = setInterval(update, 200);
  }
  // });
  // });
  // }

  fleetDispatcher() {
    // Coords in clipboard ?
    // navigator.clipboard.readText().then((txt) => alert(txt));
    // \d{1}:\d{1,3}:\d{1,2}

    if (
      this.page == "fleetdispatch" &&
      document.querySelector("#civilships") &&
      fleetDispatcher.shipsOnPlanet.length != 0
    ) {
      // let old = fleetDispatcher.hasValidTarget;

      $("#shortcuts .combatunits").on("change", () => {
        let splits = $("#shortcuts .combatunits").val().split("#");
        unions.forEach((union) => {
          if (union.id == splits[splits.length - 1]) {
            this.initUnionCombat(union);
          }
        });
      });

      this.onFleetSent(() => {
        let pos = document.querySelector("#position").value;
        let coords =
          document.querySelector("#galaxy").value +
          ":" +
          document.querySelector("#system").value +
          ":" +
          pos;

        let fuel = fleetDispatcher.getConsumption();
        let dateStr = getFormatedDate(new Date().getTime(), "[d].[m].[y]");

        let fullCoords = coords;
        if (
          fleetDispatcher.targetPlanet.type ==
          fleetDispatcher.fleetHelper.PLANETTYPE_MOON
        ) {
          coords += "M";
        } else if (
          fleetDispatcher.targetPlanet.type ==
          fleetDispatcher.fleetHelper.PLANETTYPE_PLANET
        ) {
          coords += "P";
        }

        if (this.json.missing[coords]) {
          this.json.missing[coords][0] -= fleetDispatcher.cargoMetal;
          this.json.missing[coords][1] -= fleetDispatcher.cargoCrystal;
          this.json.missing[coords][2] -= fleetDispatcher.cargoDeuterium;
        }

        if (pos == 16) {
          if (!this.json.expeditionSums[dateStr]) {
            this.json.expeditionSums[dateStr] = {
              found: [0, 0, 0, 0],
              harvest: [0, 0],
              fleet: {},
              losses: {},
              type: {},
              fuel: 0,
              adjust: [0, 0, 0],
            };
          }
          this.json.expeditionSums[dateStr].fuel -= fuel;
        } else {
          if (!this.json.combatsSums[dateStr]) {
            this.json.combatsSums[dateStr] = {
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
          this.json.combatsSums[dateStr].fuel -= fuel;
        }
        this.saveData();

        // let self = false;
        // this.json.empire.forEach((planet) => {
        //   if (planet.coordinates.slice(1, -1) == coords) self = true;
        // });
        // if (self) return;
        // if (this.json.coordsHistory.length > 15) {
        //   this.json.coordsHistory.shift();
        // }

        // this.json.coordsHistory.forEach((elem, i) => {
        //   if (elem == coords) {
        //     this.json.coordsHistory.splice(i, 1);
        //   }
        // });
        // this.json.coordsHistory.push(coords);
        // this.saveData();
      });

      $(".send_all").before(this.createDOM("span", { class: "select-most" }));
      $(".allornonewrap .select-most").on("click", () => {
        fleetDispatcher.shipsOnPlanet.forEach((ship) => {
          let kept =
            this.json.options.kept[
              this.current.coords + this.current.isMoon ? "M" : "P"
            ] || this.json.options.defaultKept;
          this.selectShips(
            ship.id,
            Math.max(0, ship.number - (kept[ship.id] || 0))
          );
        });
      });

      let svgButtons = this.createDOM("div", { class: "ogl-dispatch-icons" });
      $("#civil").append(svgButtons);

      let svg = svgButtons.appendChild(
        this.createDOM(
          "div",
          { class: "ogi-speed-icon" },
          `
        <svg x="0px" y="0px"
           viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;">
              <path fill="white" d="M268.574,511.69c1.342-0.065,2.678-0.154,4.015-0.239c0.697-0.045,1.396-0.082,2.091-0.133
                c1.627-0.117,3.247-0.259,4.865-0.406c0.37-0.034,0.741-0.063,1.111-0.099c1.895-0.181,3.783-0.387,5.665-0.609
                c0.056-0.007,0.111-0.012,0.167-0.019C413.497,495.109,512,387.063,512,256C512,114.618,397.382,0,256,0S0,114.618,0,256
                c0,131.063,98.503,239.109,225.511,254.185c0.056,0.007,0.111,0.013,0.167,0.019c1.883,0.222,3.77,0.428,5.665,0.609
                c0.37,0.036,0.741,0.065,1.111,0.099c1.618,0.148,3.239,0.289,4.865,0.406c0.696,0.051,1.394,0.087,2.091,0.133
                c1.337,0.086,2.673,0.174,4.015,0.239c1.098,0.054,2.201,0.086,3.301,0.125c0.976,0.035,1.95,0.081,2.929,0.105
                c2.111,0.052,4.225,0.08,6.344,0.08s4.234-0.028,6.344-0.08c0.979-0.024,1.952-0.07,2.929-0.105
                C266.374,511.776,267.476,511.743,268.574,511.69z M273.523,468.613c-0.921,0.076-1.844,0.14-2.767,0.204
                c-0.814,0.056-1.629,0.109-2.446,0.155c-0.776,0.045-1.553,0.086-2.331,0.122c-1.037,0.048-2.077,0.086-3.118,0.118
                c-0.608,0.019-1.215,0.043-1.823,0.057c-1.675,0.039-3.353,0.064-5.037,0.064s-3.362-0.025-5.037-0.064
                c-0.609-0.014-1.216-0.038-1.823-0.057c-1.041-0.033-2.081-0.071-3.118-0.118c-0.778-0.036-1.555-0.078-2.331-0.122
                c-0.817-0.046-1.632-0.099-2.446-0.155c-0.923-0.064-1.846-0.128-2.767-0.204c-0.52-0.042-1.037-0.092-1.555-0.138
                c-41.142-3.68-79.759-19.195-111.96-44.412c32.024-38.424,79.557-61.396,131.038-61.396s99.015,22.972,131.038,61.396
                c-32.201,25.218-70.819,40.732-111.96,44.412C274.56,468.521,274.042,468.571,273.523,468.613z M43.726,277.333h41.608
                c11.782,0,21.333-9.551,21.333-21.333s-9.551-21.333-21.333-21.333H43.726c4.26-42.904,21.234-82.066,47.099-113.672l29.41,29.41
                c8.331,8.331,21.839,8.331,30.17,0s8.331-21.839,0-30.17l-29.41-29.41c31.607-25.865,70.768-42.838,113.672-47.099v41.608
                c0,11.782,9.551,21.333,21.333,21.333s21.333-9.551,21.333-21.333V43.726c42.904,4.26,82.066,21.234,113.672,47.099l-29.41,29.41
                c-8.331,8.331-8.331,21.839,0,30.17s21.839,8.331,30.17,0l29.41-29.41c25.865,31.607,42.838,70.768,47.099,113.672h-41.608
                c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h41.608c-4.428,44.592-22.591,85.14-50.194,117.366
                C378.101,347.932,319.426,320,256,320s-122.101,27.932-162.08,74.7C66.317,362.474,48.154,321.926,43.726,277.333z"/>
              <path fill="white" d="M248.077,275.807c10.939,4.376,23.355-0.945,27.73-11.885l42.667-106.667c4.376-10.939-0.945-23.355-11.885-27.731
                c-10.939-4.376-23.355,0.945-27.73,11.885l-42.667,106.667C231.817,259.016,237.138,271.432,248.077,275.807z"/>
        </svg>
        `
        )
      );

      svg.addEventListener("mouseover", () => {
        document
          .querySelectorAll("#shipsChosen .technology")
          .forEach((elem) => {
            elem.classList.add("ogi-transparent");
            let id = elem.getAttribute("data-technology");
            elem.appendChild(
              this.createDOM(
                "span",
                { class: "ogi-speed" },
                fleetDispatcher.fleetHelper.shipsData[id].speed.toLocaleString(
                  "de-DE"
                )
              )
            );
          });
      });
      svg.addEventListener("mouseout", () => {
        document
          .querySelectorAll("#shipsChosen .technology")
          .forEach((elem) => {
            elem.classList.remove("ogi-transparent");
            elem.querySelector(".ogi-speed").remove();
          });
      });

      let plusSvg = svgButtons.appendChild(
        this.createDOM(
          "div",
          { class: "ogi-plus-icon" },
          `
      <svg viewBox="0 0 300.003 300.003" style="enable-background:new 0 0 300.003 300.003;">
        <g>
		  <path fill="white" d="M150,0C67.159,0,0.001,67.159,0.001,150c0,82.838,67.157,150.003,149.997,150.003S300.002,232.838,300.002,150
			C300.002,67.159,232.839,0,150,0z M213.281,166.501h-48.27v50.469c-0.003,8.463-6.863,15.323-15.328,15.323
			c-8.468,0-15.328-6.86-15.328-15.328v-50.464H87.37c-8.466-0.003-15.323-6.863-15.328-15.328c0-8.463,6.863-15.326,15.328-15.328
			l46.984,0.003V91.057c0-8.466,6.863-15.328,15.326-15.328c8.468,0,15.331,6.863,15.328,15.328l0.003,44.787l48.265,0.005
			c8.466-0.005,15.331,6.86,15.328,15.328C228.607,159.643,221.742,166.501,213.281,166.501z"/>
	      </g>
        </svg>`
        )
      );

      if (this.json.options.dispatcher) {
        plusSvg.classList.add("ogl-active");
      }
      plusSvg.addEventListener("click", () => {
        if (this.json.options.dispatcher) {
          this.json.options.dispatcher = false;
          document.querySelector(".ogl-dispatch").style.display = "none";
          plusSvg.classList.remove("ogl-active");
        } else {
          this.json.options.dispatcher = true;
          if (document.querySelector(".ogl-dispatch")) {
            document.querySelector(".ogl-dispatch").style.display = "flex";
          } else {
            this.ressourceFiller();
          }
          plusSvg.classList.add("ogl-active");
        }
        this.saveData();
      });

      if (this.mode == 1 || this.mode == 2) {
        plusSvg.style.display = "none";
      }
    }
  }

  updateServerSettings() {
    if (this.json.trashsimSettings) return;
    let settingsUrl = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/api/serverData.xml`;
    return fetch(settingsUrl)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        this.json.topScore = xml.querySelector("topScore").innerHTML;
        this.json.speed = xml.querySelector("speed").innerHTML;
        this.json.speedFleet = xml.querySelector("speedFleet").innerHTML;
        this.json.researchDivisor = xml.querySelector(
          "researchDurationDivisor"
        ).innerHTML;

        this.json.trashsimSettings = {
          speed: xml.querySelector("speedFleet").innerHTML,
          speed_fleet: xml.querySelector("speedFleet").innerHTML,
          galaxies: xml.querySelector("galaxies").innerHTML,
          systems: xml.querySelector("systems").innerHTML,
          rapid_fire: xml.querySelector("rapidFire").innerHTML,
          def_to_tF: xml.querySelector("defToTF").innerHTML,
          debris_factor: xml.querySelector("debrisFactor").innerHTML,
          repair_factor: xml.querySelector("repairFactor").innerHTML,
          donut_galaxy: xml.querySelector("donutGalaxy").innerHTML,
          donut_system: xml.querySelector("donutSystem").innerHTML,
          simulations: 25,
          characterClassesEnabled: xml.querySelector("characterClassesEnabled")
            .innerHTML,
          minerBonusFasterTradingShips: xml.querySelector(
            "minerBonusFasterTradingShips"
          ).innerHTML,
          minerBonusIncreasedCargoCapacityForTradingShips: xml.querySelector(
            "minerBonusIncreasedCargoCapacityForTradingShips"
          ).innerHTML,
          warriorBonusFasterCombatShips: xml.querySelector(
            "warriorBonusFasterCombatShips"
          ).innerHTML,
          warriorBonusFasterRecyclers: xml.querySelector(
            "warriorBonusFasterRecyclers"
          ).innerHTML,
          warriorBonusRecyclerFuelConsumption: xml.querySelector(
            "warriorBonusRecyclerFuelConsumption"
          ).innerHTML,
          combatDebrisFieldLimit: xml.querySelector("combatDebrisFieldLimit")
            .innerHTML,
        };
        this.saveData();
        return true;
      });
  }

  topBarUtilities() {
    // Adding board shortcut
    let boardlink = `https://board.${this.gameLang}.ogame.gameforge.com/`;
    let bar = document.querySelector("#bar ul");
    bar.appendChild(
      this.createDOM(
        "li",
        {},
        `<a href="${boardlink}" target="_blank">Board</a>`
      )
    );
    bar.appendChild(
      this.createDOM(
        "li",
        {},
        `<a href="https://proxyforgame.com/${this.gameLang}/ogame/calc/flight.php" target="_blank">Flight</a>`
      )
    );
    bar.appendChild(
      this.createDOM(
        "li",
        {},
        `<a href="https://trashsim.universeview.be/en" target="_blank">Trash</a>`
      )
    );
    bar.appendChild(
      this.createDOM(
        "li",
        {},
        `<a href="https://www.mmorpg-stat.eu/base.php?se=1&univers=_${this.universe}" target="_blank">Mmorpg</a>`
      )
    );

    // Adding ping info
    let ping =
      window.performance.timing.domLoading -
      window.performance.timing.fetchStart;

    let colorClass = "friendly";
    if (ping > 400 && ping < 800) colorClass = "neutral";
    if (ping > 800) colorClass = "hostile";
    $("#bar ul").prepend(
      this.createDOM(
        "span",
        { class: "ogk-ping" },
        `<span class='${colorClass}'>${(ping / 1000).toFixed(1)}s</span> ping`
      )
    );
  }

  eventBox() {
    let interval = setInterval(() => {
      if (document.querySelector("#eventboxLoading").style.display == "none") {
        clearInterval(interval);
        let flying = this.getFlyingRes();
        console.log(flying.ids);
        if (
          JSON.stringify(this.json.flying.ids) != JSON.stringify(flying.ids)
        ) {
          // let difference = this.json.flying.ids
          //   .filter((x) => !flying.ids.includes(x))
          //   .concat(
          //     flying.ids.filter((x) => !this.json.flying.ids.includes(x))
          //   );
          let gone = [];
          this.json.flying.ids &&
            this.json.flying.ids.forEach((mov) => {
              let found = false;
              flying.ids.forEach((oldMov) => {
                if (mov.id == oldMov.id) {
                  found = true;
                }
              });
              if (!found) {
                gone.push(mov);
              }
            });

          gone.forEach((movement) => {
            if (this.json.myRes[movement.dest]) {
              let found = false;
              this.planetList.forEach((planet) => {
                let coords = planet
                  .querySelector(".planet-koords")
                  .innerText.slice(1, -1);
                if (coords == movement.origin.slice(0, -1)) {
                  found = true;
                }
              });
              if (found) {
                this.json.myRes[movement.dest].metal += movement.metal;
                this.json.myRes[movement.dest].crystal += movement.crystal;
                this.json.myRes[movement.dest].deuterium += movement.deuterium;
              } else {
                let tot =
                  movement.metal + movement.crystal + movement.deuterium;
                if (tot != 0) {
                  this.json.myRes[movement.dest].invalidate = true;
                }
              }
            }
          });

          this.json.needsUpdate = true;
          this.saveData();
          this.updateInfo();
        }

        this.json.flying = flying;
        this.saveData();
      }
    }, 10);

    let addOptions = () => {
      let header = document.querySelector("#eventHeader");
      let div = header.appendChild(this.createDOM("div", {}));

      div.appendChild(this.createDOM("span", {}, "Keep"));
      let keep = div.appendChild(this.createDOM("input", { type: "checkbox" }));
      if (this.json.options.eventBoxKeep) keep.checked = true;

      div.appendChild(this.createDOM("span", {}, "Expeditions"));
      let exps = div.appendChild(this.createDOM("input", { type: "checkbox" }));
      if (this.json.options.eventBoxExps) exps.checked = true;

      keep.addEventListener("change", () => {
        this.json.options.eventBoxKeep = keep.checked;
        this.saveData();
      });

      exps.addEventListener("change", () => {
        this.json.options.eventBoxExps = exps.checked;
        this.saveData();
        this.expeditionImpact(exps.checked);
      });
    };

    let addColors = () => {
      document.querySelectorAll(".eventFleet").forEach((line) => {
        let origin = line.querySelector(".coordsOrigin a");
        let dest = line.querySelector(".destCoords a");
        let mission = line.getAttribute("data-mission-type");
        let debrisD = line.querySelector(".destFleet .tf");
        let moonD = line.querySelector(".destFleet .moon");

        if (mission == 3 || mission == 16 || mission == 5) {
          origin.classList.add("ogk-coords-neutral");
          dest.classList.add("ogk-coords-neutral");
        } else {
          dest.classList.add("ogk-coords-hostile");
          origin.classList.add("ogk-coords-hostile");
        }

        if (debrisD) {
          dest.classList.add("ogk-coords-debris");
        } else if (moonD) {
          dest.classList.add("ogk-coords-moon");
        } else if (dest.innerText.trim().split(":")[2] == "16]") {
          dest.classList.add("ogk-coords-expedition");
        } else {
          dest.classList.add("ogk-coords-planet");
        }

        let debrisO = line.querySelector(".originFleet .tf");
        let moonO = line.querySelector(".originFleet .moon");
        if (debrisO) {
          origin.classList.add("ogk-coords-debris");
        } else if (moonO) {
          origin.classList.add("ogk-coords-moon");
        } else {
          origin.classList.add("ogk-coords-planet");
        }

        this.planetList.forEach((planet) => {
          let coords = planet
            .querySelector(".planet-koords")
            .innerText.slice(1, -1);
          if (coords == origin.innerText.trim().slice(1, -1)) {
            if (
              coords == this.current.coords &&
              ((this.current.isMoon && moonO) ||
                (!this.current.isMoon && !moonO))
            ) {
              origin.classList.add("ogk-current-coords");
            } else {
              origin.classList.add("ogk-own-coords");
            }
          }
          if (coords == dest.innerText.trim().slice(1, -1)) {
            if (
              coords == this.current.coords &&
              ((this.current.isMoon && moonD) ||
                (!this.current.isMoon && !moonD))
            ) {
              dest.classList.add("ogk-current-coords");
            } else {
              dest.classList.add("ogk-own-coords");
            }
          }
        });
      });
    };

    let addHover = () => {
      document.querySelectorAll(".eventFleet").forEach((line) => {
        let previous =
          Number(line.getAttribute("id").replace("eventRow-", "")) - 1;
        let next = Number(line.getAttribute("id").replace("eventRow-", "")) + 1;

        let previousNode = document.querySelector("#eventRow-" + previous);
        let nextNode = document.querySelector("#eventRow-" + next);

        let opacity = line.style.opacity;

        line.addEventListener("mouseover", () => {
          line.style.setProperty("background-color", "#353535", "important");
          line.style.setProperty("opacity", "1", "important");
          if (previousNode) {
            previousNode.style.setProperty(
              "background-color",
              "#353535",
              "important"
            );
            previousNode.style.setProperty("opacity", "1");
          }
          if (nextNode) {
            nextNode.style.setProperty("opacity", "1");
            nextNode.style.setProperty(
              "background-color",
              "#353535",
              "important"
            );
          }
        });
        line.addEventListener("mouseout", () => {
          line.style.setProperty("background-color", "inherit");
          if (previousNode)
            previousNode.style.setProperty("background-color", "inherit");
          if (nextNode) {
            nextNode.style.setProperty("background-color", "inherit");
            nextNode.style.setProperty("opacity", "0.5");
          }
          line.style.setProperty("opacity", opacity, "important");
        });
      });
    };

    let updateEventBox = () => {
      addColors();
      addOptions();
      addHover();
      addRefreshButton();
      this.expeditionImpact(this.json.options.eventBoxExps);
    };

    let addRefreshButton = () => {
      let refreshBtn = this.createDOM("a", { class: "icon icon_reload" });
      $("#eventHeader").prepend(refreshBtn);
      refreshBtn.addEventListener("click", () => {
        $.get(
          ajaxEventboxURI.replace("&asJson=1", ""),
          (data) => {
            $("#eventListWrap").replaceWith(data);
            updateEventBox();
          },
          "text"
        );
      });
    };

    if (this.json.options.eventBoxKeep) {
      toggleEvents.loaded = true;
      document.querySelector("#eventboxContent").style.display = "block";
    }

    let inter = setInterval(() => {
      if (toggleEvents.loaded) {
        clearInterval(inter);
        updateEventBox();
      }
    }, 100);
  }

  expeditionImpact(show) {
    if (show) {
      document
        .querySelectorAll(
          ".eventFleet[data-mission-type='15'][data-return-flight='true']"
        )
        .forEach((elem) => {
          let previous =
            Number(elem.getAttribute("id").replace("eventRow-", "")) - 1;

          let previousNode = document.querySelector("#eventRow-" + previous);
          if (previousNode) {
            previousNode.style.display = "table-row";
          }
        });
    } else {
      document
        .querySelectorAll(
          ".eventFleet[data-mission-type='15'][data-return-flight='false']"
        )
        .forEach((elem) => {
          elem.style.display = "none";
        });
    }
  }

  addGalaxyTooltips() {
    // tooltipRel galaxy
    document.querySelectorAll(".tooltipRel").forEach((sender) => {
      let rel = sender.getAttribute("rel");
      if (rel.indexOf("player") == 0 && rel != "player99999") {
        let id = rel.replace("player", "");

        let content = document.querySelector("#" + rel);
        let rank = content.querySelector(".rank a");

        sender.appendChild(
          this.createDOM(
            "a",
            { href: this.generateHiscoreLink(id) || "", class: "ogl-ranking" },
            "#" + (rank ? rank.textContent : "b")
          )
        );
        sender.classList.add("ogl-tooltipReady");
        this.stalk(sender, id);
      }
    });
  }

  // Fix galaxy reload
  fixRedirectGalaxy() {
    history.pushState(
      {},
      null,
      `/game/index.php?page=ingame&component=galaxy&galaxy=${galaxy}&system=${system}`
    );
  }

  onGalaxyUpdate() {
    // When sending probes and getting async message back :
    // then we want to reload event box header when it's empty
    // let dmfm = displayMiniFleetMessage;
    // displayMiniFleetMessage = (rep) => {
    //   dmfm(rep)
    //   if (document.querySelectorAll(".eventFleet").length == 0) {
    //   getAjaxEventbox();
    //   }
    // }

    if (this.page != "galaxy") return;
    let timeout;

    let callback = () => {
      this.scan();
      this.addGalaxyMarkers();
      this.addGalaxyTooltips();
      this.highlightTarget();
    };

    let dc = displayContentGalaxy;
    displayContentGalaxy = (b) => {
      dc(b);
      if (!this.keepTooltip) {
        document.querySelector(".ogl-tooltip") &&
          document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.fixRedirectGalaxy();
          timeout = null;
        }, 200);
      }
      this.keepTooltip = false;
      callback(galaxy, system);
    };
    let inter = setInterval(() => {
      if (window.loadGalaxy) {
        clearInterval(inter);
        loadContent = window.loadGalaxy;

        loadContent(galaxy, system);
      }
    }, 1);
  }

  addGalaxyMarkers() {
    document
      .querySelectorAll("#galaxytable tbody .allytag")
      .forEach((element, index) => {
        let moon = element.parentNode.querySelector(".moon.tooltipRel")
          ? true
          : false;
        let playerDiv = element.parentNode.querySelector(".playername > a");
        let id =
          (playerDiv && playerDiv.getAttribute("rel").replace("player", "")) ||
          99999;

        let coords = galaxy + ":" + system + ":" + Number(index + 1);
        let colors = this.createDOM("div", {
          class: "ogl-colors",
          "data-coords": coords,
        });
        element.appendChild(colors);
        this.addMarkerUI(coords, colors, id, moon);
      });
    document
      .querySelectorAll("#galaxytable tbody tr")
      .forEach((element, index) => {
        let coords = galaxy + ":" + system + ":" + Number(index + 1);
        let playerDiv = element.querySelector(".playername > a");
        if (!playerDiv) return;
        let id = playerDiv.getAttribute("rel").replace("player", "");
        if (this.json.markers[coords]) {
          if (this.json.markers[coords].id != id) {
            delete this.json.markers[coords];
            if (this.json.options.targetList) {
              this.targetList(false);
              this.targetList(true);
            }
          } else {
            element.classList.add("ogl-marked");
            element.setAttribute(
              "data-marked",
              this.json.markers[coords].color
            );
            this.json.markers[coords].moon = element.querySelector(
              ".moon.tooltipRel"
            )
              ? true
              : false;
          }
          this.saveData();
        }
      });
  }

  getActivity(row) {
    let planet = row.children[1];
    let moon = row.children[3];

    let planetAct = -1,
      moonAct = -1;
    if (planet) {
      if (planet.querySelector(".activity.minute15")) {
        planetAct = 0;
      } else {
        let timer = planet.querySelector(".activity.showMinutes");
        planetAct = timer ? Number(timer.textContent.trim()) : 61;
      }
    }
    if (moon.getAttribute("rel")) {
      if (moon.querySelector(".activity.minute15")) {
        moonAct = 0;
      } else {
        let timer = moon.querySelector(".activity.showMinutes");
        moonAct = timer ? Number(timer.textContent.trim()) : 61;
      }
    }
    return { planet: planetAct, moon: moonAct };
  }

  updateSideActivity(planet, act) {
    if (!act) return;

    planet.querySelector(".ogl-planet").style.visibility = "hidden";
    planet.querySelector(".ogl-moon").style.visibility = "hidden";

    let planetAct = planet.querySelector(".ogl-planet-act");
    let moonAct = planet.querySelector(".ogl-moon-act");
    if (!planetAct) return;

    planetAct.classList.remove("active");
    planetAct.classList.remove("showMinutes");
    planetAct.classList.remove("activity");

    moonAct.classList.remove("active");
    moonAct.classList.remove("showMinutes");
    moonAct.classList.remove("activity");
    planetAct.innerText = "";
    moonAct.innerText = "";

    if (act.planet == 0) {
      planetAct.classList.add("active");
    } else if (act.planet > 0 && act.planet < 60) {
      planetAct.classList.add("activity", "showMinutes");
      planetAct.innerText = act.planet;
    } else {
      planetAct.classList.add("activity", "showMinutes");
      planetAct.innerText = "-";
    }

    if (act.moon != -1) {
      if (act.moon == 0) {
        moonAct.classList.add("active");
      } else if (act.moon > 0 && act.moon < 60) {
        moonAct.classList.add("activity", "showMinutes");
        moonAct.innerText = act.moon;
      } else {
        moonAct.classList.add("activity", "showMinutes");
        moonAct.innerText = "-";
      }
    }
  }

  resetStalk(stalk) {
    stalk.querySelectorAll("*").forEach((a) => a.remove());
    dataHelper.getPlayer(stalk.getAttribute("player-id")).then((player) => {
      this.updateStalk(player.planets).forEach((e) => stalk.appendChild(e));
    });
  }

  refreshStalk(stalk) {
    dataHelper.getPlayer(stalk.getAttribute("player-id")).then((player) => {
      player.planets.forEach((planet) => {
        let olds = stalk.querySelectorAll("a");
        let max;
        let maxCoords;
        let found = false;
        let coords;
        olds.forEach((elem) => {
          coords = elem.getAttribute("data-coords");
          if (planet.coords > coords) {
            max = elem;
          }
          if (planet.coords == coords) {
            if (planet.deleted) {
              elem.classList.add("ogl-deleted");
            }
            this.updateSideActivity(elem, this.activities[planet.coords]);
            found = true;
          }
        });

        if (!found) {
          $(max).after(this.renderPlanet(planet.coords, false, true, false));
        }
      });
      this.highlightTarget();
    });
  }

  scan() {
    let sided = document.querySelectorAll(".ogl-stalkPlanets > a");

    if (!this.activities) this.activities = {};

    let exists = false;
    let changes = [];
    let resets = [];
    document.querySelectorAll(".row").forEach((row, index) => {
      let coords = galaxy + ":" + system + ":" + Number(index + 1);
      let target = document.querySelector(
        `.ogl-target-list .ogl-stalkPlanets [data-coords="${coords}"]`
      );
      if (target) {
        this.updateSideActivity(target, this.getActivity(row));
      }

      let playerDiv = row.querySelector(".playername div");
      if (playerDiv) {
        exists = true;
        let id = playerDiv.getAttribute("id").replace("player", "");
        let name = playerDiv.querySelector("span:first-of-type").innerText;

        changes.push({
          id: id,
          name: name,
          moon: row.querySelector(".moon.tooltipRel") ? true : false,
          coords: coords,
        });

        let sided = document.querySelectorAll(`.ogl-stalkPlanets`);
        if (sided.length != 0) {
          sided.forEach((side) => {
            if (id == side.getAttribute("player-id")) {
              this.activities[coords] = this.getActivity(row);
            } else {
            }
          });
        }
      } else {
        let sided = document.querySelectorAll(
          `.ogl-stalkPlanets [data-coords="${coords}"]`
        );
        if (sided.length != 0) {
          if (!document.querySelector(".ogl-tooltip.ogl-active")) {
            // location.reload();
            document.querySelector(".ogl-tooltip").classList.add("ogl-active");
            // dataHelper
            //   .getPlayer(sided[0].parentElement.getAttribute("player-id"))
            //   .then((player) => {
            //     this.stalk(row.querySelector(".playername"), player);
            //   });
            // console.log(this.rawURL.searchParams.get("galaxy"));
            // loadContent(this.rawURL.searchParams.get('galaxy'),this.rawURL.searchParams.get('system'))
          }
          this.activities[coords] = this.getActivity(row);
          changes.push({
            id: sided[0].parentElement.getAttribute("player-id"),
            moon: row.querySelector(".moon.tooltipRel") ? true : false,
            coords: coords,
            deleted: true,
          });
        }
      }
    });
    document.dispatchEvent(
      new CustomEvent("ogi-galaxy", { detail: changes }),
      true,
      true
    );

    document
      .querySelectorAll(`div:not(.ogl-target-list) .ogl-stalkPlanets`)
      .forEach((reset) => {
        this.refreshStalk(reset);
      });
  }

  jumpGate() {
    let jumpTimes = [
      60,
      53,
      47,
      41,
      36,
      31,
      27,
      23,
      19,
      17,
      14,
      13,
      11,
      10,
      10,
    ];

    for (const [coords, t] of Object.entries(this.json.jumpGate)) {
      let time = new Date(t);
      this.planetList.forEach((planet) => {
        if (
          planet.querySelector(".planet-koords").innerText.slice(1, -1) ==
          coords
        ) {
          let moonlink = planet.querySelector(".moonlink");
          let gateLevel = Number(moonlink.getAttribute("data-jumpgatelevel"));

          let updateCounter = () => {
            let diff = (new Date() - time) / 1000 / 60;
            let refreshTime = jumpTimes[gateLevel - 1] / this.json.speedFleet;
            let count = Math.round(refreshTime - diff);
            counter.innerText = count + "'";
            if (count > 0) {
              if (count < 10) {
                counter.classList.add("friendly");
              } else if (count < 30) {
                counter.classList.add("neutral");
              } else {
                counter.classList.add("hostile");
              }
              return true;
            } else {
              delete this.json.jumpGate[coords];
              this.saveData();
              return false;
            }
          };

          let counter = moonlink.appendChild(
            this.createDOM("div", { class: "ogk-gate-counter" })
          );

          updateCounter();
          let inter = setInterval(() => {
            if (!updateCounter()) clearInterval(inter);
          }, 1000);
        }
      });
    }

    if (!this.current.isMoon) return;

    let oj = openJumpgate;
    openJumpgate = () => {
      oj();

      let init = false;
      let inter = setInterval(() => {
        try {
          if (init) {
            clearInterval(inter);
            return;
          }
          let jg = jumpToTarget;
          jumpToTarget = () => {
            origin = this.current.coords;

            let dest = document.querySelector(".fright select")
              .selectedOptions[0].text;
            dest = dest.split("[")[1].replace("]", "").trim();

            let time = new Date();
            this.json.jumpGate[dest] = time;
            this.json.jumpGate[origin] = time;
            this.saveData();

            // Calling the actual function
            jg();
          };

          $("#jumpgate .send_all").after(
            this.createDOM("span", { class: "select-most" })
          );
          $(".select-most").on("click", () => {
            let kept =
              this.json.options.kept[
                this.current.coords + this.current.isMoon ? "M" : "P"
              ] || this.json.options.defaultKept;
            document
              .querySelectorAll(".ship_input_row input")
              .forEach((elem) => {
                let id = elem.getAttribute("name").replace("ship_", "");
                let max = elem.getAttribute("rel");

                $(elem).val(Math.max(0, max - (kept[id] || 0)));
              });

            $("#continue").focus();
          });
          init = true;
        } catch (e) {}
      }, 100);
    };
    if (this.rawURL.searchParams.get("opengate") == "1") {
      openJumpgate();
    }
  }
  // Not used atm. Keeping for eventual feature requests
  // screenshot() {
  //   return
  //   domtoimage.toPng(document.querySelector(".ogl-fleet-table")).then((url)
  //   => {
  //     // alert(url);
  //     const formData = new FormData();
  //     formData.append("type", "base64");
  //     formData.append("image", url.split("image/png;base64,")[1]);

  //     return fetch("https://api.imgur.com/3/image", {
  //       method: "post",
  //       headers: new Headers({
  //         Authorization: "Client-ID b9dd281387c6a9a",
  //       }),
  //       body: formData,
  //     })
  //       .then((res) => res.json())
  //       .then((json) => json.data.link);
  //   });
  // }

  timeSince(date) {
    var seconds = Math.floor((new Date(serverTime) - date) / 1000);

    var interval = Math.floor(seconds / 86400);
    let since = "";

    if (interval >= 1) {
      since += interval + "d ";
    }
    seconds = seconds % 86400;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      since += interval + "h ";
    }
    seconds = seconds % 3600;
    interval = Math.floor(seconds / 60);
    if (interval >= 1 && since.indexOf("d") == -1) {
      since += interval + "m";
    }
    if (since == "") {
      since = "Just now";
    } else {
      since += " ago";
    }
    return since;
  }

  async flyingFleet() {
    let fleetCount = 0;
    let total = 0;
    let uniques = {};

    document.querySelectorAll(".eventFleet").forEach((line) => {
      let id = Number(line.getAttribute("id").split("-")[1]);
      let back = line.getAttribute("data-return-flight");
      let type = line.getAttribute("data-mission-type");
      // Expeditions have 2 outbound lines

      if (type == 16) return;

      // If statio (4) or return flight & not in expedition unique list
      if (type == 4 || (back && !(id - 1 in uniques) && !(id - 2 in uniques))) {
        uniques[id] = true;
        fleetCount += Number(line.querySelector(".detailsFleet").innerText);
      }
    });

    total = fleetCount;

    if (!this.commander) {
      total = await dataHelper.getPlayer(playerId);
      if (!total) return;
      total = total.military.ships;
    } else {
      this.json.empire.forEach((planet) => {
        for (let i = 202; i <= 219; i++) {
          // Not counting sats (212) and driller (217) && 216 does not exists
          if (i != 212 && i != 217 && i != 216) {
            total += Number(planet[i]);
            if (planet.moon) {
              total += Number(planet.moon[i]);
            }
          }
        }
      });
    }

    let per = (fleetCount / total) * 100;
    let color = "friendly";
    if (per >= 70) color = "neutral";
    if (per >= 90) color = "hostile";

    let inter = setInterval(() => {
      let current = document.querySelector(".ogk-flying-per");
      if (current) current.remove();
      let eventList = document.querySelector(".event_list");
      if (eventList) {
        clearInterval(inter);
        document.querySelector(".event_list").appendChild(
          this.createDOM(
            "span",
            {
              class: "ogk-flying-per tooltip",
              title: "Percentage of fleet currently in flight",
            },
            "Flying: " +
              (this.commander ? "" : "≈") +
              '<span class="' +
              color +
              '">' +
              ((fleetCount / total) * 100).toFixed(0) +
              "%</span>"
          )
        );
      }
    }, 200);
  }

  welcome() {
    let container = this.createDOM("div", { class: "ogk-welcome" });
    let head = container.appendChild(
      this.createDOM("div", { class: "ogk-header" })
    );
    head.appendChild(this.createDOM("h1", {}, "Welcome "));
    head.appendChild(this.createDOM("div", { class: "ogk-logo" }));

    container.appendChild(
      this.createDOM(
        "p",
        {},
        "Ogame Infinity will hopefully bring some new joy playing OGame!"
      )
    );
    container.appendChild(
      this.createDOM(
        "p",
        {},
        "<strong class='friendly'>Note</strong>: Ogame Infinity is now officially tolarated by Ogame! (<a href='https://board.en.ogame.gameforge.com/index.php?thread/819842-ogame-infinity-extension/' target='_blank'>Origin board</a>)."
      )
    );

    if (!this.commander) {
      container.appendChild(
        this.createDOM(
          "p",
          { class: "neutral" },
          "<strong>Reminder: </strong>The commander officier will bring improved empire features (seriously, try it :)."
        )
      );
    }

    container.appendChild(
      this.createDOM(
        "p",
        {},
        "If you see a bug or have a feature request please report to discord 🙏 <a href='https://discord.gg/Z7MDHmk' target='_blank'>Link</a> also in the setting page. <span class='overmark'> Be advised that using multiple addons/script might generate conflicts. </span>"
      )
    );

    // let languageDiv = container.appendChild(
    //   this.createDOM("div", {
    //     style: "margin-top: 20px;display: flex;font-size: revert",
    //   })
    // );
    // if ("fr".indexOf(this.gameLang) == -1) {
    //   languageDiv.html(
    //     `<div class='mmoflag mmo_${this.gameLang.toUpperCase()}'>
    //     </div><strong class="neutral">Addon is not fully translated in your
    //     language at the moment. Please also see the settings page to help me
    //     make it available in your language...</strong>`
    //   );
    // }

    let shortcutsDiv = container.appendChild(
      this.createDOM(
        "p",
        {
          class: "ogk-tips friendly",
          style:
            "display: flex;justify-content: space-between;font-size: revert",
        },
        "Oh, and here are some quick tips: "
      )
    );

    let ctrl = shortcutsDiv.appendChild(
      this.createDOM(
        "div",
        {
          style:
            "width: auto;display: flex;margin-right: 60px;color: white;margin-top: 5px;",
        },
        "Shortcuts with"
      )
    );

    if (!this.commander && "fr".indexOf(this.gameLang) == -1) {
      ctrl.style.top = "272px";
    } else if (!this.commander) {
      ctrl.style.top = "240px";
    } else if ("fr".indexOf(this.gameLang) == -1) {
      ctrl.style.top = "244px";
    }

    let keyHelp = container.appendChild(
      this.createDOM("div", { class: "ogk-keyhelp" })
    );
    let ctrlKey = this.createDOM(
      "div",
      {
        style: "display: flex; width: 80px;margin-left: 10px;margin-top: -2px;",
      },
      `
      <div style="margin-right: 7px" class="ogl-keyboard">cmd/ctrl</div>
      +
      <div style="margin-left: 5px" class="ogl-keyboard">?</div>
    `
    );
    ctrl.appendChild(ctrlKey);

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-overview-icon" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Open the resources panel"));
    keyHelp.appendChild(this.createDOM("div"));

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-search-icon" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Open the player search"));
    keyHelp.appendChild(this.createDOM("div", { class: "ogl-keyboard" }, "f"));

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-statistics-icon" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Open the statistics panel"));
    keyHelp.appendChild(this.createDOM("div", { class: "ogl-keyboard" }, "s"));

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-empire-icon" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Open the empire view"));
    keyHelp.appendChild(this.createDOM("div", { class: "ogl-keyboard" }, "e"));

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-targetIcon" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Open the target list"));
    keyHelp.appendChild(this.createDOM("div", { class: "ogl-keyboard" }, "d"));

    keyHelp.appendChild(
      this.createDOM("div", { class: "ogl-option ogl-syncOption" })
    );
    keyHelp.appendChild(this.createDOM("div", {}, "Settings"));

    container.appendChild(
      this.createDOM(
        "p",
        { class: "ogk-thanks" },
        "Finally, let's thanks <strong>Mr NullNan</strong> for the initial work!"
      )
    );

    let heart =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path style="fill:#C80909" d="M12 4.435c-1.989-5.399-12-4.597-12 3.568 0 4.068 3.06 9.481 12 14.997 8.94-5.516 12-10.929 12-14.997 0-8.118-10-8.999-12-3.568z"/></svg>';

    container.appendChild(
      this.createDOM(
        "div",
        { class: "ogk-love" },
        "Made isolated with " + heart + "in Paris"
      )
    );
    this.popup(null, container);
  }

  chat() {
    this.tchat = true;
    if (!document.querySelector("#chatBar")) {
      this.tchat = false;
      return;
    }
    let toggleChat = () => {
      this.json.tchat = !this.json.tchat;
      this.saveData();
      document.querySelector("#chatBar").style.display = this.json.tchat
        ? "block"
        : "none";
    };

    let oldfunc = ogame.chat.loadChatLogWithPlayer;
    ogame.chat.loadChatLogWithPlayer = (elem, m, cb, uu) => {
      if (!this.json.tchat) {
        toggleChat();
      }
      oldfunc(elem, m, cb, uu);
    };

    let btn = document
      .querySelector("body")
      .appendChild(this.createDOM("div", { class: "ogk-chat icon icon_chat" }));
    if (this.json.tchat) {
      document.querySelector("#chatBar").style.display = this.json.tchat
        ? "block"
        : "none";
    }

    btn.addEventListener("click", () => {
      toggleChat();
    });
  }

  uvlinks() {
    if (this.page == "messages") {
      document.querySelectorAll(".msg_actions").forEach((elem) => {
        if (elem.querySelector(".ogk-trashsim, .ogk-ogotcha")) return;
        let keyNode = elem.querySelector(".icon_apikey");
        if (keyNode) {
          let key =
            keyNode.getAttribute("title") || keyNode.getAttribute("data-title");
          key = key.split("'")[1];
          if (key.startsWith("sr")) {
            let link = elem.appendChild(
              this.createDOM("div", {
                class: "ogk-trashsim tooltip",
                target: "_blank",
                title: "Trahsim",
              })
            );

            let apiTechData = {};
            for (let id in this.json.apiTechData) {
              apiTechData[id] = { level: this.json.apiTechData[id] };
            }

            link.addEventListener("click", () => {
              let coords = this.current.coords.split(":");
              let json = {
                "0": [
                  {
                    class: this.playerClass,
                    research: apiTechData,
                    planet: {
                      galaxy: coords[0],
                      system: coords[1],
                      position: coords[2],
                    },
                  },
                ],
              };
              let base64 = btoa(JSON.stringify(json));
              window.open(
                `https://trashsim.universeview.be/${this.gameLang}?SR_KEY=${key}#prefill=${base64}`,
                "_blank",
                `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
              );
            });
          } else if (key.startsWith("cr")) {
            let link = elem.appendChild(
              this.createDOM("a", {
                class: "ogk-ogotcha tooltip",
                title: "Ogotcha",
              })
            );
            link.addEventListener("click", () =>
              window.open(
                `https://ogotcha.universeview.be/${this.gameLang}?CR_KEY=${key}`,
                "_blank",
                `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
              )
            );
          }
        }
      });

      setTimeout(() => {
        this.uvlinks();
      }, 100);
    }
  }

  warningCommander() {
    let content = this.createDOM(
      "div",
      { class: "ogl-warning-dialog overmark", style: "padding: 25px" },
      `<div class="premium">
      <div class="officers100  commander">
            <a href="https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=premium&openDetail=2" class="detail_button">
              <span class="ecke">
                  <span class="level">
                      <img src="https://gf3.geo.gfsrv.net/cdnbc/aa2ad16d1e00956f7dc8af8be3ca52.gif" width="12" height="11">
                  </span>
              </span>
          </a>
      </div>
    </div>
    The commander officier is required for these features...`
    );
    this.popup(null, content);
  }

  sideOptions() {
    let harvestOptions = this.createDOM("div", { class: "ogl-harvestOptions" });
    let container =
      document.querySelector("#myPlanets") ||
      document.querySelector("#myWorlds");
    container.prepend(harvestOptions);

    let syncOption = harvestOptions.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-syncOption tooltip",
        title: this.getTranslatedText(0),
      })
    );
    syncOption.addEventListener("click", () => this.settings());

    let targetList = harvestOptions.appendChild(
      this.createDOM("a", {
        class: "ogl-option ogl-targetIcon tooltip",
        title: this.getTranslatedText(1),
      })
    );

    let search = harvestOptions.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-search-icon tooltip",
        title: "Player search",
      })
    );

    let statsBtn = harvestOptions.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-statistics-icon tooltip",
        title: "Statistics",
      })
    );

    let empireBtn;
    this.commander &&
      (empireBtn = harvestOptions.appendChild(
        this.createDOM("div", {
          class: "ogl-option ogl-empire-icon tooltip",
          title: "Overview",
        })
      ));
    let overViewBtn = harvestOptions.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-overview-icon tooltip",
        title: "Planets overview",
      })
    );

    if (this.json.options.targetList) {
      targetList.classList.add("ogl-active");
      this.targetList(true);
    }

    this.searchOpened = false;

    targetList.addEventListener("click", () => {
      if (this.searchOpened) {
        this.playerSearch(false);
        this.searchOpened = false;
        search.classList.remove("ogl-active");
      }
      this.targetList(!this.json.options.targetList);
      targetList.classList.toggle("ogl-active");
      this.json.options.targetList = !this.json.options.targetList;
      this.saveData();
    });

    if (this.json.playerSearch != "") {
      this.playerSearch(true, this.json.playerSearch);
      search.classList.add("ogl-active");
      this.searchOpened = true;
    }

    search.addEventListener("click", () => {
      if (this.json.options.targetList) {
        this.json.options.targetList = false;
        this.saveData();
        targetList.classList.remove("ogl-active");
        this.targetList(false);
      }
      search.classList.toggle("ogl-active");
      this.playerSearch(!this.searchOpened);
      this.searchOpened = !this.searchOpened;
    });

    empireBtn &&
      empireBtn.addEventListener("click", () => {
        if (!this.commander) {
          this.warningCommander();
          return;
        }
        this.loading();

        let inter = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(inter);
            this.overview();
          }
        }, 20);
      });

    overViewBtn.addEventListener("click", () => {
      // if (!this.commander) {
      //   this.warningCommander();
      //   return;
      // }
      if (this.json.options.empire) {
        document
          .querySelector(".ogl-overview-icon")
          .classList.remove("ogl-active");
        document
          .querySelectorAll(".ogl-summary, .ogl-res")
          .forEach((elem) => elem.remove());
        this.json.options.empire = false;
      } else {
        this.json.options.empire = true;
        this.resourceDetail();
      }
      this.saveData();
    });

    statsBtn.addEventListener("click", () => {
      this.loading();

      let inter = setInterval(() => {
        if (!this.isLoading) {
          clearInterval(inter);
          this.statistics();
        }
      }, 20);
    });
  }

  profitGraph(profits, max, callback) {
    let content = this.createDOM("div", { class: "ogk-profit" });

    let title = content.appendChild(
      this.createDOM("div", { class: "ogk-date" })
    );

    let div = content.appendChild(
      this.createDOM("div", { class: "ogk-scroll-wrapper" })
    );

    max = -Infinity;
    profits.forEach((elem, index) => {
      if (Math.abs(elem.profit) > max) max = Math.abs(elem.profit);
    });
    let spans = [];
    profits
      .slice()
      .reverse()
      .forEach((elem, index) => {
        let span = div.appendChild(
          this.createDOM("span", {
            style: `height: ${
              elem.profit == 0
                ? 5
                : Math.max(10, (Math.abs(elem.profit) / max) * 60)
            }px`,
            class: elem.profit >= 0 ? "" : "ogk-minus",
          })
        );
        spans.push(span);
        span.addEventListener("click", () => {
          spans.forEach((elem) => elem.classList.remove("ogk-active"));
          span.classList.add("ogk-active");
          let contentHtml = `<strong>${getFormatedDate(
            elem.date.getTime(),
            "[d].[m].[y]"
          )}</strong> <span class="${
            elem.profit >= 0 ? "undermark" : "overmark"
          }">${elem.profit >= 0 ? " +" : " -"}${getNumberFormatShort(
            Math.abs(elem.profit),
            2
          )}</strong></span>`;

          if (elem.start) {
            contentHtml += `<strong>${getFormatedDate(
              elem.start.getTime(),
              "[d].[m].[y]"
            )}</strong>`;
          }
          title.html(contentHtml);
          callback(elem.range, index);
        });
      });
    if (this.initialRange) {
      spans[this.initialRange].click();
      delete this.initialRange;
    } else {
      spans[11].click();
    }
    return content;
  }

  repartitionGraph(eco, tech, fleet, def) {
    let div = this.createDOM("div", { class: "ogk-repartition" });
    let chartNode = div.appendChild(
      this.createDOM("canvas", {
        id: "piechart",
        width: "200px",
        height: "150px",
      })
    );

    let config = {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [eco, tech, fleet, def],
            backgroundColor: ["#656565", "#83ba33", "#b73536", "#3d4800"],
            borderColor: "#1b232c",
          },
        ],

        labels: ["Economy", "Research", "Military", "Defense"],
      },
      options: {
        circumference: Math.PI,
        rotation: -Math.PI,
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        animation: {
          animateScale: true,
          animateRotate: true,
        },
        plugins: {
          outsidePadding: 20,
          labels: [
            {
              fontSize: 15,
              fontStyle: "bold",
              textMargin: 5,
              render: "label",
              position: "outside",
              outsidePadding: 65,
              fontColor: "#ccc",
            },
            {
              fontSize: 15,
              fontStyle: "bold",
              fontColor: "#1b232c",
              render: "percentage",
            },
          ],
        },
      },
    };

    var ctx = chartNode.getContext("2d");
    let chart = new Chart(ctx, config);

    return div;
  }

  winGraph(win, draw, count) {
    let div = this.createDOM("div", { class: "ogk-win" });
    let chartNode = div.appendChild(
      this.createDOM("canvas", {
        id: "piechart",
        width: "200px",
        height: "150px",
      })
    );

    let config = {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [win, count - win - draw, draw],
            backgroundColor: ["#83ba33", "#b73536", "#d29d00"],
            borderColor: "#1b232c",
          },
        ],

        labels: ["Win", "Lose", "draw"],
      },
      options: {
        circumference: Math.PI,
        rotation: -Math.PI,
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        animation: {
          animateScale: true,
          animateRotate: true,
        },
        plugins: {
          outsidePadding: 20,
          labels: [
            {
              fontSize: 15,
              fontStyle: "bold",
              textMargin: 5,
              render: "label",
              position: "outside",
              outsidePadding: 65,
              fontColor: "rgb(34, 42, 51)",
            },
            {
              fontSize: 15,
              fontStyle: "bold",
              fontColor: "#1b232c",
              render: "percentage",
            },
          ],
        },
      },
    };

    var ctx = chartNode.getContext("2d");
    let chart = new Chart(ctx, config);

    return div;
  }

  APIStringToClipboard(fleet) {
    let str = "";
    str += `characterClassId;${this.playerClass}|114;${this.json.tech114}|`;
    for (let id in this.json.apiTechData) {
      str += id + ";" + this.json.apiTechData[id] + "|";
    }
    for (let id in fleet) {
      let count = fleet[id];
      str += `${id};${count}|`;
    }
    fadeBox("<br/>API Key copied in clipboard");
    navigator.clipboard.writeText(str);
  }

  generalStats(player) {
    let content = this.createDOM("div", { class: "ogk-stats" });

    let globalInfo = content.appendChild(
      this.createDOM("div", { class: "ogk-global" })
    );
    let honorRank = document.querySelector(".honorRank");
    if (honorRank) {
      honorRank = honorRank.cloneNode(true);
    } else {
      honorRank = this.createDOM("span");
    }

    let playerDiv = globalInfo.appendChild(this.createDOM("h1"));
    playerDiv.appendChild(honorRank);
    playerDiv.appendChild(this.createDOM("p", {}, playerName));
    playerDiv.appendChild(
      this.createDOM(
        "p",
        { class: honorScore > 0 ? "undermark" : "overmark" },
        "(" + dotted(honorScore) + ")"
      )
    );
    let stats = playerDiv.appendChild(
      this.createDOM("a", { class: "ogl-mmorpgstats" })
    );
    stats.addEventListener("click", () => {
      window.open(
        this.generateMMORPGLink(player.id),
        "_blank",
        `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
      );
    });

    if (!player.id) {
      player.points = { score: 0 };
      player.economy = { score: 0 };
      player.research = { score: 0 };
      player.military = { score: 0 };
    }

    globalInfo.appendChild(
      this.repartitionGraph(
        player.economy.score,
        player.research.score,
        player.military.score,
        player.def
      )
    );

    globalInfo.appendChild(this.createDOM("h2", {}, player.points.position));
    globalInfo.appendChild(
      this.createDOM(
        "h3",
        {},
        dotted(player.points.score) + "<small> pts</small>"
      )
    );

    let detailRank = globalInfo.appendChild(
      this.createDOM("div", { class: "ogl-detailRank" })
    );

    detailRank.html(`
          <div><div class="ogl-ecoIcon"></div>${dotted(
            player.economy.score
          )} <small>pts</small><span class="ogl-ranking">#${
      player.economy.position
    } </span></div>
          <div><div class="ogl-techIcon"></div>${dotted(
            player.research.score
          )} <small>pts</small><span class="ogl-ranking">#${
      player.research.position
    } </span></div>
          <div><div class="ogl-fleetIcon"></div>${dotted(
            player.military.score
          )} <small>pts</small><span class="ogl-ranking">#${
      player.military.position
    } </span></div>
          <div><div class="ogl-fleetIcon grey"></div>${dotted(
            player.def
          )} <small>pts</small></div>
          `);

    let details = content.appendChild(
      this.createDOM("div", { class: "ogk-details" })
    );

    let ecoDetail = details.appendChild(
      this.createDOM("div", { class: "ogk-box" })
    );

    let techDetail = details.appendChild(
      this.createDOM("div", { class: "ogk-box ogk-technos" })
    );

    let div = techDetail.appendChild(
      this.createDOM("div", { class: "ogk-tech" })
    );
    div.appendChild(this.createDOM("span", {}, "Hyperespace"));
    div.appendChild(
      this.createDOM("a", {
        class: "ogl-option ogl-fleet-ship ogl-tech-" + 114,
      })
    );

    if (this.commander) {
      div.appendChild(
        this.createDOM(
          "span",
          {},
          `<strong>${this.json.empire[0][114]}</strong>`
        )
      );
    } else {
      div.appendChild(
        this.createDOM(
          "span",
          {},
          `<strong>${this.json.apiTechData[114]}</strong>`
        )
      );
    }

    let fleetTech = techDetail.appendChild(
      this.createDOM("div", { class: "ogk-tech" })
    );
    // 114 missing
    [115, 117, 118, 109, 110, 111].forEach((id) => {
      if (id == 115) fleetTech.appendChild(this.createDOM("div", {}, "Speed "));
      if (id == 109)
        fleetTech.appendChild(this.createDOM("div", {}, "Combat "));
      fleetTech.appendChild(
        this.createDOM("a", {
          class: "ogl-option ogl-fleet-ship ogl-tech-" + id,
        })
      );
      if (this.commander) {
        fleetTech.appendChild(
          this.createDOM(
            "span",
            {},
            `<strong>${this.json.empire[0][id]}</strong>`
          )
        );
      } else {
        fleetTech.appendChild(
          this.createDOM(
            "span",
            {},
            `<strong>${this.json.apiTechData[id]}</strong>`
          )
        );
      }
    });

    let mprod = 0,
      mlvl = 0,
      cprod = 0,
      clvl = 0,
      dprod = 0,
      dlvl = 0,
      sum = 0;

    if (this.commander) {
      this.json.empire.forEach((planet) => {
        mlvl += Number(planet[1]);
        mprod += Number(planet.production.hourly[0]);
        clvl += Number(planet[2]);
        cprod += Number(planet.production.hourly[1]);
        dlvl += Number(planet[3]);
        dprod += Number(planet.production.hourly[2]);
      });
      sum = this.json.empire.length;
    } else {
      for (let i in this.json.myMines) {
        if (!this.json.myMines[i].metal) continue;
        let metal = Number(
          this.json.myMines[i].metal.replace("(", "").replace(")", "")
        );
        let crystal = Number(
          this.json.myMines[i].crystal.replace("(", "").replace(")", "")
        );
        let deut = Number(
          this.json.myMines[i].deuterium.replace("(", "").replace(")", "")
        );

        sum += 1;
        mlvl += metal;
        clvl += crystal;
        dlvl += deut;
        mprod += this.production(1, metal, true, i);
        cprod += this.production(2, crystal, true, i);
        dprod += this.production(3, deut, true, i);
        console.log(i, this.production(1, metal, true, i));
      }
    }

    mlvl = mlvl / sum;
    clvl = clvl / sum;
    dlvl = dlvl / sum;

    let prod = ecoDetail.appendChild(
      this.createDOM("div", { class: "ogk-mines" })
    );
    prod.appendChild(this.createDOM("span"));

    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogk-title ogl-metal" },
        `<a class="resourceIcon metal ogl-option"></a>${mlvl.toFixed(1)}`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogk-title ogl-crystal" },
        `<a class="resourceIcon crystal ogl-option"></a>${clvl.toFixed(1)}`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogk-title ogl-deut" },
        `<a class="resourceIcon deuterium ogl-option"></a>${dlvl.toFixed(1)}`
      )
    );

    prod.appendChild(this.createDOM("p", {}, `<strong>Ratio</strong>`));
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-metal" },
        `<strong>${(mprod / dprod).toFixed(2)}</strong>`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        `<strong>${(cprod / dprod).toFixed(2)}</strong>`
      )
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, `<strong>1</strong>`)
    );

    prod.appendChild(this.createDOM("p", {}, `Hour`));
    prod.appendChild(
      this.createDOM("span", { class: "ogl-metal" }, `${dotted(mprod)}`)
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-crystal" }, `${dotted(cprod)}`)
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, `${dotted(dprod)}`)
    );

    prod.appendChild(this.createDOM("p", {}, `Day`));
    prod.appendChild(
      this.createDOM("span", { class: "ogl-metal" }, `${dotted(mprod * 24)}`)
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-crystal" }, `${dotted(cprod * 24)}`)
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, `${dotted(dprod * 24)}`)
    );

    prod.appendChild(this.createDOM("p", {}, `Week`));
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-metal" },
        `${dotted(mprod * 24 * 7)}`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        `${dotted(cprod * 24 * 7)}`
      )
    );
    prod.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, `${dotted(dprod * 24 * 7)}`)
    );

    let fleetDetail = details.appendChild(
      this.createDOM("div", { class: "ogk-box" })
    );

    if (this.commander) {
      let fleet = fleetDetail.appendChild(
        this.createDOM("div", { class: "ogk-fleet" })
      );

      let flying = this.getFlyingRes();

      let totalFleet = {};
      let cyclos = 0;
      let totalSum = 0;
      [
        202,
        203,
        208,
        209,
        210,
        204,
        205,
        206,
        219,
        207,
        215,
        211,
        213,
        218,
        214,
      ].forEach((id) => {
        let flyingCount = flying.fleet[id];
        let sum = 0;
        if (flyingCount) sum = flyingCount;
        this.json.empire.forEach((planet) => {
          sum += Number(planet[id]);
          if (planet.moon) {
            sum += Number(planet.moon[id]);
          }
        });
        totalSum += sum;
        let shipDiv = fleet.appendChild(this.createDOM("div"));
        shipDiv.appendChild(
          this.createDOM("a", {
            class: "ogl-option ogl-fleet-ship ogl-fleet-" + id,
          })
        );
        if (id == 209) {
          cyclos = sum;
        }
        shipDiv.appendChild(this.createDOM("span", {}, dotted(sum)));
        totalFleet[id] = sum;
      });

      let fleetInfo = fleetDetail.appendChild(
        this.createDOM("div", { class: "ogk-fleet-info" })
      );

      let apiBtn = fleetInfo.appendChild(
        this.createDOM("span", { class: "show_fleet_apikey" })
      );

      apiBtn.addEventListener("click", () => {
        this.APIStringToClipboard(totalFleet);
      });

      fleetInfo.appendChild(
        this.createDOM(
          "span",
          {},
          `Fleet: <strong>${dotted(totalSum)}</strong> <small>ships</small>`
        )
      );

      let rcpower =
        (((this.json.empire[0][114] * 5) / 100) * 20000 + 20000) * cyclos;
      fleetInfo.appendChild(
        this.createDOM(
          "span",
          {},
          `Recycling: <strong>${dotted(rcpower)}</strong>`
        )
      );
    } else {
      fleetDetail.appendChild(
        this.createDOM(
          "p",
          { class: "ogk-commander" },
          "Commander officer needed to display fleet detail..."
        )
      );
    }
    return content;
  }

  tabs(titles, small) {
    let body = this.createDOM("div");

    let header = body.appendChild(this.createDOM("div", { class: "ogl-tabs" }));

    let tabs = [];
    let first;
    for (let title in titles) {
      if (!first) first = titles[title];
      tabs.push(
        header.appendChild(this.createDOM("span", { class: "ogl-tab" }, title))
      );
    }
    tabs[0].classList.add("ogl-active");

    let tabListener = (evt) => {
      tabs.forEach((tab) => tab.classList.remove("ogl-active"));
      evt.target.classList.add("ogl-active");
      body.children[1].remove();
      body.appendChild(titles[evt.target.innerText]());
    };

    tabs.forEach((tab) => tab.addEventListener("click", tabListener));
    body.appendChild(first());
    return body;
  }

  async statistics() {
    let showStats = async () => {
      let player = await dataHelper.getPlayer(playerId);

      let body = this.tabs({
        General: this.generalStats.bind(this, player),
        Expeditions: this.expeditionStats.bind(this),
        Combats: this.combatStats.bind(this),
      });

      this.popup(null, body);
    };
    if (typeof Chart === "undefined") {
      document.dispatchEvent(new CustomEvent("ogi-chart", {}), true, true);
      let inter = setInterval(async () => {
        if (typeof Chart !== "undefined") {
          clearInterval(inter);
          showStats();
        }
      }, 50);
    } else {
      showStats();
    }
  }

  cleanupMessages() {
    for (let [id, result] of Object.entries(this.json.expeditions)) {
      if (
        !result.favorited &&
        new Date() - new Date(result.date) > 5 * 24 * 60 * 60 * 1000
      ) {
        delete this.json.expeditions[id];
      }
    }
    // Currently keeping all combats id since I have no ideas what the delay for
    // message deletion is.
    for (let [id, result] of Object.entries(this.json.combats)) {
      if (
        !result.favorited &&
        new Date() - new Date(result.timestamp) > 10 * 24 * 60 * 60 * 1000
      ) {
        // delete this.json.combats[id];
      }
    }
    for (let [id, result] of Object.entries(this.json.harvests)) {
      if (new Date() - new Date(result.date) > 5 * 24 * 60 * 60 * 1000) {
        delete this.json.harvests[id];
      }
    }
    this.saveData();
  }

  dateStrToDate(datestr) {
    let splits = datestr.split(".");
    let tmp = splits[0];
    splits[0] = splits[1];
    splits[1] = tmp;
    return new Date(splits.join("/"));
  }

  expeditionMessages() {
    // let ressources = ["Metal", "Crystal", "Deuterium", "AM"];
    let normalized = ["Metal", "Crystal", "Deuterium", "AM"];
    let ressources = this.json.resNames;
    if (!this.combats) this.combats = {};
    if (!this.expeditionsIds) this.expeditionsIds = {};

    let cyclosName = "";
    for (let i in this.json.shipNames) {
      if (this.json.shipNames[i] == 209) cyclosName = i;
    }

    if (this.page == "messages") {
      if (document.querySelector("li[id=subtabs-nfFleet22].ui-state-active")) {
        let id = document
          .querySelector("li[id=subtabs-nfFleet22].ui-state-active")
          .getAttribute("aria-controls");

        document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
          let id = msg.getAttribute("data-msg-id");
          if (id in this.json.expeditions && this.json.expeditions[id].result) {
            if (msg.querySelector(".icon_favorited")) {
              this.json.expeditions[id].favorited = true;
              this.json.expeditions[id].date = new Date();
            } else {
              this.json.expeditions[id].favorited = false;
            }

            if (this.json.expeditions[id].result == "Unknown") {
              msg.querySelector(".ogl-unknown-warning") ||
                msg
                  .querySelector(".msg_actions")
                  .appendChild(
                    this.createDOM(
                      "div",
                      { class: "ogl-unknown-warning" },
                      "Unknown expedition message... <a href='https://discord.gg/8Y4SWup'> Help me find them all</a>"
                    )
                  );
            } else if (this.json.expeditions[id].busy) {
              msg.querySelector(".ogl-warning") ||
                msg.querySelector(".msg_actions").appendChild(
                  this.createDOM("a", {
                    class: "ogl-warning tooltip",
                    "data-title":
                      "Warning : expedition position is getting weak...",
                  })
                );
            }

            msg.classList.add(
              "ogk-" + this.json.expeditions[id].result.toLowerCase()
            );
            return;
          } else if (id in this.expeditionsIds) {
            return;
          }

          this.expeditionsIds[id] = true;

          let content = msg.querySelector("span.msg_content");
          let date = msg.querySelector(".msg_date").innerText;
          let textContent = content.innerText;

          dataHelper.getExpeditionType(textContent).then((type) => {
            date = date.split(" ")[0].slice(0, -2);

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
            // Objects
            let objectNode = content.querySelector("a");
            if (objectNode) {
              json.result = "Object";
              json["object"] = objectNode.innerText;
            }

            // Resources
            ressources.forEach((res, i) => {
              res = res.replace("(", "\\(").replace(")", "\\)");
              let regex = new RegExp(`${res} [0-9]{1,3}(.[0-9]{1,3})*`, "gm");

              let found = textContent.match(regex);
              if (found) {
                let split = found[0].split(" ");
                type = normalized[i];
                sums.found[i] += Number(
                  this.removeNumSeparator(split[split.length - 1])
                );
              }
            });
            // Fleet
            let fleetMatches = textContent.match(/.*: [1-9].*/gm);
            fleetMatches &&
              fleetMatches.forEach((result) => {
                let split = result.split(": ");
                type = "Fleet";
                let id = this.json.shipNames[split[0]];
                let count = Number(split[1]);
                sums.fleet[id]
                  ? (sums.fleet[id] += count)
                  : (sums.fleet[id] = count);
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
            if (this.json.expeditions[id].result == "Unknown") {
              msg
                .querySelector(".msg_actions")
                .appendChild(
                  this.createDOM(
                    "div",
                    { class: "ogl-unknown-warning" },
                    "Unknown expedition message... <a href='https://discord.gg/8Y4SWup'> Help me find them all</a>"
                  )
                );
            } else if (this.json.expeditions[id].busy) {
              msg.querySelector(".msg_actions").appendChild(
                this.createDOM("a", {
                  class:
                    "ogl-warning tooltipRight ogl-tooltipReady ogl-tooltipInit",
                  "data-title": "Warning : Expedition position is weak...",
                })
              );
            }

            msg.classList.add(
              "ogk-" + this.json.expeditions[id].result.toLowerCase()
            );
            this.saveData();
          });
        });
      }

      if (document.querySelector("li[id=subtabs-nfFleet21].ui-state-active")) {
        let id = document
          .querySelector("li[id=subtabs-nfFleet21].ui-state-active")
          .getAttribute("aria-controls");
        document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
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
                    loot:
                      (cr.loot.metal + cr.loot.crystal + cr.loot.deuterium) *
                      (cr.win ? 1 : -1),
                    ennemi: cr.ennemi.name,
                    losses: cr.ennemi.losses,
                  });
                  this.json.combatsSums[date].topCombats.sort((a, b) => {
                    return (
                      b.debris +
                      Math.abs(b.loot) -
                      (a.debris + Math.abs(a.loot))
                    );
                  });

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
        });
      }
      if (document.querySelector("li[id=subtabs-nfFleet24].ui-state-active")) {
        let id = document
          .querySelector("li[id=subtabs-nfFleet24].ui-state-active")
          .getAttribute("aria-controls");
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

          let date = msg.querySelector(".msg_date").innerText;
          date = date.split(" ")[0].slice(0, -2);

          let coords = msg.querySelector(".msg_title a");
          if (coords) {
            let content = msg.querySelector(".msg_content").innerText;
            coords = coords.innerText.slice(1, -1);

            let matches = content.match(/[0-9.]*[0-9]/gm);
            let met = Number(matches[matches.length - 2].split(".").join(""));
            let cri = Number(matches[matches.length - 1].split(".").join(""));

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
      }

      setTimeout(() => {
        this.expeditionMessages();
      }, 100);
    }
    return;
  }

  loading() {
    let svg = `<svg width="200px" height="100px" viewBox="0 0 187.3 93.7" preserveAspectRatio="xMidYMid meet">
                <path stroke="#3c536c" id="outline" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" 
                  d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 				
                    c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z" />
                <path id="outline-bg" opacity="0.1" fill="none" stroke="#eee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" d="
                M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 				
                c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z" />
              </svg>`;

    let body = this.createDOM("div");
    body.html(svg);
    this.popup(null, body);
  }

  overview() {
    let header = this.createDOM("div", { class: "ogl-tabs" });
    let fleetBtn = header.appendChild(
      this.createDOM("span", { class: "ogl-tab ogl-active" }, "Fleet")
    );
    let defBtn = header.appendChild(
      this.createDOM("span", { class: "ogl-tab" }, "Defense")
    );
    let minesBtn = header.appendChild(
      this.createDOM("span", { class: "ogl-tab" }, "Mines")
    );

    let body = this.createDOM("div");
    body.appendChild(header);
    body.appendChild(this.fleetOverview(true));

    let tabListener = (e) => {
      fleetBtn.classList.remove("ogl-active");
      defBtn.classList.remove("ogl-active");
      minesBtn.classList.remove("ogl-active");
      body.children[1].remove();

      if (e.target.innerText == "Fleet") {
        fleetBtn.classList.add("ogl-active");
        body.appendChild(this.fleetOverview());
      } else if (e.target.innerText == "Defense") {
        defBtn.classList.add("ogl-active");
        body.appendChild(this.defenseOverview());
      } else {
        minesBtn.classList.add("ogl-active");
        body.appendChild(this.minesOverview());
      }
    };

    fleetBtn.addEventListener("click", tabListener);
    defBtn.addEventListener("click", tabListener);
    minesBtn.addEventListener("click", tabListener);

    this.popup(null, body);
  }

  fetchAndConvertRC(messageId) {
    return fetch(
      `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=messages&messageId=${messageId}&tabid=21&ajax=1`
    )
      .then((rep) => rep.text())
      .then((str) => {
        let begin = str.indexOf("JSON('") + 6;
        let end = str.indexOf("');");
        let json = JSON.parse(str.substr(begin, end - begin));

        let combatIds = [];
        let isProbes = true;
        let isDefender = false;
        for (let i in json.attacker) {
          for (let j in json.attacker[i].shipDetails) {
            if (j != 210) {
              isProbes = false;
            }
          }
          if (json.attacker[i].ownerID == playerId) {
            combatIds.push(i);
          }
        }
        for (let i in json.defender) {
          if (json.defender[i].ownerID == playerId) {
            combatIds.push(i);
            isDefender = true;
          }
        }

        let ennemi;
        let ennemiLosses;
        if (isDefender) {
          ennemi = Object.values(json.attacker)[0].ownerID;
          ennemiLosses = json.statistic.lostUnitsAttacker;
        } else {
          ennemi = Object.values(json.defender)[0].ownerID;
          ennemiLosses = json.statistic.lostUnitsDefender;
        }

        let damages = {};
        let losses = {};
        let lastRound = json.combatRounds[json.combatRounds.length - 1];
        if (lastRound) {
          combatIds.forEach((id) => {
            for (let i in lastRound.defenderLosses) {
              if (!isDefender) {
                Object.entries(lastRound.defenderLosses[i]).forEach((ship) => {
                  let shipid = ship[0];
                  let shipcount = Number(ship[1]);
                  damages[shipid]
                    ? (damages[shipid] += shipcount)
                    : (damages[shipid] = shipcount);
                });
              }
              if (i == id) {
                Object.entries(lastRound.defenderLosses[i]).forEach((ship) => {
                  let shipid = ship[0];
                  let shipcount = Number(ship[1]);
                  losses[shipid]
                    ? (losses[shipid] += shipcount)
                    : (losses[shipid] = shipcount);
                });
              }
            }
            for (let i in lastRound.attackerLosses) {
              if (isDefender) {
                Object.entries(lastRound.attackerLosses[i]).forEach((ship) => {
                  let shipid = ship[0];
                  let shipcount = Number(ship[1]);
                  damages[shipid]
                    ? (damages[shipid] += shipcount)
                    : (damages[shipid] = shipcount);
                });
              }
              if (i == id) {
                Object.entries(lastRound.attackerLosses[i]).forEach((ship) => {
                  let shipid = ship[0];
                  let shipcount = Number(ship[1]);
                  losses[shipid]
                    ? (losses[shipid] += shipcount)
                    : (losses[shipid] = shipcount);
                });
              }
            }
          });
        }

        let cr = {
          timestamp: json.event_timestamp * 1000,
          coordinates: json.coordinates,
          losses: losses,
          loot: json.loot,
          debris: json.debris,
          ennemi: {
            name: ennemi,
            losses: ennemiLosses,
          },
          isProbes:
            isProbes &&
            json.loot.metal == 0 &&
            json.loot.crystal == 0 &&
            json.loot.deuterium == 0 &&
            json.debris.crystalTotal < 200000,
          win:
            (json.result == "defender" && isDefender) ||
            (json.result == "attacker" && !isDefender),
          draw: json.result == "draw",
        };
        return cr;
      });
  }

  getFleetCost(ships) {
    let fleetRes = [0, 0, 0];
    [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
      (id) => {
        if (ships[id]) {
          fleetRes[0] += SHIP_COSTS[id][0] * ships[id] * 1000;
          fleetRes[1] += SHIP_COSTS[id][1] * ships[id] * 1000;
          fleetRes[2] += SHIP_COSTS[id][2] * ships[id] * 1000;
        }
      }
    );
    return fleetRes;
  }

  expeditionStats() {
    let ressources = ["Metal", "Crystal", "Deuterium", "AM"];

    let content = this.createDOM("div", { class: "ogk-stats-content" });

    let renderDetails = (sums, onchange) => {
      let content = this.createDOM("div", { class: "ogk-stats" });

      let globalDiv = content.appendChild(
        this.createDOM("div", { class: "ogk-global" })
      );

      let numExpe = 0;
      Object.values(sums.type).forEach((value) => (numExpe += value));

      globalDiv.appendChild(
        this.createDOM("span", { class: "ogk-center" }, numExpe)
      );

      globalDiv.appendChild(this.expeditionGraph(sums.type));

      let details = content.appendChild(
        this.createDOM("div", { class: "ogk-details" })
      );

      let losses = this.getFleetCost(sums.losses);

      let fleetRes = this.getFleetCost(sums.fleet);

      let box = this.resourceBox(
        [
          {
            title: "Found",
            metal: sums.found[0],
            crystal: sums.found[1],
            deuterium: sums.found[2],
            am: sums.found[3],
          },
          {
            title: "Fleet",
            metal: fleetRes[0],
            crystal: fleetRes[1],
            deuterium: fleetRes[2],
          },
          {
            title: "Recycled",
            metal: sums.harvest[0],
            crystal: sums.harvest[1],
            deuterium: 0,
          },
          {
            title: "Losses",
            metal: -losses[0],
            crystal: -losses[1],
            deuterium: -losses[2],
          },
          { title: "Fuel", metal: 0, crystal: 0, deuterium: sums.fuel },
          {
            title: "B. Hole",
            metal: sums.adjust[0],
            crystal: sums.adjust[1],
            deuterium: sums.adjust[2],
            edit: onchange ? true : false,
          },
        ],
        true,
        () => {
          globalDiv.empty();
          globalDiv.appendChild(
            this.blackHoleBox((costs) => {
              let date = document.querySelector(".ogk-date strong").innerText;
              this.json.expeditionSums[date].adjust[0] -= costs[0];
              this.json.expeditionSums[date].adjust[1] -= costs[1];
              this.json.expeditionSums[date].adjust[2] -= costs[2];
              this.saveData();
              onchange();
            })
          );
        }
      );
      details.appendChild(box);

      details.appendChild(this.shipsBox(sums.fleet));

      let harvestSums = [0, 0];
      Object.entries(this.json.harvests).forEach((harvest) => {
        harvest = harvest[1];

        if (harvest.coords.split(":")[2] == 16) {
          harvestSums[0] += harvest.metal;
          harvestSums[1] += harvest.crystal;
        }
      });

      return content;
    };

    let computeRangeSums = (sums, start, stop) => {
      let weekSums = {
        found: [0, 0, 0, 0],
        harvest: [0, 0],
        losses: {
          202: 0,
          203: 0,
          210: 0,
          204: 0,
          205: 0,
          206: 0,
          219: 0,
          207: 0,
          215: 0,
          211: 0,
          213: 0,
          218: 0,
        },
        fleet: {
          202: 0,
          203: 0,
          210: 0,
          204: 0,
          205: 0,
          206: 0,
          219: 0,
          207: 0,
          215: 0,
          211: 0,
          213: 0,
          218: 0,
        },
        type: {},
        fuel: 0,
        adjust: [0, 0, 0, 0],
      };

      for (
        var d = new Date(start);
        d >= new Date(stop);
        d.setDate(d.getDate() - 1)
      ) {
        let dateStr = getFormatedDate(new Date(d).getTime(), "[d].[m].[y]");
        if (sums[dateStr]) {
          weekSums.fuel = sums[dateStr].fuel;
          [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
            (id) => {
              weekSums.fleet[id] += sums[dateStr].fleet[id] || 0;
            }
          );
          [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
            (id) => {
              weekSums.losses[id] += sums[dateStr].losses[id] || 0;
            }
          );
          sums[dateStr].found.forEach((value, index) => {
            weekSums.found[index] += sums[dateStr].found[index];
          });
          sums[dateStr].harvest.forEach((value, index) => {
            weekSums.harvest[index] += sums[dateStr].harvest[index];
          });
          sums[dateStr].adjust.forEach((value, index) => {
            weekSums.adjust[index] += sums[dateStr].adjust[index];
          });
          for (let [type, num] of Object.entries(sums[dateStr].type)) {
            weekSums.type[type]
              ? (weekSums.type[type] += num)
              : (weekSums.type[type] = num);
          }
        }
      }

      return weekSums;
    };

    let getTotal = (sums) => {
      let total = 0;
      let fleet = this.getFleetCost(sums.fleet);
      let losses = this.getFleetCost(sums.losses);
      total += fleet[0] + fleet[1] + fleet[2];
      total -= losses[0] + losses[1] + losses[2];
      total += sums.harvest[0] + sums.harvest[1];
      total += sums.found[0] + sums.found[1] + sums.found[2];
      total += sums.adjust[0] + sums.adjust[1] + sums.adjust[2];

      return total;
    };

    let refresh = (index) => {
      if (index) {
        this.initialRange = index;
      }
      document.querySelector(".ogk-stats-content .ogl-tab.ogl-active").click();
    };

    content.appendChild(
      this.tabs({
        D: () => {
          let date = new Date();
          let sum = {
            found: [0, 0, 0, 0],
            harvest: [0, 0],
            losses: {
              202: 0,
              203: 0,
              210: 0,
              204: 0,
              205: 0,
              206: 0,
              219: 0,
              207: 0,
              215: 0,
              211: 0,
              213: 0,
              218: 0,
            },
            fleet: {
              202: 0,
              203: 0,
              210: 0,
              204: 0,
              205: 0,
              206: 0,
              219: 0,
              207: 0,
              215: 0,
              211: 0,
              213: 0,
              218: 0,
            },
            type: {},
            fuel: 0,
            adjust: [0, 0, 0],
          };

          let profits = [];
          let max = 0;
          for (let i = 0; i < 12; i++) {
            let dateStr = getFormatedDate(date.getTime(), "[d].[m].[y]");
            let sums = this.json.expeditionSums[dateStr] || sum;
            let profit = sums ? getTotal(sums) : 0;
            if (Math.abs(profit) > max) max = profit;
            profits.push({
              date: new Date(date.getTime()),
              range: sums,
              profit: profit,
            });
            date.setDate(date.getDate() - 1);
          }

          let div = this.createDOM("div");
          let details = renderDetails(
            computeRangeSums(this.json.expeditionSums, new Date(), new Date()),
            () => refresh()
            // {}
          );
          div.appendChild(
            this.profitGraph(profits, max, (range, index) => {
              details.remove();
              details = renderDetails(range, () => {
                refresh(index);
              });
              div.appendChild(details);
            })
          );
          div.appendChild(details);

          return div;
        },
        W: () => {
          let renderHeader = () => {};

          let weeks = [];
          let totals = [];
          let start = new Date();
          var prevMonday = new Date();
          let max = -Infinity;
          prevMonday.setDate(
            prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
          );
          for (let i = 0; i < 12; i++) {
            let range = computeRangeSums(
              this.json.expeditionSums,
              start,
              prevMonday
            );
            weeks.push(range);
            let total = getTotal(range);
            totals.push({
              profit: total,
              range: range,
              date: prevMonday,
              start: start,
            });
            if (total > max) max = total;
            start = new Date(prevMonday);
            start.setDate(start.getDate() - 1);
            prevMonday = new Date(start);
            prevMonday.setDate(
              prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
            );
          }

          let div = this.createDOM("div");
          let details = renderDetails(weeks[0]);
          div.appendChild(
            this.profitGraph(totals, max, (range, index) => {
              details.remove();
              details = renderDetails(range);
              div.appendChild(details);
            })
          );
          div.appendChild(details);
          return div;
        },
        M: () => {
          var lastDay = new Date();
          var firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);

          let max = -Infinity;
          let months = [];
          let totals = [];
          for (let i = 0; i < 12; i++) {
            let range = computeRangeSums(
              this.json.expeditionSums,
              lastDay,
              firstDay
            );
            months.push(range);
            let total = getTotal(range);
            totals.push({
              profit: total,
              range: range,
              date: firstDay,
              start: lastDay,
            });
            if (total > max) max = total;

            lastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 0);
            firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
          }

          let div = this.createDOM("div");
          let details = renderDetails(months[0]);
          div.appendChild(
            this.profitGraph(totals, max, (range, index) => {
              details.remove();
              details = renderDetails(range);
              div.appendChild(details);
            })
          );
          div.appendChild(details);
          return div;
        },
        All: () => {
          let keys = Object.keys(this.json.expeditionSums).sort((a, b) => {
            return this.dateStrToDate(a) - this.dateStrToDate(b);
          });
          let minDate = keys[0];
          let maxDate = keys[keys.length - 1];
          let range = computeRangeSums(
            this.json.expeditionSums,
            this.dateStrToDate(maxDate),
            this.dateStrToDate(minDate)
          );

          let total = getTotal(range);
          let content = this.createDOM("div", { class: "ogk-profit" });

          let title = content.appendChild(
            this.createDOM("div", { class: "ogk-date" })
          );

          content.appendChild(
            this.createDOM("div", { class: "ogk-scroll-wrapper" })
          );

          let contentHtml = `<strong>${getFormatedDate(
            this.dateStrToDate(minDate).getTime(),
            "[d].[m].[y]"
          )}</strong> <span class="${total > 0 ? "undermark" : "overmark"}">${
            total > 0 ? " +" : " -"
          }${getNumberFormatShort(Math.abs(total), 2)}</strong></span>`;

          contentHtml += `<strong>${getFormatedDate(
            this.dateStrToDate(maxDate).getTime(),
            "[d].[m].[y]"
          )}</strong>`;
          title.html(contentHtml);
          let div = this.createDOM("div");
          div.appendChild(content);
          div.appendChild(renderDetails(range));

          return div;
        },
      })
    );

    return content;
  }

  combatStats() {
    let ressources = ["Metal", "Crystal", "Deuterium", "AM"];

    let content = this.createDOM("div", { class: "ogk-stats-content" });

    let renderDetails = (sums, onchange) => {
      let content = this.createDOM("div", { class: "ogk-stats" });

      let globalDiv = content.appendChild(
        this.createDOM("div", { class: "ogk-global" })
      );

      globalDiv.appendChild(this.winGraph(sums.wins, sums.draws, sums.count));

      globalDiv.appendChild(
        this.createDOM("span", { class: "ogk-center" }, sums.count)
      );

      globalDiv.appendChild(
        this.createDOM("h1", { class: "ogk-top-title" }, "Best combats")
      );
      let topDiv = globalDiv.appendChild(
        this.createDOM("div", { class: "ogk-top" })
      );

      topDiv.appendChild(
        this.createDOM("p", { style: "margin-bottom: 5px" }, "Name")
      );
      topDiv.appendChild(this.createDOM("div", { class: "ogk-head" }, "Loot"));
      topDiv.appendChild(
        this.createDOM("div", { class: "ogk-head" }, "Damages")
      );
      topDiv.appendChild(
        this.createDOM("div", { class: "ogk-head" }, "Debris")
      );

      sums.topCombats.forEach(async (top) => {
        if (!top.loot) top.loot = 0;
        let player = await dataHelper.getPlayer(top.ennemi);
        topDiv.appendChild(this.createDOM("p", {}, player.name));
        topDiv.appendChild(
          this.createDOM(
            "div",
            { class: top.loot > 0 ? "undermark" : "overmark" },
            this.formatToUnits(top.loot)
          )
        );
        topDiv.appendChild(
          this.createDOM(
            "div",
            { class: "overmark" },
            "-" + this.formatToUnits(top.losses)
          )
        );
        topDiv.appendChild(
          this.createDOM(
            "div",
            { class: "debris" },
            this.formatToUnits(top.debris)
          )
        );
      });

      let details = content.appendChild(
        this.createDOM("div", { class: "ogk-details" })
      );

      let losses = this.getFleetCost(sums.losses);

      let box = this.resourceBox(
        [
          {
            title: "Loot",
            metal: sums.loot[0],
            crystal: sums.loot[1],
            deuterium: sums.loot[2],
          },
          {
            title: "Recycled",
            metal: sums.harvest[0],
            crystal: sums.harvest[1],
            deuterium: 0,
          },
          {
            title: "Losses",
            metal: -losses[0],
            crystal: -losses[1],
            deuterium: -losses[2],
          },
          { title: "Fuel", metal: 0, crystal: 0, deuterium: sums.fuel },
          {
            title: "Adjust",
            metal: sums.adjust[0],
            crystal: sums.adjust[1],
            deuterium: sums.adjust[2],
            edit: onchange ? true : false,
          },
        ],
        false,
        () => {
          globalDiv.empty();
          globalDiv.appendChild(
            this.adjustBox(sums.adjust, (adjust) => {
              let date = document.querySelector(".ogk-date strong").innerText;
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
              this.json.combatsSums[date].adjust = adjust;
              this.saveData();
              onchange();
            })
          );
        }
      );
      details.appendChild(box);

      details.appendChild(this.shipsBox(sums.losses, true));

      let harvestSums = [0, 0];
      Object.entries(this.json.harvests).forEach((harvest) => {
        harvest = harvest[1];

        if (harvest.coords.split(":")[2] == 16) {
          harvestSums[0] += harvest.metal;
          harvestSums[1] += harvest.crystal;
        }
      });
      return content;
    };

    let computeRangeSums = (sums, start, stop) => {
      let weekSums = {
        loot: [0, 0, 0],
        harvest: [0, 0],
        losses: {
          202: 0,
          203: 0,
          210: 0,
          204: 0,
          205: 0,
          206: 0,
          219: 0,
          207: 0,
          215: 0,
          211: 0,
          213: 0,
          218: 0,
        },
        fuel: 0,
        adjust: [0, 0, 0],
        topCombats: [],
        count: 0,
        wins: 0,
        draws: 0,
      };

      for (
        var d = new Date(start);
        d >= new Date(stop);
        d.setDate(d.getDate() - 1)
      ) {
        let dateStr = getFormatedDate(new Date(d).getTime(), "[d].[m].[y]");
        if (sums[dateStr]) {
          weekSums.fuel += sums[dateStr].fuel;
          [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
            (id) => {
              weekSums.losses[id] += sums[dateStr].losses[id] || 0;
            }
          );
          sums[dateStr].loot.forEach((value, index) => {
            weekSums.loot[index] += sums[dateStr].loot[index];
          });
          sums[dateStr].harvest.forEach((value, index) => {
            weekSums.harvest[index] += sums[dateStr].harvest[index];
          });
          sums[dateStr].adjust.forEach((value, index) => {
            weekSums.adjust[index] += sums[dateStr].adjust[index];
          });

          sums[dateStr].topCombats.forEach((top) => {
            weekSums.topCombats.push(top);
          });
          weekSums.count += sums[dateStr].count;
          weekSums.wins += sums[dateStr].wins;
          weekSums.draws += sums[dateStr].draws;
        }
      }
      weekSums.topCombats.sort((a, b) => {
        if (a.loot) {
          return b.debris + Math.abs(b.loot) - (a.debris + Math.abs(a.loot));
        }
        return b.debris - a.debris;
      });

      weekSums.topCombats = weekSums.topCombats.slice(0, 3);

      return weekSums;
    };

    let getTotal = (sums) => {
      let total = 0;
      let losses = this.getFleetCost(sums.losses);
      total -= losses[0] + losses[1] + losses[2];
      total += sums.harvest[0] + sums.harvest[1];
      total += sums.loot[0] + sums.loot[1] + sums.loot[2];
      total += sums.adjust[0] + sums.adjust[1] + sums.adjust[2];

      return total;
    };

    let refresh = (index) => {
      if (index) {
        this.initialRange = index;
      }
      document.querySelector(".ogk-stats-content .ogl-tab.ogl-active").click();
    };

    content.appendChild(
      this.tabs({
        D: () => {
          let date = new Date();
          let sum = {
            loot: [0, 0, 0],
            harvest: [0, 0],
            losses: {
              202: 0,
              203: 0,
              210: 0,
              204: 0,
              205: 0,
              206: 0,
              219: 0,
              207: 0,
              215: 0,
              211: 0,
              213: 0,
              218: 0,
            },
            adjust: [0, 0, 0],
            fuel: 0,
            topCombats: [],
            count: 0,
            wins: 0,
            draws: 0,
          };

          let profits = [];
          let max = 0;
          for (let i = 0; i < 12; i++) {
            let dateStr = getFormatedDate(date.getTime(), "[d].[m].[y]");
            let sums = this.json.combatsSums[dateStr] || sum;
            let profit = sums ? getTotal(sums) : 0;
            if (Math.abs(profit) > max) max = profit;
            profits.push({
              date: new Date(date.getTime()),
              range: sums,
              profit: profit,
            });
            date.setDate(date.getDate() - 1);
          }

          let div = this.createDOM("div");
          let details = renderDetails(
            computeRangeSums(this.json.combatsSums, new Date(), new Date()),
            () => {
              refresh();
            }
          );
          div.appendChild(
            this.profitGraph(profits, max, (range, index) => {
              details.remove();
              details = renderDetails(range, () => {
                refresh(index);
              });
              div.appendChild(details);
            })
          );
          div.appendChild(details);

          return div;
        },
        W: () => {
          let renderHeader = () => {};

          let weeks = [];
          let totals = [];
          let start = new Date();
          var prevMonday = new Date();
          let max = -Infinity;
          prevMonday.setDate(
            prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
          );
          for (let i = 0; i < 12; i++) {
            let range = computeRangeSums(
              this.json.combatsSums,
              start,
              prevMonday
            );
            weeks.push(range);
            let total = getTotal(range);
            totals.push({
              profit: total,
              range: range,
              date: prevMonday,
              start: start,
            });
            if (total > max) max = total;
            start = new Date(prevMonday);
            start.setDate(start.getDate() - 1);
            prevMonday = new Date(start);
            prevMonday.setDate(
              prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7)
            );
          }

          let div = this.createDOM("div");
          let details = renderDetails(weeks[0]);
          div.appendChild(
            this.profitGraph(totals, max, (range, index) => {
              details.remove();
              details = renderDetails(range);
              div.appendChild(details);
            })
          );
          div.appendChild(details);
          return div;
        },
        M: () => {
          var lastDay = new Date();
          var firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);

          let max = -Infinity;
          let months = [];
          let totals = [];
          for (let i = 0; i < 12; i++) {
            let range = computeRangeSums(
              this.json.combatsSums,
              lastDay,
              firstDay
            );
            months.push(range);
            let total = getTotal(range);
            totals.push({
              profit: total,
              range: range,
              date: firstDay,
              start: lastDay,
            });
            if (total > max) max = total;

            lastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 0);
            firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
          }

          let div = this.createDOM("div");
          let details = renderDetails(months[0]);
          div.appendChild(
            this.profitGraph(totals, max, (range, index) => {
              details.remove();
              details = renderDetails(range);
              div.appendChild(details);
            })
          );
          div.appendChild(details);
          return div;
        },
        All: () => {
          let keys = Object.keys(this.json.combatsSums).sort((a, b) => {
            return this.dateStrToDate(a) - this.dateStrToDate(b);
          });
          let minDate = keys[0];
          let maxDate = keys[keys.length - 1];
          let range = computeRangeSums(
            this.json.combatsSums,
            this.dateStrToDate(maxDate),
            this.dateStrToDate(minDate)
          );

          let total = getTotal(range);
          let content = this.createDOM("div", { class: "ogk-profit" });

          let title = content.appendChild(
            this.createDOM("div", { class: "ogk-date" })
          );

          content.appendChild(
            this.createDOM("div", { class: "ogk-scroll-wrapper" })
          );

          let contentHtml = `<strong>${getFormatedDate(
            this.dateStrToDate(minDate).getTime(),
            "[d].[m].[y]"
          )}</strong> <span class="${total > 0 ? "undermark" : "overmark"}">${
            total > 0 ? " +" : " -"
          }${getNumberFormatShort(Math.abs(total), 2)}</strong></span>`;

          contentHtml += `<strong>${getFormatedDate(
            this.dateStrToDate(maxDate).getTime(),
            "[d].[m].[y]"
          )}</strong>`;
          title.html(contentHtml);
          let div = this.createDOM("div");
          div.appendChild(content);
          div.appendChild(renderDetails(range));

          return div;
        },
      })
    );

    return content;
  }

  blackHoleBox(onValidate) {
    let box = this.createDOM("div", { class: "ogk-box ogk-small" });

    let fleet = box.appendChild(
      this.createDOM("div", { class: "ogk-bhole-grid" })
    );

    let inputs = [];

    [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
      (id) => {
        fleet.appendChild(
          this.createDOM("a", {
            class: "ogl-option ogl-fleet-ship ogl-fleet-" + id,
          })
        );
        let input = fleet.appendChild(
          this.createDOM("input", {
            class: "ogl-formatInput",
            type: "text",
            data: id,
            value: 0,
          })
        );
        inputs.push(input);
      }
    );

    if (onValidate) {
      let btn = box.appendChild(
        this.createDOM("button", { class: "btn_blue" }, "OK")
      );
      btn.addEventListener("click", () => {
        let fleet = {};
        inputs.forEach((input) => {
          let id = Number(input.getAttribute("data"));
          fleet[id] = this.removeNumSeparator(input.value);
        });
        let cost = this.getFleetCost(fleet);
        onValidate(cost);
      });
    }
    return box;
  }

  shipsBox(ships, minus) {
    let fleetDetail = this.createDOM("div", { class: "ogk-box" });

    let fleet = fleetDetail.appendChild(
      this.createDOM("div", { class: "ogk-fleet" })
    );

    [202, 203, 210, 204, 205, 206, 219, 207, 215, 211, 213, 218].forEach(
      (id) => {
        let shipDiv = fleet.appendChild(this.createDOM("div"));
        shipDiv.appendChild(
          this.createDOM("a", {
            class: "ogl-option ogl-fleet-ship ogl-fleet-" + id,
          })
        );
        shipDiv.appendChild(
          this.createDOM(
            "span",
            { class: ships[id] && minus ? "overmark" : "" },
            ships[id] ? dotted(ships[id]) : "-"
          )
        );
      }
    );

    return fleetDetail;
  }

  adjustBox(adjustments, onValidate) {
    let box = this.createDOM("div", { class: "ogk-box ogk-small" });
    let prod = box.appendChild(
      this.createDOM("div", { class: "ogk-adjust-grid" })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon metal"></a>`
      )
    );
    let metInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput metal",
        type: "text",
        value: adjustments[0],
      })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon crystal"></a>`
      )
    );
    let criInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput crystal",
        type: "text",
        value: adjustments[1],
      })
    );

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon deuterium"></a>`
      )
    );

    let deutInput = prod.appendChild(
      this.createDOM("input", {
        class: "ogl-formatInput deuterium",
        type: "text",
        value: adjustments[2],
      })
    );

    if (onValidate) {
      let btn = box.appendChild(
        this.createDOM("button", { class: "btn_blue" }, "OK")
      );

      btn.addEventListener("click", () => {
        onValidate([
          Number(this.removeNumSeparator(metInput.value)),
          Number(this.removeNumSeparator(criInput.value)),
          Number(this.removeNumSeparator(deutInput.value)),
        ]);
      });
    }

    return box;
  }

  resourceBox(rows, am, callback) {
    let box = this.createDOM("div", { class: "ogk-box" });
    let prod = box.appendChild(this.createDOM("div", { class: "ogk-grid" }));
    if (am) prod.classList.add("ogk-am");
    prod.appendChild(this.createDOM("span"));

    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon metal"></a>`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon crystal"></a>`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        {},
        `<a class="ogl-option resourceIcon deuterium"></a>`
      )
    );

    if (am) {
      prod.appendChild(
        this.createDOM(
          "span",
          {},
          `<a class="ogl-option resourceIcon darkmatter"></a>`
        )
      );
    }

    let totAm = 0;
    let sums = [0, 0, 0];
    rows.forEach((row) => {
      let p = prod.appendChild(this.createDOM("p", {}, row.title));
      if (row.edit) {
        p.appendChild(
          this.createDOM(
            "strong",
            {},
            `<span style="    display: inline-block;
          vertical-align: middle;
          float: none;
          margin-left: 5px;
          border-radius: 4px;
          margin-bottom: 1px;
          width: 17px;" class="planetMoveIcons settings planetMoveGiveUp icon"></span>`
          )
        );
        p.classList.add("ogk-edit");
        p.addEventListener("click", () => {
          callback();
        });
      }
      prod.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-metal" + (row.metal < 0 ? " overmark" : "") },
          `${row.metal == 0 ? "-" : this.formatToUnits(row.metal)}`
        )
      );
      prod.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-crystal" + (row.crystal < 0 ? " overmark" : "") },
          `${row.crystal == 0 ? "-" : this.formatToUnits(row.crystal)}`
        )
      );
      prod.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-deut" + (row.deuterium < 0 ? " overmark" : "") },
          `${row.deuterium == 0 ? "-" : this.formatToUnits(row.deuterium)}`
        )
      );
      if (am) {
        if (row.am) {
          totAm = row.am;
          prod.appendChild(
            this.createDOM("span", {}, `${this.formatToUnits(row.am)}`)
          );
        } else {
          prod.appendChild(this.createDOM("span", {}, "-"));
        }
      }
      sums[0] += row.metal;
      sums[1] += row.crystal;
      sums[2] += row.deuterium;
    });

    prod.appendChild(this.createDOM("p", { class: "ogk-total" }, `Total`));
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-metal ogk-total" + (sums[0] < 0 ? " overmark" : "") },
        `${this.formatToUnits(sums[0])}`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal ogk-total" + (sums[1] < 0 ? " overmark" : "") },
        `${this.formatToUnits(sums[1])}`
      )
    );
    prod.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-deut ogk-total" + (sums[2] < 0 ? " overmark" : "") },
        `${this.formatToUnits(sums[2])}`
      )
    );
    if (am) {
      prod.appendChild(
        this.createDOM(
          "span",
          { class: "ogk-total" },
          `${this.formatToUnits(totAm)}`
        )
      );
    }

    return box;
  }

  expeditionGraph(sums) {
    let div = this.createDOM("div");

    let chartNode = div.appendChild(
      this.createDOM("canvas", {
        id: "piechart",
        width: "400px",
        height: "300px",
      })
    );
    let config = {
      type: "doughnut",
      data: {
        datasets: [
          {
            data: [
              sums["Metal"] || 0,
              sums["Crystal"] || 0,
              sums["Deuterium"] || 0,
              sums["AM"] || 0,
              sums["Object"] || 0,
              sums["Fleet"] || 0,
              sums["Aliens"] || 0,
              sums["Pirates"] || 0,
              sums["Late"] || 0,
              sums["Early"] || 0,
              sums["Bhole"] || 0,
              sums["Void"] || 0,
            ],
            label: "expeditions",
            backgroundColor: [
              "#ffaacca1",
              "#73e5ffc7",
              "#a6e0b0",
              "#ddd",
              "#c08931",
              "#782c2f",
              "#35b700",
              "#734a26",
              "#656565",
              "#adadad",
              "#614bb1",
              "#344051",
            ],
            borderColor: "#1b232c",
          },
        ],

        labels: [
          "Metal",
          "Crystal",
          "Deut",
          "D. Matter",
          "Objects",
          "Fleet",
          "Aliens",
          "Pirates",
          "Late",
          "Early",
          "B. Hole",
          "Empty",
        ],
      },
      options: {
        legend: {
          display: false,
        },
        title: {
          display: false,
        },
        animation: {
          animateScale: true,
          animateRotate: true,
        },
        plugins: {
          labels: [
            {
              fontSize: 15,
              fontStyle: "bold",
              textMargin: 10,
              render: "label",
              fontColor: "#ccc",
              position: "outside",
            },
            {
              fontSize: 15,
              fontStyle: "bold",
              fontColor: "#0d1117",
              render: "percentage",
            },
          ],
        },
      },
    };

    var ctx = chartNode.getContext("2d");
    let chart = new Chart(ctx, config);

    return div;
  }

  generateMMORPGLink(playerid) {
    let lang = [
      "fr",
      "de",
      "en",
      "es",
      "pl",
      "it",
      "ru",
      "ar",
      "mx",
      "tr",
      "fi",
      "tw",
      "gr",
      "br",
      "nl",
      "hr",
      "sk",
      "cz",
      "ro",
      "us",
      "pt",
      "dk",
      "no",
      "se",
      "si",
      "hu",
      "jp",
      "ba",
    ].indexOf(this.gameLang);

    return `https://www.mmorpg-stat.eu/0_fiche_joueur.php?pays=${lang}&ftr=${playerid}.dat&univers=_${this.universe}`;
  }

  generateHiscoreLink(playerid) {
    return `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=highscore&searchRelId=${playerid}`;
  }

  playerSearch(show, name) {
    let getStatus = (status, noob) => {
      if (status == "") {
        if (noob) return "status_abbr_noob";
        return "status_abbr_active";
      }
      if (status.includes("b")) return "status_abbr_banned";
      if (status.includes("v")) return "status_abbr_vacation";
      if (status.includes("i")) return "status_abbr_inactive";
      if (status.includes("I")) return "status_abbr_longinactive";
      if (status.includes("o")) return "status_abbr_outlaw";
    };

    let renderPlayerInfo = (player) => {
      this.json.playerSearch = player.name;
      this.saveData();

      let planetsColumn = this.createDOM("div", { class: "ogl-planets-col" });

      let controlRow = planetsColumn.appendChild(
        this.createDOM("div", { class: "ogl-search-controls" })
      );

      // let playerTitleNode =
      // controlRow.appendChild(playerNode.cloneNode(true)); let alliance = "";
      let name = `<span class="ogl-${player.status}">${
        player.name
      }</span> ${status}
                  <a target="_self"
                    href="https://s${this.universe}-${
        this.gameLang
      }.ogame.gameforge.com/game/index.php?page=highscore&searchRelId=${
        player.id
      }"
                    class="ogl-ranking">#${player.points.position || "b"}
                  </a>`;

      controlRow.appendChild(this.createDOM("span", {}, name));

      let btns = controlRow.appendChild(this.createDOM("div"));
      let pinBtn = btns.appendChild(this.createDOM("a", { class: "ogl-pin" }));
      let stats = btns.appendChild(
        this.createDOM("a", { class: "ogl-mmorpgstats" })
      );
      let chat = btns.appendChild(
        this.createDOM("a", { class: "icon icon_chat" })
      );

      pinBtn.addEventListener("click", () => {
        this.sideStalk(player.id);
      });
      chat.addEventListener("click", () => {
        this.sendMessage(player.id);
      });
      stats.addEventListener("click", () => {
        window.open(
          this.generateMMORPGLink(player.id),
          "_blank",
          `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
        );
      });

      let detailRank = planetsColumn.appendChild(
        this.createDOM("div", { class: "ogl-detailRank" })
      );

      let dotted = (value) => {
        return parseInt(value).toLocaleString("de-DE");
      };

      detailRank.html(`
          <div><div class="ogl-totalIcon"></div> ${this.formatToUnits(
            player.points.score
          )} <small>pts</small></div>
          <div><div class="ogl-ecoIcon"></div> ${this.formatToUnits(
            player.economy.score
          )} <small>pts</small></div>
          <div><div class="ogl-techIcon"></div> ${this.formatToUnits(
            player.research.score
          )} <small>pts</small></div>
          <div><div class="ogl-fleetIcon"></div> ${this.formatToUnits(
            player.military.score
          )} <small>pts</small></div>
          <div><div class="ogl-fleetIcon grey"></div> ${this.formatToUnits(
            player.def
          )} <small>pts</small></div>
          <div><div class="ogl-fleetIcon orange"></div> ${this.formatToUnits(
            player.military.ships
          )} <small>ships</small></div>
          `);

      let stalkPlanets = this.createDOM("div", {
        class: "ogl-stalkPlanets",
        "player-id": player.id,
      });
      planetsColumn.appendChild(stalkPlanets);

      this.updateStalk(player.planets).forEach((e) =>
        stalkPlanets.appendChild(e)
      );
      this.highlightTarget();

      let updateTime = planetsColumn.appendChild(
        this.createDOM("div", { class: "ogl-right ogl-date" })
      );
      updateTime.innerText = this.timeSince(new Date(player.lastUpdate));

      return planetsColumn;
    };

    let activeId, activeNode;
    let updatePlayerList = (players, forced) => {
      players.forEach(async (player, index) => {
        if (forced && index != 0) return;
        if (!player.points) {
          player.points = player.economy = player.research = player.military = {
            position: 0,
            score: 0,
          };
        }

        let noob = false;

        let self = await dataHelper.getPlayer(playerId);
        let currentScore = self.points.score;

        if (currentScore > 500000) {
          if (player.points.score < 500000) {
            if (player.points.score < 50000) {
              noob = currentScore / player.points.score > 5;
            } else {
              noob = currentScore / player.points.score > 10;
            }
          }
        }

        let playerNode = this.createDOM("div", { class: "ogl-player-div" });
        let name = this.createDOM(
          "span",
          { class: getStatus(player.status, noob) },
          `${player.name} ${
            player.status == "" ? "" : "(" + player.status + ") "
          }`
        );
        playerNode.appendChild(
          this.createDOM(
            "a",
            {
              href: this.generateHiscoreLink(player.id),
              class: "ogl-ranking",
            },
            `#${player.points.position || "b"}`
          )
        );

        let alliance = "";
        if (player.alliance) alliance = player.alliance.split(" ")[0];

        playerNode.appendChild(name);
        let alliNode = playerNode.appendChild(
          this.createDOM("span", { class: "ogl-alliance" }, alliance)
        );
        alliNode.addEventListener("click", (e) => {
          input.value = alliance.replace("[", "").replace("]", "");
          e.stopPropagation();
          updateSearch(input.value, alliance);
        });

        if (activeId == player.id) playerNode.classList.add("ogl-active");

        playerNode.addEventListener("click", () => {
          this.json.searchHistory.forEach((elem, i) => {
            if (elem.id == player.id) {
              this.json.searchHistory.splice(i, 1);
            }
          });
          this.json.searchHistory.push(player);
          if (this.json.searchHistory.length > 5) {
            this.json.searchHistory.shift();
          }
          this.saveData();

          if (activeNode) activeNode.classList.remove("ogl-active");
          playerNode.classList.add("ogl-active");
          activeNode = playerNode;
          activeId = player.id;

          dataHelper.getPlayer(player.id).then((pl) => {
            let div = content.querySelector(".ogl-planets-col");
            if (div) div.remove();
            content.appendChild(renderPlayerInfo(pl));
          });
        });
        searchResult.appendChild(playerNode);
        if (forced) playerNode.click();
      });
    };

    let updateSearch = async (value, alliance, forced) => {
      searchResult.empty();

      if (value.length > 2) {
        var possible = await dataHelper.filter(value, alliance);

        possible.sort((a, b) => {
          if (alliance) {
            if (!a.points) a.points = { position: 10000 };
            if (!b.points) b.points = { position: 10000 };
            return a.points.position - b.points.position;
          } else {
            return a.name - b.name;
          }
        });

        updatePlayerList(possible, forced);

        if (possible.length == 0) {
          searchResult.appendChild(
            this.createDOM(
              "div",
              { style: "text-align: center;" },
              "No results..."
            )
          );
        }
      } else {
        searchResult.appendChild(
          this.createDOM("div", { class: "historic" }, "Historic")
        );
        updatePlayerList(this.json.searchHistory.slice().reverse());
      }
    };

    let content = this.createDOM("div", { class: "ogl-search-content" });
    let searchColumn = content.appendChild(
      this.createDOM("div", { class: "ogl-search-col" })
    );

    let input = searchColumn.appendChild(
      this.createDOM("input", {
        type: "search",
        placeholder: "Player",
      })
    );
    input.addEventListener("keyup", () => {
      updateSearch(input.value, false);
    });

    let searchResult = content.appendChild(
      this.createDOM("div", { class: "ogl-search-result" })
    );
    setTimeout(() => {
      $(".ogl-search-result").mCustomScrollbar({ theme: "ogame" });
      searchResult = document.querySelector(
        ".ogl-search-content .mCSB_container"
      );
    }, 200);

    searchResult.appendChild(
      this.createDOM("div", { class: "historic" }, "Historic")
    );
    updatePlayerList(this.json.searchHistory.slice().reverse());

    if (name) {
      updateSearch(name, false, true);
      input.value = name;
    }

    if (show) {
      document.querySelector("#planetList").style.display = "none";
      document.querySelector("#countColonies").style.display = "none";
      document.querySelector("#rechts").children[0].appendChild(content);
      document.querySelector(".ogl-search-content input").focus();
    } else {
      document.querySelector("#planetList").style.display = "block";
      document.querySelector("#countColonies").style.display = "block";
      document.querySelector(".ogl-search-content").remove();
      this.json.playerSearch = "";
      this.saveData();
    }
  }

  minesOverview() {
    let content = this.createDOM("div", { class: "ogl-mines-content" });
    let table = content.appendChild(
      this.createDOM("table", { class: "ogl-fleet-table" })
    );

    let header = table.appendChild(this.createDOM("tr"));
    header.appendChild(this.createDOM("th"));
    let metalRow = table.appendChild(this.createDOM("tr"));
    let crystalRow = table.appendChild(this.createDOM("tr"));
    let deutRow = table.appendChild(this.createDOM("tr"));
    let nrjRow = table.appendChild(this.createDOM("tr"));

    metalRow.appendChild(
      this.createDOM(
        "td",
        {},
        '<div class="ogl-option resourceIcon metal"></div>'
      )
    );
    crystalRow.appendChild(
      this.createDOM(
        "td",
        {},
        '<div class="ogl-option resourceIcon crystal"></div>'
      )
    );
    deutRow.appendChild(
      this.createDOM(
        "td",
        {},
        '<div class="ogl-option resourceIcon deuterium"></div>'
      )
    );
    nrjRow.appendChild(
      this.createDOM(
        "td",
        {},
        '<div class="ogl-option resourceIcon energy"></div>'
      )
    );

    this.json.empire.forEach((planet) => {
      let current = false;
      if (planet.coordinates.slice(1, -1) == this.current.coords) {
        current = true;
      }

      let link = `?page=ingame&component=supplies&cp=${planet.id}`;
      header.appendChild(
        this.createDOM(
          "th",
          {},
          `<p>${planet.name}</p> <a href="${link}" class="ogl-fleet-coords">${planet.coordinates}</a> <span class="ogl-planet-fields">${planet.fieldUsed} / ${planet.fieldMax}</span>`
        )
      );
      let td = metalRow.appendChild(this.createDOM("td"));
      td.appendChild(this.createDOM("div", { class: "ogl-metal" }, planet[1]));
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-metal" },
          this.formatToUnits(planet.production.hourly[0])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-metal" },
          this.formatToUnits(planet.production.daily[0])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-metal" },
          this.formatToUnits(planet.production.weekly[0])
        )
      );
      if (current) td.classList.add("ogl-current");

      td = crystalRow.appendChild(this.createDOM("td"));
      td.appendChild(
        this.createDOM("div", { class: "ogl-crystal" }, planet[2])
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-crystal" },
          this.formatToUnits(planet.production.hourly[1])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-crystal" },
          this.formatToUnits(planet.production.daily[1])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-crystal" },
          this.formatToUnits(planet.production.weekly[1])
        )
      );
      if (current) td.classList.add("ogl-current");

      td = deutRow.appendChild(this.createDOM("td"));
      td.appendChild(this.createDOM("div", { class: "ogl-deut" }, planet[3]));
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-deut" },
          this.formatToUnits(planet.production.hourly[2])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-deut" },
          this.formatToUnits(planet.production.daily[2])
        )
      );
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-deut" },
          this.formatToUnits(planet.production.weekly[2])
        )
      );
      if (current) td.classList.add("ogl-current");

      td = nrjRow.appendChild(this.createDOM("td"));
      td.appendChild(this.createDOM("div", { class: "ogl-energy" }, planet[4]));
      let diff = planet.production.hourly[3];
      td.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-energy " + (diff >= 0 ? "undermark" : "overmark") },
          this.formatToUnits(diff)
        )
      );
      if (current) td.classList.add("ogl-current");
    });

    header.appendChild(this.createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));

    let sumlvl = (key) => {
      return this.json.empire.reduce((a, b) => a + Number(b[key]), 0);
    };
    let sumhour = (key) => {
      return this.json.empire.reduce((a, b) => {
        return a + Number(b.production.hourly[key]);
      }, 0);
    };
    let sumday = (key) => {
      return this.json.empire.reduce((a, b) => {
        return a + Number(b.production.daily[key]);
      }, 0);
    };
    let sumweek = (key) => {
      return this.json.empire.reduce((a, b) => {
        return a + Number(b.production.weekly[key]);
      }, 0);
    };

    let td = metalRow.appendChild(this.createDOM("td"));
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-metal" },
        (sumlvl(1) / this.json.empire.length).toFixed(1)
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-metal" },
        this.formatToUnits(sumhour(0))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-metal" },
        this.formatToUnits(sumday(0))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-metal" },
        this.formatToUnits(sumweek(0))
      )
    );

    td = crystalRow.appendChild(this.createDOM("td"));
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-crystal" },
        (sumlvl(2) / this.json.empire.length).toFixed(1)
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-crystal" },
        this.formatToUnits(sumhour(1))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-crystal" },
        this.formatToUnits(sumday(1))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-crystal" },
        this.formatToUnits(sumweek(1))
      )
    );

    td = deutRow.appendChild(this.createDOM("td"));
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-deut" },
        (sumlvl(3) / this.json.empire.length).toFixed(1)
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-deut" },
        this.formatToUnits(sumhour(2))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-deut" },
        this.formatToUnits(sumday(2))
      )
    );
    td.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-deut" },
        this.formatToUnits(sumweek(2))
      )
    );

    td = nrjRow.appendChild(this.createDOM("td"));

    return content;
  }

  generateGalaxyLink(galaxy, system, position) {
    return `?page=ingame&component=galaxy&galaxy=${galaxy}&system=${system}&position=${position}`;
  }

  fleetOverview(moon) {
    let content = this.createDOM("div", { class: "ogl-fleet-content" });
    let table = this.createDOM("table", { class: "ogl-fleet-table" });
    let row = this.createDOM("tr");
    let td = this.createDOM("th");

    let planetIcon = this.createDOM("span", {
      class: "ogl-planet " + (!moon ? "ogl-active" : ""),
    });
    let moonIcon = this.createDOM("span", {
      class: "ogl-moon " + (moon ? "ogl-active" : ""),
    });

    planetIcon.addEventListener("click", () => {
      if (!planetIcon.classList.contains("ogl-active")) {
        content.replaceWith(this.fleetOverview(false));
      }
    });
    moonIcon.addEventListener("click", () => {
      if (!moonIcon.classList.contains("ogl-active")) {
        content.replaceWith(this.fleetOverview(true));
      }
    });

    row.appendChild(
      this.createDOM("th", {}, '<span class="icon_movement"></span>')
    );

    td.appendChild(planetIcon);
    td.appendChild(moonIcon);
    row.appendChild(td);

    this.json.empire.forEach((planet) => {
      let link = `?page=ingame&component=fleetdispatch&cp=${
        planet.moon ? planet.moon.id : planet.id
      }`;
      row.appendChild(
        this.createDOM(
          "th",
          {},
          `<p>${planet.name}</p> <a class="ogl-fleet-coords" href="${link}">${planet.coordinates}</span> `
        )
      );
    });

    row.appendChild(this.createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));

    table.appendChild(row);
    let flying = this.getFlyingRes();

    [
      202,
      203,
      208,
      209,
      210,
      204,
      205,
      206,
      219,
      207,
      215,
      211,
      213,
      218,
      214,
    ].forEach((id) => {
      if (id == 212 || (id > 400 && id < 410)) {
        return;
      }

      row = this.createDOM("tr");

      let shipCount = flying.fleet[id];
      let td = this.createDOM("td", {
        class: shipCount ? "" : "ogl-fleet-empty",
      });
      td.appendChild(
        this.createDOM(
          "span",
          {},
          shipCount ? this.formatToUnits(shipCount) : "-"
        )
      );
      row.appendChild(td);

      let th = row.appendChild(this.createDOM("th"));
      th.appendChild(
        this.createDOM("th", {
          class: "ogl-option ogl-fleet-ship ogl-fleet-" + id,
        })
      );

      let sum = 0;

      this.json.empire.forEach((planet) => {
        let current = false;
        if (planet.coordinates.slice(1, -1) == this.current.coords) {
          current = true;
        }
        sum +=
          moon && planet.moon ? Number(planet.moon[id]) : Number(planet[id]);
        let valuePLa = planet[id] == 0 ? "-" : this.formatToUnits(planet[id]);

        let valueMooon = "-";
        if (planet.moon) {
          valueMooon =
            planet.moon[id] == 0 ? "-" : this.formatToUnits(planet.moon[id]);
        }

        let td = this.createDOM("td", {
          class: valuePLa == "-" ? "ogl-fleet-empty" : "",
        });
        td.appendChild(this.createDOM("span", {}, valuePLa));
        if (moon) {
          td = this.createDOM("td", {
            class: valueMooon == "-" ? "ogl-fleet-empty" : "",
          });
          td.appendChild(this.createDOM("span", {}, valueMooon));
        }

        if (current) {
          td.classList.add("ogl-current");
        }

        row.appendChild(td);
      });

      td = this.createDOM("td", { class: sum == "-" ? "ogl-fleet-empty" : "" });

      td.appendChild(
        this.createDOM("span", {}, sum == 0 ? "-" : this.formatToUnits(sum))
      );
      row.appendChild(td);

      table.appendChild(row);
    });

    content.appendChild(table);

    return content;
  }

  defenseOverview(moon) {
    let content = this.createDOM("div", { class: "ogl-fleet-content" });

    let shipsInfo = JSON.parse(
      '{ "212": { "name": "Satellite solaire" }, "401": { "name": "Lanceur de missiles" }, "402": { "name": "Artillerie laser légère" }, "403": { "name": "Artillerie laser lourde" }, "404": { "name": "Canon de Gauss" }, "405": { "name": "Artillerie à ions" }, "406": { "name": "Lanceur de plasma" }, "407": { "name": "Petit bouclier" }, "408": { "name": "Grand bouclier" }, "502": { "name": "Missile d`interception" }, "503": { "name": "Missile interplanétaire" }, "202": { "id": 202, "name": "Petit transporteur", "baseFuelConsumption": 20, "baseFuelCapacity": 5000, "baseCargoCapacity": 7250, "fuelConsumption": 10, "baseSpeed": 10000, "speed": 32000, "cargoCapacity": 7250, "fuelCapacity": 5000, "number": 1, "recycleMode": 0, "rapidfire": { "205": -3, "215": -3, "214": -250, "210": 5, "212": 5, "217": 5 } }, "203": { "id": 203, "name": "Grand transporteur", "baseFuelConsumption": 50, "baseFuelCapacity": 25000, "baseCargoCapacity": 36250, "fuelConsumption": 25, "baseSpeed": 7500, "speed": 18000, "cargoCapacity": 36250, "fuelCapacity": 25000, "number": 1, "recycleMode": 0, "rapidfire": { "215": -3, "214": -250, "210": 5, "212": 5, "217": 5 } }, "204": { "id": 204, "name": "Chasseur léger", "baseFuelConsumption": 20, "baseFuelCapacity": 50, "baseCargoCapacity": 72, "fuelConsumption": 10, "baseSpeed": 12500, "speed": 30000, "cargoCapacity": 72, "fuelCapacity": 50, "number": 1, "recycleMode": 0, "rapidfire": { "206": -6, "214": -200, "219": -3, "210": 5, "212": 5, "217": 5 } }, "205": { "id": 205, "name": "Chasseur lourd", "baseFuelConsumption": 75, "baseFuelCapacity": 100, "baseCargoCapacity": 145, "fuelConsumption": 37, "baseSpeed": 10000, "speed": 32000, "cargoCapacity": 145, "fuelCapacity": 100, "number": 1, "recycleMode": 0, "rapidfire": { "215": -4, "214": -100, "219": -2, "210": 5, "212": 5, "217": 5, "202": 3 } }, "206": { "id": 206, "name": "Croiseur", "baseFuelConsumption": 300, "baseFuelCapacity": 800, "baseCargoCapacity": 1160, "fuelConsumption": 150, "baseSpeed": 15000, "speed": 48000, "cargoCapacity": 1160, "fuelCapacity": 800, "number": 1, "recycleMode": 0, "rapidfire": { "215": -4, "214": -33, "219": 3, "210": 5, "212": 5, "217": 5, "204": 6, "401": 10 } }, "207": { "id": 207, "name": "Vaisseau de bataille", "baseFuelConsumption": 500, "baseFuelCapacity": 1500, "baseCargoCapacity": 2175, "fuelConsumption": 250, "baseSpeed": 10000, "speed": 49000, "cargoCapacity": 2175, "fuelCapacity": 1500, "number": 1, "recycleMode": 0, "rapidfire": { "215": -7, "214": -30, "218": -7, "210": 5, "212": 5, "217": 5, "219": 5 } }, "208": { "id": 208, "name": "Vaisseau de colonisation", "baseFuelConsumption": 1000, "baseFuelCapacity": 7500, "baseCargoCapacity": 10875, "fuelConsumption": 500, "baseSpeed": 2500, "speed": 8000, "cargoCapacity": 10875, "fuelCapacity": 7500, "number": 1, "recycleMode": 0, "rapidfire": { "214": -250, "210": 5, "212": 5, "217": 5 } }, "209": { "id": 209, "name": "Recycleur", "baseFuelConsumption": 300, "baseFuelCapacity": 20000, "baseCargoCapacity": 29000, "fuelConsumption": 150, "baseSpeed": 2000, "speed": 4800, "cargoCapacity": 29000, "fuelCapacity": 20000, "number": 1, "recycleMode": 0, "rapidfire": { "214": -250, "210": 5, "212": 5, "217": 5 } }, "210": { "id": 210, "name": "Sonde despionnage", "baseFuelConsumption": 1, "baseFuelCapacity": 5, "baseCargoCapacity": 7, "fuelConsumption": 0, "baseSpeed": 100000000, "speed": 240000000, "cargoCapacity": 7, "fuelCapacity": 5, "number": 1, "recycleMode": 0, "rapidfire": { "204": -5, "205": -5, "206": -5, "207": -5, "215": -5, "211": -5, "213": -5, "214": -1250, "218": -5, "219": -5, "202": -5, "203": -5, "208": -5, "209": -5 } }, "211": { "id": 211, "name": "Bombardier", "baseFuelConsumption": 700, "baseFuelCapacity": 500, "baseCargoCapacity": 725, "fuelConsumption": 350, "baseSpeed": 5000, "speed": 24500, "cargoCapacity": 725, "fuelCapacity": 500, "number": 1, "recycleMode": 0, "rapidfire": { "214": -25, "218": -4, "210": 5, "212": 5, "217": 5, "401": 20, "402": 20, "403": 10, "405": 10, "404": 5, "406": 5 } }, "213": { "id": 213, "name": "Destructeur", "baseFuelConsumption": 1000, "baseFuelCapacity": 2000, "baseCargoCapacity": 2900, "fuelConsumption": 500, "baseSpeed": 5000, "speed": 24500, "cargoCapacity": 2900, "fuelCapacity": 2000, "number": 1, "recycleMode": 0, "rapidfire": { "214": -5, "218": -3, "210": 5, "212": 5, "217": 5, "402": 10, "215": 2 } }, "214": { "id": 214, "name": "Étoile de la mort", "baseFuelConsumption": 1, "baseFuelCapacity": 1000000, "baseCargoCapacity": 1450000, "fuelConsumption": 0, "baseSpeed": 100, "speed": 490, "cargoCapacity": 1450000, "fuelCapacity": 1000000, "number": 1, "recycleMode": 0, "rapidfire": { "210": 1250, "212": 1250, "204": 200, "205": 100, "206": 33, "207": 30, "211": 25, "213": 5, "202": 250, "203": 250, "208": 250, "209": 250, "401": 200, "402": 200, "403": 100, "405": 100, "404": 50, "215": 15, "219": 30, "218": 10, "217": 1250 } }, "215": { "id": 215, "name": "Traqueur", "baseFuelConsumption": 250, "baseFuelCapacity": 750, "baseCargoCapacity": 1087, "fuelConsumption": 125, "baseSpeed": 10000, "speed": 49000, "cargoCapacity": 1087, "fuelCapacity": 750, "number": 1, "recycleMode": 0, "rapidfire": { "214": -10, "405": -2, "210": 5, "212": 5, "217": 5, "207": 7, "211": 4, "213": 3 } }, "217": { "id": 217, "name": "Foreuse", "baseFuelConsumption": 0, "baseFuelCapacity": 0, "baseCargoCapacity": 0, "fuelConsumption": 0, "baseSpeed": 0, "speed": 0, "cargoCapacity": 0, "fuelCapacity": 0, "number": 1, "recycleMode": 0, "rapidfire": { "204": -5, "205": -5, "206": -5, "207": -5, "215": -5, "211": -5, "213": -5, "214": -1250, "218": -5, "219": -5, "202": -5, "203": -5, "208": -5, "209": -5 } }, "218": { "id": 218, "name": "Faucheur", "baseFuelConsumption": 1100, "baseFuelCapacity": 10000, "baseCargoCapacity": 14500, "fuelConsumption": 550, "baseSpeed": 7000, "speed": 34300, "cargoCapacity": 14500, "fuelCapacity": 10000, "number": 1, "recycleMode": 2, "rapidfire": { "214": -10, "405": -2, "210": 5, "212": 5, "217": 5, "207": 7, "211": 4, "213": 3 } }, "219": { "id": 219, "name": "Éclaireur", "baseFuelConsumption": 300, "baseFuelCapacity": 10000, "baseCargoCapacity": 14500, "fuelConsumption": 150, "baseSpeed": 12000, "speed": 58800, "cargoCapacity": 14500, "fuelCapacity": 10000, "number": 1, "recycleMode": 3, "rapidfire": { "207": -5, "214": -30, "210": 5, "212": 5, "217": 5, "206": 3, "204": 3, "205": 2 } } }'
    );

    let table = this.createDOM("table", { class: "ogl-fleet-table" });

    let row = this.createDOM("tr");
    let td = this.createDOM("td");

    let planetIcon = this.createDOM("span", {
      class: "ogl-planet " + (!moon ? "ogl-active" : ""),
    });
    let moonIcon = this.createDOM("span", {
      class: "ogl-moon " + (moon ? "ogl-active" : ""),
    });

    planetIcon.addEventListener("click", () => {
      if (!planetIcon.classList.contains("ogl-active")) {
        content.replaceWith(this.defenseOverview(false));
      }
    });
    moonIcon.addEventListener("click", () => {
      if (!moonIcon.classList.contains("ogl-active")) {
        content.replaceWith(this.defenseOverview(true));
      }
    });

    td.appendChild(planetIcon);
    td.appendChild(moonIcon);
    row.appendChild(td);

    this.json.empire.forEach((planet) => {
      let link = `?page=ingame&component=defenses&cp=${
        moon ? planet.moon.id : planet.id
      }`;
      row.appendChild(
        this.createDOM(
          "th",
          {},
          `<p>${planet.name}</p> <a class="ogl-fleet-coords" href="${link}">${planet.coordinates}</span>`
        )
      );
    });

    row.appendChild(this.createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));

    table.appendChild(row);

    Object.keys(shipsInfo).forEach((id) => {
      if (id > 200 && id < 300) {
        return;
      }

      row = this.createDOM("tr");
      let th = row.appendChild(this.createDOM("th"));
      th.appendChild(
        this.createDOM("th", {
          class: "ogl-option ogl-fleet-ship tooltip ogl-fleet-" + id,
        })
      );

      let sum = 0;

      this.json.empire.forEach((planet) => {
        let current = false;
        if (planet.coordinates.slice(1, -1) == this.current.coords) {
          current = true;
        }
        sum +=
          moon && planet.moon ? Number(planet.moon[id]) : Number(planet[id]);
        let valuePLa = planet[id] == 0 ? "-" : this.formatToUnits(planet[id]);

        let valueMooon = "-";
        if (planet.moon) {
          valueMooon =
            planet.moon[id] == 0 ? "-" : this.formatToUnits(planet.moon[id], 2);
        }

        let td = this.createDOM(
          "td",
          { class: valuePLa == "-" ? "ogl-fleet-empty" : "" },
          valuePLa
        );
        if (moon) {
          td = this.createDOM(
            "td",
            { class: valueMooon == "-" ? "ogl-fleet-empty" : "" },
            valueMooon
          );
        }

        if (current) {
          td.classList.add("ogl-current");
        }

        row.appendChild(td);
      });

      row.appendChild(
        this.createDOM(
          "td",
          { class: sum == "-" ? "ogl-fleet-empty" : "" },
          sum == 0 ? "-" : this.formatToUnits(sum)
        )
      );
      table.appendChild(row);
    });

    content.appendChild(table);

    return content;
  }

  betterFleetDispatcher() {
    if (
      this.page == "fleetdispatch" &&
      document.querySelector("#civilships") &&
      fleetDispatcher.shipsOnPlanet.length != 0
    ) {
      let metalAvailable = Math.max(0, fleetDispatcher.metalOnPlanet);
      let crystalAvailable = Math.max(0, fleetDispatcher.crystalOnPlanet);
      let deutAvailable = Math.max(0, fleetDispatcher.deuteriumOnPlanet);

      let needCargo = (fret) => {
        let metal = Number(metalFiller.value.split(".").join(""));
        if (metal > metalAvailable) metalFiller.value = metalAvailable;

        let crystal = Number(crystalFiller.value.split(".").join(""));
        if (crystal > crystalAvailable) crystalFiller.value = crystalAvailable;

        let deut = Number(deutFiller.value.split(".").join(""));
        if (deut > deutAvailable)
          deutFiller.value = Math.max(
            0,
            deutAvailable - fleetDispatcher.getConsumption()
          );

        let amount = this.calcNeededShips({
          fret: fret,
          resources:
            Math.min(metal, metalAvailable) +
            Math.min(crystal, crystalAvailable) +
            Math.min(deut, deutAvailable),
        });
        return amount;
      };

      let dispatch = document
        .querySelector("#shipsChosen")
        .appendChild(this.createDOM("div", { class: "ogl-dispatch" }));

      if (!this.json.options.dispatcher) {
        dispatch.style.display = "none";
      }

      let destination = dispatch.appendChild(
        this.createDOM("div", { class: "ogl-dest" })
      );
      let resDiv = dispatch.appendChild(this.createDOM("div"));
      let actions = resDiv.appendChild(
        this.createDOM("div", { class: "ogl-transport" })
      );
      let coords = destination.appendChild(
        this.createDOM("div", { class: "ogl-coords" })
      );

      let warning = coords.appendChild(
        this.createDOM("a", {
          class: "ogl-warning tooltipRight",
          "data-title": "Error : current planet/moon...",
        })
      );

      let galaxyInput = coords.appendChild(
        this.createDOM("input", {
          type: "text",
          pattern: "[0-9]*",
          value: fleetDispatcher.targetPlanet.galaxy,
        })
      );
      let systemInput = coords.appendChild(
        this.createDOM("input", {
          type: "text",
          pattern: "[0-9]*",
          value: fleetDispatcher.targetPlanet.system,
        })
      );
      let positionInput = coords.appendChild(
        this.createDOM("input", {
          type: "text",
          pattern: "[0-9]*",
          value: fleetDispatcher.targetPlanet.position,
        })
      );
      let planet = coords.appendChild(
        this.createDOM("a", { class: "ogl-planet-icon" })
      );
      let moon = coords.appendChild(
        this.createDOM("a", { class: "ogl-moon-icon" })
      );
      let debris = coords.appendChild(
        this.createDOM("a", { class: "ogl-debris-icon" })
      );

      planet.addEventListener("click", () => {
        fleetDispatcher.targetPlanet.type =
          fleetDispatcher.fleetHelper.PLANETTYPE_PLANET;
        update(true);
        fleetDispatcher.focusSubmitFleet1();
      });

      moon.addEventListener("click", () => {
        fleetDispatcher.targetPlanet.type =
          fleetDispatcher.fleetHelper.PLANETTYPE_MOON;
        update(true);
        fleetDispatcher.focusSubmitFleet1();
      });
      debris.addEventListener("click", () => {
        fleetDispatcher.targetPlanet.type =
          fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS;
        update(true);
        fleetDispatcher.focusSubmitFleet1();
      });

      let planetList = coords.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-homes" },
          `<svg height="12px" viewBox="0 0 512 512" width="12px"><path fill="white" d="m498.195312 222.695312c-.011718-.011718-.023437-.023437-.035156-.035156l-208.855468-208.847656c-8.902344-8.90625-20.738282-13.8125-33.328126-13.8125-12.589843 0-24.425781 4.902344-33.332031 13.808594l-208.746093 208.742187c-.070313.070313-.140626.144531-.210938.214844-18.28125 18.386719-18.25 48.21875.089844 66.558594 8.378906 8.382812 19.445312 13.238281 31.277344 13.746093.480468.046876.964843.070313 1.453124.070313h8.324219v153.699219c0 30.414062 24.746094 55.160156 55.167969 55.160156h81.710938c8.28125 0 15-6.714844 15-15v-120.5c0-13.878906 11.289062-25.167969 25.167968-25.167969h48.195313c13.878906 0 25.167969 11.289063 25.167969 25.167969v120.5c0 8.285156 6.714843 15 15 15h81.710937c30.421875 0 55.167969-24.746094 55.167969-55.160156v-153.699219h7.71875c12.585937 0 24.421875-4.902344 33.332031-13.808594 18.359375-18.371093 18.367187-48.253906.023437-66.636719zm0 0"/></svg>`
        )
      );

      if (unions.length != 0) {
        let unionsBtn = coords.appendChild(
          this.createDOM(
            "div",
            { class: "ogl-union-btn" },
            '<img src="https://gf3.geo.gfsrv.net/cdn56/2ff25995f98351834db4b5aa048c68.gif" height="16" width="16"></img>'
          )
        );
        unionsBtn.addEventListener("click", () => {
          let container = this.createDOM("div", {
            class: "ogl-quickLinks",
            style: "display: flex;flex-direction:column",
          });
          for (let i in unions) {
            let union = unions[i];
            let unionDiv = container.appendChild(
              this.createDOM(
                "div",
                { class: "ogl-quickPlanet" },
                `${union.name} [${union.galaxy}:${union.system}:${
                  union.planet
                }] ${union.planettype == 1 ? "P" : "M"}`
              )
            );
            unionDiv.addEventListener("click", () => {
              fleetDispatcher.union = union.id;
              fleetDispatcher.targetPlanet.position = union.planet;
              fleetDispatcher.targetPlanet.system = union.system;
              fleetDispatcher.targetPlanet.galaxy = union.galaxy;
              fleetDispatcher.targetPlanet.type = union.planettype;

              galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
              systemInput.value = fleetDispatcher.targetPlanet.system;
              positionInput.value = fleetDispatcher.targetPlanet.position;
              document.querySelector(".ogl-dialog .close-tooltip").click();
              update(true);
              this.initUnionCombat(union);
            });
          }

          this.popup(false, container);

          //   hat.selectCombatUnion($(e.currentTarget));
          // that.updateTarget();
          // that.refresh();
          // that.focusSubmitFleet2();
        });
      }

      planetList.addEventListener("click", () => {
        let container = this.openPlanetList((planet) => {
          fleetDispatcher.targetPlanet = planet;
          fleetDispatcher.refresh();
          galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
          systemInput.value = fleetDispatcher.targetPlanet.system;
          positionInput.value = fleetDispatcher.targetPlanet.position;

          document
            .querySelector(".ogl-dialogOverlay")
            .classList.remove("ogl-active");
          update(true);
          fleetDispatcher.focusSubmitFleet1();
        });
        this.popup(false, container);
      });

      let briefing = destination.appendChild(
        this.createDOM("div", { style: "flex-direction: column" })
      );
      let info = briefing.appendChild(
        this.createDOM("div", { class: "ogl-info" })
      );

      info.appendChild(this.createDOM("div", {}, "Arrival"));
      let arrivalDiv = info.appendChild(
        this.createDOM("div", { class: "ogl-arrival-time" })
      );
      info.appendChild(this.createDOM("div", {}, "Duration"));
      let durationDiv = info.appendChild(
        this.createDOM("div", { class: "ogl-duration" })
      );
      info.appendChild(this.createDOM("div", {}, "Return"));
      let returnDiv = info.appendChild(
        this.createDOM("div", { class: "ogl-return-time" })
      );
      returnDiv.style.visibility = "hidden";
      info.appendChild(this.createDOM("div", {}, "Consumption"));
      let consDiv = info.appendChild(
        this.createDOM("div", { class: "undermark" })
      );

      let slider = briefing.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-fleetSpeed" },
          `
        <div data-step="1">10</div>
        <div data-step="2">20</div>
        <div data-step="3">30</div>
        <div data-step="4">40</div>
        <div data-step="5">50</div>
        <div data-step="6">60</div>
        <div data-step="7">70</div>
        <div data-step="8">80</div>
        <div data-step="9">90</div>
        <div class="ogl-active" data-step="10">100</div>
        `
        )
      );

      $(".ogl-fleetSpeed div").on("click", (event) => {
        $(`.ogl-fleetSpeed div`).removeClass("ogl-active");
        fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
        $(
          `.ogl-fleetSpeed div[data-step=${fleetDispatcher.speedPercent}]`
        ).addClass("ogl-active");
        update(false);
        if (fleetDispatcher.currentPage == "fleet1") {
          fleetDispatcher.focusSubmitFleet1();
        } else {
          fleetDispatcher.focusSubmitFleet2();
        }
      });

      $(".ogl-fleetSpeed div").on("mouseover", (event) => {
        fleetDispatcher.speedPercent = event.target.getAttribute("data-step");

        let old = deutLeft.innerText;
        update(false);
        if (deutLeft.innerText != old) {
          deutLeft.classList.add("middlemark");
        }
      });

      $(".ogl-fleetSpeed div").on("mouseout", (event) => {
        fleetDispatcher.speedPercent = slider
          .querySelector(".ogl-active")
          .getAttribute("data-step");
        let middle = deutLeft.classList.contains("middlemark");
        update(false);
        if (middle) {
          deutLeft.classList.add("middlemark");
        }
      });

      let missionsDiv = destination.appendChild(
        this.createDOM("div", { class: "ogl-missions" })
      );
      missionsDiv.html(`<span style="color: #9099a3"> No missions... </span>`);

      let switchToPage = fleetDispatcher.switchToPage.bind(fleetDispatcher);
      let refresh = fleetDispatcher.refresh.bind(fleetDispatcher);

      let resetShips = fleetDispatcher.resetShips.bind(fleetDispatcher);
      let selectShip = fleetDispatcher.selectShip.bind(fleetDispatcher);
      fleetDispatcher.selectShip = (shipId, number) => {
        selectShip(shipId, number);
        update(true);
        onResChange(2);
        onResChange(1);
        onResChange(0);
      };
      fleetDispatcher.resetShips = () => {
        resetShips();
        update(true);
        onResChange(2);
        onResChange(1);
        onResChange(0);
      };

      let isDefaultMission = (index) => {
        if (this.rawURL.searchParams.get(`mission`) == 1) {
          if (index == 1) {
            return true;
          } else {
            return false;
          }
        }
        if (this.rawURL.searchParams.get(`mission`) == 3) {
          if (index == 3) {
            return true;
          } else {
            return false;
          }
        }

        if (index == 3) {
          if (
            fleetDispatcher.targetPlayerId == playerId &&
            this.json.options.harvestMission == 3
          ) {
            return true;
          } else if (this.json.options.foreignMission == 3) {
            return true;
          }
        }
        if (
          index == 1 &&
          (this.mode == 4 || this.json.options.foreignMission == 1)
        ) {
          return true;
        }
        if (index == 4 && this.json.options.harvestMission == 4) {
          return true;
        }
        if (
          index == 15 &&
          (this.json.options.expeditionMission == 15 || this.expedition)
        ) {
          this.expedition = false;
          return true;
        }

        if (
          index == 6 &&
          this.json.options.expeditionMission == 6 &&
          !this.expedition
        ) {
          return true;
        }
        return false;
      };

      fleetDispatcher.switchToPage = (page) => {
        if (!(fleetDispatcher.currentPage == "fleet1" && page == "fleet3")) {
          switchToPage(page);
          if (fleetDispatcher.currentPage == "fleet3") {
            if (fleetDispatcher.mission == 0) {
              let missionIcons = document.querySelectorAll("#missions .on a");
              let mission = 0;
              if (missionIcons.length == 1) {
                missionIcons[0].click();
              } else {
                missionIcons.forEach((elem) => {
                  mission = elem.getAttribute("data-mission");
                  if (isDefaultMission(mission)) {
                    elem.click();
                  }
                });
              }
            }
          }
        } else {
          document.querySelector("#continueToFleet2").style.filter = "none";
          if (fleetDispatcher.shipsToSend.length == 0) {
            document
              .querySelector(".ogl-dispatch .ogl-missions")
              .html(`<span style="color: #9099a3"> No missions... </span>`);

            warning.style.visibility = "visible";

            warning.setAttribute("data-title", "Error : No ships selected");
            return;
          }

          fleetDispatcher.mission = 0;

          let missions = fleetDispatcher.getAvailableMissions();

          let iconsDiv;
          if (missions.length == 0) {
            missionsDiv.html(
              `<span style="color: #9099a3"> No missions... </span>`
            );
          } else {
            warning.style.visibility = "hidden";
            missionsDiv.html(
              "<span>" +
                fleetDispatcher.targetPlayerRankIcon +
                `<span class="status_abbr_${fleetDispatcher.targetPlayerColorClass}">${fleetDispatcher.targetPlayerName}</span>` +
                "</span>"
            );

            if (missionsDiv.innerText == "") {
              if (fleetDispatcher.targetPlanet.name == "?")
                fleetDispatcher.targetPlanet.name = "Unknown";
              missionsDiv.html(
                "<span>" + fleetDispatcher.targetPlanet.name + "</span>"
              );
            }
            iconsDiv = missionsDiv.appendChild(this.createDOM("div"));
          }

          let defaultMish = 0;
          let union = false;

          missions.forEach((index) => {
            iconsDiv.appendChild(
              this.createDOM("div", {
                class: `ogl-mission-${index} ogl-mission-icon`,
                mission: index,
              })
            );

            if (missions.length == 1) {
              defaultMish = index;
            } else {
              if (isDefaultMission(index)) {
                defaultMish = index;
              }
              if (index == 2) {
                union = true;
              }
            }
          });

          if (union) {
            defaultMish = 2;
          }
          let icon = document.querySelector(
            `.ogl-missions .ogl-mission-${defaultMish}`
          );
          icon.classList.add("ogl-active");
          fleetDispatcher.selectMission(Number(defaultMish));
          $(".ogl-mission-icon").on("click", (e) => {
            $(".ogl-mission-icon").removeClass("ogl-active");
            fleetDispatcher.selectMission(
              Number(e.target.getAttribute("mission"))
            );
            e.target.classList.add("ogl-active");
            update(false);
          });
        }
        update(false);
      };

      let displayErrors = fleetDispatcher.displayErrors;
      let error;
      fleetDispatcher.displayErrors = function (errors) {
        document
          .querySelector(".ogl-dispatch .ogl-missions")
          .html(`<span style="color: #9099a3"> No missions... </span>`);

        fleetDispatcher.selectMission(0);
        warning.style.visibility = "visible";
        document.querySelector("#continueToFleet2").style.filter =
          "hue-rotate(-50deg)";

        warning.setAttribute("data-title", errors[0].message);
        error = errors[0].message;
        if (fleetDispatcher.currentPage == "fleet1") return;
        displayErrors(errors);
      };

      let fleet = JSON.stringify(
        fleetDispatcher.shipsToSend.map((elem) => {
          return elem.id;
        })
      );
      let targetPlanet = JSON.stringify(fleetDispatcher.targetPlanet);
      let interval;
      let timeout;
      let firstLoad = true;
      let update = (submit) => {
        if (fleetDispatcher.currentPage == "fleet1") {
          let galaxy = clampInt(
            galaxyInput.value,
            1,
            fleetDispatcher.fleetHelper.MAX_GALAXY,
            true
          );
          galaxyInput.value = galaxy;
          let system = clampInt(
            systemInput.value,
            1,
            fleetDispatcher.fleetHelper.MAX_SYSTEM,
            true
          );
          systemInput.value = system;
          let position = clampInt(
            positionInput.value,
            1,
            fleetDispatcher.fleetHelper.MAX_POSITION,
            true
          );
          positionInput.value = position;

          fleetDispatcher.targetPlanet.galaxy = galaxy;
          fleetDispatcher.targetPlanet.system = system;
          fleetDispatcher.targetPlanet.position = position;
        } else {
          galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
          systemInput.value = fleetDispatcher.targetPlanet.system;
          positionInput.value = fleetDispatcher.targetPlanet.position;
        }

        // if (
        //   fleetDispatcher.targetPlanet.position ===
        //   fleetDispatcher.fleetHelper.EXPEDITION_POSITION
        // ) {
        //   fleetDispatcher.targetPlanet.type =
        //     fleetDispatcher.fleetHelper.PLANETTYPE_PLANET;
        // }

        if (fleetDispatcher.mission == 4 || fleetDispatcher.mission == 0) {
          returnDiv.style.visibility = "hidden";
        } else {
          returnDiv.style.visibility = "visible";
        }

        if (submit) {
          let newFleet = JSON.stringify(
            fleetDispatcher.shipsToSend.map((elem) => {
              return elem.id;
            })
          );
          let newTargetPlanet = JSON.stringify(fleetDispatcher.targetPlanet);

          if (
            newFleet != fleet ||
            targetPlanet != newTargetPlanet ||
            firstLoad
          ) {
            firstLoad = false;
            warning.style.visibility = "hidden";
            fleet = newFleet;
            targetPlanet = newTargetPlanet;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
              fleetDispatcher.trySubmitFleet2();
            }, 50);
          }
        }

        planet.classList.remove("ogl-active");
        moon.classList.remove("ogl-active");
        debris.classList.remove("ogl-active");

        if (
          fleetDispatcher.targetPlanet.type ==
          fleetDispatcher.fleetHelper.PLANETTYPE_PLANET
        ) {
          planet.classList.add("ogl-active");
        }
        if (
          fleetDispatcher.targetPlanet.type ==
          fleetDispatcher.fleetHelper.PLANETTYPE_MOON
        ) {
          moon.classList.add("ogl-active");
        }
        if (
          fleetDispatcher.targetPlanet.type ==
          fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS
        ) {
          debris.classList.add("ogl-active");
        }
        if (interval) clearInterval(interval);

        let reset = (noShips) => {
          durationDiv.html("-");
          consDiv.innerText = "-";
          arrivalDiv.innerText = "-";
          returnDiv.innerText = "-";

          document
            .querySelector(".ogl-dispatch .ogl-missions")
            .html(`<span style="color: #9099a3"> No missions... </span>`);

          warning.style.visibility = "visible";
          warning.setAttribute("data-title", "Error : current planet/moon...");
          if (noShips) {
            warning.setAttribute("data-title", "Error : No ships selected...");
          }
          document.querySelector("#continueToFleet2").style.filter =
            "hue-rotate(-50deg)";
        };

        if (!fleetDispatcher.hasShipsSelected()) {
          reset(true);
          return;
        }
        if (
          this.current.coords ==
          fleetDispatcher.targetPlanet.galaxy +
            ":" +
            fleetDispatcher.targetPlanet.system +
            ":" +
            fleetDispatcher.targetPlanet.position
        ) {
          if (
            this.current.isMoon &&
            fleetDispatcher.targetPlanet.type ==
              fleetDispatcher.fleetHelper.PLANETTYPE_MOON
          ) {
            reset();
            return;
          } else if (
            !this.current.isMoon &&
            fleetDispatcher.targetPlanet.type ==
              fleetDispatcher.fleetHelper.PLANETTYPE_PLANET
          ) {
            reset();
            return;
          }
        }

        durationDiv.html(
          "<strong>" + formatTime(fleetDispatcher.getDuration()) + "</strong>"
        );
        consDiv.innerText = fleetDispatcher
          .getConsumption()
          .toLocaleString("de-DE");
        if (fleetDispatcher.getConsumption() > deutAvailable) {
          consDiv.classList.add("overmark");
          if (!error) {
            warning.style.visibility = "visible";
            warning.setAttribute(
              "data-title",
              "Error : No enough deuterium..."
            );
            document.querySelector("#continueToFleet2").style.filter =
              "hue-rotate(-50deg)";
          }
        } else {
          if (!error) {
            warning.style.visibility = "hidden";
            document.querySelector("#continueToFleet2").style.filter = "none";
          }
          consDiv.classList.remove("overmark");
        }

        interval = setInterval(() => {
          arrivalDiv.html(
            getFormatedDate(
              new Date(serverTime).getTime() +
                fleetDispatcher.getDuration() * 1000,
              "<strong> [G]:[i]:[s] </strong> - [d].[m]"
            )
          );

          returnDiv.html(
            getFormatedDate(
              new Date(serverTime).getTime() +
                2 * fleetDispatcher.getDuration() * 1000,
              "<strong> [G]:[i]:[s] </strong> - [d].[m]"
            )
          );
        }, 100);

        onResChange(2);
        onResChange(1);
        onResChange(0);
      };

      galaxyInput.addEventListener("click", () => {
        galaxyInput.value = "";
      });
      systemInput.addEventListener("click", () => {
        systemInput.value = "";
      });
      positionInput.addEventListener("click", () => {
        positionInput.value = "";
      });
      galaxyInput.addEventListener("keyup", (e) => {
        update(true);
      });
      systemInput.addEventListener("keyup", (e) => {
        update(true);
      });
      positionInput.addEventListener("keyup", (e) => {
        update(true);
      });

      let resFiller = actions.appendChild(
        this.createDOM("div", { class: "ogl-res-filler" })
      );

      let metalBtn = resFiller.appendChild(this.createDOM("div"));
      metalBtn.appendChild(
        this.createDOM("div", { class: "resourceIcon metal" })
      );
      let metalFiller = metalBtn.appendChild(
        this.createDOM("input", { type: "text" })
      );
      let metalLeft = metalBtn.appendChild(this.createDOM("span", {}, "-"));
      let metalReal = metalBtn.appendChild(
        this.createDOM("span", { class: "ogk-real-cargo ogk-metal" }, "-")
      );
      let btns = metalBtn.appendChild(
        this.createDOM("div", { class: "ogl-actions" })
      );

      let selectMinMetal = btns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif",
        })
      );
      let selectMostMetal = btns.appendChild(
        this.createDOM("a", { class: "select-most-min" })
      );
      let selectMaxMetal = btns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif",
        })
      );

      let crystalBtn = resFiller.appendChild(this.createDOM("div"));
      crystalBtn.appendChild(
        this.createDOM("div", { class: "resourceIcon crystal" })
      );
      let crystalFiller = crystalBtn.appendChild(
        this.createDOM("input", { type: "text" })
      );
      let crystalLeft = crystalBtn.appendChild(this.createDOM("span", {}, "-"));
      let crystalReal = crystalBtn.appendChild(
        this.createDOM("span", { class: "ogk-real-cargo ogk-crystal" }, "-")
      );
      let crystalBtns = crystalBtn.appendChild(
        this.createDOM("div", { class: "ogl-actions" })
      );

      let selectMinCrystal = crystalBtns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif",
        })
      );
      let selectMostCrystal = crystalBtns.appendChild(
        this.createDOM("a", { class: "select-most-min" })
      );
      let selectMaxCrystal = crystalBtns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif",
        })
      );

      let deutBtn = resFiller.appendChild(this.createDOM("div"));
      deutBtn.appendChild(
        this.createDOM("div", { class: "resourceIcon deuterium" })
      );
      let deutFiller = deutBtn.appendChild(
        this.createDOM("input", { type: "text" })
      );
      let deutLeft = deutBtn.appendChild(this.createDOM("span", {}, "-"));
      let deutReal = deutBtn.appendChild(
        this.createDOM("span", { class: "ogk-real-cargo ogk-deut" }, "-")
      );
      let deutBtns = deutBtn.appendChild(
        this.createDOM("div", { class: "ogl-actions" })
      );

      let selectMinDeut = deutBtns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif",
        })
      );
      let selectMostDeut = deutBtns.appendChild(
        this.createDOM("a", { class: "select-most-min" })
      );
      let selectMaxDeut = deutBtns.appendChild(
        this.createDOM("img", {
          src:
            "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif",
        })
      );

      $("#selectMinMetal").after(
        this.createDOM("a", { id: "selectMostMetal", class: "select-most-min" })
      );
      $("#selectMinCrystal").after(
        this.createDOM("a", {
          id: "selectMostCrystal",
          class: "select-most-min",
        })
      );
      $("#selectMinDeuterium").after(
        this.createDOM("a", {
          id: "selectMostDeuterium",
          class: "select-most-min",
        })
      );

      $("#selectMaxMetal").after(
        this.createDOM("span", { class: "ogi-metalLeft" }, "-")
      );
      $("#selectMaxCrystal").after(
        this.createDOM("span", { class: "ogi-crystalLeft" }, "-")
      );
      $("#selectMaxDeuterium").after(
        this.createDOM("span", { class: "ogi-deuteriumLeft" }, "-")
      );

      $("#allresources").after(this.createDOM("a", { class: "select-most" }));
      $("#allresources").after(
        this.createDOM("a", { class: "send_none" }, "<a></a>")
      );
      $("#loadAllResources .select-most").on("click", () => {
        $("#selectMinDeuterium").click();
        $("#selectMinCrystal").click();
        $("#selectMinMetal").click();
        $("#selectMostDeuterium").click();
        $("#selectMostCrystal").click();
        $("#selectMostMetal").click();
      });

      $("#loadAllResources .send_none").on("click", () => {
        $("#selectMinDeuterium").click();
        $("#selectMinCrystal").click();
        $("#selectMinMetal").click();
      });

      let firstResRefresh = true;
      let refreshRes = () => {
        let mLeft = document.querySelector(".res_wrap .ogi-metalLeft");
        let cLeft = document.querySelector(".res_wrap .ogi-crystalLeft");
        let dLeft = document.querySelector(".res_wrap .ogi-deuteriumLeft");

        if (firstResRefresh) {
          firstResRefresh = false;
          if (deutLeft.classList.contains("overmark")) {
            dLeft.classList.add("overmark");
          } else if (deutLeft.classList.contains("middlemark")) {
            dLeft.classList.add("middlemark");
          }
          if (metalLeft.classList.contains("overmark")) {
            mLeft.classList.add("overmark");
          }
          if (crystalLeft.classList.contains("overmark")) {
            cLeft.classList.add("overmark");
          }

          mLeft.innerText = metalLeft.innerText;
          cLeft.innerText = crystalLeft.innerText;
          dLeft.innerText = deutLeft.innerText;
        } else {
          cLeft.classList.remove("overmark");
          mLeft.classList.remove("overmark");
          dLeft.classList.remove("overmark");
          dLeft.classList.remove("middlemark");

          let val = this.removeNumSeparator(
            document.querySelector("input#metal").value
          );
          mLeft.innerText = Math.max(0, metalAvailable - val).toLocaleString(
            "de-DE"
          );
          val = this.removeNumSeparator(
            document.querySelector("input#crystal").value
          );
          cLeft.innerText = Math.max(0, crystalAvailable - val).toLocaleString(
            "de-DE"
          );
          val = this.removeNumSeparator(
            document.querySelector("input#deuterium").value
          );
          dLeft.innerText = Math.max(
            0,
            deutAvailable - fleetDispatcher.getConsumption() - val
          ).toLocaleString("de-DE");
        }
      };
      let focusSubmitFleet3 = fleetDispatcher.focusSubmitFleet3;
      fleetDispatcher.focusSubmitFleet3 = () => {
        refreshRes();
        focusSubmitFleet3();
      };

      let kept =
        this.json.options.kept[
          this.current.coords + this.current.isMoon ? "M" : "P"
        ] || this.json.options.defaultKept;

      $("#selectMostMetal").on("click", () => {
        let capacity = fleetDispatcher.getFreeCargoSpace();
        let cargo = Math.min(capacity, metalAvailable - (kept[0] || 0));
        fleetDispatcher.cargoMetal = Math.min(
          capacity,
          Math.max(0, metalAvailable - (kept[0] || 0))
        );
        fleetDispatcher.refresh();
        fleetDispatcher.focusSubmitFleet3();
      });
      $("#selectMostCrystal").on("click", () => {
        let capacity = fleetDispatcher.getFreeCargoSpace();
        fleetDispatcher.cargoCrystal = Math.min(
          capacity,
          Math.max(0, crystalAvailable - (kept[1] || 0))
        );
        fleetDispatcher.refresh();
        fleetDispatcher.focusSubmitFleet3();
      });
      $("#selectMostDeuterium").on("click", () => {
        let capacity = fleetDispatcher.getFreeCargoSpace();
        fleetDispatcher.cargoDeuterium = Math.min(
          capacity,
          Math.max(
            0,
            deutAvailable - fleetDispatcher.getConsumption() - (kept[2] || 0)
          )
        );
        fleetDispatcher.refresh();
        fleetDispatcher.focusSubmitFleet3();
      });
      $("#backToFleet2").on("click", () => {
        firstResRefresh = true;
      });
      $("#backToFleet1").on("click", () => {
        update(true);
      });

      let load = this.createDOM("div", { class: "ogl-cargo" });

      let selectMostRes = load.appendChild(
        this.createDOM("a", { class: "select-most" })
      );
      let selectAllRes = load.appendChild(
        this.createDOM("a", { class: "sendall" })
      );
      let selectNoRes = load.appendChild(
        this.createDOM("a", { class: "send_none" }, `<a></a>`)
      );

      selectNoRes.addEventListener("click", () => {
        selectMinDeut.click();
        selectMinCrystal.click();
        selectMinMetal.click();
      });
      selectAllRes.addEventListener("click", () => {
        selectMaxDeut.click();
        selectMaxCrystal.click();
        selectMaxMetal.click();
      });
      selectMostRes.addEventListener("click", () => {
        selectMostDeut.click();
        selectMostCrystal.click();
        selectMostMetal.click();
      });

      let bar = load.appendChild(this.createDOM("div", {}));
      bar.html(
        `<div class="fleft bar_container" data-current-amount="0" data-capacity="0">
        <div class="filllevel_bar"></div>
        </div>
        <div>
        <span class="undermark">0</span>
        / <span>0</span>
        </div>`
      );

      let settings = load.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-setting-icon" },
          `<img src="https://gf3.geo.gfsrv.net/cdne7/1f57d944fff38ee51d49c027f574ef.gif" width="16" height="16" >`
        )
      );
      settings.addEventListener("click", () => {
        this.popup(
          null,
          this.keepOnPlanetDialog(
            this.current.coords + (this.current.isMoon ? "M" : "P")
          )
        );
      });

      let updateCargo = () => {
        let total =
          Number(this.removeNumSeparator(metalFiller.value)) +
          Number(this.removeNumSeparator(crystalFiller.value)) +
          Number(this.removeNumSeparator(deutFiller.value));

        let freeSpace = fleetDispatcher.getCargoCapacity() - total;
        bar.html(
          `<div class="fleft bar_container" data-current-amount="0" data-capacity="0">
        <div class="filllevel_bar"></div>
        </div>
        <div>
        <span class="${
          freeSpace >= 0 ? "undermark" : "overmark"
        }">${freeSpace.toLocaleString("de-DE")} </span>
        / <span> ${fleetDispatcher
          .getCargoCapacity()
          .toLocaleString("de-DE")}</span>
        </div>`
        );

        let filler = document.querySelector(".ogl-cargo .filllevel_bar");
        let percent =
          100 - (freeSpace / fleetDispatcher.getCargoCapacity()) * 100;

        if (percent > 100) {
          percent = 100;
        }

        filler.style.width = percent + "%";
        if (percent < 80) {
          filler.classList.add("filllevel_undermark");
        } else if (percent > 80 && percent < 100) {
          filler.classList.add("filllevel_middlemark");
        } else {
          filler.classList.add("filllevel_overmark");
        }
      };

      resDiv.appendChild(load);

      selectMinMetal.addEventListener("click", () => {
        metalFiller.value = 0;
        onResChange(0);
      });
      selectMaxMetal.addEventListener("click", () => {
        metalFiller.value = metalAvailable;
        onResChange(0);
      });
      selectMostMetal.addEventListener("click", () => {
        metalFiller.value = Math.max(0, metalAvailable - (kept[0] || 0));
        onResChange(0);
      });
      selectMinCrystal.addEventListener("click", () => {
        crystalFiller.value = 0;
        onResChange(1);
      });
      selectMaxCrystal.addEventListener("click", () => {
        crystalFiller.value = crystalAvailable;
        onResChange(1);
      });
      selectMostCrystal.addEventListener("click", () => {
        crystalFiller.value = Math.max(0, crystalAvailable - (kept[1] || 0));
        onResChange(1);
      });
      selectMinDeut.addEventListener("click", () => {
        deutFiller.value = 0;
        onResChange(2);
      });
      selectMaxDeut.addEventListener("click", () => {
        deutFiller.value = Math.max(
          0,
          deutAvailable - fleetDispatcher.getConsumption()
        );
        onResChange(2);
      });
      selectMostDeut.addEventListener("click", () => {
        deutFiller.value = Math.max(
          0,
          deutAvailable - fleetDispatcher.getConsumption() - (kept[2] || 0)
        );
        onResChange(2);
      });

      let transport = actions.appendChild(
        this.createDOM("div", { class: "ogl-res-transport" })
      );

      let ptBtn = transport.appendChild(
        this.createDOM("a", {
          "tech-id": 202,
          class: "ogl-option ogl-fleet-ship ogl-fleet-202",
        })
      );
      let ptNum = transport.appendChild(this.createDOM("span", {}, "-"));

      let gtBtn = transport.appendChild(
        this.createDOM("a", {
          "tech-id": 203,
          class: "ogl-option ogl-fleet-ship ogl-fleet-203",
        })
      );
      let gtNum = transport.appendChild(this.createDOM("span", {}, "-"));

      let pfBtn = transport.appendChild(
        this.createDOM("a", {
          "tech-id": 219,
          class: "ogl-option ogl-fleet-ship ogl-fleet-219",
        })
      );
      let pfNum = transport.appendChild(this.createDOM("span", {}, "-"));

      let cyBtn = transport.appendChild(
        this.createDOM("a", {
          "tech-id": 209,
          class: "ogl-option ogl-fleet-ship ogl-fleet-209",
        })
      );
      let cyNum = transport.appendChild(this.createDOM("span", {}, "-"));

      let pbBtn;
      let pbNum;
      if (this.json.pbFret != 0) {
        pbBtn = transport.appendChild(
          this.createDOM("a", {
            "tech-id": 210,
            class: "ogl-option ogl-fleet-ship ogl-fleet-210",
          })
        );
        pbNum = transport.appendChild(this.createDOM("span", {}, "-"));
      }

      let updateShips = (e) => {
        let amount = e.target.nextElementSibling.getAttribute("amount");
        this.selectShips(Number(e.target.getAttribute("tech-id")), amount);
      };

      ptBtn.addEventListener("click", updateShips);
      gtBtn.addEventListener("click", updateShips);
      pfBtn.addEventListener("click", updateShips);
      cyBtn.addEventListener("click", updateShips);
      if (pbBtn) pbBtn.addEventListener("click", updateShips);

      let onResChange = (index) => {
        let capacity = fleetDispatcher.getCargoCapacity();
        if (capacity == 0) {
          fleetDispatcher.resetCargo();
        }

        let filled = this.removeNumSeparator(deutFiller.value);
        let deut = Math.min(
          this.removeNumSeparator(deutFiller.value),
          capacity,
          deutAvailable - fleetDispatcher.getConsumption()
        );

        if (index == 2) {
          fleetDispatcher.cargoDeuterium = Math.min(
            deut,
            fleetDispatcher.cargoDeuterium + fleetDispatcher.getFreeCargoSpace()
          );

          let old = deutLeft.innerText;

          deutLeft.innerText = (
            deutAvailable -
            fleetDispatcher.getConsumption() -
            fleetDispatcher.cargoDeuterium
          ).toLocaleString("de-DE");

          if (old != deutLeft.innerText || deutLeft.innerText == "0") {
            deutLeft.classList.remove("middlemark");
          }

          if (
            fleetDispatcher.getFreeCargoSpace() == 0 &&
            deutLeft.innerText != "0"
          ) {
            deutLeft.classList.add("overmark");
            deutReal.innerText = Math.max(
              0,
              fleetDispatcher.cargoDeuterium
            ).toLocaleString("de-DE");
          } else {
            deutLeft.classList.remove("overmark");
            deutReal.innerText = "-";
          }

          if (
            filled >
            Math.max(0, deutAvailable - fleetDispatcher.getConsumption())
          ) {
            deutFiller.value = (
              deutAvailable - fleetDispatcher.getConsumption()
            ).toLocaleString("de-DE");
          }
        } else if (index == 1) {
          filled = this.removeNumSeparator(crystalFiller.value);
          let crystal = Math.min(
            this.removeNumSeparator(crystalFiller.value),
            capacity,
            crystalAvailable
          );

          fleetDispatcher.cargoCrystal = Math.min(
            crystal,
            fleetDispatcher.cargoCrystal + fleetDispatcher.getFreeCargoSpace()
          );
          crystalLeft.innerText = (
            crystalAvailable - fleetDispatcher.cargoCrystal
          ).toLocaleString("de-DE");

          if (
            fleetDispatcher.getFreeCargoSpace() == 0 &&
            crystalLeft.innerText != "0"
          ) {
            crystalLeft.classList.add("overmark");
            crystalReal.innerText = Math.max(
              0,
              fleetDispatcher.cargoCrystal
            ).toLocaleString("de-DE");
          } else {
            crystalLeft.classList.remove("overmark");
            crystalReal.innerText = "-";
          }
        } else if (index == 0) {
          filled = this.removeNumSeparator(metalFiller.value);
          let metal = Math.min(
            this.removeNumSeparator(metalFiller.value),
            capacity,
            metalAvailable
          );

          fleetDispatcher.cargoMetal = Math.min(
            metal,
            fleetDispatcher.cargoMetal + fleetDispatcher.getFreeCargoSpace()
          );
          metalLeft.innerText = (
            metalAvailable - fleetDispatcher.cargoMetal
          ).toLocaleString("de-DE");

          if (
            fleetDispatcher.getFreeCargoSpace() == 0 &&
            metalLeft.innerText != "0"
          ) {
            metalLeft.classList.add("overmark");
            metalReal.innerText = Math.max(
              0,
              fleetDispatcher.cargoMetal
            ).toLocaleString("de-DE");
          } else {
            metalLeft.classList.remove("overmark");
            metalReal.innerText = "-";
          }
        }

        let ships = {};
        fleetDispatcher.shipsOnPlanet.forEach((elem) => {
          ships[elem.id] = elem.number;
        });
        ptNum.classList.remove("overmark");
        gtNum.classList.remove("overmark");
        pfNum.classList.remove("overmark");
        cyNum.classList.remove("overmark");
        if (pbNum) pbNum.classList.remove("overmark");

        let amount = needCargo(202);
        ptNum.innerText = this.formatToUnits(amount);
        ptNum.setAttribute("amount", amount);
        if (amount > (ships[202] || 0)) ptNum.classList.add("overmark");

        amount = needCargo(203);
        gtNum.innerText = this.formatToUnits(amount);
        gtNum.setAttribute("amount", amount);
        if (amount > (ships[203] || 0)) gtNum.classList.add("overmark");

        amount = needCargo(219);
        pfNum.innerText = this.formatToUnits(amount);
        pfNum.setAttribute("amount", amount);
        if (amount > (ships[219] || 0)) pfNum.classList.add("overmark");

        amount = needCargo(209);
        cyNum.innerText = this.formatToUnits(amount);
        cyNum.setAttribute("amount", amount);
        if (amount > (ships[209] || 0)) cyNum.classList.add("overmark");

        if (pbBtn) {
          amount = needCargo(210);
          pbNum.innerText = this.formatToUnits(amount);
          pbNum.setAttribute("amount", amount);
          if (amount > (ships[210] || 0)) pbNum.classList.add("overmark");
        }

        updateCargo();
      };

      metalFiller.addEventListener("keyup", (e) => {
        onResChange(0);
        e.target.focus();
      });
      crystalFiller.addEventListener("keyup", (e) => {
        onResChange(1);
        e.target.focus();
      });
      deutFiller.addEventListener("keyup", (e) => {
        onResChange(2);
        e.target.focus();
      });

      if (this.mode == 2 || this.mode == 1) {
        if (this.mode == 1) {
          metalFiller.value = metalAvailable;
          crystalFiller.value = crystalAvailable;
          deutFiller.value = deutAvailable;
        } else if (this.mode == 2) {
          let coords =
            fleetDispatcher.targetPlanet.galaxy +
            ":" +
            fleetDispatcher.targetPlanet.system +
            ":" +
            fleetDispatcher.targetPlanet.position;
          coords +=
            fleetDispatcher.targetPlanet.type ==
            fleetDispatcher.fleetHelper.PLANETTYPE_MOON
              ? "M"
              : "P";
          let missing = this.json.missing[coords];
          if (missing) {
            metalFiller.value = Math.min(
              missing[0],
              fleetDispatcher.metalOnPlanet
            );
            crystalFiller.value = Math.min(
              missing[1],
              fleetDispatcher.crystalOnPlanet
            );
            deutFiller.value = Math.min(
              missing[2],
              fleetDispatcher.deuteriumOnPlanet
            );
          }
        }
        onResChange(2);
        onResChange(1);
        onResChange(0);
      }
      update(false);
    }
  }

  neededCargo() {
    let kept =
      this.json.options.kept[
        this.current.coords + this.current.isMoon ? "M" : "P"
      ] || this.json.options.defaultKept;
    if (this.page == "fleetdispatch" && document.querySelector("#shipChosen")) {
      shipsOnPlanet.forEach((ship) => {
        if (ship.id == 202 || ship.id == 203) {
          let min = {
            metal: Math.max(0, fleetDispatcher.metalOnPlanet - kept[0]),
            crystal: Math.max(0, fleetDispatcher.crystalOnPlanet - kept[1]),
            deut: Math.max(0, fleetDispatcher.deuteriumOnPlanet - kept[2]),
          };

          let total = min.metal + min.crystal + min.deut;

          let amount = this.calcNeededShips({
            fret: ship.id,
            resources: total,
          });
          let span = this.createDOM(
            "span",
            { class: "ogl-needed" },
            amount.toLocaleString("de-DE")
          );
          document
            .querySelector(`.technology[data-technology="${ship.id}"]`)
            .appendChild(span);

          // add needed buttons
          span.addEventListener("click", (event) => {
            event.stopPropagation();
            document.querySelector("#resetall").click();
            this.selectShips(ship.id, amount);
            document.querySelector(".ogl-cargo .select-most").click();
          });
        }
      });
    }
  }

  harvest() {
    // buttons action on click
    let btnAction = (event, coords, type) => {
      event.preventDefault();
      event.stopPropagation();

      let link = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=${type}&mission=${this.json.options.harvestMission}&oglMode=1`;

      window.location.href =
        "https://" + window.location.host + window.location.pathname + link;
    };

    // planet & moon harvest icons
    this.planetList.forEach((planet) => {
      let coords = planet
        .querySelector(".planet-koords")
        .textContent.slice(1, -1)
        .split(":");

      if (this.current.coords != coords.join(":") || this.current.isMoon) {
        let btn = planet
          .querySelector(".planetlink")
          .appendChild(
            this.createDOM("div", { class: "ogl-harvest ogl-planet" })
          );
        btn.addEventListener("click", (event) => btnAction(event, coords, 1));
      }

      let moon = planet.querySelector(".moonlink");

      if (moon) {
        // moon.classList.remove("tooltipLeft");
        // moon.classList.add("tooltipRight");
        if (this.current.coords == coords.join(":") && this.current.isMoon)
          return;

        let btn = planet
          .querySelector(".moonlink")
          .appendChild(
            this.createDOM("button", { class: "ogl-harvest ogl-moon" })
          );
        btn.addEventListener("click", (event) => btnAction(event, coords, 3));
      }
    });
  }

  openPlanetList(callcback) {
    let container = this.createDOM(
      "div",
      { class: "ogl-dialogContainer ogl-quickLinks" }
      // "<h1>" + this.getTranslatedText(10) + "</h1>"
    );

    let buildButton = (planet, id, galaxy, system, position, type) => {
      let data = {
        id: id,
        galaxy: galaxy,
        system: system,
        position: position,
        type: type,
      };

      let div = container.appendChild(this.createDOM("div"));

      if (type == 1) div.classList.add("ogl-quickPlanet");
      else div.classList.add("ogl-quickMoon");

      div.addEventListener("click", () => callcback(data));

      if (
        (planet == this.current.planet && !this.current.isMoon && type == 1) ||
        (planet == this.current.planet && this.current.isMoon && type == 3)
      ) {
        div.classList.add("ogl-current");
      }

      return div;
    };

    this.planetList.forEach((planet) => {
      let coords = planet
        .querySelector(".planet-koords")
        .textContent.slice(1, -1)
        .split(":");

      // planet
      let btn = buildButton(
        planet,
        new URL(planet.querySelector(".planetlink").href).searchParams.get(
          "cp"
        ),
        coords[0],
        coords[1],
        coords[2],
        1
      );

      btn.html(
        `[${coords.join(":")}] ${
          planet.querySelector(".planet-name").textContent
        }`
      );

      // moon
      if (planet.querySelector(".moonlink")) {
        let btn = buildButton(
          planet,
          new URL(planet.querySelector(".moonlink").href).searchParams.get(
            "cp"
          ),
          coords[0],
          coords[1],
          coords[2],
          3
        );

        btn.html('<figure class="planetIcon moon"></figure>');
      } else container.appendChild(this.createDOM("div"));
    });

    return container;
    // this.popup(false, container);
  }

  autoHarvest() {
    this.planetList.forEach((p, index) => {
      p.setAttribute("data-redirect", index);

      if (this.mode == 3) {
        if (
          p.querySelector(".planet-koords").textContent.slice(1, -1) ==
          this.json.autoHarvest[0]
        ) {
          let target =
            this.json.autoHarvest[1] == 3
              ? p.querySelector(".moonlink")
              : p.querySelector(".planetlink");
          target.classList.add("ogl-target");
        }
      }
    });

    let currentIndex = parseInt(
      this.current.planet.getAttribute("data-redirect")
    );
    let nextIndex =
      currentIndex + 1 >= this.planetList.length ? 0 : currentIndex + 1;

    this.next = {};
    this.next.planet = document.querySelector(
      `.smallplanet[data-redirect="${nextIndex}"]`
    );
    this.next.coords = this.next.planet
      .querySelector(".planet-koords")
      .textContent.slice(1, -1);
    this.next.id = this.next.planet.getAttribute("id").replace("planet-", "");
    this.next.hasMoon = this.next.planet.querySelector(".moonlink")
      ? true
      : false;

    if (this.page == "fleetdispatch") {
      if (this.mode == 3) {
        let coords = this.json.autoHarvest[0].split(":");
        let type = this.json.autoHarvest[1];
        let id = this.next.id;

        if (this.current.isMoon && this.next.hasMoon) {
          let url = new URL(this.next.planet.querySelector(".moonlink").href);
          id = url.searchParams.get("cp");
        }

        let link = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=${type}&mission=${this.json.options.harvestMission}&cp=${id}&oglMode=${this.mode}`;
        link =
          "https://" + window.location.host + window.location.pathname + link;

        let skip = document
          .querySelector("#fleet1 #planet")
          .appendChild(
            this.createDOM(
              "button",
              { class: "btn_blue ogl-skip" },
              this.getTranslatedText(9)
            )
          );
        skip.addEventListener("click", () => (window.location.href = link));

        let needed = document.querySelector(
          `.technology[data-technology="${this.json.options.fret}"] .ogl-needed`
        );
        if (needed) needed.click();

        document.querySelector(".ogl-cargo .sendall").click();

        document.querySelector("#sendFleet").addEventListener("click", () => {
          localStorage.setItem("ogl-redirect", link);
        });

        document.addEventListener("keydown", (event) => {
          if (event.keyCode === 13 && fleetDispatcher.currentPage == "fleet3") {
            localStorage.setItem("ogl-redirect", link);
          }
        });
      }
    }
  }

  expedition() {
    if (this.page == "fleetdispatch") {
      dataHelper.getPlayer(playerId).then((player) => {
        let topScore = player.topScore;

        // https://board.origin.ogame.gameforge.com/index.php/Thread/872-Guide-12-Expedition-guide/
        let maxTotal = 0;
        let minPT,
          minGT = 0;

        if (topScore < 10000) {
          maxTotal = 40000;
          minPT = 273;
          minGT = 91;
        } else if (topScore < 100000) {
          maxTotal = 500000;
          minPT = 423;
          minGT = 141;
        } else if (topScore < 1000000) {
          maxTotal = 1200000;
          minPT = 423;
          minGT = 191;
        } else if (topScore < 5000000) {
          maxTotal = 1800000;
          minPT = 423;
          minGT = 191;
        } else if (topScore < 25000000) {
          maxTotal = 2400000;
          minPT = 573;
          minGT = 191;
        } else if (topScore < 50000000) {
          maxTotal = 3000000;
          minPT = 723;
          minGT = 241;
        } else if (topScore < 75000000) {
          maxTotal = 3600000;
          minPT = 873;
          minGT = 291;
        } else if (topScore < 100000000) {
          maxTotal = 4200000;
          minPT = 1023;
          minGT = 341;
        } else {
          maxTotal = 5000000;
          minPT = 1223;
          minGT = 417;
        }

        maxTotal =
          this.playerClass == PLAYER_CLASS_EXPLORER
            ? maxTotal * 3 * this.json.speed
            : maxTotal * 2;

        let maxPT = Math.max(
          minPT,
          this.calcNeededShips({ fret: 202, resources: maxTotal })
        );
        let maxGT = Math.max(
          minGT,
          this.calcNeededShips({ fret: 203, resources: maxTotal })
        );

        if (!document.querySelector("#allornone .allornonewrap")) return;

        let ptExpe = document
          .querySelector("#allornone .secondcol")
          .appendChild(
            this.createDOM("button", { class: "ogl-prefab ogl-ptexpe" })
          );
        let gtExpe = document
          .querySelector("#allornone .secondcol")
          .appendChild(
            this.createDOM("button", { class: "ogl-prefab ogl-gtexpe" })
          );

        let coords = this.current.coords.split(":");

        [ptExpe, gtExpe].forEach((btn) => {
          btn.addEventListener("click", () => {
            document.querySelector("#resetall").click();

            let type = btn == ptExpe ? 202 : 203;
            let count = btn == ptExpe ? maxPT : maxGT;

            let prio = [218, 213, 211, 215, 207];
            let bigship = 0;

            prio.forEach((shipID) => {
              if (
                bigship == 0 &&
                document
                  .querySelector(
                    `.technology[data-technology="${shipID}"] .amount`
                  )
                  .getAttribute("data-value") > 0
              ) {
                bigship = shipID;
              }
            });

            let inputs = document.querySelectorAll(".ogl-coords input");

            inputs[0].value = coords[0];
            inputs[1].value = coords[1];
            inputs[2].value = 16;
            document.querySelector(".ogl-planet-icon").click();
            this.expedition = true;

            shipsOnPlanet.forEach((ship) => {
              if (ship.id == type) this.selectShips(ship.id, count);
              else if (ship.id == bigship) this.selectShips(ship.id, 1);
              else if (ship.id == 210) this.selectShips(ship.id, 1);
              else if (ship.id == 219) this.selectShips(ship.id, 1);
            });

            fleetDispatcher.refresh();
          });
        });
      });
    }
  }

  quickPlanetList() {
    if (this.page == "fleetdispatch" && fleetDispatcher) {
      if (!document.querySelector("#shortcuts .dropdown")) return;

      let btn = document
        .querySelector("#shortcuts span")
        .appendChild(this.createDOM("btn", { class: "ogl-quickBtn" }, "-"));
      let container = this.createDOM("div", {
        class: "ogl-dialogContainer ogl-quickLinks",
      });

      container.addEventListener("click", (event) => {
        if (!event.target.href) {
          event.stopPropagation();
          event.preventDefault();
        }
      });

      btn.addEventListener("click", () => {
        let container = this.openPlanetList((planet) => {
          fleetDispatcher.targetPlanet = planet;
          fleetDispatcher.refresh();
          document
            .querySelector(".ogl-dialogOverlay")
            .classList.remove("ogl-active");
          document.querySelector("#continueToFleet3").focus();
        });
        this.popup(false, container);
      });
    }
  }

  activitytimers() {
    let now = Date.now();

    if (!this.json.myActivities[this.current.coords])
      this.json.myActivities[this.current.coords] = [0, 0];

    let planetActivity = this.json.myActivities[this.current.coords][0];
    let moonActivity = this.json.myActivities[this.current.coords][1];

    if (this.current.isMoon) moonActivity = now;
    else planetActivity = now;

    this.json.myActivities[this.current.coords] = [
      planetActivity,
      moonActivity,
    ];
    this.saveData();

    this.planetList.forEach((planet) => {
      let coords = planet
        .querySelector(".planet-koords")
        .textContent.slice(1, -1);
      let timers = this.json.myActivities[coords] || [0, 0];

      let value = Math.min(Math.round((now - timers[0]) / 60000), 60);
      let pTimer = planet.querySelector(".planetlink").appendChild(
        this.createDOM("div", {
          class: "ogl-timer ogl-short ogl-medium",
          "data-timer": value,
        })
      );

      if (this.json.options.activitytimers && value != 60 && value >= 15) {
        planet
          .querySelector(".planetlink")
          .appendChild(
            this.createDOM("div", { class: "activity showMinutes" }, value)
          );
      }
      this.updateTimer(pTimer);
      setInterval(() => this.updateTimer(pTimer, true), 60000);

      value = Math.min(Math.round((now - timers[1]) / 60000), 60);
      if (planet.querySelector(".moonlink")) {
        let mTimer = planet.querySelector(".moonlink").appendChild(
          this.createDOM("div", {
            class: "ogl-timer ogl-short ogl-medium",
            "data-timer": Math.min(Math.round((now - timers[1]) / 60000), 60),
          })
        );

        if (this.json.options.activitytimers && value != 60 && value >= 15) {
          planet
            .querySelector(".moonlink")
            .appendChild(
              this.createDOM("div", { class: "activity showMinutes" }, value)
            );
        }

        this.updateTimer(mTimer);
        setInterval(() => this.updateTimer(mTimer, true), 60000);
      }
    });
  }

  updateTimer(element, increment) {
    let time = parseInt(element.getAttribute("data-timer"));
    if (time <= 61) {
      if (increment) {
        time++;
        element.setAttribute("data-timer", time);
      }

      element.title = time;

      if (time >= 30) {
        element.classList.remove("ogl-medium");
      }
      if (time >= 15) {
        element.classList.remove("ogl-short");
      }
    }
  }

  async getEmpireInfo() {
    let abortController = new AbortController();
    this.abordSignal = abortController.signal;
    window.onbeforeunload = function (e) {
      abortController.abort();
    };

    return fetch(
      `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=standalone&component=empire`,
      { signal: abortController.signal }
    )
      .then((rep) => rep.text())
      .then((str) => {
        let planets = JSON.parse(
          str.substring(
            str.indexOf("createImperiumHtml") + 47,
            str.indexOf("initEmpire") - 16
          )
        ).planets;

        let hasMoon = false;
        planets.forEach((planet) => {
          for (const key in planet) {
            if (key.includes("html")) {
              delete planet[key];
            }
          }
          if (planet.moonID) {
            hasMoon = true;
          }
        });

        if (hasMoon) {
          return fetch(
            `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=standalone&component=empire&planetType=1`,
            { signal: abortController.signal }
          )
            .then((rep) => rep.text())
            .then((str) => {
              let moons = JSON.parse(
                str.substring(
                  str.indexOf("createImperiumHtml") + 47,
                  str.indexOf("initEmpire") - 16
                )
              ).planets;

              planets.forEach((planet) => {
                moons.forEach((moon, j) => {
                  if (planet.moonID == moon.id) {
                    for (const key in moon) {
                      if (key.includes("html")) {
                        delete moon[key];
                      }
                    }
                    planet.moon = moon;
                  }
                });
              });
              return planets;
            });
        }

        return planets;
      });
  }

  getFlyingRes() {
    let met = 0,
      cri = 0,
      deut = 0;

    let fleetCount = {};
    let uniques = {};
    let ids = [];
    let planets = {};
    document.querySelectorAll(".eventFleet").forEach((line) => {
      let tooltip = line.querySelector(".tooltip");
      let id = Number(line.getAttribute("id").split("-")[1]);
      let back =
        line.getAttribute("data-return-flight") == "false" ? false : true;
      let type = line.getAttribute("data-mission-type");
      let time = line.getAttribute("data-arrival-time");
      let coords = line
        .querySelector(".coordsOrigin > a")
        .innerText.trim()
        .slice(1, -1);

      let destCoords = line
        .querySelector(".destCoords > a")
        .innerText.trim()
        .slice(1, -1);

      let destIsMoon = document.querySelector(".destFleet .moon");
      let originIsMoon = document.querySelector(".originFleet .moon");

      let origin = coords + (destIsMoon ? "M" : "P");
      let dest = destCoords + (originIsMoon ? "M" : "P");
      let movement = {
        id: id,
        origin: back ? dest : origin,
        dest: back ? origin : dest,
      };

      // Market movements
      if (type == 16) return;

      let expe = {};
      // If statio (4) or return flight & not in expedition unique list
      if (type == 4 || (back && !(id - 1 in uniques) && !(id - 2 in uniques))) {
        uniques[id] = true;

        let div = document.createElement("div");
        div.html(
          tooltip.getAttribute("title") || tooltip.getAttribute("data-title")
        );

        div.querySelectorAll('td[colspan="2"]').forEach((tooltip) => {
          let count = Number(
            tooltip.nextElementSibling.innerHTML.trim().split(".").join("")
          );
          let name = tooltip.innerText.trim().slice(0, -1);

          let id = this.json.shipNames[name];
          if (id) {
            expe[id] ? (expe[id] += count) : (expe[id] = count);
            fleetCount[id]
              ? (fleetCount[id] += count)
              : (fleetCount[id] = count);
          } else {
            if (!planets[coords]) {
              planets[coords] = { metal: 0, crystal: 0, deuterium: 0 };
            }
            if (name == this.json.resNames[0]) {
              movement.metal = count;
              met += count;
              planets[coords].metal += count;
            }
            if (name == this.json.resNames[1]) {
              movement.crystal = count;
              cri += count;
              planets[coords].crystal += count;
            }
            if (name == this.json.resNames[2]) {
              movement.deuterium = count;
              deut += count;
              planets[coords].deuterium += count;
            }
          }
        });
      }
      ids.push(movement);
    });

    let t = {
      metal: met,
      crystal: cri,
      deuterium: deut,
      fleet: fleetCount,
      planets: planets,
      ids: ids,
    };
    return t;
  }

  hasActivityChanged(oldAct, newAct) {
    return (
      (oldAct == 0 && newAct > 0) ||
      (oldAct > 0 && newAct == 0) ||
      (oldAct < 61 && newAct == 61)
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  recordActivityChange(history, activity) {
    let ACTIVITY_TYPE = (timer) => {
      if (timer == 0) return "active";
      if (timer == 15) return "inactive15";
      if (timer > 15 && timer < 60) return "inactive60";
      if (timer == 61) return "inactive";
    };

    let last = history[history.length - 1];
    if (last) {
      last.end = new Date();
      if (activity == 15) {
        last.end = new Date(last.end - 1000 * 60 * 15);
      }
    }

    if (activity == 15) {
      history.push({
        activityType: ACTIVITY_TYPE(activity),
        start: new Date(new Date() - 1000 * 60 * 15),
        end: new Date(),
      });
    }

    history.push({
      className: ACTIVITY_TYPE(activity),
      start: new Date(),
    });
  }

  recordLostConnectivity(history) {
    let last = history[history.length - 1];
    if (last) {
      last.end = new Date();
    }
  }

  updateresourceDetail() {
    if (!this.json.options.empire) return;
    let mSumP = 0,
      cSumP = 0,
      dSumP = 0;
    let mSumM = 0,
      cSumM = 0,
      dSumM = 0;

    this.json.empire.forEach((planet) => {
      let planetNode = document.querySelector(`div[id=planet-${planet.id}]`);

      let isFullM = planet.metalStorage - planet.metal > 0 ? "" : " ogl-full";
      let isFullC =
        planet.crystalStorage - planet.crystal > 0 ? "" : " ogl-full";
      let isFullD =
        planet.deuteriumStorage - planet.deuterium > 0 ? "" : " ogl-full";

      let isaFullM =
        planet.metalStorage - planet.metal > planet.production.hourly[0] * 2
          ? ""
          : " ogl-afull";
      let isaFullC =
        planet.crystalStorage - planet.crystal > planet.production.hourly[1] * 2
          ? ""
          : " ogl-afull";
      let isaFullD =
        planet.deuteriumStorage - planet.deuterium >
        planet.production.hourly[2] * 2
          ? ""
          : " ogl-afull";

      let metalRess = planetNode.querySelectorAll(".ogl-metal");
      let crystalRess = planetNode.querySelectorAll(".ogl-crystal");
      let deutRess = planetNode.querySelectorAll(".ogl-deut");

      metalRess[0].innerText = this.formatToUnits(planet.metal);
      crystalRess[0].innerText = this.formatToUnits(planet.crystal);
      deutRess[0].innerText = this.formatToUnits(planet.deuterium);

      metalRess[0].classList = "ogl-metal " + isFullM + isaFullM;
      crystalRess[0].classList = "ogl-crystal " + isFullC + isaFullC;
      deutRess[0].classList = "ogl-deut " + isFullD + isaFullD;

      mSumP += planet.metal;
      cSumP += planet.crystal;
      dSumP += planet.deuterium;

      if (planet.moon != undefined && metalRess[1]) {
        metalRess[1].innerText = this.formatToUnits(planet.moon.metal);
        crystalRess[1].innerText = this.formatToUnits(planet.moon.crystal);
        deutRess[1].innerText = this.formatToUnits(planet.moon.deuterium);
        mSumM += planet.moon.metal;
        cSumM += planet.moon.crystal;
        dSumM += planet.moon.deuterium;
      }

      let sumNodes = document.querySelectorAll(".ogl-summary");

      sumNodes[0].querySelectorAll(
        ".ogl-metal"
      )[0].innerText = this.formatToUnits(mSumP);
      sumNodes[0].querySelectorAll(
        ".ogl-crystal"
      )[0].innerText = this.formatToUnits(cSumP);
      sumNodes[0].querySelectorAll(
        ".ogl-deut"
      )[0].innerText = this.formatToUnits(dSumP);

      sumNodes[0].querySelectorAll(
        ".ogl-metal"
      )[1].innerText = this.formatToUnits(mSumM);
      sumNodes[0].querySelectorAll(
        ".ogl-crystal"
      )[1].innerText = this.formatToUnits(cSumM);
      sumNodes[0].querySelectorAll(
        ".ogl-deut"
      )[1].innerText = this.formatToUnits(dSumM);

      sumNodes[1].querySelector(".ogl-metal").innerText = this.formatToUnits(
        this.json.flying.metal
      );
      sumNodes[1].querySelector(".ogl-crystal").innerText = this.formatToUnits(
        this.json.flying.crystal
      );
      sumNodes[1].querySelector(".ogl-deut").innerText = this.formatToUnits(
        this.json.flying.deuterium
      );

      sumNodes[2].querySelector(".ogl-metal").innerText = this.formatToUnits(
        mSumP + mSumM + this.json.flying.metal
      );
      sumNodes[2].querySelector(".ogl-crystal").innerText = this.formatToUnits(
        cSumP + cSumM + this.json.flying.crystal
      );
      sumNodes[2].querySelector(".ogl-deut").innerText = this.formatToUnits(
        dSumP + dSumM + this.json.flying.deuterium
      );
    });
  }

  resourceDetail() {
    let rechts = document.querySelector("#rechts");
    this.isMobile &&
      rechts.addEventListener("mouseover", () => {
        let rect = rechts.getBoundingClientRect();
        if (rect.width + rect.x > window.innerWidth) {
          let diff = rect.width + rect.x - window.innerWidth;
          rechts.style.right = diff + "px";
        }
      });

    this.isMobile &&
      rechts.addEventListener("mouseout", (e) => {
        if (e.target.classList.contains("tooltipRight")) return;
        if (e.target.classList.contains("tooltipLeft")) return;
        if (e.target.id == "planetList") {
          return;
        }
        rechts.style.right = "0px";
      });

    if (!this.json.options.empire) {
      return;
    }
    document.querySelector(".ogl-overview-icon").classList.add("ogl-active");

    let list = document.querySelector("#planetList");

    let flying = this.createDOM("div", { class: "ogl-res" });
    flying.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-metal" },
        this.formatToUnits(this.json.flying.metal)
      )
    );
    flying.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        this.formatToUnits(this.json.flying.crystal)
      )
    );
    flying.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-deut" },
        this.formatToUnits(this.json.flying.deuterium)
      )
    );

    let flyingSum = this.createDOM("div", {
      class: "smallplanet smaller ogl-summary",
    });
    flyingSum.appendChild(
      this.createDOM(
        "div",
        { class: "ogl-sum-symbol" },
        '<span class="icon_movement"></span>'
      )
    );
    flyingSum.appendChild(flying);

    let mSumP = 0,
      cSumP = 0,
      dSumP = 0;
    let mSumM = 0,
      cSumM = 0,
      dSumM = 0;

    let emulatedEmpire = [];
    !this.commander &&
      this.planetList.forEach((planet) => {
        let coords = planet
          .querySelector(".planet-koords")
          .textContent.slice(1, -1);
        let id = planet.getAttribute("id").replace("planet-", "");
        let moon = planet.querySelector(".moonlink");

        let metal = 0;
        let crystal = 0;
        let deuterium = 0;
        let metProd = 0,
          criProd = 0,
          deutProd = 0,
          diff = 0;
        let res = this.json.myRes[coords + "P"];
        let moonRes = this.json.myRes[coords + "M"];

        if (res) {
          metal = res.metal;
          crystal = res.crystal;
          deuterium = res.deuterium;

          let mines = this.json.myMines[coords];
          if (mines && mines.metal && mines.temperature) {
            diff = new Date().getTime() - new Date(res.lastUpdate).getTime();

            diff = diff / 1000 / 60 / 60;

            metProd = this.production(
              1,
              Number(mines.metal.replace("(", "").replace(")", "")),
              true,
              coords
            );
            criProd = this.production(
              2,
              Number(mines.crystal.replace("(", "").replace(")", "")),
              true,
              coords
            );
            deutProd = this.production(
              3,
              Number(mines.deuterium.replace("(", "").replace(")", "")),
              true,
              coords
            );

            if (res.metalStorage > res.metal) {
              metal = res.metal + metProd * diff;
              metal = Math.min(metal, res.metalStorage);
            } else {
              metal = res.metal;
            }
            if (res.crystalStorage > res.crystal) {
              crystal = res.crystal + criProd * diff;
              crystal = Math.min(crystal, res.crystalStorage);
            } else {
              crystal = res.crystal;
            }
            if (res.deuteriumStorage > res.deuterium) {
              deuterium = res.deuterium + deutProd * diff;
              deuterium = Math.min(deuterium, res.deuteriumStorage);
            } else {
              deuterium = res.deuterium;
            }
          }
        }

        emulatedEmpire.push({
          id: id,
          metalStorage: (res && res.metalStorage) || 0,
          metal: metal,
          crystalStorage: (res && res.crystalStorage) || 0,
          crystal: crystal,
          deuteriumStorage: (res && res.deuteriumStorage) || 0,
          deuterium: deuterium,
          production: { hourly: [metProd, criProd, deutProd] },
          invalidate: (res && res.invalidate) || false,
          moon: moon && {
            metal: (moonRes && moonRes.metal) || 0,
            crystal: (moonRes && moonRes.crystal) || 0,
            deuterium: (moonRes && moonRes.deuterium) || 0,
            invalidate: (moonRes && moonRes.invalidate) || false,
          },
        });
      });

    let empire = this.json.empire;
    if (emulatedEmpire.length != 0) {
      empire = emulatedEmpire;
    }
    empire.forEach((elem) => {
      let planet = list.querySelector(`div[id=planet-${elem.id}]`);
      if (!planet) return;
      let isFullM = elem.metalStorage - elem.metal > 0 ? "" : " ogl-full";
      let isFullC = elem.crystalStorage - elem.crystal > 0 ? "" : " ogl-full";
      let isFullD =
        elem.deuteriumStorage - elem.deuterium > 0 ? "" : " ogl-full";

      let isaFullM =
        elem.metalStorage - elem.metal > elem.production.hourly[0] * 2
          ? ""
          : " ogl-afull";
      let isaFullC =
        elem.crystalStorage - elem.crystal > elem.production.hourly[1] * 2
          ? ""
          : " ogl-afull";
      let isaFullD =
        elem.deuteriumStorage - elem.deuterium > elem.production.hourly[2] * 2
          ? ""
          : " ogl-afull";

      let divPla = this.createDOM("div", { class: "ogl-res" });
      if (elem.invalidate) divPla.classList.add("ogi-invalidate");

      divPla.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-metal" + isFullM + isaFullM },
          this.formatToUnits(elem.metal)
        )
      );
      divPla.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-crystal" + isFullC + isaFullC },
          this.formatToUnits(elem.crystal)
        )
      );
      divPla.appendChild(
        this.createDOM(
          "span",
          { class: "ogl-deut" + isFullD + isaFullD },
          this.formatToUnits(elem.deuterium)
        )
      );

      mSumP += elem.metal;
      cSumP += elem.crystal;
      dSumP += elem.deuterium;

      planet
        .querySelector(".planetlink")
        .parentNode.insertBefore(
          divPla,
          planet.querySelector(".planetlink").nextSibling
        );

      if (elem.moon) {
        let divMoon = this.createDOM("div", { class: "ogl-res" });
        if (elem.moon.invalidate) {
          divMoon.classList.add("ogi-invalidate");
        }
        divMoon.appendChild(
          this.createDOM(
            "span",
            { class: "ogl-metal" },
            this.formatToUnits(elem.moon.metal)
          )
        );
        divMoon.appendChild(
          this.createDOM(
            "span",
            { class: "ogl-crystal" },
            this.formatToUnits(elem.moon.crystal)
          )
        );
        divMoon.appendChild(
          this.createDOM(
            "span",
            { class: "ogl-deut" },
            this.formatToUnits(elem.moon.deuterium)
          )
        );

        mSumM += elem.moon.metal;
        cSumM += elem.moon.crystal;
        dSumM += elem.moon.deuterium;

        planet.appendChild(divMoon);
      }
    });

    let divPlaSum = this.createDOM("div", { class: "ogl-res" });

    divPlaSum.appendChild(
      this.createDOM("span", { class: "ogl-metal" }, this.formatToUnits(mSumP))
    );
    divPlaSum.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        this.formatToUnits(cSumP)
      )
    );
    divPlaSum.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, this.formatToUnits(dSumP))
    );

    let divMoonSum = this.createDOM("div", { class: "ogl-res" });
    divMoonSum.appendChild(
      this.createDOM("span", { class: "ogl-metal" }, this.formatToUnits(mSumM))
    );
    divMoonSum.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        this.formatToUnits(cSumM)
      )
    );
    divMoonSum.appendChild(
      this.createDOM("span", { class: "ogl-deut" }, this.formatToUnits(dSumM))
    );

    let sumPlanet = this.createDOM("div", {
      class: "smallplanet smaller ogl-summary",
    });
    sumPlanet.appendChild(
      this.createDOM("div", { class: "ogl-sum-symbol" }, "Σ")
    );
    sumPlanet.appendChild(divPlaSum);
    let moonSumSymbol = sumPlanet.appendChild(
      this.createDOM("div", { class: "ogl-sum-symbol" }, "Σ")
    );
    sumPlanet.appendChild(divMoonSum);
    list.appendChild(sumPlanet);

    list.appendChild(flyingSum);

    let sum = this.createDOM("div", {
      class: "smallplanet smaller ogl-summary",
    });

    let sumres = this.createDOM("div", { class: "ogl-res" });
    sumres.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-metal" },
        this.formatToUnits(mSumP + mSumM + this.json.flying.metal)
      )
    );
    sumres.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-crystal" },
        this.formatToUnits(cSumP + cSumM + this.json.flying.crystal)
      )
    );
    sumres.appendChild(
      this.createDOM(
        "span",
        { class: "ogl-deut" },
        this.formatToUnits(dSumP + dSumM + this.json.flying.deuterium)
      )
    );
    sum.appendChild(this.createDOM("div", { class: "ogl-sum-symbol" }, "ΣΣ"));
    sum.appendChild(sumres);

    list.appendChild(sum);

    if (document.querySelectorAll(".moonlink").length == 0) {
      divMoonSum.style.display = "none";
      moonSumSymbol.style.display = "none";
    }
  }

  updateInfo() {
    if (!this.commander) return;
    if (this.isLoading) return;
    this.isLoading = true;

    let svg = `<svg width="80px" height="30px" viewBox="0 0 187.3 93.7" preserveAspectRatio="xMidYMid meet">
                <path stroke="#3c536c" id="outline" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" 
                  d="M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 				
                    c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z" />
                <path id="outline-bg" opacity="0.1" fill="none" stroke="#eee" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-miterlimit="10" d="
                M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-13.3,7.2-22.1,17.1 				
                c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z" />
				      </svg>`;
    document
      .querySelector("#countColonies")
      .appendChild(this.createDOM("div", { class: "spinner" }, svg));

    return this.getEmpireInfo().then((json) => {
      this.json.empire = json;
      this.json.lastEmpireUpdate = new Date();
      this.updateresourceDetail();
      this.flyingFleet();
      this.isLoading = false;
      this.json.needsUpdate = false;
      this.saveData();
      document.querySelector(".spinner").remove();
    });
  }

  targetList(show) {
    let renderTagetList = () => {
      let galaxy = this.json.targetTabs.g == -1 ? false : true;
      let system = this.json.targetTabs.s == -1 ? false : true;
      let div = this.createDOM("div", { class: "ogl-target-list" });

      let header = div.appendChild(
        this.createDOM("div", { class: "ogk-controls" })
      );

      let markers = header.appendChild(this.createDOM("div"));

      ["red", "yellow", "green", "blue", "violet", "gray"].forEach((color) => {
        let toggle = this.createDOM("div", {
          class: "tooltip ogl-toggle",
          title: this.getTranslatedText(5),
        });
        toggle.setAttribute("data-toggle", color);
        markers.appendChild(toggle);

        if (!this.json.options.hiddenTargets[color])
          toggle.classList.add("ogl-active");

        toggle.addEventListener("click", () => {
          this.json.options.hiddenTargets[color] = this.json.options
            .hiddenTargets[color]
            ? false
            : true;
          this.saveData();

          if (this.json.options.hiddenTargets[color])
            toggle.classList.remove("ogl-active");
          else toggle.classList.add("ogl-active");

          content
            .querySelectorAll(`[data-marked="${color}"]`)
            .forEach((planet) => {
              if (this.json.options.hiddenTargets[color])
                planet.classList.add("ogl-colorHidden");
              else planet.classList.remove("ogl-colorHidden");
            });

          checkEmpty(galaxy, system);
        });
      });

      let filterTabs = header.appendChild(
        this.createDOM("div", {
          class: "ogl-tabList",
          style: "margin-bottom: 5px;",
        })
      );
      let tabG = filterTabs.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-tab" + (!galaxy ? " ogl-active" : "") },
          "Gs"
        )
      );
      tabG.addEventListener("click", () => {
        if (this.json.targetTabs.g == -1) {
          this.json.targetTabs.g = 0;
          galaxy = true;
          this.saveData();
          tabG.classList.remove("ogl-active");
        } else {
          this.json.targetTabs.g = -1;
          galaxy = false;
          this.saveData();
          let active = header.querySelector(`.ogl-tab[data-galaxy].ogl-active`);
          if (active) active.classList.remove("ogl-active");
          document.querySelectorAll(`a.ogl-galaxyHidden`).forEach((target) => {
            target.classList.remove("ogl-galaxyHidden");
          });
          tabG.classList.add("ogl-active");
        }
        checkEmpty(galaxy, system);
      });
      let tabS = filterTabs.appendChild(
        this.createDOM(
          "div",
          { class: "ogl-tab" + (!system ? " ogl-active" : "") },
          "Ss"
        )
      );
      tabS.addEventListener("click", () => {
        if (this.json.targetTabs.s == -1) {
          this.json.targetTabs.s = 0;
          system = true;
          this.saveData();
          tabS.classList.remove("ogl-active");
        } else {
          this.json.targetTabs.s = -1;
          system = false;
          this.saveData();
          let active = header.querySelector(`.ogl-tab[data-system].ogl-active`);
          if (active) active.classList.remove("ogl-active");
          document.querySelectorAll(`a.ogl-systemHidden`).forEach((target) => {
            target.classList.remove("ogl-systemHidden");
          });
          tabS.classList.add("ogl-active");
        }
        checkEmpty(galaxy, system);
      });

      // popup content
      let content = div.appendChild(
        this.createDOM("div", {
          class: "ogl-dialogContainer ogl-stalkContainer",
          style: "max-height: 400px; overflow: hidden",
        })
      );
      let galaxyTabList = header.appendChild(
        this.createDOM("div", { class: "ogl-tabList ogl-galaxyTabList" })
      );
      let systemTabList = header.appendChild(
        this.createDOM("div", { class: "ogl-tabList ogl-systemTabList" })
      );
      let planetList = content.appendChild(
        this.createDOM("div", { class: "ogl-stalkPlanets" })
      );
      header.appendChild(this.createDOM("hr"));

      let checkEmpty = (galaxy, system) => {
        for (let g = 1; g <= 10; g++) {
          if (galaxy) {
            let children = content.querySelector(
              `[data-galaxy="${g}"]:not(.ogl-colorHidden)`
            );

            if (children)
              header
                .querySelector(`.ogl-tab[data-galaxy="${g}"]`)
                .classList.remove("ogl-isEmpty");
            else
              header
                .querySelector(`.ogl-tab[data-galaxy="${g}"]`)
                .classList.add("ogl-isEmpty");
          } else {
            header
              .querySelector(`.ogl-tab[data-galaxy="${g}"]`)
              .classList.add("ogl-isEmpty");
          }
        }

        for (let s = 0; s < step * 10; s += step) {
          if (system) {
            let children = content.querySelector(
              `[data-galaxy="${this.json.targetTabs.g}"][data-system="${s}"]:not(.ogl-colorHidden)`
            );

            if (children)
              header
                .querySelector(`.ogl-tab[data-system="${s}"]`)
                .classList.remove("ogl-isEmpty");
            else
              header
                .querySelector(`.ogl-tab[data-system="${s}"]`)
                .classList.add("ogl-isEmpty");
          } else {
            header
              .querySelector(`.ogl-tab[data-system="${s}"]`)
              .classList.add("ogl-isEmpty");
          }
        }
      };

      // cleanup saved coords
      for (let coords in this.json.markers) {
        if (this.json.markers[coords] == "") {
          delete this.json.markers[coords];
        }
      }

      // sort coords
      let keys = Object.keys(this.json.markers).sort((a, b) => {
        let coordsA = a
          .split(":")
          .map((x) => x.padStart(3, "0"))
          .join("");
        let coordsB = b
          .split(":")
          .map((x) => x.padStart(3, "0"))
          .join("");

        return coordsA - coordsB;
      });

      let step = 50;

      // system buttons
      for (let i = 0; i < step * 10; i += step) {
        let sTab = systemTabList.appendChild(
          this.createDOM("div", { class: "ogl-tab", "data-system": i }, i)
        );

        if (this.json.targetTabs.s == i && system)
          sTab.classList.add("ogl-active");

        sTab.addEventListener("click", (event) => {
          if (!system) return;
          header
            .querySelectorAll(".ogl-tab[data-system].ogl-active")
            .forEach((e) => e.classList.remove("ogl-active"));
          event.target.classList.add("ogl-active");

          content.querySelectorAll(`[data-system]`).forEach((planet) => {
            planet.classList.add("ogl-systemHidden");

            if (planet.getAttribute("data-system") == i) {
              planet.classList.remove("ogl-systemHidden");
            }

            this.json.targetTabs.s = i;
          });
          this.saveData();
        });
      }

      // galaxy buttons
      for (let i = 1; i <= 10; i++) {
        let gTab = galaxyTabList.appendChild(
          this.createDOM("div", { class: "ogl-tab", "data-galaxy": i }, "G" + i)
        );

        if (this.json.targetTabs.g == i && galaxy)
          gTab.classList.add("ogl-active");
        if (this.json.targetTabs.g == 0) gTab.click();

        gTab.addEventListener("click", (event) => {
          if (!galaxy) return;
          header
            .querySelectorAll(".ogl-tab[data-galaxy]")
            .forEach((e) => e.classList.remove("ogl-active"));
          event.target.classList.add("ogl-active");

          content.querySelectorAll(`[data-galaxy]`).forEach((planet) => {
            planet.classList.add("ogl-galaxyHidden");

            if (planet.getAttribute("data-galaxy") == i) {
              planet.classList.remove("ogl-galaxyHidden");
            }
          });

          this.json.targetTabs.g = i;
          this.saveData();
          checkEmpty(galaxy, system);
        });
      }
      // build ui
      keys.forEach((coords) => {
        // renderPlanet;
        if (this.json.markers[coords]) {
          let a = this.renderPlanet(
            coords,
            false,
            false,
            this.json.markers[coords].moon
          );
          let splitted = coords.split(":");

          a.setAttribute("data-coords", coords);
          a.setAttribute("data-galaxy", splitted[0]);
          a.setAttribute("data-system", Math.floor(splitted[1] / step) * step);

          if (
            this.json.options.hiddenTargets[this.json.markers[coords].color]
          ) {
            a.classList.add("ogl-colorHidden");
          }

          if (galaxy) {
            if (this.json.targetTabs.g != splitted[0]) {
              a.classList.add("ogl-galaxyHidden");
            }
          }

          if (system) {
            if (
              this.json.targetTabs.s !=
              Math.floor(splitted[1] / step) * step
            ) {
              a.classList.add("ogl-systemHidden");
            }
          }

          planetList.appendChild(a);
        }

        setTimeout(() => {
          $(content).mCustomScrollbar({ theme: "ogame" });
        }, 100);
      });
      checkEmpty(galaxy, system);

      return div;
    };

    if (show) {
      document.querySelector("#planetList").style.display = "none";
      document.querySelector("#countColonies").style.display = "none";

      document
        .querySelector("#rechts")
        .children[0].appendChild(renderTagetList());
    } else {
      let list = document.querySelector(".ogl-target-list");
      if (list) {
        list.remove();
        document.querySelector("#planetList").style.display = "block";
        document.querySelector("#countColonies").style.display = "block";
      }
    }
  }

  addMarkerUI(coords, parent, id) {
    let div = this.createDOM("div", { class: "ogl-colorChoice" });

    ["red", "yellow", "green", "blue", "violet", "gray"].forEach((color) => {
      let circle = div.appendChild(
        this.createDOM("div", { "data-marker": color })
      );
      div.appendChild(circle);

      if (
        this.json.markers[coords] &&
        this.json.markers[coords].color == color
      ) {
        circle.classList.add("ogl-active");
      }

      circle.addEventListener("click", () => {
        div
          .querySelectorAll("div[data-marker]")
          .forEach((e) => e.classList.remove("ogl-active"));
        dataHelper.getPlayer(id).then((player) => {
          if (
            this.json.markers[coords] &&
            this.json.markers[coords].color == color
          ) {
            delete this.json.markers[coords];
            parent.closest("tr").removeAttribute("data-marked");
          } else {
            this.json.markers[coords] = this.json.markers[coords] || {};
            this.json.markers[coords].color = color;
            this.json.markers[coords].id = player.id;
            player.planets.forEach((planet) => {
              if (planet.coords == coords && planet.moon) {
                this.json.markers[coords].moon = true;
              }
            });

            circle.classList.add("ogl-active");
            parent.closest("tr").setAttribute("data-marked", color);
          }

          document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
          document
            .querySelector(".ogl-targetIcon")
            .classList.remove("ogl-targetsReady");

          this.saveData();

          if (this.json.options.targetList) {
            this.targetList(false);
            this.targetList(true);
          }
          this.sideStalk();
        });
      });
    });

    parent.addEventListener(this.eventAction, () => {
      this.tooltip(parent, div);
    });
  }

  sendMessage(id) {
    if (this.tchat) {
      ogame.chat.loadChatLogWithPlayer(Number(id));
    } else {
      document.location = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=chat&playerId=${id}`;
    }
  }

  generateIgnoreLink(playerId) {
    return `https://s169-fr.ogame.gameforge.com/game/index.php?page=ignorelist&action=1&id=${playerId}`;
  }
  generateBuddyLink(playerId) {
    return `https://s169-fr.ogame.gameforge.com/game/index.php?page=ingame&component=buddies&action=7&id=${playerId}&ajax=1`;
  }

  stalk(sender, player, delay) {
    let finalPlayer;

    let render = (player) => {
      finalPlayer = player;
      let content = this.createDOM("div");
      content.html(`
      <h1>${player.name} 
        <a href="${
          this.generateHiscoreLink(player.id) || ""
        }" class="ogl-ranking">
          #${player.points.position || "b"}
        </a>
      </h1>
      <hr style="margin-bottom: 8px">`);

      let actions = content.appendChild(
        this.createDOM("div", { class: "ogi-actions" })
      );
      actions.html(`
      <a href="${this.generateIgnoreLink(
        player.id
      )}" class="icon icon_against"></a>
      <a href="${this.generateBuddyLink(
        player.id
      )}" class="icon icon_user overlay buddyrequest"></a>`);

      let msgBtn = actions.appendChild(
        this.createDOM("a", { class: "icon icon_chat" })
      );
      msgBtn.addEventListener("click", () => {
        this.sendMessage(player.id);
      });

      let actBtn = actions.appendChild(
        this.createDOM(
          "a",
          { style: "margin-left: 10px", class: "ogl-text-btn" },
          "&#9888"
        )
      );

      let first = false;
      actBtn.addEventListener("mouseout", (e) => {
        this.keepTooltip = false;
      });
      actBtn.addEventListener("click", (e) => {
        if (this.page != "galaxy") {
          let coords = document
            .querySelector(`.ogl-tooltip .ogl-stalkPlanets a.ogl-main`)
            .getAttribute("data-coords")
            .split(":");
          location.href = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&id=${player.id}`;
        }

        if (this.keepTooltip) return;
        this.keepTooltip = true;
        let active = document.querySelectorAll(
          `.ogl-tooltip .ogl-stalkPlanets a.ogl-active`
        );
        active = active[active.length - 1];

        if (
          first &&
          first.getAttribute("data-coords") ==
            active.getAttribute("data-coords")
        ) {
          return;
        }

        let next = active.nextElementSibling;
        if (!next) {
          next = document.querySelector(`.ogl-tooltip .ogl-stalkPlanets a`);
        }
        let splits = next.getAttribute("data-coords").split(":");

        loadContent(splits[0], splits[1]);

        if (!first) first = active;
        e.preventDefault();
        e.stopPropagation();
      });

      let date = content.appendChild(
        this.createDOM("span", {
          style: "margin-top: 2px;",
          class: "ogl-right ogl-date",
        })
      );
      content.appendChild(this.createDOM("hr"));
      let detailRank = content.appendChild(
        this.createDOM("div", { class: "ogl-detailRank" })
      );
      content.appendChild(this.createDOM("hr"));
      let list = content.appendChild(
        this.createDOM("div", {
          class: "ogl-stalkPlanets",
          "player-id": player.id,
        })
      );
      let count = content.appendChild(
        this.createDOM("div", { class: "ogl-fullGrid ogl-right" })
      );

      let sideStalk = content.appendChild(
        this.createDOM("a", { class: "ogl-pin" })
      );

      sideStalk.addEventListener("click", () => this.sideStalk(player.id));

      let stats = content.appendChild(
        this.createDOM("a", { class: "ogl-mmorpgstats" })
      );
      stats.addEventListener("click", () => {
        window.open(this.generateMMORPGLink(player.id), "_blank");
      });

      player.planets.forEach((planet) => {
        if (this.activities) {
          delete this.activities[planet.coords];
        }
      });
      first = false;

      let pos = 0;
      if (this.page == "galaxy") {
        pos = sender.parentElement.parentElement.children[0].innerText;
      }
      this.page == "galaxy"
        ? (pos = { bottom: pos < 4, top: pos > 4 })
        : (pos = {});

      // pos = { left: true };
      this.tooltip(sender, content, false, pos, delay);

      let planets = this.updateStalk(player.planets, player.id);
      planets.forEach((e) => list.appendChild(e));
      this.highlightTarget();

      date.html(this.timeSince(new Date(player.lastUpdate)));

      count.html(player.planets.length + " planet(s)");

      detailRank.html(`
      <div><div class="ogl-totalIcon"></div> ${this.formatToUnits(
        player.points.score
      )} <small>pts</small></div>
      <div><div class="ogl-ecoIcon"></div> ${this.formatToUnits(
        player.economy.score
      )} <small>pts</small></div>
      <div><div class="ogl-techIcon"></div> ${this.formatToUnits(
        player.research.score
      )} <small>pts</small></div>
      <div><div class="ogl-fleetIcon"></div> ${this.formatToUnits(
        player.military.score
      )} <small>pts</small></div>
      <div><div class="ogl-fleetIcon grey"></div> ${this.formatToUnits(
        player.def
      )} <small>pts</small></div>
      <div><div class="ogl-fleetIcon orange"></div> ${this.formatToUnits(
        player.military.ships
      )} <small>ships</small></div>`);
    };

    if (isNaN(Number(player))) {
      finalPlayer = player;
    }

    sender.addEventListener(this.eventAction, () => {
      if (!finalPlayer) {
        dataHelper.getPlayer(player).then((p) => {
          render(p);
        });
      } else {
        render(finalPlayer);
      }
    });

    if (this.rawURL.searchParams.get(`id`) == player) {
      this.rawURL.searchParams.delete("id");

      dataHelper.getPlayer(player).then((p) => {
        render(p);
        document
          .querySelector(".ogl-tooltip")
          .addEventListener("mouseover", () => {
            this.keepTooltip = false;
          });
        this.keepTooltip = true;
      });
    }
  }

  renderPlanet(coords, main, scanned, moon, deleted) {
    coords = coords.split(":");
    let a = this.createDOM("a");

    let planetDiv = a.appendChild(
      this.createDOM("div", { class: "ogl-planet-div" })
    );
    let planetIcon = planetDiv.appendChild(
      this.createDOM("div", { class: "ogl-planet" })
    );

    let panel = planetDiv.appendChild(
      this.createDOM("div", { class: "ogl-planet-hover" })
    );
    let plaspy = panel.appendChild(
      this.createDOM("button", { class: "icon_eye" })
    );
    let plaFleet = panel.appendChild(
      this.createDOM("div", { class: "ogl-atk" })
    );

    plaspy.addEventListener("click", (e) => {
      sendShipsWithPopup(
        6,
        coords[0],
        coords[1],
        coords[2],
        0,
        this.json.spyProbes
      );
      e.stopPropagation();
    });
    plaFleet.addEventListener("click", (e) => {
      window.location.href = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=1`;
      e.stopPropagation();
    });

    planetDiv.appendChild(this.createDOM("div", { class: "ogl-planet-act" }));
    a.appendChild(this.createDOM("span", {}, coords.join(":")));
    a.setAttribute("data-coords", coords.join(":"));

    if (main) {
      a.classList.add("ogl-main");
      planetIcon.classList.add("ogl-active");
    }
    if (deleted) {
      a.classList.add("ogl-deleted");
    } else if (scanned) {
      a.classList.add("ogl-scan");
    }

    let moonDiv = a.appendChild(
      this.createDOM("div", { class: "ogl-moon-div" })
    );
    moonDiv.appendChild(this.createDOM("div", { class: "ogl-moon-act" }));

    let mIcon = moonDiv.appendChild(
      this.createDOM("div", { class: "ogl-moon" })
    );

    panel = moonDiv.appendChild(
      this.createDOM("div", { class: "ogl-moon-hover" })
    );
    plaFleet = panel.appendChild(this.createDOM("div", { class: "ogl-atk" }));
    plaspy = panel.appendChild(this.createDOM("button", { class: "icon_eye" }));

    plaspy.addEventListener("click", (e) => {
      sendShipsWithPopup(
        6,
        coords[0],
        coords[1],
        coords[2],
        3,
        this.json.spyProbes
      );
      e.stopPropagation();
    });
    plaFleet.addEventListener("click", (e) => {
      window.location.href = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=3`;
      e.stopPropagation();
    });

    a.addEventListener("click", () => {
      let link = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
      link =
        "https://" + window.location.host + window.location.pathname + link;

      if (event.ctrlKey) window.open(link, "_blank");
      else {
        if (this.page == "galaxy") {
          document.querySelector("#galaxy_input").value = coords[0];
          document.querySelector("#system_input").value = coords[1];
          submitForm();
          this.highlighted = coords.join(":");
        } else window.location.href = link;
      }
    });

    if (moon) {
      mIcon.classList.add("ogl-active");
      moonDiv.classList.add("ogl-active");
    }

    let targeted = this.json.markers[coords.join(":")];

    if (targeted) {
      a.classList.add("ogl-marked");
      a.setAttribute("data-marked", targeted.color);
    } else {
      a.classList.remove("ogl-marked");
      a.removeAttribute("data-marked");
    }
    return a;
  }

  updateStalk(planets) {
    let sorted = Object.values(planets);
    sorted.sort((a, b) => {
      let coordsA = a.coords
        .split(":")
        .map((x) => x.padStart(3, "0"))
        .join("");
      let coordsB = b.coords
        .split(":")
        .map((x) => x.padStart(3, "0"))
        .join("");

      return coordsA - coordsB;
    });

    let domArr = [];
    sorted.forEach((planet) => {
      let coords = planet.coords.split(":");

      let a = this.createDOM("a");

      let planetDiv = a.appendChild(
        this.createDOM("div", { class: "ogl-planet-div" })
      );
      let planetIcon = planetDiv.appendChild(
        this.createDOM("div", { class: "ogl-planet" })
      );

      let panel = planetDiv.appendChild(
        this.createDOM("div", { class: "ogl-planet-hover" })
      );
      let plaspy = panel.appendChild(
        this.createDOM("button", { class: "icon_eye" })
      );
      // let plaFleet = panel.appendChild(
      // this.createDOM("div", { class: "ogl-atk" })
      // );

      plaspy.addEventListener("click", (e) => {
        sendShipsWithPopup(
          6,
          coords[0],
          coords[1],
          coords[2],
          0,
          this.json.spyProbes
        );
        e.stopPropagation();
      });
      // plaFleet.addEventListener("click", (e) => {
      //   window.location.href =
      //   `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=1`;
      //   e.stopPropagation();
      // });

      planetDiv.appendChild(this.createDOM("div", { class: "ogl-planet-act" }));
      a.appendChild(this.createDOM("span", {}, planet.coords));
      a.setAttribute("data-coords", planet.coords);

      if (planet.isMain) {
        a.classList.add("ogl-main");
        planetIcon.classList.add("ogl-active");
      }

      if (planet.deleted) {
        a.classList.add("ogl-deleted");
      } else if (planet.scanned) {
        a.classList.add("ogl-scan");
      }

      let moonDiv = a.appendChild(
        this.createDOM("div", { class: "ogl-moon-div" })
      );
      moonDiv.appendChild(this.createDOM("div", { class: "ogl-moon-act" }));

      let mIcon = moonDiv.appendChild(
        this.createDOM("div", { class: "ogl-moon" })
      );

      panel = moonDiv.appendChild(
        this.createDOM("div", { class: "ogl-moon-hover" })
      );
      // plaFleet = panel.appendChild(this.createDOM("div", { class: "ogl-atk"
      // }));
      plaspy = panel.appendChild(
        this.createDOM("button", { class: "icon_eye" })
      );

      plaspy.addEventListener("click", (e) => {
        sendShipsWithPopup(
          6,
          coords[0],
          coords[1],
          coords[2],
          3,
          this.json.spyProbes
        );
        e.stopPropagation();
      });
      // plaFleet.addEventListener("click", (e) => {
      //   window.location.href =
      //   `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=3`;
      //   e.stopPropagation();
      // });

      a.addEventListener("click", (event) => {
        let link = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
        link =
          "https://" + window.location.host + window.location.pathname + link;

        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          window.open(link, "_blank");
        } else {
          if (this.page == "galaxy") {
            document.querySelector("#galaxy_input").value = coords[0];
            document.querySelector("#system_input").value = coords[1];
            submitForm();
            this.highlighted = coords.join(":");
          } else window.location.href = link;
        }
      });

      if (planet.moon) {
        mIcon.classList.add("ogl-active");
        moonDiv.classList.add("ogl-active");
      }

      let targeted = this.json.markers[planet.coords];

      if (targeted) {
        a.classList.add("ogl-marked");
        a.setAttribute("data-marked", targeted.color);
      } else {
        a.classList.remove("ogl-marked");
        a.removeAttribute("data-marked");
      }

      domArr.push(a);
    });

    return domArr;
  }

  sideStalk(playerid) {
    let getStatus = (status, noob) => {
      if (status == "") {
        if (noob) return "status_abbr_noob";
        return "status_abbr_active";
      }
      if (status.includes("b")) return "status_abbr_banned";
      if (status.includes("v")) return "status_abbr_vacation";
      if (status.includes("i")) return "status_abbr_inactive";
      if (status.includes("I")) return "status_abbr_longinactive";
      if (status.includes("o")) return "status_abbr_outlaw";
    };

    if (playerid) {
      this.json.sideStalk.forEach((e, i, o) => {
        if (e == playerid) o.splice(i, 1);
      });
      this.json.sideStalk.push(playerid);
      if (this.json.sideStalk.length > 10) {
        this.json.sideStalk.shift();
      }

      this.saveData();
    }

    let last = this.json.sideStalk[this.json.sideStalk.length - 1];

    if (last) {
      playerid = last;

      let sideStalk = document.querySelector(".ogl-sideStalk");

      if (sideStalk) {
        sideStalk.remove();
      }
      sideStalk = document
        .querySelector("#links")
        .appendChild(this.createDOM("div", { class: "ogl-sideStalk" }));

      let actBtn, watchlistBtn;

      if (!this.json.options.sideStalkVisible) {
        sideStalk.classList.add("ogi-hidden");
        sideStalk.addEventListener("click", () => {
          this.json.options.sideStalkVisible = true;
          this.saveData();
          this.sideStalk();
        });
      } else {
        watchlistBtn = sideStalk.appendChild(
          this.createDOM("a", { class: "ogl-text-btn" }, "h")
        );
        actBtn = sideStalk.appendChild(
          this.createDOM("a", { class: "ogl-text-btn" }, "&#9888")
        );
        let closeBtn = sideStalk.appendChild(
          this.createDOM("a", { class: "close-tooltip" })
        );
        closeBtn.addEventListener("click", () => {
          this.json.options.sideStalkVisible = false;
          this.saveData();
          this.sideStalk();
        });
      }

      dataHelper.getPlayer(playerid).then((player) => {
        sideStalk.appendChild(
          this.createDOM(
            "div",
            { class: "ogi-title " + getStatus(player.status) },
            player.name
          )
        );

        sideStalk.appendChild(this.createDOM("hr"));

        let container = sideStalk.appendChild(
          this.createDOM("div", {
            class: "ogl-stalkPlanets",
            "player-id": player.id,
          })
        );

        let planets = this.updateStalk(player.planets);
        planets.forEach((dom) => container.appendChild(dom));
        this.highlightTarget();

        let index = 0;
        let first = true;
        actBtn &&
          actBtn.addEventListener("click", () => {
            if (first) planets[0].click();

            while (
              planets[index] &&
              planets[index].classList.contains("ogl-active")
            )
              index++;
            if (planets[index]) planets[index].click();

            index++;
            if (index >= planets.length) {
              index = 0;
              this.activities = {};
            }
            first = false;
          });

        watchlistBtn &&
          watchlistBtn.addEventListener("click", () => {
            sideStalk.empty();
            sideStalk.appendChild(
              this.createDOM("div", { class: "title" }, "Historic")
            );
            sideStalk.appendChild(this.createDOM("hr"));
            this.json.sideStalk
              .slice()
              .reverse()
              .forEach((id) => {
                dataHelper.getPlayer(id).then((player) => {
                  let playerDiv = sideStalk.appendChild(
                    this.createDOM("div", { class: "ogl-player" })
                  );
                  playerDiv.appendChild(
                    this.createDOM(
                      "span",
                      { class: getStatus(player.status) },
                      player.name
                    )
                  );
                  playerDiv.appendChild(
                    this.createDOM("span", {}, "#" + player.points.position)
                  );
                  playerDiv.addEventListener("click", () => {
                    this.sideStalk(player.id);
                  });
                });
              });
          });

        container.appendChild(
          this.createDOM(
            "div",
            { class: "ogl-right ogl-date" },
            this.timeSince(new Date(player.lastUpdate))
          )
        );
      });
    }
  }

  checkDebris() {
    if (this.page == "galaxy") {
      this.FPSLoop("checkDebris");

      document.querySelectorAll(".debris").forEach((element) => {
        let debris = element.querySelector(".ListLinks");
        if (debris && !debris.classList.contains("ogl-debrisReady")) {
          debris.classList.add("ogl-debrisReady");
          let total = 0;

          let htmlContent = element.querySelector(".debrisField").innerHTML;
          debris.querySelectorAll(".debris-content").forEach((resources) => {
            let value = this.removeNumSeparator(
              resources.innerText.replace(/(\D*)/, "")
            );
            total += parseInt(value);

            htmlContent += this.formatToUnits(value) + "<br>";
          });

          element.querySelector(".debrisField").html(htmlContent);

          if (total > this.json.options.rvalLimit) {
            element.classList.add("ogl-active");
          }
        }
      });

      let expeBox = document.querySelector(".expeditionDebrisSlotBox");
      if (expeBox && !expeBox.classList.contains("ogl-done")) {
        let content = expeBox.querySelectorAll(".ListLinks li");
        expeBox.classList.add("ogl-done");

        let scouts = content[2];
        let action = content[3];
        let res = [
          content[0].textContent.replace(/(\D*)/, ""),
          content[1].textContent.replace(/(\D*)/, ""),
        ];

        expeBox.html(`
<img src="https://gf1.geo.gfsrv.net/cdnc5/fa3e396b8af2ae31e28ef3b44eca91.gif">
<div>
<div class="ogl-metal">${res[0]}</div>
<div class="ogl-crystal">${res[1]}</div>
</div>
<div>
<div>${scouts.textContent}</div>
<div>${action.outerHTML}</div>
</div>
`);
      }
    }
  }

  spyTable() {
    if (this.page == "fleetdispatch" && this.mode == 4) {
      let link =
        "https://" +
        window.location.host +
        window.location.pathname +
        "?page=messages";

      document.querySelector("#sendFleet").addEventListener("click", () => {
        localStorage.setItem("ogl-redirect", link);
      });

      let sent = false;

      document.addEventListener("keydown", (event) => {
        if (
          !sent &&
          event.keyCode === 13 &&
          fleetDispatcher.currentPage == "fleet3"
        ) {
          localStorage.setItem("ogl-redirect", link);
          sent = true;
        }
      });
    }

    if (this.page != "messages") return;

    this.FPSLoop("spyTable");

    let tab = document.querySelector("#subtabs-nfFleet20");

    if (
      !tab ||
      !tab.classList.contains("ui-tabs-active") ||
      !document.querySelector(".pagination") ||
      document.querySelector(".ogl-spyTable")
    )
      return;

    tab.classList.add("ogl-spyTableReady");

    let reportList = [];

    document.querySelectorAll(".msg").forEach((msg) => {
      if (
        !msg.querySelector(".msg_title") ||
        !msg.querySelector(".msg_content .resspan") ||
        msg.classList.contains("ogl-reportReady")
      )
        return;

      msg.classList.add("ogl-reportReady");

      let data = msg.querySelectorAll(".compacting");

      let rawDate = msg.querySelector(".msg_date").textContent.split(/\.| /g);
      let cleanDate = new Date(
        `${rawDate[2]}-${rawDate[1]}-${rawDate[0]} ${rawDate[3]}`
      );
      let deltaDate = Date.now() - cleanDate;
      let mins = deltaDate / 60000;
      let hours = mins / 60;

      if (
        !parseInt(
          data[0].querySelectorAll("span.fright")[0].textContent.match(/\d+/)
        )
      )
        return;

      let report = {};
      report.new = msg.classList.contains("msg_new");
      report.attacked = msg.querySelector(".icon_attack img");
      report.type = msg.querySelector("figure.moon") ? 3 : 1;
      report.name = data[0]
        .querySelectorAll('span[class^="status"]')[0]
        .textContent.replace(/&nbsp;/g, "")
        .trim();
      report.status = data[0]
        .querySelectorAll('span[class^="status"]')[1]
        .textContent.replace(/&nbsp;/g, "")
        .trim();
      report.spy = msg
        .querySelector('a[onclick*="sendShipsWithPopup"]')
        .getAttribute("onclick");
      report.activity = parseInt(
        data[0].querySelectorAll("span.fright")[0].textContent.match(/\d+/)[0]
      );
      report.coords = /\[.*\]/g
        .exec(msg.querySelector(".msg_title").innerHTML)[0]
        .slice(1, -1);
      report.coordsLink = msg.querySelector(".msg_title a").href;
      report.detail = msg.querySelector(".msg_actions a.fright").href;
      report.delete = msg.querySelector(".msg_head .fright a .icon_refuse");
      report.fleet =
        data[4].querySelectorAll("span").length > 0
          ? this.cleanValue(
              data[4]
                .querySelectorAll("span.ctn")[0]
                .textContent.replace(/(\D*)/, "")
                .split(" ")[0]
            )
          : "No Data";
      report.defense =
        data[4].querySelectorAll("span").length > 1
          ? this.cleanValue(
              data[4]
                .querySelectorAll("span.ctn")[1]
                .textContent.replace(/(\D*)/, "")
                .split(" ")[0]
            )
          : "No Data";
      report.deltaDate = deltaDate;
      report.cleanDate = cleanDate;
      report.date =
        hours < 1 ? Math.floor(mins) + " min" : Math.floor(hours) + "h";
      report.loot = data[3]
        .querySelector(".ctn")
        .textContent.replace(/(\D*)/, "")
        .replace(/%/, "");
      report.metal = this.cleanValue(
        data[2].querySelectorAll(".resspan")[0].textContent.replace(/(\D*)/, "")
      );
      report.crystal = this.cleanValue(
        data[2].querySelectorAll(".resspan")[1].textContent.replace(/(\D*)/, "")
      );
      report.deut = this.cleanValue(
        data[2].querySelectorAll(".resspan")[2].textContent.replace(/(\D*)/, "")
      );
      report.total = report.metal + report.crystal + report.deut;
      report.renta = Math.round((report.total * report.loot) / 100);

      report.apiKey =
        msg.querySelector(".icon_apikey").getAttribute("title") ||
        msg.querySelector(".icon_apikey").getAttribute("data-title");
      report.apiKey = report.apiKey.split("'")[1];

      report.pb = this.calcNeededShips({
        moreFret: true,
        fret: 210,
        resources: Math.ceil((report.total * report.loot) / 100),
      });

      report.pt = this.calcNeededShips({
        moreFret: true,
        fret: 202,
        resources: Math.ceil((report.total * report.loot) / 100),
      });
      report.gt = this.calcNeededShips({
        moreFret: true,
        fret: 203,
        resources: Math.ceil((report.total * report.loot) / 100),
      });
      report.pf = this.calcNeededShips({
        moreFret: true,
        fret: 219,
        resources: Math.ceil((report.total * report.loot) / 100),
      });

      let resRatio = [
        report.total / report.metal,
        report.total / report.crystal,
        report.total / report.deut,
      ];
      report.resRatio = resRatio.map((x) => Math.round((1 / x) * 100));

      report.tmpCoords = report.coords.split(":");
      report.tmpCoords = report.tmpCoords.map((x) => x.padStart(3, "0"));
      report.tmpCoords = report.tmpCoords.join("");

      reportList.push(report);
    });

    this.sortTable(reportList);
  }

  sortTable(arr) {
    arr.sort((a, b) => {
      if (this.json.options.spyFilter == "$") {
        return b.renta - a.renta;
      } else if (this.json.options.spyFilter == "DATE") {
        return a.deltaDate - b.deltaDate;
      } else if (this.json.options.spyFilter == "COORDS") {
        return a.tmpCoords - b.tmpCoords;
      } else if (this.json.options.spyFilter == "FLEET") {
        return b.fleet - a.fleet;
      } else if (this.json.options.spyFilter == "DEF") {
        return b.defense - a.defense;
      }
    });

    let pagination = document.querySelector(".pagination");

    let tableOptions = this.createDOM("div", { class: "ogl-tableOptions" });
    pagination.parentNode.insertBefore(tableOptions, pagination);

    // eye icon, toggle report table
    let enableTable = tableOptions.appendChild(
      this.createDOM("button", {
        class: "icon icon_eye ogl-enableTable tooltip",
        title: this.getTranslatedText(8),
      })
    );
    if (this.json.options.spyTableEnable)
      enableTable.classList.add("ogl-active");
    enableTable.addEventListener("click", () => {
      this.json.options.spyTableEnable = this.json.options.spyTableEnable
        ? false
        : true;
      this.saveData();
      document.location.reload();
    });

    // trash icon, toggle auto delete
    let autoDelete = tableOptions.appendChild(
      this.createDOM("button", {
        class: "icon icon_trash ogl-autoDelete tooltip",
        title: this.getTranslatedText(7),
      })
    );
    if (this.json.options.autoDeleteEnable)
      autoDelete.classList.add("ogl-active");
    autoDelete.addEventListener("click", () => {
      this.json.options.autoDeleteEnable = this.json.options.autoDeleteEnable
        ? false
        : true;
      this.saveData();
      document.location.reload();
    });

    // separator
    tableOptions.appendChild(
      this.createDOM("div", { style: "height:1px;width:20px;" })
    );

    // spy table
    let table = this.createDOM("table", { class: "ogl-spyTable" });
    pagination.parentNode.insertBefore(table, pagination);

    if (!this.json.options.spyTableEnable) table.classList.add("ogl-hidden");

    // header
    let header = this.createDOM("tr");
    table.appendChild(header);

    header.appendChild(this.createDOM("th", {}, "#"));
    header.appendChild(
      this.createDOM("th", { "data-filter": "DATE" }, "Date (*)")
    );
    header.appendChild(
      this.createDOM("th", { "data-filter": "COORDS" }, "Coords")
    );
    header.appendChild(this.createDOM("th", {}, "Name (+)"));
    header.appendChild(this.createDOM("th", { "data-filter": "$" }, "Renta"));
    header.appendChild(
      this.createDOM("th", { "data-filter": "FLEET" }, "Fleet")
    );
    header.appendChild(this.createDOM("th", { "data-filter": "DEF" }, "Def"));

    let cargoChoice = this.createDOM("div", { class: "ogk-cargo" });
    let sc = cargoChoice.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-fleet-ship ogl-fleet-202",
      })
    );
    let lc = cargoChoice.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-fleet-ship ogl-fleet-203",
      })
    );
    let pf = cargoChoice.appendChild(
      this.createDOM("div", {
        class: "ogl-option ogl-fleet-ship ogl-fleet-219",
      })
    );

    let updateDefaultShip = (id) => {
      this.json.options.spyFret = id;
      this.saveData();
      location.reload();
    };
    sc.addEventListener("click", () => updateDefaultShip(202));
    lc.addEventListener("click", () => updateDefaultShip(203));
    pf.addEventListener("click", () => updateDefaultShip(219));

    if (this.json.pbFret != 0) {
      let pb = cargoChoice.appendChild(
        this.createDOM("div", {
          class: "ogl-option ogl-fleet-ship ogl-fleet-210",
        })
      );
      pb.addEventListener("click", () => updateDefaultShip(210));
    }

    let cargo = header.appendChild(
      this.createDOM(
        "th",
        {},
        `<span class="ogl-option ogl-fleet-ship ogl-fleet-${this.json.options.spyFret}"></span>`
      )
    );

    cargo.addEventListener("mouseover", () =>
      this.tooltip(cargo, cargoChoice, false, false, 50)
    );

    header.appendChild(
      this.createDOM("th", { class: "ogl-headerColors" }, "-")
    );
    header.appendChild(this.createDOM("th", {}, "Actions"));

    document.querySelectorAll(".ogl-spyTable th").forEach((th) => {
      let filter = th.getAttribute("data-filter");

      if (this.json.options.spyFilter == filter) th.classList.add("ogl-active");

      th.addEventListener("click", () => {
        if (filter) {
          this.json.options.spyFilter = filter;
          this.saveData();
          document.location.reload();
        }
      });
    });

    // body
    arr.forEach(async (report, index) => {
      let line = this.createDOM("tr");
      table.appendChild(line);

      let indexDiv = line.appendChild(this.createDOM("td", {}, index + 1));
      if (report.new) {
        indexDiv.classList.add("ogi-new");
      }

      let dateDetail = `
${report.cleanDate.toLocaleDateString()}<br>
${report.cleanDate.toLocaleTimeString()}<br>
Activity : ${report.activity}
`;

      let dateText = `${this.timeSince(report.cleanDate)}<br>`;

      let date = line.appendChild(
        this.createDOM(
          "td",
          { class: "tooltipLeft ogl-date", title: dateDetail },
          dateText
        )
      );
      if (report.activity <= 15) date.classList.add("ogl-danger");
      else if (report.activity < 60) date.classList.add("ogl-care");
      else date.classList.add("ogl-good");

      let moonContent =
        report.type == 3 ? `<figure class="planetIcon moon"></figure>` : "";

      let coords = line.appendChild(this.createDOM("td"));
      coords.appendChild(
        this.createDOM(
          "a",
          { href: report.coordsLink },
          report.coords + moonContent
        )
      );

      let name = line.appendChild(this.createDOM("td", { class: "ogl-name" }));

      let status = {
        "": "status_abbr_active",
        "(i)": "status_abbr_inactive",
        "(I)": "status_abbr_longinactive",
        "(ph)": "status_abbr_honorableTarget",
        "(v)": "status_abbr_vacation",
        "(vi)": "status_abbr_vacation",
      };

      let link = name.appendChild(
        this.createDOM(
          "a",
          { class: status[report.status] },
          report.name + " " + report.status
        )
      );

      let totalDetail = `
<div class="ogl-metal">M: ${this.formatToUnits(report.metal)}</div>
<div class="ogl-crystal">C: ${this.formatToUnits(report.crystal)}</div>
<div class="ogl-deut">D: ${this.formatToUnits(report.deut)}</div>
<div class="splitLine"></div>
TOTAL: ${this.formatToUnits(report.total)}
`;

      let total = line.appendChild(
        this.createDOM(
          "td",
          { class: "tooltipLeft ogl-lootable", title: totalDetail },
          this.formatToUnits(report.renta)
        )
      );

      if (
        this.json.options.rvalLimit <=
        Math.round((report.total * report.loot) / 100)
      )
        total.classList.add("ogl-good");

      if (report.attacked) line.classList.add("ogl-attacked");

      total.style.background = `linear-gradient(to right, rgba(255, 170, 204, 0.63) ${
        report.resRatio[0]
      }%, rgba(115, 229, 255, 0.78) ${report.resRatio[0]}%
, rgba(115, 229, 255, 0.78) ${
        report.resRatio[0] + report.resRatio[1]
      }%, rgb(166, 224, 176) ${report.resRatio[2]}%)`;

      let fleet = line.appendChild(
        this.createDOM("td", {}, this.formatToUnits(report.fleet))
      );
      if (report.fleet > 0 || report.fleet == "No Data")
        fleet.classList.add("ogl-care");

      let defense = line.appendChild(
        this.createDOM("td", {}, this.formatToUnits(report.defense))
      );
      if (report.defense > 0 || report.defense == "No Data")
        defense.classList.add("ogl-danger");

      let splittedCoords = report.coords.split(":");

      // sc
      let shipId = this.json.options.spyFret;
      let shipCount;

      if (
        report.defense == 0 &&
        report.fleet == 0 &&
        this.json.options.spyFret == 210
      ) {
        shipCount = report.pb;
      } else {
        shipCount = 0;
      }

      if (this.json.options.spyFret == 202) shipCount = report.pt;
      if (this.json.options.spyFret == 203) shipCount = report.gt;
      if (this.json.options.spyFret == 219) shipCount = report.pf;

      let fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&am${shipId}=${shipCount}&oglMode=4`;

      let ship = line.appendChild(this.createDOM("td"));
      ship.appendChild(
        this.createDOM(
          "a",
          {
            href:
              "https://" +
              window.location.host +
              window.location.pathname +
              fleetLink,
          },
          shipCount.toLocaleString("de-DE")
        )
      );

      let colors = line.appendChild(this.createDOM("td"));
      colors.appendChild(
        this.createDOM("div", {
          class: "ogl-colors",
          "data-coords": report.coords,
        })
      );

      let moon = false;
      dataHelper.getPlayer(report.name).then((player) => {
        if (player.id) {
          this.stalk(link, player);
        }
        this.addMarkerUI(report.coords, colors, player.id, moon);
        if (this.json.markers[report.coords]) {
          line.classList.add("ogl-marked");
          line.setAttribute(
            "data-marked",
            this.json.markers[report.coords].color
          );
        }
      });

      let opt = line.appendChild(
        this.createDOM("td", { class: "ogl-spyOptions" })
      );

      opt.appendChild(
        this.createDOM("button", {
          class: "icon icon_maximize overlay",
          href: report.detail,
        })
      );
      let simulateBtn = opt.appendChild(
        this.createDOM("a", { class: "ogl-text-btn" }, "T")
      );

      let attackBtn = opt.appendChild(
        this.createDOM("a", { class: "icon ogl-icon-attack" }, "T")
      );
      attackBtn.addEventListener("click", () => {
        let fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&oglMode=4`;
        location.href = fleetLink;
      });

      simulateBtn.addEventListener("click", () => {
        let apiTechData = {};
        for (let id in this.json.apiTechData) {
          apiTechData[id] = { level: this.json.apiTechData[id] };
        }

        let coords = this.current.coords.split(":");
        let json = {
          "0": [
            {
              class: this.playerClass,
              research: apiTechData,
              planet: {
                galaxy: coords[0],
                system: coords[1],
                position: coords[2],
              },
            },
          ],
        };

        let base64 = btoa(JSON.stringify(json));
        window.open(
          `https://trashsim.universeview.be/${this.gameLang}?SR_KEY=${report.apiKey}#prefill=${base64}`,
          "_blank",
          `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
        );
      });

      opt.appendChild(
        this.createDOM("button", {
          class: "icon icon_eye",
          onclick: report.spy,
        })
      );

      let deleteBtn = opt.appendChild(
        this.createDOM("button", { class: "icon icon_trash" })
      );
      deleteBtn.addEventListener("click", () => {
        document.querySelectorAll(".ogl-sub").forEach((sub) => sub.remove());
        report.delete.click();
        line.remove();
      });

      if (
        this.json.options.autoDeleteEnable &&
        report.fleet == 0 &&
        Math.round((report.total * report.loot) / 100) <
          this.json.options.rvalLimit
      ) {
        deleteBtn.click();
      }
    });
  }

  sideLock(add) {
    document.querySelectorAll(".ogl-sideLock").forEach((e) => e.remove());

    let handleLock = (coords, planet) => {
      let splittedCoords = coords.split(":");
      let missing = this.json.missing[coords];
      let moon = false;
      if (coords.includes("M")) {
        moon = true;
      }

      if (missing) {
        let btn = this.createDOM("button", {
          class: "ogl-sideLock tooltip tooltipClose tooltipLeft",
        });

        planet.appendChild(btn);
        if (moon) {
          btn.classList.add("ogl-moonLock");
        }

        let div = this.createDOM("div");
        div.html(`
          <div style="width: 75px">Missing </div>
          
          <hr>
          <div class="ogl-metal">M: ${this.formatToUnits(
            Math.max(0, missing[0])
          )}</div>
          <div class="ogl-crystal">C: ${this.formatToUnits(
            Math.max(0, missing[1])
          )}</div>
          <div class="ogl-deut">D: ${this.formatToUnits(
            Math.max(0, missing[2])
          )}</div>
          <hr>
          `);
        let deleteBtn = div.appendChild(
          this.createDOM("div", {
            style: "width: 75px;",
            class: "icon icon_against",
          })
        );

        if (missing[0] + missing[1] + missing[2] == 0) {
          btn.classList.add("ogl-sideLockFilled");
        }

        deleteBtn.addEventListener("click", () => {
          delete this.json.missing[coords];
          this.saveData();
          this.sideLock();
          document.querySelector(".ogl-tooltip .close-tooltip").click();
        });

        btn.addEventListener("mouseover", () => {
          this.tooltip(btn, div, false, { left: true });
        });

        if (add && this.current.coords == coords) {
          this.tooltip(btn, div, false, { left: true });
        }

        btn.addEventListener("click", () => {
          let type = moon ? 3 : 1;

          let link = `?page=ingame&component=fleetdispatch&galaxy=${
            splittedCoords[0]
          }&system=${splittedCoords[1]}&position=${splittedCoords[2].slice(
            0,
            -1
          )}&type=${type}&mission=${
            this.json.options.harvestMission
          }&oglMode=2`;

          window.location.href =
            "https://" + window.location.host + window.location.pathname + link;
        });
      }
    };

    this.planetList.forEach((planet) => {
      let coords = planet
        .querySelector(".planet-koords")
        .textContent.slice(1, -1);

      handleLock(coords + "P", planet);
      handleLock(coords + "M", planet);
    });
  }

  highlightTarget() {
    if (this.page != "galaxy") return;

    let coords;

    if (this.highlighted) {
      coords = this.highlighted.split(":");
    } else {
      coords = [
        this.rawURL.searchParams.get(`galaxy`) || 0,
        this.rawURL.searchParams.get(`system`) || 0,
        this.rawURL.searchParams.get(`position`) || 0,
      ];
      coords.join(":");
    }

    if (
      document.querySelector("#galaxy_input").value == coords[0] &&
      document.querySelector("#system_input").value == coords[1]
    ) {
      let target = document.querySelectorAll("#galaxytable tbody tr")[
        parseInt(coords[2]) - 1
      ];
      if (target) target.classList.add("ogl-highlighted");
    }

    document.querySelectorAll("a[data-coords]").forEach((a) => {
      let hCoords = a.getAttribute("data-coords").split(":");

      if (
        document.querySelector("#galaxy_input").value == hCoords[0] &&
        document.querySelector("#system_input").value == hCoords[1]
      ) {
        a.classList.add("ogl-active");
      } else {
        a.classList.remove("ogl-active");
      }
    });
  }

  checkInputs() {
    this.FPSLoop("checkInputs");

    if (this.page == "fleetdispatch") {
      document
        .querySelectorAll('form[name="shipsChosen"] input')
        .forEach((i) => i.classList.add("ogl-formatInput"));
    }

    document.querySelectorAll("input.ogl-formatInput").forEach((input) => {
      if (input.value == "-") return;
      if (input.value == "NaN") input.value = "";
      if (input.value)
        input.value = parseInt(
          this.removeNumSeparator(input.value, true)
        ).toLocaleString("de-DE");
    });
  }

  selectShips(shipID, amount) {
    if (this.page == "fleetdispatch") {
      fleetDispatcher.shipsOnPlanet.forEach((ship) => {
        if (ship.id == shipID) {
          if (amount > ship.number) amount = ship.number;

          fleetDispatcher.selectShip(shipID, amount);
          fleetDispatcher.refresh();
          fleetDispatcher.focusSubmitFleet1();
        }
      });
    }

    return amount;
  }

  preselectShips() {
    if (this.page == "fleetdispatch") {
      fleetDispatcher.shipsOnPlanet.forEach((ship) => {
        let param = this.rawURL.searchParams.get(`am${ship.id}`);
        if (param) {
          this.selectShips(ship.id, param);
          fleetDispatcher.refresh();
          fleetDispatcher.focusSubmitFleet1();
        }
      });
    }
  }

  calcNeededShips(options) {
    options = options || {};
    // get resources
    let resources = [
      this.removeNumSeparator(
        document.querySelector("#resources_metal").textContent
      ),
      this.removeNumSeparator(
        document.querySelector("#resources_crystal").textContent
      ),
      this.removeNumSeparator(
        document.querySelector("#resources_deuterium").textContent
      ),
    ];

    resources = resources.reduce((a, b) => parseInt(a) + parseInt(b));

    if (options.resources || options.resources == 0)
      resources = options.resources;

    let type = options.fret || this.json.options.fret;
    let fret;

    if (type == 202) {
      fret = this.json.ptFret;
    } else if (type == 203) {
      fret = this.json.gtFret;
    } else if (type == 219) {
      fret = this.json.pfFret;
    } else if (type == 210) {
      fret = this.json.pbFret;
    } else if (type == 209) {
      fret = this.json.cyFret;
    }

    let total = resources / fret;
    if (options.moreFret) total *= 107 / 100;

    return Math.ceil(total);
  }

  calcAvailableFret(shipAmount) {
    let fret =
      this.json.options.fret == 203 ? this.json.gtFret : this.json.ptFret;
    return shipAmount * fret;
  }

  saveData() {
    localStorage.setItem("ogk-data", JSON.stringify(this.json));
  }

  createDOM(element, options, content) {
    let e = document.createElement(element);

    for (var key in options) {
      e.setAttribute(key, options[key]);
    }

    if (content || content == 0) e.html(content);

    return e;
  }

  formatToUnits(value) {
    let precision;

    let neg = false;
    if (value < 0) {
      neg = true;
      value *= -1;
    }

    if (value == 0) precision = 0;
    else if (value < 1000) precision = 0;
    else if (value < 1000000) precision = 1;
    else if (value < 10000000000) precision = 2;
    else precision = 3;

    if (isNaN(value)) return value;

    const abbrev = [
      "",
      LocalizationStrings["unitKilo"],
      LocalizationStrings["unitMega"],
      LocalizationStrings["unitMilliard"],
      "T",
    ];
    const unrangifiedOrder = Math.floor(Math.log10(Math.abs(value)) / 3);
    const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length - 1));
    const suffix = abbrev[order];

    return (
      (neg ? "-" : "") +
      (value / Math.pow(10, order * 3)).toFixed(precision) +
      suffix
    );
  }

  cleanValue(value) {
    let sep = LocalizationStrings["thousandSeperator"];
    let dec = LocalizationStrings["decimalPoint"];
    let reg = new RegExp(`${dec}([^${dec}]*)$`, "g");
    let factor = 1;
    if (value.indexOf(LocalizationStrings["unitMilliard"]) > -1) {
      value = value.replace(reg, "|" + "$1");
      value = value.slice(0, -LocalizationStrings["unitMilliard"].length);
      factor = 1000000000;
    } else if (value.indexOf(LocalizationStrings["unitMega"]) > -1) {
      value = value.replace(reg, "|" + "$1");
      value = value.slice(0, -LocalizationStrings["unitMega"].length);
      factor = 1000000;
    } else if (value.indexOf(LocalizationStrings["unitKilo"]) > -1) {
      value = value.replace(reg, "|" + "$1");
      value = value.slice(0, -LocalizationStrings["unitKilo"].length);
      factor = 1000;
    }
    value = value.split(sep).join("");
    return parseInt(value.replace("|", ".") * factor);
  }

  removeNumSeparator(str) {
    return str.replace(
      new RegExp(`\\${LocalizationStrings["thousandSeperator"]}`, "g"),
      ""
    );
  }

  consumption(id, lvl) {
    let baseCons = {
      1: 10,
      2: 10,
      3: 20,
      12: 10,
    };

    let cons = baseCons[id] * lvl * Math.pow(1.1, lvl);
    return Math.floor(cons);
  }

  production(id, lvl, total, coords) {
    let prodFactor = 1;
    let tech113, tech122, temp;
    let mines = this.json.myMines[coords || this.current.coords];

    if (this.commander) {
      tech113 = this.json.empire[0][113];
      tech122 = this.json.empire[0][122];
      this.json.empire.forEach((planet) => {
        if (planet.coordinates.slice(1, -1) == this.current.coords) {
          let splits = planet.temperature.split(" ");
          temp = splits[splits.length - 1];
          temp = temp.replace("°C", "");
        }
      });
    } else {
      tech113 = this.json.tech113;
      tech122 = this.json.tech122;
      temp = mines.temperature;

      let energyMet = this.consumption(
        1,
        mines.metal.replace("(", "").replace(")", "")
      );
      let energyCri = this.consumption(
        2,
        mines.crystal.replace("(", "").replace(")", "")
      );
      let energyDeut = this.consumption(
        3,
        mines.deuterium.replace("(", "").replace(")", "")
      );

      let energy = energyMet + energyCri + energyDeut;

      if (mines.energy < 0) {
        prodFactor = (energy + mines.energy) / energy;

        // alert(energyMet);
        // alert(energyMet / energyDeut);
        // alert(prodFactor / 100);
      }
    }

    let percentBonus = 0;

    let maxCrawlerCount =
      Number(mines.metal) + Number(mines.crystal) + Number(mines.deuterium);

    let crawlerBonus =
      Math.min(mines.crawlers, maxCrawlerCount) *
      (this.playerClass == PLAYER_CLASS_MINER ? 0.03 : 0.02);
    if (crawlerBonus > 50) crawlerBonus = 50;

    let geologistFactor = this.geologist ? 1 : 0;
    if (this.allOfficers) {
      geologistFactor = 0.12;
    }

    let baseProd = {
      1: 30,
      2: 20,
      3: 10,
      4: 20,
    };

    let plasmaFactor = {
      1: 0.01,
      2: 0.0066,
      3: 0.0033,
    };

    let initProd = 0;
    if (id == 1) {
      initProd += 30;
    } else if (id == 2) {
      initProd += 15;
    }

    let prod = baseProd[id] * lvl * Math.pow(1.1, lvl);
    if (id == 3) {
      prod *= 1.44 - 0.004 * temp;
    }
    if (id == 12) {
      prod = 30 * lvl * Math.pow(1.05 + tech113 * 0.01, lvl);
    }
    if (total) prod = prod * prodFactor;
    let plasma = prod * plasmaFactor[id] * tech122;
    let crawlers = prod * crawlerBonus;
    let geologist = prod * geologistFactor;
    let bonus = prod * percentBonus;
    let miner = (this.playerClass == PLAYER_CLASS_MINER ? 1 : 0) * 0.25 * prod;

    let totalProd =
      initProd + prod + geologist + plasma + crawlers + miner + bonus;

    if (id == 1 || id == 2 || id == 3) {
      prod = prod * this.json.speed;
      totalProd = totalProd * this.json.speed;
      return total ? Math.round(totalProd) : Math.round(prod);
    }

    return Math.round(prod);
  }

  research(id, lvl, labs, technocrat, explorer) {
    if (labs == 0) {
      labs = 1;
    }

    let baseCost = {
      106: [200, 1000, 200], // Espionnage
      108: [0, 400, 600], // Computer
      109: [800, 200, 0], // Weapons
      110: [200, 600, 0], // Shield
      111: [1000, 0, 0], // Armor
      113: [0, 800, 400], // Energy
      114: [0, 4000, 2000], // Hyperspace tech
      115: [400, 0, 600], // Comustion
      117: [2000, 4000, 600], // Impulse drive
      118: [10000, 20000, 6000], // Hyperspace drive
      120: [200, 100, 0], // Laser
      121: [1000, 300, 100], // Ion
      122: [2000, 4000, 1000], // Plasma
      123: [240000, 400000, 160000], // Research Network
      124: [4000, 8000, 4000], // Astrophysics
      199: [300000, 300000, 300000], // Graviton
    };
    let cost = baseCost[id];

    // if ()
    cost[0] *= Math.pow(2, lvl - 1);
    cost[1] *= Math.pow(2, lvl - 1);
    cost[2] *= Math.pow(2, lvl - 1);

    if (id == 199) {
      cost[0] *= 3;
      cost[1] *= 3;
      cost[2] *= 3;
    } else if (id == 124) {
      cost[0] = Math.ceil((4000 * Math.pow(1.75, lvl - 1)) / 100) * 100;
      cost[1] = Math.ceil((8000 * Math.pow(1.75, lvl - 1)) / 100) * 100;
      cost[2] = Math.ceil((4000 * Math.pow(1.75, lvl - 1)) / 100) * 100;
    }

    let time =
      (cost[0] + cost[1]) /
      (1000 * labs) /
      this.json.speed /
      this.json.researchDivisor;

    if (technocrat) time -= time * 0.25;
    if (explorer) time -= time * 0.25;

    return {
      time: time,
      cost: cost,
    };
  }

  getRobotsNanites(id, lvl, time) {
    this.getLabs(124, 1, "", false, true);
    for (let i = 0; i < 15; i++) {
      for (let j = 0; j < 25; j++) {
        let newTime = this.building(id, lvl, j, i).time;
        if (
          time ==
            formatTimeWrapper(newTime * 60 * 60, 2, true, " ", false, "") ||
          time ==
            formatTimeWrapper(newTime * 60 * 60 - 1, 2, true, " ", false, "") ||
          time ==
            formatTimeWrapper(newTime * 60 * 60 + 1, 2, true, " ", false, "")
        ) {
          return { robotics: j, nanites: i };
        }
      }
    }
  }

  getLabs(id, lvl, time, technocrat, explorer) {
    for (let i = 0; i < 300; i++) {
      let newTime = this.research(id, lvl, i, technocrat, explorer).time;

      if (
        time == formatTimeWrapper(newTime * 60 * 60, 2, true, " ", false, "") ||
        time ==
          formatTimeWrapper(newTime * 60 * 60 - 1, 2, true, " ", false, "") ||
        time ==
          formatTimeWrapper(newTime * 60 * 60 + 1, 2, true, " ", false, "")
      ) {
        return i;
      }
    }
  }

  building(id, lvl, robotic, nanite) {
    let baseCost = {
      1: [60, 15, 0], // Mine - metal
      2: [48, 24, 0], // Mine - cyrstal
      3: [225, 75, 0], // Mine - deuterium
      4: [75, 30, 0], // Solar plant
      12: [900, 360, 180], // Fusion reactor
      22: [1000, 0, 0], // Metal storage
      23: [1000, 500, 0], // Crystal storage
      24: [1000, 1000, 0], // Deuterium storage

      14: [400, 120, 200], // Robotic factory
      15: [1000000, 500000, 100000], // Nanite Factory
      21: [400, 200, 100], // Shipyard
      31: [200, 400, 200], // Research lab
      33: [0, 50000, 100000, 1000], // Terraformer
      34: [20000, 40000, 0], // Alliance depot
      36: [200, 0, 50, 50], // Repair Dock
      44: [20000, 20000, 1000], // Missile silo

      41: [20000, 40000, 20000], // Lunar base
      42: [20000, 40000, 20000], // Phalanx
      43: [2000000, 4000000, 2000000], // Star gate
    };

    let cost = baseCost[id];

    if (id == 1 || id == 3 || id == 4) {
      cost[0] *= Math.pow(1.5, lvl - 1);
      cost[1] *= Math.pow(1.5, lvl - 1);
    } else if (id == 2) {
      cost[0] *= Math.pow(1.6, lvl - 1);
      cost[1] *= Math.pow(1.6, lvl - 1);
    } else if (id == 12) {
      cost[0] *= Math.pow(1.8, lvl - 1);
      cost[1] *= Math.pow(1.8, lvl - 1);
      cost[2] *= Math.pow(1.8, lvl - 1);
    } else if (id == 36) {
      cost[0] *= Math.pow(5, lvl - 1) / 4;
      cost[2] *= Math.pow(5, lvl - 1) / 4;
      cost[3] *= Math.ceil(Math.pow(2.5, lvl - 1));
    } else if (id == 33) {
      cost[1] *= Math.pow(2, lvl - 1);
      cost[2] *= Math.pow(2, lvl - 1);
      cost[3] *= Math.pow(2, lvl - 1);
    } else {
      cost[0] *= Math.pow(2, lvl - 1);
      cost[1] *= Math.pow(2, lvl - 1);
      cost[2] *= Math.pow(2, lvl - 1);
    }

    let time =
      (cost[0] + cost[1]) /
      (2500 * Math.max(4 - lvl / 2, 1) * (1 + robotic) * Math.pow(2, nanite));
    if (id == 15 || id == 36 || id == 43) {
      time =
        ((cost[0] + cost[1]) / 2500) *
        (1 / (1 + robotic)) *
        Math.pow(0.5, nanite);
    }
    time /= this.json.speed;

    return {
      time: time,
      cost: cost,
    };
  }

  keyboardActions() {
    let closeDialog = () => {
      let overlay = document.querySelector(".ogl-dialogOverlay.ogl-active");
      let btn =
        document.querySelector(".ogl-dialog .btn_blue.save") ||
        document.querySelector(".ogl-dialog .btn_blue") ||
        document.querySelector(".ogl-dialog .close-tooltip");
      if (overlay) {
        btn.click();
        return true;
      }
      return false;
    };

    document.addEventListener("keydown", (event) => {
      if (event.keyCode == 13 || event.keyCode == 32 || event.keyCode == 27) {
        if (this.json.welcome) return;
        closeDialog();
      }

      if (this.page == "galaxy") {
        if (document.activeElement.getAttribute("type") == "search") {
          return;
        }
        if (event.keyCode == 13 || event.keyCode == 32) {
          if (document.querySelector(".refreshPhalanxLink")) {
            document.querySelector(".refreshPhalanxLink").click();
          } else {
            submitForm();
          }
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.keyCode == 70) {
        if (this.page != "highscore") {
          document.querySelector(".ogl-search-icon").click();
          event.preventDefault();
          event.stopPropagation();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.keyCode == 69) {
        document.querySelector(".ogl-empire-icon").click();
        event.preventDefault();
        event.stopPropagation();
      } else if ((event.ctrlKey || event.metaKey) && event.keyCode == 83) {
        document.querySelector(".ogl-statistics-icon").click();
        event.preventDefault();
        event.stopPropagation();
      } else if ((event.ctrlKey || event.metaKey) && event.keyCode == 68) {
        document.querySelector(".ogl-targetIcon").click();

        event.preventDefault();
        event.stopPropagation();
      }
    });

    if (this.page == "fleetdispatch") {
      document.addEventListener("keydown", (event) => {
        if (event.keyCode == 13) {
          if (fleetDispatcher.currentPage == "fleet1") {
            fleetDispatcher.trySubmitFleet1();
          } else if (fleetDispatcher.currentPage == "fleet2") {
            fleetDispatcher.trySubmitFleet2();
          } else if (fleetDispatcher.currentPage == "fleet3") {
            fleetDispatcher.trySubmitFleet3();
          }

          event.preventDefault();
          event.stopPropagation();
        }
      });
    }
  }

  FPSLoop(callbackAsString, params) {
    setTimeout(() => {
      requestAnimationFrame(() => this[callbackAsString](params));
    }, 1000 / 20);
  }

  tooltip(sender, content, autoHide, side, timer) {
    side = side || {};
    timer = timer || 300;

    let tooltip = document.querySelector(".ogl-tooltip");

    if (this.keepTooltip) return;

    document.querySelector(".ogl-tooltip > div") &&
      document.querySelector(".ogl-tooltip > div").remove();

    let close = document.querySelector(".close-tooltip");

    if (!tooltip) {
      tooltip = document.body.appendChild(
        this.createDOM("div", { class: "ogl-tooltip" })
      );

      close = tooltip.appendChild(
        this.createDOM("a", { class: "close-tooltip" })
      );

      close.addEventListener("click", (e) => {
        e.stopPropagation();
        tooltip.classList.remove("ogl-active");
      });

      document.body.addEventListener("click", (event) => {
        if (
          !event.target.getAttribute("rel") &&
          !event.target.closest(".tooltipRel") &&
          !event.target.classList.contains("ogl-colors") &&
          !tooltip.contains(event.target)
        ) {
          tooltip.classList.remove("ogl-active");
          this.keepTooltip = false;
        }
      });
    }
    tooltip.classList.remove("ogl-update");

    if (sender != this.oldSender) {
      tooltip.classList.remove("ogl-active");
    }
    tooltip.classList.remove("ogl-autoHide");
    tooltip.classList.remove("ogl-tooltipLeft");
    tooltip.classList.remove("ogl-tooltipRight");
    tooltip.classList.remove("ogl-tooltipBottom");

    this.oldSender = sender;

    let rect = sender.getBoundingClientRect();
    let win = sender.ownerDocument.defaultView;
    let position = {
      x: rect.left + win.pageXOffset,
      y: rect.top + win.pageYOffset,
    };

    if (side.left) {
      tooltip.classList.add("ogl-tooltipLeft");
      position.y -= 20;
      position.y += rect.height / 2;
    } else if (side.right) {
      tooltip.classList.add("ogl-tooltipRight");
      position.x += rect.width;
      position.y -= 20;
      position.y += rect.height / 2;
    } else if (side.bottom) {
      tooltip.classList.add("ogl-tooltipBottom");
      position.x += rect.width / 2;
      position.y += rect.height;
    } else {
      position.x += rect.width / 2;
    }

    if (sender.classList.contains("tooltipOffsetX")) {
      position.x += 33;
    }

    // if (sender.parentElement.classList.contains("playername")) {
    //   position.y -= 200;
    // }

    if (autoHide) {
      tooltip.classList.add("ogl-autoHide");
    }

    tooltip.appendChild(content);

    tooltip.style.top = position.y + "px";
    tooltip.style.left = position.x + "px";

    this.tooltipTimer = setTimeout(
      () => tooltip.classList.add("ogl-active"),
      timer
    );

    if (!sender.classList.contains("ogl-tooltipInit")) {
      sender.classList.add("ogl-tooltipInit");
      sender.addEventListener("mouseleave", (event) => {
        if (autoHide) {
          tooltip.classList.remove("ogl-active");
        }
        clearTimeout(this.tooltipTimer);
      });
    }

    return tooltip;
  }

  popup(header, content) {
    let overlay = document.querySelector(".ogl-dialogOverlay");

    if (!overlay) {
      overlay = document.body.appendChild(
        this.createDOM("div", { class: "ogl-dialogOverlay" })
      );
      overlay.addEventListener("click", (event) => {
        if (event.target == overlay) {
          if (this.json.welcome) return;
          overlay.classList.remove("ogl-active");
        }
      });
    }

    let dialog = overlay.querySelector(".ogl-dialog");

    if (!dialog) {
      dialog = overlay.appendChild(
        this.createDOM("div", { class: "ogl-dialog" })
      );
      let close = dialog.appendChild(
        this.createDOM("div", { class: "close-tooltip" })
      );
      close.addEventListener("click", () => {
        if (this.json.welcome) {
          this.json.welcome = false;
          this.saveData();
          if (this.playerClass == 0) {
            window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=characterclassselection`;
          } else {
            window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=overview`;
          }
        }
        overlay.classList.remove("ogl-active");
      });
    }

    let top =
      dialog.querySelector("header") ||
      dialog.appendChild(this.createDOM("header"));
    let body =
      dialog.querySelector(".ogl-dialogContent") ||
      dialog.appendChild(this.createDOM("div", { class: "ogl-dialogContent" }));

    top.html("");
    body.html("");

    if (header) {
      top.appendChild(header);
    }

    if (content) {
      body.appendChild(content);
    }

    overlay.classList.add("ogl-active");
  }

  trashsimTooltip(container, fleetinfo) {
    let ctn = container.appendChild(
      this.createDOM("div", { style: "display:flex;justify-content:center;" })
    );
    let btn = ctn.appendChild(
      this.createDOM("div", { class: "ogk-trashsim tooltip" })
    );

    let p = this.createDOM("div");
    p.html(fleetinfo);

    let ships = {};
    let t = p.querySelectorAll(".fleetinfo tr");
    Array.from(p.querySelectorAll(".fleetinfo tr")).forEach((elem) => {
      if (elem.children[1]) {
        let name = elem.children[0].innerText.slice(0, -1);
        let count = elem.children[1].innerText.split(".").join("");
        if (count > 0) {
          ships[this.json.shipNames[name]] = { count: count };
        }
      }
    });

    let apiTechData = {};
    for (let id in this.json.apiTechData) {
      apiTechData[id] = { level: this.json.apiTechData[id] };
    }

    btn.addEventListener("click", () => {
      let coords = this.current.coords.split(":");
      let json = {
        "0": [
          {
            class: this.playerClass,
            research: apiTechData,
            planet: {
              galaxy: coords[0],
              system: coords[1],
              position: coords[2],
            },
            ships: ships,
          },
        ],
        settings: this.json.trashsimSettings,
      };

      let base64 = btoa(JSON.stringify(json));
      window.open(
        `https://trashsim.universeview.be/${this.gameLang}?#prefill=${base64}`,
        "_blank",
        `location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
      );
    });
  }

  betterHighscore() {
    if (this.page == "highscore") {
      // history.pushState(
      //   {},
      //   null,
      //   `location.pathname  + location.search + "type=1"`
      // );

      let addTooltip = () => {
        let positions = document.querySelectorAll("#ranks tbody tr");

        positions.forEach((position) => {
          if (!position.classList.contains("ogi-ready")) {
            position.classList.add("ogi-ready");
            let playerDiv = position.querySelector(".playername");

            let countDiv = position.querySelector(".score.tooltip");
            if (countDiv) {
              let count =
                countDiv.getAttribute("title") ||
                countDiv.getAttribute("data-title");
              count = count.split(":")[1].trim();
              countDiv.html(
                `<span class="ogi-highscore-ships">(${count})</span> ${countDiv.innerText}`
              );
            }

            let mail = position.querySelector(".sendMail");
            if (mail) {
              let id = mail.getAttribute("data-playerid");
              dataHelper.getPlayer(id).then((p) => {
                if (p.status && p.status.includes("v")) {
                  playerDiv.html(
                    `<span class="status_abbr_vacation">${p.name}</span> ${status}`
                  );
                }
                this.stalk(playerDiv, p);
              });
            }
          }
        });
      };

      addTooltip();

      initHighscoreContent = () => {
        let active = document.querySelector(".stat_filter.active");
        let type = 0;
        if (active) {
          type = active.getAttribute("rel");
        }

        var href = new URL(location.href);
        href.searchParams.set("type", type);
        history.replaceState({}, null, href.toString());

        if (userWantsFocus) {
          if ($("#position" + searchPosition).length > 0) {
            let top = Math.max(
              0,
              $("#position" + searchPosition).offset().top - 200
            );
            scrollTo(0, top);
          }
        }
        $(".changeSite").change(function () {
          var value = $(this).val();
          $("#stat_list_content").html(
            '<div class="ajaxLoad">' + LocalizationStrings.loading + "</div>"
          );
          ajaxCall(
            highscoreContentUrl +
              "&category=" +
              currentCategory +
              "&type=" +
              currentType +
              "&site=" +
              value,
            "#stat_list_content",
            initHighscoreContent
          );
        });
        // scroll to top buttons
        var scrollToTopButton = $("#scrollToTop");
        var positionCell = $("#ranks thead .score");
        function positionScrollButton() {
          if (positionCell.length) {
            scrollToTopButton.css("left", positionCell.offset().left);
          }
        }
        positionScrollButton();
        $(window)
          .unbind("resize.highscoreTop")
          .bind("resize.highscoreTop", positionScrollButton);
        addTooltip();
      };
      history.scrollRestoration = "manual";

      let type = this.rawURL.searchParams.get("type");
      if (type) {
        $(".stat_filter").removeClass("active");
        $(`.stat_filter[rel=${type}]`).addClass("active");
      }
      initHighscoreContent();
    }
  }

  betterAPITooltip(sender) {
    if (sender.classList.contains("icon_apikey")) {
      let data =
        sender.getAttribute("title") || sender.getAttribute("data-title");
      let first = data.indexOf("'");
      let second = data.indexOf("'", first + 1);
      sender.addEventListener("click", () => {
        fadeBox("<br/>API Key copied in clipboard");
        navigator.clipboard.writeText(
          data.substr(first + 1, second - first - 1)
        );
      });
      return true;
    }
    if (sender.classList.contains("show_fleet_apikey")) {
      let data =
        sender.getAttribute("title") || sender.getAttribute("data-title");
      if (data) {
        let first = data.indexOf('value="');
        let second = data.indexOf('"', first + 7);
        sender.addEventListener("click", () => {
          fadeBox("<br/>API Key copied in clipboard");
          navigator.clipboard.writeText(
            data.substr(first + 7, second - first - 7)
          );
        });
      }
      return true;
    }
  }

  showTooltip(sender) {
    if (
      !sender.classList.contains("ogl-tooltipReady") &&
      !sender.classList.contains("ogl-stalkReady") &&
      !sender.classList.contains("activity")
    ) {
      sender.classList.add("ogl-tooltipReady");
      let show = () => {
        let content;
        let appendMode = false;

        this.betterAPITooltip(sender);

        if (sender.classList.contains("tooltipRel")) {
          let rel = sender.getAttribute("rel");
          // Fix for the demolition tooltip (idk wtf)
          rel = rel.replace("_oneTimeelement", "");

          let id = "#" + rel;
          content = document.querySelector(id).cloneNode(true);
          appendMode = true;
        } else {
          content = sender.getAttribute("data-title");
        }

        if (!content) {
          content = sender.getAttribute("title");
          if (!content) return;
          sender.setAttribute("data-title", content);
        }

        sender.removeAttribute("title");

        if (sender.classList.contains("tooltipHTML")) {
          content = content.replace("|", "<hr>");
        }
        if (
          sender.getAttribute("id") &&
          sender.getAttribute("id").indexOf("route_") == 0
        ) {
          sender.classList.add("tooltipRight");
        }

        let div = this.createDOM("div");
        appendMode ? div.appendChild(content) : div.html(content);

        if (
          (typeof content === "string" || content instanceof String) &&
          content.includes("fleetinfo")
        ) {
          this.trashsimTooltip(div, content);
        }

        let side = {};
        side.left = sender.classList.contains("tooltipLeft");
        side.right = sender.classList.contains("tooltipRight");
        side.bottom = sender.classList.contains("tooltipBottom");

        let autoHide = true;
        if (
          sender.classList.contains("tooltipClose") ||
          sender.classList.contains("tooltipCustom")
        ) {
          autoHide = false;
        }
        this.tooltip(sender, div, autoHide, side);
      };
      sender.addEventListener(this.eventAction, () => {
        show();
      });
      show();
    }
  }

  betterTooltip() {
    Tipped.show = (e) => {
      this.showTooltip(e);
    };
  }

  utilities() {
    // fix top tooltips
    document
      .querySelectorAll(
        "#resources .tooltipHTML, #commandercomponent .tooltipHTML"
      )
      .forEach((e) => {
        e.classList.add("tooltipBottom");
      });

    if (this.page == "fleetdispatch") {
      // speed slider

      document.querySelector("#speedPercentage").classList.add("ogl-hidden");

      let slider = this.createDOM("div", { class: "ogl-fleetSpeed" });
      document.querySelector("#fleetBriefingPart1").appendChild(slider);

      slider.html(`
        <div data-step="1">10</div>
        <div data-step="2">20</div>
        <div data-step="3">30</div>
        <div data-step="4">40</div>
        <div data-step="5">50</div>
        <div data-step="6">60</div>
        <div data-step="7">70</div>
        <div data-step="8">80</div>
        <div data-step="9">90</div>
        <div class="ogl-active" data-step="10">100</div>
        `);

      $(".ogl-fleetSpeed div").on("click", (event) => {
        $(`.ogl-fleetSpeed div`).removeClass("ogl-active");
        fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
        $(
          `.ogl-fleetSpeed div[data-step=${fleetDispatcher.speedPercent}]`
        ).addClass("ogl-active");
      });

      $(".ogl-fleetSpeed div").on("mouseover", (event) => {
        fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
        fleetDispatcher.refresh();
      });

      $(".ogl-fleetSpeed div").on("mouseout", (event) => {
        fleetDispatcher.speedPercent = slider
          .querySelector(".ogl-active")
          .getAttribute("data-step");
        fleetDispatcher.refresh();
      });

      // ship infos
      let data = fleetDispatcher.fleetHelper.shipsData;
      for (let id in data) {
        let infos = `
            <div class="ogl-fleetInfo">
                ${data[id].name}
                <hr>
                <div><span>Fret</span>${data[id].cargoCapacity.toLocaleString(
                  "de-DE"
                )}</div>
                <div><span>${this.getTranslatedText(19)}</span>${data[
          id
        ].speed.toLocaleString("de-DE")}</div>
                <div><span>Conso</span>${data[
                  id
                ].fuelConsumption.toLocaleString("de-DE")}</div>
            </div>`;

        let ship = document.querySelector(
          `.technology[data-technology="${id}"]`
        );

        if (ship) {
          ship.setAttribute("data-title", infos);
          ship.removeAttribute("title");
        }
      }
    }

    if (this.page == "movement") {
      let lastFleetId = -1;
      let lastFleetBtn;
      let date;
      document.querySelectorAll(".fleetDetails").forEach((fleet) => {
        let id = Number(fleet.getAttribute("id").replace("fleet", ""));
        if (id > lastFleetId && fleet.querySelector(".reversal a")) {
          lastFleetId = id;
          lastFleetBtn = fleet.querySelector(".reversal a");
        }
        let type = fleet.getAttribute("data-mission-type");
        let originCoords = fleet
          .querySelector(".originCoords")
          .innerText.slice(1, -1);
        this.planetList.forEach((planet) => {
          let coords = planet
            .querySelector(".planet-koords")
            .textContent.slice(1, -1);
          if (coords == originCoords) {
            fleet.querySelector(".timer").classList.add("friendly");
            fleet.querySelector(".nextTimer") &&
              fleet.querySelector(".nextTimer").classList.add("friendly");
          }
        });
        fleet.appendChild(
          this.createDOM("a", { class: `ogl-mission-icon ogl-mission-${type}` })
        );

        let fleetInfo = fleet.querySelector(".fleetinfo");

        let fleetCount = 0;
        let values = fleetInfo.querySelectorAll("td.value");
        let backed = [0, 0, 0];
        values.forEach((value, index) => {
          if (index == values.length - 1) {
            backed[2] = Number(value.innerText.split(".").join(""));
            return;
          }
          if (index == values.length - 2) {
            backed[1] = Number(value.innerText.split(".").join(""));
            return;
          }
          if (index == values.length - 3) {
            backed[0] = Number(value.innerText.split(".").join(""));
            return;
          }

          fleetCount += Number(value.innerText.split(".").join(""));
        });

        let destination = fleet
          .querySelector(".destinationCoords a")
          .innerText.slice(1, -1);
        let coords =
          destination +
          (fleet.querySelector(".destinationData moon") ? "M" : "P");
        let revesal = fleet.querySelector(".reversal a");
        if (revesal) {
          revesal.addEventListener("click", () => {
            if (this.json.missing[coords]) {
              this.json.missing[coords][0] += backed[0];
              this.json.missing[coords][1] += backed[1];
              this.json.missing[coords][2] += backed[2];
            }

            if (this.json.myRes[coords]) {
              this.json.myRes[coords].metal -= backed[0];
              this.json.myRes[coords].crystal -= backed[1];
              this.json.myRes[coords].deuterium -= backed[2];
            }
            this.saveData();
          });
        }

        let details = fleet.appendChild(
          this.createDOM("div", { class: "ogk-fleet-detail" })
        );
        details.appendChild(
          this.createDOM(
            "div",
            { class: "ogk-ships-count" },
            this.formatToUnits(fleetCount) + " ships"
          )
        );

        if (!fleet.querySelector(".reversal")) return;

        let back =
          fleet.querySelector(".reversal a").title ||
          fleet.querySelector(".reversal a").getAttribute("data-title");
        let splitted = back
          .split("|")[1]
          .replace("<br>", "/")
          .replace(/:|\./g, "/")
          .split("/");

        let backDate = {
          year: splitted[2],
          month: splitted[1],
          day: splitted[0],
          h: splitted[3],
          m: splitted[4],
          s: splitted[5],
        };

        let lastTimer = new Date(
          backDate.year,
          backDate.month,
          backDate.day,
          backDate.h,
          backDate.m,
          backDate.s
        ).getTime();

        let content = details.appendChild(
          this.createDOM("div", { class: "ogl-date" })
        );
        let date;

        let updateTimer = () => {
          lastTimer += 1000;
          date = new Date(lastTimer);
          content.html(
            getFormatedDate(
              date.getTime(),
              "<strong> [G]:[i]:[s] </strong> - [d].[m]"
            )
          );
        };

        updateTimer();
        setInterval(() => updateTimer(), 500);
      });

      if (lastFleetBtn) {
        lastFleetBtn.style.filter = "hue-rotate(180deg) saturate(150%)";
        let backlast = document.querySelector(".fleetStatus").appendChild(
          this.createDOM(
            "span",
            { class: "reload ogl-backLast" },
            `
          <a class="dark_highlight_tablet"">
            <span class="icon icon_link"></span>
            <span>Back latest</span>
          </a>
            `
          )
        );

        backlast.addEventListener("click", () => {
          lastFleetBtn.click();
        });
      }
    }
  }

  loopUtilities() {
    this.FPSLoop("loopUtilities");
    if (this.page == "galaxy") {
      if (document.querySelector('a[onclick*="sendShips"')) {
        let ships = document
          .querySelector('a[onclick*="sendShips"')
          .getAttribute("onclick")
          .match(/\d+/g)
          .map(Number);
        if (ships[0] == 6) this.json.spyProbes = ships[5];
      }
    }
  }

  getTranslatedText(id) {
    let text = {
      0: ["Gestion des données", "Manage data"],
      1: ["Ouvrir la liste de cibles", "Open targets list"],
      2: [
        "Alterne entre PT et GT comme type de vaisseaux à utilser pour les envois de ressources",
        "Switch between SC and LC as default ship to use for transporting resources",
      ],
      3: [
        "Alterne entre transport et stationnement comme type de mission à utiliser pour les rapatriements",
        "Switch between transport and deployment as default mission to use for transporting resources",
      ],
      4: [
        "Rapatrie les ressources vers la planète/lune ciblée",
        "Send resources to the target planet/moon",
      ],
      5: ["Afficher/masquer les cibles", "Show ignored targets"],
      6: [
        "Rentabilité minimale d'une cible pour être considéré comme intéressante",
        "Minimal target rentability to be considered as interesting",
      ],
      7: [
        "Active/désactive la suppression automatique des rapports inintéréssants",
        "Toggle automatic removal of low rentability reports",
      ],
      8: ["Active/désactive le tableau d'espionnage", "Toggle spy table"],
      9: ["Ignorer cette planète", "Skip this planet"],
      10: ["Envoyer vers...", "Send to..."],
      11: ["Active/désactive la vue compacte", "Toggle compact view"],
      12: [
        "Quantité de ressources à laisser ici",
        "Amount of resources that stays here",
      ],
      13: ["Liste des cibles", "Targets list"],
      14: ["Aucun résultat trouvé", "No data found"],
      15: ["PT", "SC"],
      16: ["GT", "LC"],
      17: ["Epingler ces données", "Pin this data"],
      18: ["Ressources en vol", "In flight resources"],
      19: ["Vit.", "Speed"],
      20: ["Espionner la planète", "Spy planet"],
      21: ["Espionner la lune", "Spy moon"],
      22: ["Attaquer la planète", "Attack planet"],
      23: ["Technologie hyperespace", "Hyperspace technology"],
      24: ["Seuil rentabilité", "Rentability threshold"],
      25: ["Quantité de ressources à garder", "Resources amount to keep"],
    };

    let line = this.gameLang == "fr" ? 0 : 1;

    return '<span class="ogl-translated">' + text[id][line] + "</span>";
  }

  getLocalStorageSize() {
    var other = 0;
    var ogi = 0;
    for (var x in localStorage) {
      // Value is multiplied by 2 due to data being stored in `utf-16` format,
      // which requires twice the space.
      var amount = localStorage[x].length / 1024 / 1024;
      if (!isNaN(amount) && localStorage.hasOwnProperty(x)) {
        if (x == "ogk-data") {
          ogi += amount;
        } else {
          other += amount;
        }
      }
    }
    return {
      ogi: ogi.toFixed(2),
      other: other.toFixed(2),
      total: (ogi + other).toFixed(2),
    };
  }

  purgeLocalStorage() {
    for (var x in localStorage) {
      if (x != "ogk-data") {
        delete localStorage[x];
      }
    }
  }

  settings() {
    function download(content, fileName) {
      var a = document.createElement("a");
      var file = new Blob([JSON.stringify(content)], { type: "text/plain" });
      a.href = URL.createObjectURL(file);
      a.download = fileName;
      a.click();
    }

    let size = this.getLocalStorageSize();

    let container = this.createDOM("div", {
      class: "ogl-dialogContainer ogl-settings",
    });
    let dataDiv = container.appendChild(this.createDOM("div", {}));
    dataDiv.appendChild(this.createDOM("div", { class: "ogk-logo" }));

    dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `Bug reporting 
        <a target="_blank" href="https://discord.gg/9aMdQgk"> Here </span>`
      )
    );
    dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `Feature request  
        <a target="_blank" href="https://discord.gg/9aMdQgk"> Here </span>`
      )
    );

    dataDiv.appendChild(
      this.createDOM(
        "p",
        {
          style:
            "max-width: 250px; margin-top: 10px; font-style: italic; margin: 20px 0px 11px 0px",
        },
        "If you like it please leave a review. And if you're feeling generous :) You can also..."
      )
    );
    let di = dataDiv.appendChild(
      this.createDOM("div", { style: "margin: 10px 0px 20px 38px" })
    );
    di.html(
      `<a class="bmc-button" target="_blank" href="https://www.buymeacoffee.com/ogameinfinity"><img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="Buy me a coffee"><span>Buy me a coffee</span></a>`
    );

    dataDiv.appendChild(this.createDOM("hr"));

    dataDiv.appendChild(
      this.createDOM(
        "h1",
        {},
        `Data management <span style="font-weight: 100;color: white; float:right"> <strong class="${
          size.total > 4 ? "overmark" : "undermark"
        }"> ${size.total}</strong>  / 5 Mb`
      )
    );

    dataDiv.appendChild(this.createDOM("h1", {}, ``));

    let expeditionsBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="expeditions">Expeditions data</label>
        <input type="checkbox" id="expeditions" name="expeditions">`
      )
    );

    let combatsBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="combats">Combats data</label>
        <input type="checkbox" id="combats" name="combats">`
      )
    );
    let targetsBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="targets">Targets data</label>
        <input type="checkbox" id="targets" name="targets">`
      )
    );
    let scanBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="scan">Scanned data (galaxy)</label>
        <input type="checkbox" id="scan" name="scan">`
      )
    );
    let OptionsBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="combats">Options data</label>
        <input type="checkbox" id="combats" name="combats">`
      )
    );
    let cacheBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox" },
        `<label for="temp">Cache and Temp data</label>
        <input type="checkbox" id="temp" name="temp" checked>`
      )
    );
    let purgeBox = dataDiv.appendChild(
      this.createDOM(
        "div",
        { class: "ogi-checkbox", style: "margin-top: 10px" },
        `<label for="purge">Other add-on's data <span class="${
          size.other > 3 ? "undermark" : "overmark"
        }">(${size.other}Mb)</span></label>
        <input type="checkbox" id="purge" name="purge">`
      )
    );
    dataDiv.appendChild(this.createDOM("hr"));

    let dataBtns = dataDiv.appendChild(
      this.createDOM("div", { style: "display: flex;align-items: flex-end;" })
    );

    let exportBtn = dataBtns.appendChild(
      this.createDOM("button", { class: "btn_blue" }, "Export")
    );
    let fileHandler = dataBtns.appendChild(
      this.createDOM("input", {
        id: "file",
        name: "file",
        class: "inputfile",
        type: "file",
        accept: ".data",
      })
    );
    dataBtns.appendChild(
      this.createDOM(
        "label",
        { for: "file", class: "btn_blue", style: "margin: 0px 10px" },
        "Import"
      )
    );
    fileHandler.addEventListener("change", () => {
      var reader = new FileReader();

      reader.onload = (evt) => {
        let json = JSON.parse(evt.target.result);
        this.json = json;
        this.saveData();
        document.location =
          document.location.origin +
          "/game/index.php?page=ingame&component=overview ";
      };
      reader.readAsText(event.target.files[0], "UTF-8");
    });

    exportBtn.addEventListener("click", () => {
      const data = Object.assign({}, this.json);
      download(data, `oginfinity-${this.gameLang}-${this.universe}.data`);
    });
    let resetBtn = dataBtns.appendChild(
      this.createDOM("button", { class: "btn_blue ogl-btn_red" }, "Reset")
    );

    container.appendChild(
      this.createDOM("div", { style: "width: 1px; background: #10171d;" })
    );
    let settingDiv = container.appendChild(
      this.createDOM("div", { style: "margin-top: 12px;" })
    );

    let saveBtn = this.createDOM("button", { class: "btn_blue save" }, "Save");

    settingDiv.appendChild(this.keepOnPlanetDialog(null, saveBtn));

    settingDiv.appendChild(this.createDOM("hr"));
    let span = settingDiv.appendChild(
      this.createDOM(
        "span",
        {
          style:
            "display: flex;justify-content: space-between; align-items: center;",
        },
        "Default mission (own)"
      )
    );

    let missionDiv = span.appendChild(
      this.createDOM("div", { style: "display:flex" })
    );
    let none = missionDiv.appendChild(
      this.createDOM("a", {
        class: "icon icon_against",
        style: "margin-top: 2px;margin-right: 5px;",
      })
    );
    let own3 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-3 ${
          this.json.options.harvestMission == 3 ? "ogl-active" : ""
        }`,
      })
    );
    let own4 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-4 ${
          this.json.options.harvestMission == 4 ? "ogl-active" : ""
        }`,
      })
    );

    own3.addEventListener("click", () => {
      own4.classList.remove("ogl-active");
      own3.classList.add("ogl-active");
      this.json.options.harvestMission = 3;
      this.saveData();
    });
    own4.addEventListener("click", () => {
      own3.classList.remove("ogl-active");
      own4.classList.add("ogl-active");
      this.json.options.harvestMission = 4;
      this.saveData();
    });
    none.addEventListener("click", () => {
      own4.classList.remove("ogl-active");
      own3.classList.remove("ogl-active");
      this.json.options.harvestMission = 0;
      this.saveData();
    });

    settingDiv.appendChild(this.createDOM("hr"));

    span = settingDiv.appendChild(
      this.createDOM(
        "span",
        {
          style:
            "display: flex;justify-content: space-between; align-items: center;",
        },
        "Default mission (others)"
      )
    );

    missionDiv = span.appendChild(
      this.createDOM("div", { style: "display:flex" })
    );
    none = missionDiv.appendChild(
      this.createDOM("a", {
        class: "icon icon_against",
        style: "margin-top: 2px;margin-right: 5px;",
      })
    );
    let other3 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-3 ${
          this.json.options.foreignMission == 3 ? "ogl-active" : ""
        }`,
      })
    );
    let other1 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-1 ${
          this.json.options.foreignMission == 1 ? "ogl-active" : ""
        }`,
      })
    );

    other1.addEventListener("click", () => {
      other3.classList.remove("ogl-active");
      other1.classList.add("ogl-active");
      this.json.options.foreignMission = 1;
    });
    other3.addEventListener("click", () => {
      other1.classList.remove("ogl-active");
      other3.classList.add("ogl-active");
      this.json.options.foreignMission = 3;
    });
    none.addEventListener("click", () => {
      other1.classList.remove("ogl-active");
      other3.classList.remove("ogl-active");
      this.json.options.foreignMission = 0;
    });
    settingDiv.appendChild(this.createDOM("hr"));

    span = settingDiv.appendChild(
      this.createDOM(
        "span",
        {
          style:
            "display: flex;justify-content: space-between; align-items: center;",
        },
        "Default mission (expedition)"
      )
    );
    missionDiv = span.appendChild(
      this.createDOM("div", { style: "display:flex" })
    );
    none = missionDiv.appendChild(
      this.createDOM("a", {
        class: "icon icon_against",
        style: "margin-top: 2px;margin-right: 5px;",
      })
    );
    let expe15 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-15 ${
          this.json.options.expeditionMission == 15 ? "ogl-active" : ""
        }`,
      })
    );
    let expe6 = missionDiv.appendChild(
      this.createDOM("div", {
        class: `ogl-mission-icon ogl-mission-6 ${
          this.json.options.expeditionMission == 6 ? "ogl-active" : ""
        }`,
      })
    );

    expe15.addEventListener("click", () => {
      expe6.classList.remove("ogl-active");
      expe15.classList.add("ogl-active");
      this.json.options.expeditionMission = 15;
    });
    expe6.addEventListener("click", () => {
      expe15.classList.remove("ogl-active");
      expe6.classList.add("ogl-active");
      this.json.options.expeditionMission = 6;
    });
    none.addEventListener("click", () => {
      expe15.classList.remove("ogl-active");
      expe6.classList.remove("ogl-active");
      this.json.options.expeditionMission = 0;
    });
    settingDiv.appendChild(this.createDOM("hr"));

    span = settingDiv.appendChild(
      this.createDOM(
        "span",
        {
          style:
            "display: flex;justify-content: space-between; align-items: center;",
        },
        "Show activity timers"
      )
    );
    let timerCheck = span.appendChild(
      this.createDOM("input", { type: "checkbox" })
    );
    timerCheck.addEventListener("change", () => {
      this.json.options.activitytimers = timerCheck.checked;
      this.saveData();
    });
    if (this.json.options.activitytimers) {
      timerCheck.checked = true;
    }

    settingDiv.appendChild(this.createDOM("hr"));

    span = settingDiv.appendChild(
      this.createDOM("span", {}, "Rentability value")
    );
    let rvalInput = span.appendChild(
      this.createDOM("input", {
        type: "text",
        class: "ogl-rvalInput ogl-formatInput tooltip",
        value: this.json.options.rvalLimit,
        title: this.getTranslatedText(6),
      })
    );
    settingDiv.appendChild(this.createDOM("hr"));

    settingDiv.appendChild(saveBtn);

    saveBtn.addEventListener("click", () => {
      this.json.options.rvalLimit = parseInt(
        this.removeNumSeparator(rvalInput.value)
      );
      this.saveData();
      document.querySelector(".ogl-dialog .close-tooltip").click();
    });

    resetBtn.addEventListener("click", () => {
      let reset = confirm("Are you sure ? :)");

      if (reset) {
        let json = {};

        if (!cacheBox.children[1].checked) {
          json = Object.assign({}, this.json);
        }

        json.harvests = {};
        json.options = {};
        json.expeditions = {};
        json.expeditionSums = {};
        json.combats = {};
        json.combatsSums = {};

        if (scanBox.children[1].checked) {
          document.dispatchEvent(new CustomEvent("ogi-clear"));
        }
        if (purgeBox.children[1].checked) {
          this.purgeLocalStorage();
        }
        if (!expeditionsBox.children[1].checked) {
          json.expeditionSums = this.json.expeditionSums;
          json.expeditions = this.json.expeditions;

          for (let id in this.json.harvests) {
            if (this.json.harvests[id].coords.split(":")[2] == 16) {
              json.harvests[id] = this.json.harvests[id];
            }
          }
          for (let id in this.json.combats) {
            if (this.json.combats[id].coordinates.position == 16) {
              json.combats[id] = this.json.combats[id];
            }
          }
        }
        if (!combatsBox.children[1].checked) {
          json.combatsSums = this.json.combatsSums;
          for (let id in this.json.combats) {
            if (this.json.combats[id].coordinates.position != 16) {
              json.combats[id] = this.json.combats[id];
            }
          }
          for (let id in this.json.harvests) {
            if (this.json.harvests[id].coords.split(":")[2] != 16) {
              json.harvests[id] = this.json.harvests[id];
            }
          }
        }
        if (!targetsBox.children[1].checked) {
          json.markers = this.json.markers;
        }
        if (!OptionsBox.children[1].checked) {
          json.options = this.json.options;
          json.options.empire = false;
        }

        this.json = json;
        this.saveData();
        document.location =
          document.location.origin +
          "/game/index.php?page=ingame&component=overview ";
      }
    });

    this.popup(false, container);
  }
}

(async () => {
  let ogKush = new OGInfinity();
  await ogKush.init();
  ogKush.start();
})();
