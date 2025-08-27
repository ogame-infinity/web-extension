const localStorageKey = "ogi-notifications";

/*
 * We absolutely need to store the notification data into the extension local storage
 * At runtime, the background scripts are loaded when events are fired.
 * When a background script is unloaded, all its variables are lost.
 * Therefore, we need to persist the notification data
 *
 * The chosen storage is the extension local storage because it allows us to store data that can be accessed by background scripts.
 * => Background scripts cannot access to the local storage.
 *
 * When an alarm is triggered, we only have its ID to work with. So we can't separate the notification data per universe Ids
 * We also have only one instance of the background script running at a time.
 * => The notification data is shared across all universes.
 */
class BackgroundNotificationData {
  _json = {
    lastCleaned: new Date().toISOString(),
    notifications: {},
  };

  get notifications() {
    return this._json.notifications;
  }

  get lastCleaned() {
    return this._json.lastCleaned;
  }
  set lastCleaned(date) {
    this._json.lastCleaned = date ?? new Date().toISOString();
  }

  async InitializeFromStorageAsync() {
    console.log("Initializing from storage...");
    const data = await chrome.storage.local.get("ogi-notifications");

    if (data && data["ogi-notifications"]) {
      console.log("Data found in storage, initializing...");
      this._json = data["ogi-notifications"];
      if (!this._json.notifications) {
        this._json.notifications = {};
      }
      if (!this._json.lastCleaned) {
        this._json.lastCleaned = new Date().toISOString();
      }
      console.log("Initialization complete:", this._json);
    } else {
      console.warn("No data found in storage, initializing with default values");
      this._json = {
        notifications: {},
        lastCleaned: new Date().toISOString(),
      };
      await this.SaveAsync();
    }
  }

  async SaveAsync() {
    console.log("Saving to storage...");
    await chrome.storage.local.set({ ["ogi-notifications"]: this._json });
    console.log("Saving complete");
  }
}

class BackgroundNotifier {
  constructor(notificationData) {
    this.notificationData = notificationData;
  }

  #raiseNotification(id, title, message, priority = 2) {
    if (!chrome) return;

