import { getLogger } from "../logger.js";

import NotificationType from "./NotificationType.js";

class Notifier {
  static OGI_NOTIFICATION = "ogi-notification";

  logger = getLogger("Notifier");

  #dispatch(type, detail) {
    detail.type = type;
    document.dispatchEvent(new CustomEvent(Notifier.OGI_NOTIFICATION, { detail: detail }));
  }

  Notify(id, title, message) {
    if (id && title && message) {
      this.#dispatch(NotificationType.NOTIFICATION, { id, title, message });
    }
  }

  ScheduleNotification(id, title, message, date) {
    const delay = date.getTime() - Date.now();
    const when = Date.now() + delay;
    this.#dispatch(NotificationType.CREATE_SCHEDULED_NOTIFICATION, { id, title, message, when });
  }
  CancelScheduledNotification(id) {
    this.#dispatch(NotificationType.CANCEL_SCHEDULED_NOTIFICATION, { id });
  }
}

export default new Notifier();
