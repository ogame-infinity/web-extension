import { getLogger } from "../logger.js";
import NotificationType from "./NotificationType.js";

class BackgroundNotifier {
  logger = getLogger("BackgroundNotifier");

  notifications = [];

  #createNotification(id, title, message) {
    try {
      chrome.notifications.create(id, {
        type: "basic",
        iconUrl: "/assets/images/logo128.png",
        title: title,
        message: message,
      });
    } catch (error) {
      this.logger.error("Error while creating notification:", error);
    }
  }

  #scheduleNotification(id, title, message, when) {
    try {
      chrome.alarms.create(id, { when: when });
      this.notifications[id] = { title, message };
    } catch (error) {
      this.logger.error("Error while scheduling notification:", error);
    }
  }

  #cancelScheduledNotification(id) {
    try {
      chrome.alarms.clear(id);
      delete this.notifications[id];
    } catch (error) {
      this.logger.error("Error while canceling scheduled notification:", error);
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

export default new BackgroundNotifier();
