const NotificationType = Object.freeze({
  NOTIFICATION: 0,
  CREATE_SCHEDULED_NOTIFICATION: 1,
  CANCEL_SCHEDULED_NOTIFICATION: 2,
});

class BackgroundNotifier {
  notifications = [];
  constructor(browserApi) {
    this.browserApi = browserApi;
  }

  #createNotification(id, title, message) {
    if (!this.browserApi) return;

    try {
      this.browserApi.notifications.create(id, {
        type: "basic",
        iconUrl: "/assets/images/logo128.png",
        title: title,
        message: message,
      });
      console.log("Created notification:", { id, title, message });
    } catch (error) {
      console.error("Error while creating notification:", error);
    }
  }

  #scheduleNotification(id, title, message, when) {
    if (!this.browserApi) return;

    try {
      if (this.notifications[id]) {
        // if a notification with the same ID exists, cancel it
        this.#cancelScheduledNotification(id);
      }

      this.browserApi.alarms.create(id, { when: when });
      this.notifications[id] = { title, message };
      console.log("Scheduled notification:", this.notifications[id]);
    } catch (error) {
      console.error("Error while scheduling notification:", error);
    }
  }

  #cancelScheduledNotification(id) {
    if (!this.browserApi) return;

    try {
      this.browserApi.alarms.clear(id);
      if (this.notifications[id]) {
        delete this.notifications[id];
      }
      console.log("Canceled scheduled notification:", id);
    } catch (error) {
      console.error("Error while canceling scheduled notification:", error);
    }
  }

  Notify(notification) {
    if (!notification) return;

    if (notification.type === NotificationType.NOTIFICATION) {
      this.#createNotification(notification.id, notification.title, notification.message);
    } else if (notification.type === NotificationType.CREATE_SCHEDULED_NOTIFICATION) {
      this.#scheduleNotification(notification.id, notification.title, notification.message, notification.when);
    } else if (notification.type === NotificationType.CANCEL_SCHEDULED_NOTIFICATION) {
      this.#cancelScheduledNotification(notification.id);
    }
  }

  NotifyScheduled(notificationId) {
    const notification = this.notifications[notificationId];
    if (notification) {
      delete this.notifications[notificationId];
      this.#createNotification(notificationId, notification.title, notification.message);
    }
  }
}
var isChrome = typeof chrome !== "undefined";
var isFirefox = typeof browser !== "undefined";
const browserApi = isChrome ? chrome : isFirefox ? browser : null;
const backgroundNotifier = new BackgroundNotifier(browserApi);

if (browserApi) {
  browserApi.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    try {
      if (request.type == "notification") {
        if (request.detail) {
          backgroundNotifier.Notify(request.detail);
          if (sendResponse) return sendResponse(request.detail);
        }
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  browserApi.alarms.onAlarm.addListener((alarm) => {
    try {
      if (alarm.name) {
        backgroundNotifier.NotifyScheduled(alarm.name);
      }
    } catch (error) {
      console.error("Error handling alarm:", error);
    }
  });
}
