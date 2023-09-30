import { getLogger } from "../util/logger.js";
import { contentContextInit } from "../util/service.callbackEvent.js";
import { getExpeditionType } from "./callbacks/expedition-type.js";
import { getAlliances } from "./helpers/universe.alliances.js";
import { getPlayersHighscore, NAN_HIGHSCORE } from "./helpers/universe.highscore.js";
import { getPlanets } from "./helpers/universe.planets.js";
import { DEFAULT_PLAYER, getPlayers } from "./helpers/universe.players.js";

const mainLogger = getLogger();

contentContextInit({
  ptre: {
    galaxy: function (changes, ptreKey = null, serverTime = null) {
      return dataHelper.scan(changes, ptreKey, serverTime);
    },
  },
  messages: {
    expeditionType: getExpeditionType,
  },
});

class DataHelper {
  constructor(universe) {
    this.universe = universe;
    this.names = {};
    this.loading = false;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      chrome.storage.local.get("ogi-scanned-" + this.universe, (result) => {
        let json;
        try {
          json = JSON.parse(result["ogi-scanned-" + this.universe]);
        } catch (error) {
          json = {};
        }
        this.scannedPlanets = json.scannedPlanets || {};
        this.scannedPlayers = json.scannedPlayers || {};
        this.lastPlayersUpdate = this.lastPlayersUpdate || new Date(0);
        this.lastPlanetsUpdate = this.lastPlayersUpdate || new Date(0);
        resolve();
      });
    });
  }

  clearData() {
    this.scannedPlanets = {};
    this.scannedPlayers = {};
    this.lastPlayersUpdate = new Date(0);
    this.lastPlanetsUpdate = new Date(0);
    this.lastUpdate = new Date(0);
    this.saveData();
    this.update();
  }

  filter(name, alliance) {
    let possible = [];
    if (alliance) {
      for (let id in this.players) {
        if (this.players[id].alliance && this.players[id].alliance.toLowerCase().includes(name.toLowerCase())) {
          possible.push(this.getPlayer(id));
        }
      }
    } else {
      for (let id in this.scanned) {
        if (this.scanned[id].name.toLowerCase().includes(name.toLowerCase())) {
          possible.push(this.getPlayer(id));
        }
      }
      for (let id in this.players) {
        if (this.players[id].name && this.players[id].name.toLowerCase().includes(name.toLowerCase())) {
          possible.push(this.getPlayer(id));
        }
      }
    }
    return possible;
  }

  getPlayer(id) {
    if (isNaN(Number(id))) {
      id = this.names[id];
      if (!id) {
        for (let scannedId in this.scannedPlayers) {
          if (this.scannedPlayers.name == id) {
            id = scannedId;
          }
        }
      }
    }
    let response = {};

    let player = this.players[id];
    let scannedPlanets = this.scannedPlanets[id];
    let scannedPlayer = this.scannedPlayers[id];
    response.id = id;
    response.planets = [];
    response.alliance = "";
    response.status = "";
    response.military = { score: 0, position: 0, ships: 0 };
    response.economy = { score: 0, position: 0 };
    response.points = { score: 0, position: 0 };
    response.research = { score: 0, position: 0 };
    response.lifeform = { score: 0, position: 0 };
    response.def = 0;
    if (player) {
      response.name = player.name || "";
      response.alliance = player.alliance || "";
      response.status = player.status || "";
      response.points = { ...player.points } || { score: 0, position: 0 };
      response.military = { ...player.military } || { score: 0, position: 0 };
      response.research = { ...player.research } || { score: 0, position: 0 };
      response.economy = { ...player.economy } || { score: 0, position: 0 };
      response.lifeform = { ...player.lifeform } || { score: 0, position: 0 };
      response.def = -(
        response.points.score -
        response.economy.score -
        response.research.score -
        response.lifeform.score -
        response.military.score
      );
      response.economy.score = response.economy.score - response.def;
      response.military.score = response.military.score - response.def;
      response.lastUpdate = this.lastPlanetsUpdate;
      player.planets.forEach((planet) => {
        response.planets.push(planet);
      });
    }
    if (scannedPlayer) {
      response.name = scannedPlayer;
    }
    if (scannedPlanets) {
      for (let [coords, moon] of Object.entries(scannedPlanets)) {
        let isMain = false;
        response.planets.forEach((planet, index) => {
          if (coords == planet.coords) {
            isMain = planet.isMain;
            response.planets.splice(index, 1);
          }
        });
        let pla = { coords: coords, moon: moon, isMain: isMain, scanned: true };
        if (moon == null) {
          pla.deleted = true;
        }
        response.planets.push(pla);
      }
    }
    response.topScore = this.topScore;
    return response;
  }

  scan(system, ptreKey = null, serverTime = null) {
    let ptrePosition = {};

    system.forEach((row) => {
      let sameOld = false;
      if (!this.scannedPlanets[row.id]) {
        this.scannedPlanets[row.id] = {};
      }
      if (!this.scannedPlayers[row.id] && row.name) {
        this.scannedPlayers[row.id] = row.name;
      }
      let player = this.players[row.id];
      let known = false;
      if (player) {
        this.players[row.id].planets.forEach((planet) => {
          if (row.coords == planet.coords) {
            sameOld = true;
          }
          if (row.coords == planet.coords && row.moon == planet.moon) {
            known = true;
          }
        });
      }

      if (ptreKey && (!known || row.deleted)) {
        ptrePosition[row.coords] = {};
        ptrePosition[row.coords].id = row.planetId || -1;
        ptrePosition[row.coords].teamkey = ptreKey;
        ptrePosition[row.coords].galaxy = row.coords.split(":")[0];
        ptrePosition[row.coords].system = row.coords.split(":")[1];
        ptrePosition[row.coords].position = row.coords.split(":")[2];
        ptrePosition[row.coords].timestamp_ig = serverTime;
        if (row.moon) {
          ptrePosition[row.coords].moon = {};
          ptrePosition[row.coords].moon.id = row.moonId || -1;
        }
      }

      if (!known) {
        this.scannedPlanets[row.id][row.coords] = row.moon;
        if (ptreKey && row.id) {
          let currentPlayer = player ?? "{id:" + row.id + ", name:" + row.name + "}";
          ptrePosition[row.coords].player_id = row.id;
          ptrePosition[row.coords].name = row.name || false;
          ptrePosition[row.coords].rank = currentPlayer?.points?.position || -1;
          ptrePosition[row.coords].score = currentPlayer?.points?.score || -1;
          ptrePosition[row.coords].fleet = currentPlayer?.military?.ships || -1;
          ptrePosition[row.coords].status = currentPlayer?.status;
          ptrePosition[row.coords].old_player_id = sameOld ? ptrePosition[row.coords].player_id : -1;
          ptrePosition[row.coords].timestamp_api = sameOld && this.lastUpdate ? this.lastUpdate : -1;
          ptrePosition[row.coords].old_name = sameOld ? ptrePosition[row.coords].name : false;
          ptrePosition[row.coords].old_rank = sameOld ? ptrePosition[row.coords].score : -1;
          ptrePosition[row.coords].old_score = sameOld ? ptrePosition[row.coords].score : -1;
          ptrePosition[row.coords].old_fleet = sameOld ? ptrePosition[row.coords].fleet : -1;
        }
      }
      if (row.deleted) {
        this.scannedPlanets[row.id][row.coords] = null;
        if (ptreKey && row.id) {
          ptrePosition[row.coords].player_id = -1;
          ptrePosition[row.coords].name = false;
          ptrePosition[row.coords].rank = -1;
          ptrePosition[row.coords].score = -1;
          ptrePosition[row.coords].fleet = -1;
          ptrePosition[row.coords].status = -1;
          ptrePosition[row.coords].old_player_id = row.id || -1;
          ptrePosition[row.coords].timestamp_api = this.lastUpdate || -1;
          ptrePosition[row.coords].old_name = player?.name || false;
          ptrePosition[row.coords].old_rank = player?.points?.position || -1;
          ptrePosition[row.coords].old_score = player?.points?.score || -1;
          ptrePosition[row.coords].old_fleet = player?.military?.ships || -1;
          //debugger;
        }
      }
    });
    this.saveData();
    return ptrePosition;
  }

  saveData() {
    chrome.storage.local.set({
      [`ogi-scanned-${this.universe}`]: JSON.stringify({
        scannedPlanets: this.scannedPlanets,
        scannedPlayers: this.scannedPlayers,
        lastPlayersUpdate: this.lastPlayersUpdate,
        lastPlanetsUpdate: this.lastPlanetsUpdate,
      }),
    });
  }

  async update() {
    const logger = getLogger("updateUniverse");

    if (this.loading) return;
    if (!isNaN(this.lastUpdate) && new Date() - this.lastUpdate < 30 * 60 * 1e3) {
      logger.debug("Last ogame's data update was: " + this.lastUpdate);
      return;
    }

    this.loading = true;
    let players = {};

    try {
      const [playersScore, playersInformation, playerPlanets, allianceInformation] = await Promise.all([
        getPlayersHighscore(this.universe),
        getPlayers(this.universe),
        getPlanets(this.universe),
        getAlliances(this.universe),
      ]);

      [...playerPlanets.keys()].forEach((playerId) => {
        const planets = playerPlanets.get(playerId);
        const information = playersInformation.get(playerId) ?? DEFAULT_PLAYER;
        const score = playersScore.get(playerId) ?? NAN_HIGHSCORE;
        let alliance = null;

        if (information.alliance && allianceInformation.alliances.has(information.alliance)) {
          const ally = allianceInformation.alliances.get(information.alliance);
          alliance = `[${ally.tag}] ${ally.name}`;
        }

        players[playerId] = {
          ...information,
          ...score,
          alliance: alliance,
          planets: planets,
        };
      });

      this.players = players;
      this.lastUpdate = new Date();
      this.lastPlayersUpdate = new Date();
      this.lastPlanetsUpdate = new Date();
    } catch (err) {
      logger.error(err);
    } finally {
      this.loading = false;
    }
  }

  /**
   * @deprecated
   * @private
   */
  _fetchXML(url) {
    return fetch(url)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => xml);
  }

  /**
   * @deprecated
   * @private
   */
  _updateHighscore(players) {
    return getPlayersHighscore(this.universe);
  }

  /**
   * @deprecated
   * @private
   */
  _updatePlayers(players) {
    return getPlayers(this.universe);
  }

  /**
   * @deprecated
   * @private
   */
  _updatePlanets(players) {
    return fetch(`https://${this.universe}.ogame.gameforge.com/api/universe.xml`)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        let update = new Date(Number(xml.children[0].getAttribute("timestamp")) * 1e3);
        if (update > this.lastPlanetsUpdate) {
          this.lastPlanetsUpdate = update;
          this.scannedPlanets = {};
        }
        Array.from(xml.querySelectorAll("planet")).forEach((planet, index) => {
          let moon = planet.firstChild;
          let planetjson = {
            id: planet.getAttribute("id"),
            name: planet.getAttribute("name"),
            coords: planet.getAttribute("coords"),
            moon: moon ? true : false,
          };
          let player = players[planet.getAttribute("player")];
          if (player) {
            player.planets.push(planetjson);
          }
        });
        for (let [_, player] of Object.entries(players)) {
          let main = player.planets[0];
          player.planets.forEach((planet) => {
            if (main.id > planet.id) {
              main = planet;
            }
          });
          if (main) {
            main.isMain = true;
          }
          player.planets.sort((a, b) => {
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
        }
        return players;
      });
  }

  /**
   * @deprecated
   * @private
   */
  _updateAlliances(players) {
    return fetch(`https://${this.universe}.ogame.gameforge.com/api/alliances.xml`)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        Array.from(xml.querySelectorAll("alliance")).forEach((alliance, index) => {
          Array.from(alliance.children).forEach((alliPlayer) => {
            let player = players[alliPlayer.getAttribute("id")];
            if (player) {
              player.alliance = `[${alliance.getAttribute("tag")}] ${alliance.getAttribute("name")}`;
            }
          });
        });
        return players;
      });
  }
}

