// OGAME_LOBBY_URL = "https://lobby.ogame.gameforge.com/";

// chrome.browserAction.setPopup({ popup: "" }); //disable browserAction's popup

window.onerror = () => {};

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: "https://lobby.ogame.gameforge.com/" });
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
        if (
          this.players[id].alliance &&
          this.players[id].alliance.toLowerCase().includes(name.toLowerCase())
        ) {
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
        // if (!his.players[id].name) return;
        if (
          this.players[id].name &&
          this.players[id].name.toLowerCase().includes(name.toLowerCase())
        ) {
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
    response.def = 0;

    if (player) {
      response.name = player.name || "";
      response.alliance = player.alliance || "";
      response.status = player.status || "";

      response.points = { ...player.points } || { score: 0, position: 0 };
      response.military = { ...player.military } || { score: 0, position: 0 };
      response.research = { ...player.research } || { score: 0, position: 0 };
      response.economy = { ...player.economy } || { score: 0, position: 0 };

      response.def = -(
        response.points.score -
        response.economy.score -
        response.research.score -
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

  scan(system) {
    system.forEach((row) => {
      // If first scan of player
      if (!this.scannedPlanets[row.id]) {
        this.scannedPlanets[row.id] = {};
      }
      if (!this.scannedPlayers[row.id] && row.name) {
        this.scannedPlayers[row.id] = row.name;
      }

      // Looking in ogame's data
      let player = this.players[row.id];
      let known = false;
      if (player) {
        this.players[row.id].planets.forEach((planet) => {
          if (row.coords == planet.coords && row.moon == planet.moon) {
            known = true;
          }
        });
      }
      if (!known) {
        this.scannedPlanets[row.id][row.coords] = row.moon;
      }
      if (row.deleted) {
        this.scannedPlanets[row.id][row.coords] = null;
      }
    });
    this.saveData();
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

  update() {
    if (this.loading) return;
    if (
      isNaN(this.lastUpdate) ||
      new Date() - this.lastUpdate > 5 * 60 * 1000
    ) {
      console.log("Starting updating ogame's data");
      this.loading = true;
      let players = {};
      this._updateHighscore(players)
        .then((players) => this._updatePlayers(players))
        .then((players) => this._updatePlanets(players))
        .then((players) => this._updateAlliances(players))
        .then((players) => {
          this.lastUpdate = new Date();
          this.players = players;
          this.loading = false;
        })
        .catch((err) => {
          this.loading = false;
          console.log(err);
        });
    } else {
      console.log("Last ogame's data update was: " + this.lastUpdate);
    }
  }

  _fetchXML(url) {
    return fetch(url)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        return xml;
      });
  }

  _updateHighscore(players) {
    let types = ["points", "economy", "research", "military"];
    let promises = [];

    types.forEach((type, index) => {
      let p = this._fetchXML(
        `https://${this.universe}.ogame.gameforge.com/api/highscore.xml?category=1&type=` +
          index
      ).then((xml) => {
        Array.from(xml.querySelectorAll("player")).forEach((player) => {
          let playerid = player.getAttribute("id");
          if (!players[playerid]) {
            players[player.getAttribute("id")] = {
              id: player.getAttribute("id"),
              planets: [],
            };
          }
          let position = player.getAttribute("position");
          let score = player.getAttribute("score");
          if (index == 0 && Number(position) == 1) {
            this.topScore = score;
          }

          players[player.getAttribute("id")][types[index]] = {
            position: position,
            score: score,
          };
          if (index == 3) {
            players[player.getAttribute("id")][
              types[index]
            ].ships = player.getAttribute("ships");
          }
        });
      });
      promises.push(p);
    });
    return Promise.all(promises).then(() => players);
  }

  _updatePlayers(players) {
    return fetch(`https://${this.universe}.ogame.gameforge.com/api/players.xml`)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        let update = new Date(
          Number(xml.children[0].getAttribute("timestamp")) * 1000
        );
        if (update > this.lastPlayersUpdate) {
          this.lastPlayersUpdate = update;
          this.scannedPlayers = {};
        }

        Array.from(xml.querySelectorAll("player")).forEach((player, index) => {
          let id = player.getAttribute("id");
          if (players[id]) {
            players[id].name = player.getAttribute("name");
            players[id].alliance = player.getAttribute("alliance");
            players[id].status = player.getAttribute("status")
              ? player.getAttribute("status")
              : "";

            this.names[player.getAttribute("name")] = id;
          } else {
            let playerjson = {
              id: id,
              name: player.getAttribute("name"),
              alliance: player.getAttribute("alliance"),
              status: player.getAttribute("status")
                ? player.getAttribute("status")
                : "",
              planets: [],
            };
            players[id] = playerjson;
          }
        });
        return players;
      });
  }

  _updatePlanets(players) {
    return fetch(
      `https://${this.universe}.ogame.gameforge.com/api/universe.xml`
    )
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        let update = new Date(
          Number(xml.children[0].getAttribute("timestamp")) * 1000
        );
        if (update > this.lastPlanetsUpdate) {
          this.lastPlanetsUpdate = update;
          this.scannedPlanets = {};
        }

        // this.lastOgameUpdate = new
        // Date(Number(xml.children[0].getAttribute("timestamp")) * 1000);

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

  _updateAlliances(players) {
    return fetch(
      `https://${this.universe}.ogame.gameforge.com/api/alliances.xml`
    )
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
      .then((xml) => {
        Array.from(xml.querySelectorAll("alliance")).forEach(
          (alliance, index) => {
            Array.from(alliance.children).forEach((alliPlayer) => {
              let player = players[alliPlayer.getAttribute("id")];
              if (player) {
                player.alliance = `[${alliance.getAttribute(
                  "tag"
                )}] ${alliance.getAttribute("name")}`;
              }
            });
          }
        );
        return players;
      });
  }
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1, s2) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (
    (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  );
}

const url = chrome.runtime.getURL("res/expeditions.tsv");

let expeditionsMap = {};
let logbooks = {};
fetch(url)
  .then((response) => response.text())
  .then((text) => {
    let lines = text.split("\n");
    let first = lines.shift();
    for (let line of lines) {
      line.split(",");
      let splits = line.split("\t");
      for (let split of splits) {
        // Ignoring first value
        if (split == splits[0]) continue;
        if (splits[0] == "Logbook") {
          logbooks[split] = true;
        } else {
          expeditionsMap[split] = splits[0];
        }
      }
    }
  });

function getExpeditionType(message) {
  let splits = message.split("\n\n");
  logbook = splits[splits.length - 1];
  if (logbook.includes(":")) {
    splits.pop();
  }
  message = splits.join("\n\n");

  // Checking lobbook entries
  let busy = false;
  // for (let i in logbooks) {
  //   let sim = similarity(logbook, i);
  //   if (sim > 0.9) {
  //     busy = false;
  //   }
  // }

  for (let i in expeditionsMap) {
    let sim = similarity(message, i);
    if (sim > 0.6) {
      return { type: expeditionsMap[i], busy: busy };
    }
  }

  return { type: "Unknown", busy: busy };
}

let universes = {};

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "expedition") {
    sendResponse(getExpeditionType(request.message));
    return;
  }
  try {
    let dataHelper = universes[request.universe];
    if (dataHelper) {
      dataHelper.update();
      if (request.type == "clear") {
        dataHelper.clearData();
        return sendResponse({});
      } else if (request.type == "galaxy") {
        dataHelper.scan(request.changes);
        return sendResponse({});
      } else if (request.type == "filter") {
        return sendResponse({
          players: dataHelper.filter(request.name, request.alliance),
        });
      } else if (request.type == "get") {
        return sendResponse({ player: dataHelper.getPlayer(request.id) });
      }
    } else {
      universes[request.universe] = new DataHelper(request.universe);
      universes[request.universe].init().then(() => {
        try {
          universes[request.universe].update();
        } catch (e) {
          universes = {};
        }
      });
      sendResponse({});
    }
  } catch (e) {
    sendResponse({});
  }
});