    try {
      chrome.notifications.create(id, {
        type: "basic",
        priority: priority,
        iconUrl: "/assets/images/logo128.png",
        title: title,
        message: message,
      });
      console.log(`Raised notification ${id}:`, { title, message });
    } catch (error) {
      console.error("Error while creating notification:", error);
    }
  }

  async #scheduleNotificationAsync(id, domain, title, message, url, when) {
    try {
      let shouldUpdateAlarm = false;
      let shouldUpdateNotification = false;

      //Verify if the notification exists and if it has changed
      const notification = this.notificationData.notifications[id];
      if (notification) {
        if (notification.title !== title) {
          shouldUpdateNotification = true;
          console.log(`Notification ${id} exists but title is different`, { old: notification.title, new: title });
        }
        if (notification.message !== message) {
          shouldUpdateNotification = true;
          console.log(`Notification ${id} exists but message is different`, {
            old: notification.message,
            new: message,
          });
        }
        if (notification.when !== when) {
          shouldUpdateNotification = true;
          console.log(`Notification ${id} exists but when is different`, { old: notification.when, new: when });
        }
        if (notification.url !== url) {
          shouldUpdateNotification = true;
          console.log(`Notification ${id} exists but url is different`, { old: notification.url, new: url });
        }
      } else {
        shouldUpdateNotification = true;
      }

      //Verify if the alarm exists and if it should be updated
      const alarm = await chrome.alarms.get(id);
      if (alarm) {
        const alarmDate = new Date(alarm.scheduledTime).toISOString();
        if (alarmDate !== when) {
          shouldUpdateAlarm = true;
          console.log(`Alarm ${id} exists but scheduled time is different (old: ${alarmDate}, new: ${when})`);
        }
      } else {
        shouldUpdateAlarm = true;
      }

      if (shouldUpdateNotification) {
        this.notificationData.notifications[id] = { domain, title, message, url, when };
        await this.notificationData.SaveAsync();
        console.log(`Saved notification ${id}:`, { domain, title, message, url, when });
      } else {
        console.log(`Notification ${id} is unchanged`);
      }

      if (shouldUpdateAlarm) {
        /*
         * The browser doesn't execute tasks with millisecond-level precision.
         * It manages an event scheduling cycle to optimize performance and battery consumption.
         * If you create an alarm for a time that's too short (e.g., 10 seconds from now), the browser might not process the scheduling request until after that time has already passed.
         * At that point, the alarm is considered expired and is simply never triggered.
         * This is why the documentation recommends a minimum delay of one minute to ensure the alarm has enough time to be properly registered and processed by the scheduling system.
         */

        const minRequiredDelayInMs = 60 * 1000; // ensure minimum delay of 1 minute
        const newAlarmDate = Math.max(new Date(when).getTime(), Date.now() + minRequiredDelayInMs);

        chrome.alarms.create(id, { when: newAlarmDate });
        console.log(`Scheduled alarm ${id} at ${when}`);
      } else {
        console.log(`Alarm ${id} is unchanged`);
      }
    } catch (error) {
      console.error("Error while scheduling notification:", error);
    }
  }

  async #cancelScheduledNotificationAsync(id) {
    try {
      if (this.notificationData.notifications[id]) {
        delete this.notificationData.notifications[id];
        await this.notificationData.SaveAsync();
        console.log(`Removed notification ${id}`);
      }

      const wasCleared = await chrome.alarms.clear(id);
      if (wasCleared) {
        console.log(`Cleared alarm ${id}`);
      }
    } catch (error) {
      console.error("Error while canceling scheduled notification:", error);
    }
  }

  async #cleanOldNotificationsAsync() {
    const idsToRemove = [];
    const now = Date.now();

    const fiveMinutes = 5 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;

    //if last cleaned is more than 5 minutes ago, clean notifications that are older than 1 hour
    if (new Date(this.notificationData.lastCleaned).getTime() < now - fiveMinutes) {
      console.log(`Cleaning old notifications`);
      for (const [id, notification] of Object.entries(this.notificationData.notifications)) {
        if (new Date(notification.when).getTime() < now - oneHour) idsToRemove.push(id);
      }

      for (const id of idsToRemove) {
        delete this.notificationData.notifications[id];
        console.log(`Removed old notification ${id}`);
      }

      const lastCleaned = new Date().toISOString();
      this.notificationData.lastCleaned = lastCleaned;
      await this.notificationData.SaveAsync();

      console.log(`Last cleaned old notifications: ${lastCleaned}`);
    }
  }

  async HandleMessageAsync(message) {
    if (!message) return;

    if (message.type === "NOTIFICATION") {
      this.#raiseNotification(message.id, message.title, message.message);
    } else if (message.type === "CREATE_SCHEDULED_NOTIFICATION") {
      await this.#scheduleNotificationAsync(
        message.id,
        message.domain,
        message.title,
        message.message,
        message.url,
        message.when
      );
    } else if (message.type === "CANCEL_SCHEDULED_NOTIFICATION") {
      await this.#cancelScheduledNotificationAsync(message.id);
    }

    await this.#cleanOldNotificationsAsync();
  }

  async NotifyScheduledAsync(notificationId) {
    if (!notificationId) return;

    const notification = this.notificationData.notifications[notificationId];
    if (notification) {
      this.#raiseNotification(notificationId, notification.title, notification.message);
      //if the notification has no URL, it can be considered for removal
      if (!notification.url) {
        delete this.notificationData.notifications[notificationId];
        await this.notificationData.SaveAsync();
      }
    }

    await this.#cleanOldNotificationsAsync();
  }

  async ActionOnNotificationClickAsync(notificationId) {
    if (!notificationId) return;

    const notification = this.notificationData.notifications[notificationId];
    if (notification) {
      const urlPattern = `https://${notification.domain}/game/*`;

      //find all matching tabs
      const tabs = await chrome.tabs.query({ url: urlPattern });

      if (tabs.length > 0) {
        // If an existing tab is found, activate it
        const ogameTab = tabs[0];
        if (notification.url) await chrome.tabs.update(ogameTab.id, { url: notification.url, active: true });
        else await chrome.tabs.update(ogameTab.id, { active: true });

        console.log(`Found existing OGame tab for domain ${notification.domain}, activating it.`);
      } else {
        // Otherwise, create a new one
        await chrome.tabs.create({ url: notification.url });
        console.log(`No OGame tab found for domain ${notification.domain}, creating a new one.`);
      }

      //remove the notification from the list
      delete this.notificationData.notifications[notificationId];
      await this.notificationData.SaveAsync();
    } else {
      //else open lobby
      await chrome.tabs.create({ url: `https://lobby.ogame.gameforge.com/` });
    }

    await this.#cleanOldNotificationsAsync();
  }

  GetAllNotifications(domain) {
    if (!domain) return [];
    return Object.entries(this.notificationData.notifications)
      .filter(([id, notification]) => notification.domain === domain)
      .map(([id, notification]) => ({ id, ...notification }));
  }
}

const notificationData = new BackgroundNotificationData();
const backgroundNotifier = new BackgroundNotifier(notificationData);
async function setup() {
  await notificationData.InitializeFromStorageAsync();
}
setup();

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // execute into IIFE (Immediately Invoked Function Expression)
  (async () => {
    try {
      if (request.eventType === "ogi-notification" && request.message) {
        await backgroundNotifier.HandleMessageAsync(request.message);
      } else if (request.eventType === "ogi-notification-sync" && sendResponse) {
        await notificationData.InitializeFromStorageAsync();
        sendResponse(backgroundNotifier.GetAllNotifications(request.message.domain));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      // Send an empty response in case of error to avoid the port being suspended
      sendResponse({});
    }
  })();

  // Send a response indicating that the message was received
  return true;
});

chrome.alarms.onAlarm.addListener(async function (alarm) {
  try {
    await backgroundNotifier.NotifyScheduledAsync(alarm.name);
  } catch (error) {
    console.error("Error handling alarm:", error);
  }
});

chrome.notifications.onClicked.addListener(async function (notificationId) {
  try {
    await notificationData.InitializeFromStorageAsync();
    await backgroundNotifier.ActionOnNotificationClickAsync(notificationId);
    chrome.notifications.clear(notificationId);
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});
