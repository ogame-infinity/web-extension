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
    notifications: {},
  };

  get notifications() {
    return this._json.notifications;
  }

  getLastSynced(domain) {
    return this._json.lastSynced[domain] ?? new Date(0).toISOString();
  }
  setLastSynced(domain, date) {
    this._json.lastSynced[domain] = date ?? new Date().toISOString();
  }

  async InitializeFromStorageAsync() {
    console.log("Initializing from storage...");
    const data = await chrome.storage.local.get("ogi-notifications");

    if (data && data["ogi-notifications"]) {
      console.log("Data found in storage, initializing...");
      let tempJson = data["ogi-notifications"];

      if (!tempJson.notifications) {
        tempJson.notifications = {};
      }
      if (!tempJson.lastSynced) {
        tempJson.lastSynced = {};
      }

      //remove already notified notifications
      tempJson.notifications = Object.fromEntries(
        Object.entries(tempJson.notifications).filter(([, notification]) => !notification.notified)
      );

      //remove obsolete notifications since 5 minutes
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      tempJson.notifications = Object.fromEntries(
        Object.entries(tempJson.notifications).filter(([, notification]) => {
          if (new Date(notification.when).getTime() < fiveMinutesAgo) return false;
          return true;
        })
      );

      this._json = tempJson;

      console.log("Initialization complete:", this._json);
      await this.SaveAsync();
    } else {
      console.warn("No data found in storage, initializing with default values");
      this._json = {
        notifications: {},
        lastSynced: {},
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

  #raiseNotification(notification) {
    if (notification.notified) return; //avoid raising twice the same notification

    try {
      chrome.notifications.create(notification.id, {
        type: "basic",
        priority: notification.priority ?? 0,
        iconUrl: "/assets/images/logo128.png",
        title: notification.title,
        message: notification.message,
      });
      console.log(`Raised notification ${notification.id}:`, notification);
    } catch (error) {
      console.error("Error while creating notification:", error);
    }
  }

  async #createOrUpdateNotificationAsync(notificationToSchedule) {
    try {
      let ensureMinDelay = false;
      let shouldUpdateAlarm = false;
      let shouldUpdateNotification = false;

      //Verify if the notification exists and if it has changed
      const notification = this.notificationData.notifications[notificationToSchedule.id];
      if (notification) {
        if (!this.#areEquals(notificationToSchedule, notification)) {
          shouldUpdateNotification = true;
        }
      } else {
        shouldUpdateNotification = true;
      }

      if (shouldUpdateNotification) {
        this.notificationData.notifications[notificationToSchedule.id] = notificationToSchedule;
        await this.notificationData.SaveAsync();
        console.log(`Saved notification ${notificationToSchedule.id}:`, notificationToSchedule);
      } else {
        console.log(`Notification ${notificationToSchedule.id} is unchanged`);
      }

      if (!notificationToSchedule.notified) {
        //Verify if the alarm exists and if it should be updated
        const alarm = await chrome.alarms.get(notificationToSchedule.id);
        if (alarm) {
          const alarmDate = new Date(alarm.scheduledTime).toISOString();
          if (alarmDate !== notificationToSchedule.when) {
            shouldUpdateAlarm = true;
            console.log(
              `Alarm ${notificationToSchedule.id} exists but scheduled time is different (old: ${alarmDate}, new: ${notificationToSchedule.when})`
            );
          }
        } else {
          //alarm doesn't exist, we need to create it, and ensure minimum delay
          ensureMinDelay = true;
          shouldUpdateAlarm = true;
        }

        if (shouldUpdateAlarm)
          this.#createAlarm(notificationToSchedule.id, notificationToSchedule.when, ensureMinDelay);
        else console.log(`Alarm ${notificationToSchedule.id} is unchanged`);
      } else await this.#cancelAlarmAsync(notificationToSchedule.id); //if already notified, remove any existing alarm to avoid re-notification
    } catch (error) {
      console.error("Error while scheduling notification:", error);
    }
  }

  #createAlarm(id, when, ensureMinDelay) {
    /*
     * The browser doesn't execute tasks with millisecond-level precision.
     * It manages an event scheduling cycle to optimize performance and battery consumption.
     * If you create an alarm for a time that's too short (e.g., 10 seconds from now), the browser might not process the scheduling request until after that time has already passed.
     * At that point, the alarm is considered expired and is simply never triggered.
     * This is why the documentation recommends a minimum delay of one minute to ensure the alarm has enough time to be properly registered and processed by the scheduling system.
     */
    const minRequiredDelayInMs = 60 * 1000; // ensure minimum delay of 1 minute
    const alarmDate = ensureMinDelay
      ? Math.max(new Date(when).getTime(), Date.now() + minRequiredDelayInMs)
      : new Date(when).getTime();

    chrome.alarms.create(id, { when: alarmDate });
    console.log(`Scheduled alarm  ${id} at ${when}`);
  }
  async #cancelAlarmAsync(id) {
    const wasCleared = await chrome.alarms.clear(id);
    if (wasCleared) {
      console.log(`Cleared alarm ${id}`);
    }
  }

  async #cancelScheduledNotificationAsync(id) {
    try {
      if (this.notificationData.notifications[id]) {
        delete this.notificationData.notifications[id];
        await this.notificationData.SaveAsync();
        console.log(`Removed notification ${id}`);
      }

      await this.#cancelAlarmAsync(id);
    } catch (error) {
      console.error("Error while canceling scheduled notification:", error);
    }
  }

  #areEquals = (notificationA, notificationB) => {
    if (notificationA.id !== notificationB.id) {
      console.debug(`Notification ID mismatch`, {
        notificationA: notificationA.id,
        notificationB: notificationB.id,
      });
      return false;
    }
    if (notificationA.domain !== notificationB.domain) {
      console.debug(`Notification ${notificationA.id} Domain mismatch`, {
        notificationA: notificationA.domain,
        notificationB: notificationB.domain,
      });
      return false;
    }
    if (notificationA.when !== notificationB.when) {
      console.debug(`Notification ${notificationA.id} When mismatch`, {
        notificationA: notificationA.id,
        notificationB: notificationB.id,
      });
      return false;
    }
    if (notificationA.url !== notificationB.url) {
      console.debug(`Notification ${notificationA.id} URL mismatch`, {
        notificationA: notificationA.url,
        notificationB: notificationB.url,
      });
      return false;
    }
    if (notificationA.priority !== notificationB.priority) {
      console.debug(`Notification ${notificationA.id} Priority mismatch`, {
        notificationA: notificationA.priority,
        notificationB: notificationB.priority,
      });
      return false;
    }
    if (notificationA.message !== notificationB.message) {
      console.debug(`Notification ${notificationA.id} Message mismatch`, {
        notificationA: notificationA.message,
        notificationB: notificationB.message,
      });
      return false;
    }
    if (notificationA.title !== notificationB.title) {
      console.debug(`Notification ${notificationA.id} Title mismatch`, {
        notificationA: notificationA.title,
        notificationB: notificationB.title,
      });
      return false;
    }
    if (notificationA.notified !== notificationB.notified) {
      console.debug(`Notification ${notificationA.id} Notified status mismatch`, {
        notificationA: notificationA.notified,
        notificationB: notificationB.notified,
      });
      return false;
    }
    return true;
  };

  async SyncNotifications(domain, notifications) {
    const notificationsToCancel = [];
    const perfectlySynced = [];

    const registerForCancellation = (id, notification) => {
      if (!notificationsToCancel.find((x) => x[0] === id)) notificationsToCancel.push([id, notification]);
    };

    //remove background notifications that are not into notifications
    for (const [backgroundNotificationId, backgroundNotification] of Object.entries(
      this.notificationData.notifications
    ).filter(
      (x) => x[1].domain === domain //⚠️ Filter by domain
    )) {
      //if notification is not found, we must cancel it
      const notification = notifications.find((x) => x.domain === domain && x.id === backgroundNotificationId);
      if (!notification) {
        registerForCancellation(backgroundNotificationId, backgroundNotification);
      }
    }

    // proceed removal
    for (const [id, notification] of notificationsToCancel) {
      delete this.notificationData.notifications[notification.id];
      this.#cancelAlarmAsync(notification.id);
    }
    await this.notificationData.SaveAsync();

    //proceed updates
    for (const notification of notifications) {
      await this.#createOrUpdateNotificationAsync({
        id: notification.id,
        domain: domain,
        title: notification.title,
        message: notification.message,
        url: notification.url,
        when: notification.when,
        priority: notification.priority,
        notified: notification.notified,
      });
    }

    this.notificationData.setLastSynced(domain, new Date().toISOString());
    await this.notificationData.SaveAsync();

    const syncResult = {
      SyncDate: this.notificationData.getLastSynced(domain),
      Saved: notifications.map((x) => this.notificationData.notifications[x.id]),
      Canceled: notificationsToCancel.map((x) => x[1]),
    };
    console.log(
      `Synchronized notifications: ${syncResult.Saved.length} saved, ${notificationsToCancel.length} canceled`,
      syncResult
    );

    return syncResult;
  }

  async RaiseNotificationAsync(notification) {
    this.#raiseNotification(notification);
  }
  async ScheduleNotificationAsync(notification) {
    await this.#createOrUpdateNotificationAsync(notification);
  }
  async CancelScheduledNotificationAsync(notification) {
    await this.#cancelScheduledNotificationAsync(notification.id);
  }

  async NotifyScheduledAsync(notificationId) {
    if (!notificationId) return;

    const notification = this.notificationData.notifications[notificationId];
    if (notification) {
      this.#raiseNotification(notification);
      notification.notified = true;
      this.notificationData.notifications[notificationId] = notification;
      await this.notificationData.SaveAsync();
    }
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
  }
}

