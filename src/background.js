import BackgroundNotifier from "./util/Notifications/BackgroundNotifier.js";
import { isChrome, isFirefox } from "./util/runContext.js";
// chrome.action.onClicked.addListener((() => {
//     chrome.tabs.create({url: "https://lobby.ogame.gameforge.com/"})
// }));

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "notification") {
    if (request.detail) {
      BackgroundNotifier.Notify(request.detail);
      return sendResponse(request.detail);
    }
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name) {
    BackgroundNotifier.NotifyScheduled(alarm.name);
  }
});

/*
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.local.clear()
}) */