const UNIVERSE = window.location.host.split(".")[0];
let universes = {};
let currentUniverse = null;
let dataHelper = null;

function processData() {
  if (dataHelper) {
    universes[UNIVERSE] = dataHelper;
  } else {
    universes[UNIVERSE] = new DataHelper(UNIVERSE);
  }
  universes[UNIVERSE].init().then(() => {
    try {
      universes[UNIVERSE].update().then(() => {
        let tempSaveData = { ...universes[UNIVERSE] };
        tempSaveData.lastUpdate = universes[UNIVERSE].lastUpdate.toJSON();
        tempSaveData.lastPlanetsUpdate = universes[UNIVERSE].lastPlanetsUpdate.toJSON();
        tempSaveData.lastPlayersUpdate = universes[UNIVERSE].lastPlayersUpdate.toJSON();

        chrome.storage.local.set({ [UNIVERSE]: tempSaveData }, function (at) {});
      });
      dataHelper = universes[UNIVERSE];
    } catch (e) {
      console.error(e);
      universes = {};
    }
  });
}

function injectScript(path, cb, module = false) {
  var s = document.createElement("script");
  s.type = "text/javascript";
  s.src = chrome.runtime.getURL(path);
  if (module) {
    s.type = "module";
  }
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => {
    s.remove();
    cb && cb();
  };
}

