import { getLogger } from "./logger.js";
import OGIData from "./OGIData.js";
import Translator from "./translate.js";
import MissionType from "./enum/missionType.js";

class Notifier {
  constructor() {
    this.logger = getLogger("Notifier");
    const self = this;
    document.addEventListener("ogi-notification-sync-response", function (e) {
      try {
        if (!e.detail) return;
        self.#syncNotifications(e.detail);
      } catch (error) {
        self.logger.error("Error syncing notifications:", error);
      }
    });
  }

  #dispatch(detail) {
    document.dispatchEvent(new CustomEvent("ogi-notification", { detail: detail }));
  }

  #formatId(id) {
    return `${OGIData.json.universeId}-${id}`;
  }
  #formatTitle(title) {
    return `${OGIData.json.universeName} - ${title}`;
  }

  #scheduleNotification(detail) {
    this.#dispatch({
      type: "CREATE_SCHEDULED_NOTIFICATION",
      id: detail.id,
      domain: OGIData.json.universeDomain,
      title: detail.title,
      message: detail.message,
      when: detail.when,
    });

    this.logger.info(`Scheduling notification ${detail.id}: `, detail);

    //Save for synchronization in case of multiple devices
    OGIData.notifications[detail.id] = detail;
    OGIData.Save();
  }
  ScheduleNotification(id, title, message, date) {
    this.#scheduleNotification({
      id: this.#formatId(id),
      title: this.#formatTitle(title),
      message: message,
      when: date.toISOString(),
    });
  }

  #syncNotifications(backgroundNotifications) {
    const idsToCancel = [];
    const notificationsToReschedule = [];

    const dateIsPassed = (date) => new Date(date).getTime() < Date.now();

    for (const [id, notification] of Object.entries(OGIData.notifications)) {
      const backgroundNotification = backgroundNotifications.find((x) => x.id === id);
      if (!backgroundNotification) {
        // If there's no background notification, and date is not passed, we must reschedule it, else we can cancel it
        if (!dateIsPassed(notification.when)) notificationsToReschedule.push(notification);
        else if (!idsToCancel.find((x) => x === id)) idsToCancel.push(id);
      } else {
        if (
          backgroundNotification.title !== notification.title ||
          backgroundNotification.message !== notification.message ||
          backgroundNotification.when !== notification.when
        ) {
          //if any property is different, and date is not passed, we can reschedule it, else we can cancel it
          if (!dateIsPassed(new Date(notification.when).getTime())) notificationsToReschedule.push(notification);
          else if (!idsToCancel.find((x) => x === id)) idsToCancel.push(id);
        }
      }
    }

    for (const [index, backgroundNotification] of Object.entries(backgroundNotifications)) {
      const backgroundNotificationId = backgroundNotification.id;
      const notification = OGIData.notifications[backgroundNotificationId];
      if (!notification) {
        // If there's no local notification, we must cancel it
        if (!idsToCancel.find((x) => x === backgroundNotificationId)) idsToCancel.push(backgroundNotificationId);
      }
    }

    for (const id of idsToCancel) {
      this.#cancelScheduledNotification(id);
    }
    for (const notification of notificationsToReschedule) {
      this.#scheduleNotification({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        when: notification.when,
      });
    }

    OGIData.lastSyncNotification = new Date().toISOString();
    OGIData.Save();

    this.logger.info(
      `Synchronized notifications: ${notificationsToReschedule.length} rescheduled, ${idsToCancel.length} canceled`
    );
  }

  SyncNotifications(force) {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    //if force or last sync was more than 5 minutes ago, then sync
    if (force || new Date(OGIData.lastSyncNotification).getTime() < now - fiveMinutes) {
      this.logger.info(`Syncing notifications (Forced: ${force})`);
      document.dispatchEvent(
        new CustomEvent("ogi-notification-sync", { detail: { domain: OGIData.json.universeDomain } })
      );
    }
  }

  #cancelScheduledNotification(id) {
    this.#dispatch({ type: "CANCEL_SCHEDULED_NOTIFICATION", id: id });
    if (OGIData.notifications[id]) {
      //Save for synchronization in case of multiple devices
      delete OGIData.notifications[id];
      this.logger.info(`Cancelled notification ${id}`);
      OGIData.Save();
    }
  }
  CancelScheduledNotification(id) {
    this.#cancelScheduledNotification(this.#formatId(id));
  }

  Notify(id, title, message) {
    if (id && title && message) {
      const formattedId = this.#formatId(id);
      const formattedTitle = this.#formatTitle(title);
      this.#dispatch({ type: "NOTIFICATION", id: formattedId, title: formattedTitle, message });
      this.logger.info(`Sent notification ${formattedId}: ${formattedTitle} - ${message}`);
    }
  }

  #formatFleetArrivalId(fleetId, isBack) {
    return `fleet-${fleetId}-${isBack ? "return" : "arrival"}`;
  }

  IsFleetMissionNotifiable(missionType) {
    /*Only peaceful fleets are affected.
     * For now, managing hostile fleets is complicated due to the possible change in fleet arrival time.*/
    const notifiableMissions = [MissionType.TRANSPORT, MissionType.DEPLOYMENT, MissionType.HARVEST];
    return notifiableMissions.includes(missionType);
  }

  IsFleetArrivalNotificationScheduled(fleetId, isBack) {
    const formattedId = this.#formatId(this.#formatFleetArrivalId(fleetId, isBack));
    const exists = OGIData.notifications[formattedId] !== undefined && OGIData.notifications[formattedId] !== null;
    return exists;
  }

  ScheduleFleetArrivalNotification(fleetId, coords, isMoon, missionType, isBack, arrivalDatetime) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);

    const title = Translator.translate(198);
    const missionTranslated = `${Translator.translate(199)}: ${Translator.TranslateMissionType(missionType)}${
      isBack ? ` (${Translator.translate(45)})` : ""
    }`;

    const destinationNameTranslated = `${Translator.translate(127)}: ${
      isMoon
        ? OGIData.empire.find((x) => x.coordinates === coords)?.moon?.name
        : OGIData.empire.find((x) => x.coordinates === coords)?.name
    }`;

    const coordsTranslated = `${Translator.translate(98)}: ${coords} (${
      isMoon ? Translator.translate(194) : Translator.translate(42)
    })`;

    if (id && coords) {
      this.ScheduleNotification(
        id,
        title,
        `${missionTranslated}\n${destinationNameTranslated}\n${coordsTranslated}`,
        arrivalDatetime
      );
    }
  }
  CancelFleetArrivalScheduledNotification(fleetId, isBack) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);
    this.CancelScheduledNotification(id);
  }
}

export default new Notifier();
