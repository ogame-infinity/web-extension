import BackgroundNotifier from "./util/Notifications/BackgroundNotifier.js";
import { isChrome, isFirefox } from "./util/runContext.js";

const browserApi = isChrome() ? chrome : isFirefox() ? browser : null;

if (browserApi) {
  browserApi.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    try {
      if (request.type == "notification") {
        if (request.detail) {
          BackgroundNotifier.Notify(request.detail);
          return sendResponse(request.detail);
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  browserApi.alarms.onAlarm.addListener((alarm) => {
    try {
      if (alarm.name) {
        BackgroundNotifier.NotifyScheduled(alarm.name);
      }
    } catch (error) {
      console.error("Error handling alarm:", error);
    }
  });
}