const notificationData = new BackgroundNotificationData();
const backgroundNotifier = new BackgroundNotifier(notificationData);

/*
async function setup() {
  console.log("Setting up background notifier...");
  await notificationData.InitializeFromStorageAsync();
}
await setup();

*/

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // execute into IIFE (Immediately Invoked Function Expression)
  (async () => {
    try {
      if (request.eventType === "ogi-notification" && request.message) {
        console.log("ogi-notification");

        await notificationData.InitializeFromStorageAsync();
        await backgroundNotifier.RaiseNotificationAsync(request.message);
      }
      if (request.eventType === "ogi-notification-scheduled" && request.message) {
        console.log("ogi-notification-scheduled");

        await notificationData.InitializeFromStorageAsync();
        await backgroundNotifier.ScheduleNotificationAsync(request.message);
      }
      if (request.eventType === "ogi-notification-cancel" && request.message) {
        console.log("ogi-notification-cancel");

        await notificationData.InitializeFromStorageAsync();
        await backgroundNotifier.CancelScheduledNotificationAsync(request.message);
      }
      if (request.eventType === "ogi-notification-sync" && sendResponse) {
        console.log("ogi-notification-sync");

        await notificationData.InitializeFromStorageAsync();
        sendResponse(await backgroundNotifier.SyncNotifications(request.message.domain, request.message.notifications));
      }
    } catch (error) {
      console.error("Error processing message:", error);
      sendResponse({}); // Send an empty response in case of error to avoid the port being suspended
    }
  })();

  // Send a response indicating that the message was received
  return true;
});

chrome.alarms.onAlarm.addListener(async function (alarm) {
  try {
    console.log("Alarm triggered:", alarm);
    await notificationData.InitializeFromStorageAsync();
    await backgroundNotifier.NotifyScheduledAsync(alarm.name);
  } catch (error) {
    console.error("Error handling alarm:", error);
  }
});

chrome.notifications.onClicked.addListener(async function (notificationId) {
  try {
    console.log("Notification clicked:", notificationId);
    await notificationData.InitializeFromStorageAsync();
    await backgroundNotifier.ActionOnNotificationClickAsync(notificationId);
    chrome.notifications.clear(notificationId);
  } catch (error) {
    console.error("Error handling notification click:", error);
  }
});