document.addEventListener("ogi-chart", function (e) {
  injectScript("libs/chart.min.js", () => {
    injectScript("libs/chartjs-plugin-labels.js");
  });
});

window.addEventListener(
  "ogi-players",
  function (evt) {
    setTimeout(() => {
      if (!dataHelper) {
        console.warn("No data helper in ogi-players, returning...");
        return;
      }
      let request = evt.detail;
      let response = { player: dataHelper.getPlayer(evt.detail.id) };
      var clone = response;
      if (navigator.userAgent.indexOf("Firefox") > 0) {
        clone = cloneInto(response, document.defaultView);
      }
      clone.requestId = request.requestId;
      window.dispatchEvent(new CustomEvent("ogi-players-rep", { detail: clone }));
    });
  },
  10
);

window.addEventListener(
  "ogi-filter",
  function (evt) {
    let request = evt.detail;
    let response = {
      players: dataHelper.filter(evt.detail.name, evt.detail.alliance),
    };
    var clone = response;
    if (navigator.userAgent.indexOf("Firefox") > 0) {
      clone = cloneInto(response, document.defaultView);
    }
    clone.requestId = request.requestId;
    window.dispatchEvent(new CustomEvent("ogi-filter-rep", { detail: clone }));
  },
  false
);

document.addEventListener("ogi-clear", function (e) {
  dataHelper.clearData();
});
document.addEventListener("ogi-notification", function (e) {
  const msg = Object.assign({ iconUrl: "assets/images/logo128.png" }, e.detail);
  chrome.runtime.sendMessage({ type: "notification", universe: UNIVERSE, message: msg }, function (response) {});
});

