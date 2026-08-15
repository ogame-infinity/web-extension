import { getLogger } from "../util/logger.js";
import { COORDINATE_PLANET, toNumber as toNumberCoordinate } from "../util/ogame.coordinate.js";
import { getAlliances } from "./helpers/universe.alliances.js";
import { getPlayersHighscore, NAN_HIGHSCORE } from "./helpers/universe.highscore.js";
import { getPlanets } from "./helpers/universe.planets.js";
import { DEFAULT_PLAYER, getPlayers } from "./helpers/universe.players.js";

export class DataHelper {
  constructor(universe) {
    this.universe = universe;
    this.names = {};
    this.topScore = 0;
    this.loading = false;
    // Transient cache of the last successful universe.xml fetch. Stripped from the persisted blob in processData().
    this._galaxySnapshot = null;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      chrome.storage.local.get(
        ["ogi-scanned-" + this.universe, "ogi-galaxy-" + this.universe],
        (result) => {
          let scannedJson;
          try {
            scannedJson = JSON.parse(result["ogi-scanned-" + this.universe]);
          } catch (error) {
            scannedJson = {};
          }
          this.scannedPlanets = scannedJson.scannedPlanets || {};
          this.scannedPlayers = scannedJson.scannedPlayers || {};
          this.lastPlayersUpdate = this.lastPlayersUpdate || new Date(0);
          this.lastPlanetsUpdate = this.lastPlayersUpdate || new Date(0);

          // Galaxy storage lives in its own key so hot writes (from scan()) stay small
          // and never drag the big `[UNIVERSE]` blob along. The dedicated key is the
          // SOLE source of truth; do not fall back to `this.galaxyStorage` /
          // `this.lastGalaxyUpdateTS` values inherited from the big blob via
          // Object.assign in main() - a manual reset would be defeated otherwise.
          let galaxyJson;
          try {
            galaxyJson = JSON.parse(result["ogi-galaxy-" + this.universe]);
          } catch (error) {
            galaxyJson = null;
          }
          if (galaxyJson && typeof galaxyJson === "object") {
            this.galaxyStorage = galaxyJson.galaxyStorage || {};
            this.lastGalaxyUpdateTS = galaxyJson.lastGalaxyUpdateTS ?? -1;
          } else {
            this.galaxyStorage = {};
            this.lastGalaxyUpdateTS = -1;
          }
          resolve();
        }
      );
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
        response.planets.forEach((planet, index) => {
          if (coords == planet.coords) {
            response.planets.splice(index, 1);
          }
        });
        let pla = { coords: coords, moon: moon, scanned: true };
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
          ptrePosition[row.coords].old_rank = sameOld ? ptrePosition[row.coords].rank : -1;
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

  // Immediate persistence of galaxyStorage into its dedicated key. Callers that
  // update this store frequently (e.g. scan() from the PTRE PR) should prefer
  // scheduleGalaxyStorageFlush() to coalesce writes.
  flushGalaxyStorage() {
    if (this._galaxyFlushTimer) {
      clearTimeout(this._galaxyFlushTimer);
      this._galaxyFlushTimer = null;
    }
    const logger = getLogger("galaxyStorage");
    const key = `ogi-galaxy-${this.universe}`;
    let payload;
    try {
      payload = JSON.stringify({
        galaxyStorage: this.galaxyStorage,
        lastGalaxyUpdateTS: this.lastGalaxyUpdateTS,
      });
    } catch (err) {
      this._lastFlushError = `serialize: ${err && err.message ? err.message : err}`;
      logger.error(`[${key}] serialize failed: ${this._lastFlushError}`);
      return;
    }
    chrome.storage.local.set({ [key]: payload }, () => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        const bytes = new Blob([payload]).size;
        this._lastFlushError = `write (${bytes}B): ${lastError.message}`;
        logger.error(`[${key}] write failed: ${this._lastFlushError}`);
        return;
      }
      this._lastFlushError = null;
    });
  }

  // Debounced flush. Multiple calls within `delayMs` collapse into one write.
  scheduleGalaxyStorageFlush(delayMs = 2000) {
    if (this._galaxyFlushTimer) return;
    this._galaxyFlushTimer = setTimeout(() => {
      this._galaxyFlushTimer = null;
      this.flushGalaxyStorage();
    }, delayMs);
  }

  // Rebuild `galaxyStorage` from the cached API snapshot. The PTRE key is
  // never stored on DataHelper; callers must supply it (same pattern as scan()).
  // No-op when the key is missing, when no snapshot has been cached yet, or
  // when the cached snapshot is not strictly newer than the persisted state.
  rebuildGalaxyStorage(ptreKey) {
    const logger = getLogger("updateUniverse");
    if (!ptreKey) {
      logger.debug(`[galaxyStorage] rebuild skipped: no PTRE key`);
      return;
    }
    if (!this._galaxySnapshot) {
      logger.debug(`[galaxyStorage] rebuild skipped: no cached snapshot`);
      return;
    }
    const newGalaxyTs = this._galaxySnapshot.timestamp;
    const previousGalaxyTs = this.lastGalaxyUpdateTS ?? -1;
    if (!Number.isFinite(newGalaxyTs) || newGalaxyTs <= previousGalaxyTs) {
      logger.debug(`[galaxyStorage] rebuild skipped: prevTs=${previousGalaxyTs} newTS=${newGalaxyTs}`);
      return;
    }

    const galaxyBuildStart = performance.now();
    this.galaxyStorage = {};
    let updatedSystemsCount = 0;
    let updatedPlanetsCount = 0;
    let updatedMoonsCount = 0;

    this._galaxySnapshot.planetList.forEach((planet) => {
      const parts = (planet.coords || "").split(":");
      if (parts.length !== 3) return;
      const g = parts[0];
      const s = parts[1];
      const p = parts[2];

      if (!this.galaxyStorage[g]) {
        this.galaxyStorage[g] = {};
      }
      if (!this.galaxyStorage[g][s]) {
        this.galaxyStorage[g][s] = {};
        for (let i = 1; i <= 15; i++) {
          this.galaxyStorage[g][s][String(i)] = {
            playerId: -1,
            planetId: -1,
            moonId: -1,
            ts: newGalaxyTs,
          };
        }
        updatedSystemsCount++;
      }

      this.galaxyStorage[g][s][p] = {
        playerId: planet.player,
        planetId: planet.id,
        moonId: planet.moon ? planet.moon : -1,
        ts: newGalaxyTs,
      };
      updatedPlanetsCount++;
      if (planet.moon) updatedMoonsCount++;
    });

    this.lastGalaxyUpdateTS = newGalaxyTs;
    const galaxyBuildDurationMs = Math.round(performance.now() - galaxyBuildStart);
    logger.debug(`[galaxyStorage] New data: systems=${updatedSystemsCount} planets=${updatedPlanetsCount} moons=${updatedMoonsCount} | TS=${this.lastGalaxyUpdateTS} | Took ${galaxyBuildDurationMs}ms`);
    this.flushGalaxyStorage();
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
      const [playersScore, playersInformation, planetsSnapshot, allianceInformation] = await Promise.all([
        getPlayersHighscore(this.universe),
        getPlayers(this.universe),
        getPlanets(this.universe),
        getAlliances(this.universe),
      ]);

      // ----------------------------------------------
      // Galaxy Snapshot Cache (planets fetched from universe.xml, once a week)
      // The actual `galaxyStorage` rebuild is deferred to rebuildGalaxyStorage(ptreKey)
      // so the PTRE team key never crosses into the content-script context.
      const playerPlanets = planetsSnapshot.planets;
      this._galaxySnapshot = {
        planetList: planetsSnapshot.planetList,
        timestamp: planetsSnapshot.timestamp,
      };
      logger.debug(`[galaxyStorage] snapshot cached (ts=${planetsSnapshot.timestamp})`);
      // End Galaxy Snapshot Cache
      // --------------------------------------------

      // -- TopScore --------------------------------
      /** @type {HighscoreTypes | undefined} */
      const highscores = [...playersScore.values()].find(
        /** @param {HighscoreTypes} highscore */
        (highscore) => highscore.points.position === 1
      );
      if (highscores) {
        this.topScore = highscores.points.score;
      }

      [...playerPlanets.keys()].forEach((playerId) => {
        /** @type {PlanetResponse[]} */
        let planets = playerPlanets.get(playerId);
        const information = playersInformation.get(playerId) ?? DEFAULT_PLAYER;
        const score = playersScore.get(playerId) ?? NAN_HIGHSCORE;
        let alliance = null;

        if (information.alliance && allianceInformation.alliances.has(information.alliance)) {
          const ally = allianceInformation.alliances.get(information.alliance);
          alliance = `[${ally.tag}] ${ally.name}`;
        }

        planets = planets.sort((a, b) => {
          const aCoords = toNumberCoordinate(a.coords, COORDINATE_PLANET);
          const bCoords = toNumberCoordinate(b.coords, COORDINATE_PLANET);
          return aCoords - bCoords;
        });

        players[playerId] = {
          ...information,
          ...score,
          alliance: alliance,
          planets: planets,
        };
        this.names[information.name] = information.id;
      });

      this.players = players;
      this.lastUpdate = new Date();
      this.lastPlayersUpdate = new Date();
      this.lastPlanetsUpdate = new Date();
      this.scannedPlayers = {};
    } catch (err) {
      logger.error(err);
    } finally {
      this.loading = false;
    }
  }
}
