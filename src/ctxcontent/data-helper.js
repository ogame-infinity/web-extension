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
