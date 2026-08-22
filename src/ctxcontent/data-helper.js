import { getLogger } from "../util/logger.js";
import { COORDINATE_PLANET, toNumber as toNumberCoordinate } from "../util/ogame.coordinate.js";
import { getAlliances } from "./helpers/universe.alliances.js";
import { getPlayersHighscore, NAN_HIGHSCORE } from "./helpers/universe.highscore.js";
import { getPlanets } from "./helpers/universe.planets.js";
import { DEFAULT_PLAYER, getPlayers } from "./helpers/universe.players.js";

const ptreLogger = getLogger("data-helper.ptre");

/** Number of positions per system stored in `galaxyStorage` (dense layout). */
const SCANNED_SYSTEM_POSITION_COUNT = 15;
/** Filler for absent players/planets/moons in a `galaxyStorage` position. */
const EMPTY_POSITION = Object.freeze({ playerId: -1, planetId: -1, moonId: -1 });

/**
 * Build a fresh empty snapshot with exactly SCANNED_SYSTEM_POSITION_COUNT positions.
 * @return {Object<string, {playerId:number, planetId:number, moonId:number}>}
 */
function generateEmptySystem() {
  const snap = {};
  for (let pos = 1; pos <= SCANNED_SYSTEM_POSITION_COUNT; pos++) {
    snap[pos] = { ...EMPTY_POSITION };
  }
  return snap;
}

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

  /**
   * Process the current galaxy view (positions 1..15).
   *
   * Runs unconditionally two side-effect groups:
   *   1. Non-PTRE - updates `scannedPlanets` / `scannedPlayers` (consumed by `getPlayer()`
   *      and `filter()` for the stalking sidebar, tooltips, target list and search box)
   *      and persists them via `saveData()`.
   *   2. PTRE (only when `teamKey` is provided) - diffs the incoming positions against the
   *      persisted per-(g,s) snapshot in `this.galaxyStorage[g][s]`, returns the changed positions
   *      only in the returned payload, and persists the new snapshot only when at least one
   *      position moved (identical revisits skip the disk write). On first-ever visit of the
   *      system, all 15 positions are emitted (populated AND empty) so PTRE learns its initial
   *      shape.
   *
   * Any failure is logged and returns an empty payload; galaxy rendering is never impacted.
   *
   * @param {number} galaxy
   * @param {number} system
   * @param {Object<string, {playerId:number, planetId:number, moonId:number}>} positions
   *        Keys "1".."15". Missing player/planet/moon -> -1.
   * @param {Object<string, {playerName:string, playerRank:number, playerStatus:string}>} additionnal
   *        Keys "1".."15". Enrichment collected live in the page context.
   * @param {string|null} teamKey - PTRE team key. When null/empty, PTRE work is skipped
   *        and only the non-PTRE side effects run.
   * @param {number|null} serverTime - Milliseconds from a JS `Date` built by ogkush from the
   *        OGame page's wall-clock server time. NOT a reliable UTC Unix ms: the value is
   *        interpreted in the browser's timezone, so on a server whose timezone differs
   *        from the browser's (e.g. `.en` for a CEST user) it is offset by the timezone
   *        delta. Sent as-is in the PTRE payload's `timestamp_ig`. Do NOT compare directly
   *        with `lastGalaxyUpdateTS` (Unix seconds from the public API).
   * @return {Object<string, object>} - PTRE payload keyed by "g:s:p"; empty when no diff
   *         or when no team key.
   */
  scan(galaxy, system, positions, additionnal, teamKey = null, serverTime = null) {
    const payload = {};
    try {
      if (!positions) {
        return payload;
      }

      // Previous snapshot: loaded from `galaxyStorage` when a team key is set and we
      // already have data for this (galaxy, system); otherwise an empty stand-in so the
      // diff / departure logic below stays uniform. `previousSystemFound` distinguishes
      // "first-ever visit of this system" (false) from "we have a stored snapshot" (true):
      // on first visit we force-emit all 15 positions - populated AND empty - so PTRE
      // learns the initial shape of the system. Without a team key we never persist and
      // never emit (keyless behavior matches master).
      const storedSystem = this.galaxyStorage && this.galaxyStorage[galaxy] ? this.galaxyStorage[galaxy][system] : undefined;
      const previousSystemFound = Boolean(teamKey && storedSystem);
      const previousSystemSnapshot = previousSystemFound ? storedSystem : generateEmptySystem();
      const currentSystemSnapshot = {};
      let systemChanged = false;

      if (!previousSystemFound) {
        ptreLogger.debug("[GALAXY] [" + galaxy + ":" + system + "] Warning: No previous snapshot found!");
      }

      for (let pos = 1; pos <= SCANNED_SYSTEM_POSITION_COUNT; pos++) {
        const cur = positions[pos] || positions[String(pos)] || { playerId: -1, planetId: -1, moonId: -1 };
        const extra = (additionnal && (additionnal[pos] || additionnal[String(pos)])) || {};
        const coords = galaxy + ":" + system + ":" + pos;

        ptreLogger.debug("[GALAXY] [" + coords +"] Player " + previousSystemSnapshot[pos].playerId + "=>" + cur.playerId +
            " | Planet: " + previousSystemSnapshot[pos].planetId + "=>" + cur.planetId +
            " | Moon: " + previousSystemSnapshot[pos].moonId + "=>" + cur.moonId +
            " (" + (extra.playerName || "") + " - " + (extra.playerRank ?? -1) + ")");

        // ---- Non-PTRE side effects: refresh OGI's internal maps used by getPlayer/filter.
        // Runs regardless of whether a PTRE team key is set (matches master behavior).
        if (cur.playerId !== -1) {
          if (!this.scannedPlanets[cur.playerId]) {
            this.scannedPlanets[cur.playerId] = {};
          }
          this.scannedPlanets[cur.playerId][coords] = cur.moonId > -1 ? cur.moonId : false;
          if (extra.playerName && !this.scannedPlayers[cur.playerId]) {
            this.scannedPlayers[cur.playerId] = extra.playerName;
          }
        }

        // Departure detected: flip the prior occupant's coord to null in scannedPlanets
        // so getPlayer() renders it as deleted. Safe without a team key: the previous
        // snapshot is empty in that case, so this never fires spuriously.
        if (previousSystemSnapshot[pos].playerId !== -1 && cur.playerId === -1) {
          if (!this.scannedPlanets[previousSystemSnapshot[pos].playerId]) {
            this.scannedPlanets[previousSystemSnapshot[pos].playerId] = {};
          }
          this.scannedPlanets[previousSystemSnapshot[pos].playerId][coords] = null;
        }

        // ---- PTRE-only: build the delta payload when a team key is set.
        // On first-ever visit of this system (`previousSystemFound === false`) we
        // force-emit every position - including empty ones - so PTRE learns the
        // full initial shape of the system.
        if (teamKey) {
          // Build the snapshot for this position regardless of whether it changed:
          // `currentSystemSnapshot` must contain the full dense 15-position map so that,
          // when we persist below, `galaxyStorage[g][s]` always exposes 15 slots. We can't
          // decide up front to skip - a change at a later position would need the earlier
          // ones too.
          currentSystemSnapshot[pos] = {
            playerId: cur.playerId,
            planetId: cur.planetId,
            moonId: cur.moonId,
          };
          const changed =
            !previousSystemFound ||
            cur.playerId !== previousSystemSnapshot[pos].playerId ||
            cur.planetId !== previousSystemSnapshot[pos].planetId ||
            cur.moonId !== previousSystemSnapshot[pos].moonId;
          if (changed) {
            ptreLogger.debug("[GALAXY] [" + coords + "] Position changed");
            systemChanged = true;

            const entry = {
              id: cur.planetId,
              teamkey: teamKey,
              galaxy: galaxy,
              system: system,
              position: pos,
              timestamp_ig: serverTime,
            };
            if (cur.moonId !== -1) {
              entry.moon = { id: cur.moonId };
            }

            // Current-player fields (best-effort enrichment from the OGame public API cache).
            const curPlayer = cur.playerId !== -1 && this.players ? this.players[cur.playerId] : undefined;
            entry.player_id = cur.playerId;
            entry.name = extra.playerName || curPlayer?.name || false;
            entry.rank = extra.playerRank ?? curPlayer?.points?.position ?? -1;
            entry.score = curPlayer?.points?.score ?? -1;
            entry.fleet = curPlayer?.military?.ships ?? -1;
            entry.status = cur.playerId === -1 ? -1 : extra.playerStatus ?? curPlayer?.status ?? "";

            // Previous-occupant fields.
            const prevPlayer =
              previousSystemSnapshot[pos].playerId !== -1 && this.players
                ? this.players[previousSystemSnapshot[pos].playerId]
                : undefined;
            entry.old_player_id = previousSystemSnapshot[pos].playerId;
            entry.timestamp_api = this.lastUpdate || -1;
            entry.old_name = prevPlayer?.name || false;
            entry.old_rank = prevPlayer?.points?.position ?? -1;
            entry.old_score = prevPlayer?.points?.score ?? -1;
            entry.old_fleet = prevPlayer?.military?.ships ?? -1;

            payload[coords] = entry;
          }
        }
      }// End positions loop

      // Persist only when at least one position in the system actually moved.
      // Identical revisits (same player/planet/moon layout as previously stored) skip
      // the write to avoid disk churn during heavy browsing.
      if (teamKey && systemChanged) {
        if (!this.galaxyStorage[galaxy]) this.galaxyStorage[galaxy] = {};
        this.galaxyStorage[galaxy][system] = currentSystemSnapshot;
        this.scheduleGalaxyStorageFlush();
      }
      this.saveData();
    } catch (err) {
      ptreLogger.error("scan failed", err);
      return {};
    }
    return payload;
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
          };
        }
        updatedSystemsCount++;
      }

      this.galaxyStorage[g][s][p] = {
        playerId: planet.player,
        planetId: planet.id,
        moonId: planet.moon ? planet.moon : -1,
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
    if (!isNaN(this.lastUpdate) && new Date() - this.lastUpdate < 1 * 60 * 1e3) {
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
