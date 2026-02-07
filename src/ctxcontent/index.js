import { getLogger } from "../util/logger.js";
import { injectScript } from "../util/runContext.js";
import { contentContextInit } from "../util/service.callbackEvent.js";
import * as wait from "../util/wait.js";
import { getExpeditionType } from "./callbacks/expedition-type.js";
import { DataHelper } from "./data-helper.js";
import Notifier from "../util/Notifier.js";

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
document.addEventListener("ogi-notification", function (e) {
  if (!e.detail) throw new Error("No notification details provided");
  chrome.runtime.sendMessage({ eventType: "ogi-notification", message: e.detail }, function (response) {});
});
document.addEventListener("ogi-notification-scheduled", function (e) {
  if (!e.detail) throw new Error("No notification details provided");
  chrome.runtime.sendMessage({ eventType: "ogi-notification-scheduled", message: e.detail }, function (response) {});
});
document.addEventListener("ogi-notification-cancel", function (e) {
  if (!e.detail) throw new Error("No notification details provided");
  chrome.runtime.sendMessage({ eventType: "ogi-notification-cancel", message: e.detail }, function (response) {});
});
document.addEventListener("ogi-notification-sync", function (e) {
  if (!e.detail) throw new Error("No notification details provided");
  chrome.runtime.sendMessage({ eventType: "ogi-notification-sync", message: e.detail }, function (response) {
    Notifier.EndSyncNotifications(response);
  });
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