export function main() {
  mainLogger.log("Starting OGame Infinity");

  if (!universes[UNIVERSE] || Object.keys(universes[UNIVERSE]).length === 0) {
    //chrome.storage.local.clear()
    chrome.storage.local.get([UNIVERSE], function (data) {
      if (data && Object.keys(data).length > 0) {
        try {
          let tempSaveData = data[UNIVERSE];
          tempSaveData.lastUpdate = new Date(tempSaveData.lastUpdate);
          tempSaveData.lastPlanetsUpdate = new Date(tempSaveData.lastPlanetsUpdate);
          tempSaveData.lastPlayersUpdate = new Date(tempSaveData.lastPlayersUpdate);
          universes[UNIVERSE] = new DataHelper(UNIVERSE);
          dataHelper = Object.assign(universes[UNIVERSE], tempSaveData);
        } catch (e) {
          console.error(e);
          chrome.storage.local.clear();
        }
      }
      processData();
    });
  }
}

window.addEventListener("DOMContentLoaded", (event) => {
  injectPageContext();
});
let isPageContextReady = false;

function injectPageContext() {
  if (isPageContextReady) return;
  isPageContextReady = true;
  injectScript("libs/lz-string.min.js", null, false);
  injectScript("libs/purify.min.js", null, false);
  injectScript("ogkush.js", null, true);
}
