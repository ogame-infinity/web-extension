import { getLogger } from "../util/logger.js";
import { injectScript } from "../util/runContext.js";
import { contentContextInit } from "../util/service.callbackEvent.js";
import * as wait from "../util/wait.js";
import { getExpeditionType } from "./callbacks/expedition-type.js";
import { DataHelper } from "./data-helper.js";

const mainLogger = getLogger();

// PTRE team key held in the content script only for the lifetime of the tab.
// Pushed in from the page via `ptre.setTeamKey`; never persisted here.
let pendingPtreKey = "";

contentContextInit({
  ptre: {
    galaxy: function (galaxy, system, positions, additionnal, ptreKey = null, serverTime = null) {
      return dataHelper.scan(galaxy, system, positions, additionnal, ptreKey, serverTime);
    },
    setTeamKey: function (key) {
      pendingPtreKey = typeof key === "string" ? key : "";
      if (pendingPtreKey && dataHelper && dataHelper._galaxySnapshot) {
        dataHelper.rebuildGalaxyStorage(pendingPtreKey);
      }
    },
    galaxyInfo: function () {
      if (!dataHelper || !dataHelper.galaxyStorage) {
        return Promise.resolve({ systemCount: 0, lastGalaxyUpdateTS: -1, storageBytes: 0 });
      }
      let systemCount = 0;
      for (const g in dataHelper.galaxyStorage) {
        systemCount += Object.keys(dataHelper.galaxyStorage[g]).length;
      }
      const lastGalaxyUpdateTS = dataHelper.lastGalaxyUpdateTS ?? -1;
      const key = `ogi-galaxy-${UNIVERSE}`;
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([key], (result) => {
            let storageBytes = 0;
            const raw = result?.[key];
            if (typeof raw === "string") storageBytes = new Blob([raw]).size;
            resolve({ systemCount, lastGalaxyUpdateTS, storageBytes });
          });
        } catch (_) {
          resolve({ systemCount, lastGalaxyUpdateTS, storageBytes: 0 });
        }
      });
    },
  },
  messages: {
    expeditionType: getExpeditionType,
  },
});

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
        if (pendingPtreKey && universes[UNIVERSE]._galaxySnapshot) {
          universes[UNIVERSE].rebuildGalaxyStorage(pendingPtreKey);
        }
        let tempSaveData = { ...universes[UNIVERSE] };
        tempSaveData.lastUpdate = universes[UNIVERSE].lastUpdate.toJSON();
        tempSaveData.lastPlanetsUpdate = universes[UNIVERSE].lastPlanetsUpdate.toJSON();
        tempSaveData.lastPlayersUpdate = universes[UNIVERSE].lastPlayersUpdate.toJSON();
        // galaxyStorage lives in its own key `ogi-galaxy-<UNIVERSE>`; don't
        // duplicate it into the big blob or a manual reset gets resurrected
        // on next boot via Object.assign in main().
        delete tempSaveData.galaxyStorage;
        delete tempSaveData.lastGalaxyUpdateTS;
        // Runtime-only setTimeout id; must not survive a reload.
        delete tempSaveData._galaxyFlushTimer;
        delete tempSaveData._lastFlushError;
        delete tempSaveData._galaxySnapshot;

        chrome.storage.local.set({ [UNIVERSE]: tempSaveData }, function (at) {});
      });
      dataHelper = universes[UNIVERSE];
    } catch (e) {
      console.error(e);
      universes = {};
    }
  });
}

document.addEventListener("ogi-chart", function (e) {
  injectScript("libs/chart.min.js", () => {
    injectScript("libs/chartjs-plugin-labels.js");
  });
});

window.addEventListener(
  "ogi-players",
  function (evt) {
    wait
      .waitFor(() => dataHelper)
      .then(() => {
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
  false
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
document.addEventListener("ogi-galaxy-clear", function (e) {
  if (dataHelper) {
    dataHelper.galaxyStorage = {};
    dataHelper.lastGalaxyUpdateTS = -1;
  }
  chrome.storage.local.remove(`ogi-galaxy-${UNIVERSE}`);
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

  injectScript("libs/lz-string.min.js", null, false);
  injectScript("libs/purify.min.js", null, false);
  injectScript("ogkush.js", null, true);
}
