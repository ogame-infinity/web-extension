class DataHelper {
  constructor(universe) {
    this.universe = universe;
    this.names = {};
    this.loading = false;
  }

  init() {
    return new Promise(async (resolve, reject) => {
      chrome.storage.local.get('ogi-scanned-' + this.universe, (result) => {
        let json;
        try {
          json = JSON.parse(result['ogi-scanned-' + this.universe]);
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
    response.alliance = '';
    response.status = '';
    response.military = { score: 0, position: 0, ships: 0 };
    response.economy = { score: 0, position: 0 };
    response.points = { score: 0, position: 0 };
    response.research = { score: 0, position: 0 };
    response.def = 0;
    if (player) {
      response.name = player.name || '';
      response.alliance = player.alliance || '';
      response.status = player.status || '';
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
        ptrePosition[row.coords].galaxy = row.coords.split(':')[0];
        ptrePosition[row.coords].system = row.coords.split(':')[1];
        ptrePosition[row.coords].position = row.coords.split(':')[2];
        ptrePosition[row.coords].timestamp_ig = serverTime;
        if (row.moon) {
          ptrePosition[row.coords].moon = {};
          ptrePosition[row.coords].moon.id = row.moonId || -1;
        }
      }

      if (!known) {
        this.scannedPlanets[row.id][row.coords] = row.moon;
        if (ptreKey && row.id) {
          let currentPlayer =
            player ?? '{id:' + row.id + ', name:' + row.name + '}';
          ptrePosition[row.coords].player_id = row.id;
          ptrePosition[row.coords].name = row.name || false;
          ptrePosition[row.coords].rank = currentPlayer?.points?.position || -1;
          ptrePosition[row.coords].score = currentPlayer?.points?.score || -1;
          ptrePosition[row.coords].fleet = currentPlayer?.military?.ships || -1;
          ptrePosition[row.coords].status = currentPlayer?.status;
          ptrePosition[row.coords].old_player_id = sameOld
            ? ptrePosition[row.coords].player_id
            : -1;
          ptrePosition[row.coords].timestamp_api =
            sameOld && this.lastUpdate ? this.lastUpdate : -1;
          ptrePosition[row.coords].old_name = sameOld
            ? ptrePosition[row.coords].name
            : false;
          ptrePosition[row.coords].old_rank = sameOld
            ? ptrePosition[row.coords].score
            : -1;
          ptrePosition[row.coords].old_score = sameOld
            ? ptrePosition[row.coords].score
            : -1;
          ptrePosition[row.coords].old_fleet = sameOld
            ? ptrePosition[row.coords].fleet
            : -1;
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
    if (Object.keys(ptrePosition).length > 0) {
      //debugger;
      this.updatePtreGalaxy(ptrePosition);
    }
  }

  updatePtreGalaxy(ptrePosition) {
    fetch(
      'https://ptre.chez.gg/scripts/api_galaxy_import_infos.php?tool=oglight',
      {
        priority: 'low',
        method: 'POST',
        body: JSON.stringify(ptrePosition),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        if (data.code != 1) console.log('Can\'t send data to PTRE');
      });
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
    if (this.loading) return;
    if (isNaN(this.lastUpdate) || new Date() - this.lastUpdate > 5 * 60 * 1e3) {
      this.loading = true;
      let players = {};
      await this._updateHighscore(players)
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
          console.error(err);
        });
    } else {
      console.log('Last ogame\'s data update was: ' + this.lastUpdate);
    }
  }

  _fetchXML(url) {
    return fetch(url)
      .then((rep) => rep.text())
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
      .then((xml) => xml);
  }

  _updateHighscore(players) {
    let types = ['points', 'economy', 'research', 'military'];
    let promises = [];
    types.forEach((type, index) => {
      let p = this._fetchXML(
        `https://${this.universe}.ogame.gameforge.com/api/highscore.xml?category=1&type=` +
          index
      ).then((xml) => {
        Array.from(xml.querySelectorAll('player')).forEach((player) => {
          let playerid = player.getAttribute('id');
          if (!players[playerid]) {
            players[player.getAttribute('id')] = {
              id: player.getAttribute('id'),
              planets: [],
            };
          }
          let position = player.getAttribute('position');
          let score = player.getAttribute('score');
          if (index == 0 && Number(position) == 1) {
            this.topScore = score;
          }
          players[player.getAttribute('id')][types[index]] = {
            position: position,
            score: score,
          };
          if (index == 3) {
            players[player.getAttribute('id')][types[index]].ships =
              player.getAttribute('ships');
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
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
      .then((xml) => {
        let update = new Date(
          Number(xml.children[0].getAttribute('timestamp')) * 1e3
        );
        if (update > this.lastPlayersUpdate) {
          this.lastPlayersUpdate = update;
          this.scannedPlayers = {};
        }
        Array.from(xml.querySelectorAll('player')).forEach((player, index) => {
          let id = player.getAttribute('id');
          if (players[id]) {
            players[id].name = player.getAttribute('name');
            players[id].alliance = player.getAttribute('alliance');
            players[id].status = player.getAttribute('status')
              ? player.getAttribute('status')
              : '';
            this.names[player.getAttribute('name')] = id;
          } else {
            let playerjson = {
              id: id,
              name: player.getAttribute('name'),
              alliance: player.getAttribute('alliance'),
              status: player.getAttribute('status')
                ? player.getAttribute('status')
                : '',
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
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
      .then((xml) => {
        let update = new Date(
          Number(xml.children[0].getAttribute('timestamp')) * 1e3
        );
        if (update > this.lastPlanetsUpdate) {
          this.lastPlanetsUpdate = update;
          this.scannedPlanets = {};
        }
        Array.from(xml.querySelectorAll('planet')).forEach((planet, index) => {
          let moon = planet.firstChild;
          let planetjson = {
            id: planet.getAttribute('id'),
            name: planet.getAttribute('name'),
            coords: planet.getAttribute('coords'),
            moon: moon ? true : false,
          };
          let player = players[planet.getAttribute('player')];
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
              .split(':')
              .map((x) => x.padStart(3, '0'))
              .join('');
            let coordsB = b.coords
              .split(':')
              .map((x) => x.padStart(3, '0'))
              .join('');
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
      .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
      .then((xml) => {
        Array.from(xml.querySelectorAll('alliance')).forEach(
          (alliance, index) => {
            Array.from(alliance.children).forEach((alliPlayer) => {
              let player = players[alliPlayer.getAttribute('id')];
              if (player) {
                player.alliance = `[${alliance.getAttribute(
                  'tag'
                )}] ${alliance.getAttribute('name')}`;
              }
            });
          }
        );
        return players;
      });
  }
}

const UNIVERSE = window.location.host.split('.')[0];
let universes = {};
let currentUniverse = null;
let dataHelper = null;

if (!universes[UNIVERSE] || Object.keys(universes[UNIVERSE]) === 0) {
  //chrome.storage.local.clear()
  chrome.storage.local.get([UNIVERSE], function (data) {
    if (data && Object.keys(data).length > 0) {
      try {
        let tempSaveData = data[UNIVERSE];
        tempSaveData.lastUpdate = new Date(tempSaveData.lastUpdate);
        tempSaveData.lastPlanetsUpdate = new Date(
          tempSaveData.lastPlanetsUpdate
        );
        tempSaveData.lastPlayersUpdate = new Date(
          tempSaveData.lastPlayersUpdate
        );
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
        tempSaveData.lastPlanetsUpdate =
          universes[UNIVERSE].lastPlanetsUpdate.toJSON();
        tempSaveData.lastPlayersUpdate =
          universes[UNIVERSE].lastPlayersUpdate.toJSON();

        chrome.storage.local.set(
          { [UNIVERSE]: tempSaveData },
          function (at) {}
        );
      });
      dataHelper = universes[UNIVERSE];
    } catch (e) {
      console.error(e);
      universes = {};
    }
  });
}

function injectScript(path, cb, module = false) {
  var s = document.createElement('script');
  s.src = chrome.runtime.getURL(path);
  if (module) {
    s.type = 'module';
  }
  (document.head || document.documentElement).appendChild(s);
  s.onload = () => {
    s.remove();
    cb && cb();
  };
}

window.addEventListener('DOMContentLoaded', (event) => {
  injectScript('ogkush.js', null, true);
});
document.addEventListener('ogi-chart', function (e) {
  injectScript('libs/chart.min.js', () => {
    injectScript('libs/chartjs-plugin-labels.js');
  });
});

window.addEventListener(
  'ogi-expedition',
  function (evt) {
    setTimeout(() => {
      let request = evt.detail;
      let response = getExpeditionType(request.message);
      var clone = response;
      if (navigator.userAgent.indexOf('Firefox') > 0) {
        clone = cloneInto(response, document.defaultView);
      }
      clone.requestId = request.requestId;
      window.dispatchEvent(
        new CustomEvent('ogi-expedition-rep', { detail: clone })
      );
    });
  },
  true
);

window.addEventListener(
  'ogi-players',
  function (evt) {
    setTimeout(() => {
      let request = evt.detail;
      let response = { player: dataHelper.getPlayer(evt.detail.id) };
      var clone = response;
      if (navigator.userAgent.indexOf('Firefox') > 0) {
        clone = cloneInto(response, document.defaultView);
      }
      clone.requestId = request.requestId;
      window.dispatchEvent(
        new CustomEvent('ogi-players-rep', { detail: clone })
      );
    });
  },
  10
);

window.addEventListener(
  'ogi-filter',
  function (evt) {
    let request = evt.detail;
    let response = {
      players: dataHelper.filter(evt.detail.name, evt.detail.alliance),
    };
    var clone = response;
    if (navigator.userAgent.indexOf('Firefox') > 0) {
      clone = cloneInto(response, document.defaultView);
    }
    clone.requestId = request.requestId;
    window.dispatchEvent(new CustomEvent('ogi-filter-rep', { detail: clone }));
  },
  false
);
document.addEventListener('ogi-galaxy', function (e) {
  dataHelper.scan(e.detail.changes, e.detail.ptreKey, e.detail.serverTime);
});
document.addEventListener('ogi-clear', function (e) {
  dataHelper.clearData();
});
document.addEventListener('ogi-notification', function (e) {
  const msg = Object.assign({ iconUrl: 'res/logo128.png' }, e.detail);
  chrome.runtime.sendMessage(
    { type: 'notification', universe: UNIVERSE, message: msg },
    function (response) {}
  );
});

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
    return 1;
  }
  return (
    (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength)
  );
}

const url = chrome.runtime.getURL('res/expeditions.tsv');
let expeditionsMap = {};
let logbooks = {};
fetch(url)
  .then((response) => response.text())
  .then((text) => {
    let lines = text.split('\n');
    let first = lines.shift();
    for (let line of lines) {
      line.split(',');
      let splits = line.split('\t');
      for (let split of splits) {
        if (split == splits[0]) continue;
        if (splits[0] == 'Logbook') {
          logbooks[split] = true;
        } else {
          expeditionsMap[split] = splits[0];
        }
      }
    }
  });

function getExpeditionType(message) {
  let splits = message.split('\n\n');
  logbook = splits[splits.length - 1];
  if (logbook.includes(':')) {
    splits.pop();
  }
  message = splits.join('\n\n');
  let busy = false;
  let max = 0;
  let similar = '';
  let type = '';
  for (let i in expeditionsMap) {
    let sim = similarity(message, i);
    if (sim > max) {
      max = sim;
      similar = message;
      type = expeditionsMap[i];
    }
  }
  //console.log(max, message);
  if (max > 0.35) {
    return { type: type, busy: busy };
  } else {
    return { type: 'Unknown', busy: busy };
  }
}
