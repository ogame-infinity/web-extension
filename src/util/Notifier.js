import { getLogger } from "./logger.js";
import OGIData from "./OGIData.js";
import Translator from "./translate.js";
import MissionType from "./enum/missionType.js";

class Notifier {
  constructor() {
    this.logger = getLogger("Notifier");
  }

  #dispatch(detail) {
    if (detail.id) {
      detail.id = this.#formatIdWithUniverse(detail.id);
    }
    document.dispatchEvent(new CustomEvent("ogi-notification", { detail: detail }));
  }

  #formatIdWithUniverse(id) {
    return `${OGIData.json.universeId}-${id}`;
  }

  #formatId(id) {
    return id.toString().trim();
  }

  ScheduleNotification(id, title, message, date) {
    const detail = { id: this.#formatId(id), title: title, message: message, when: date.toISOString() };

    this.#dispatch({
      type: "CREATE_SCHEDULED_NOTIFICATION",
      id: detail.id,
      title: `${OGIData.json.universeName} - ${detail.title}`,
      message: detail.message,
      when: detail.when,
    });

    this.logger.info(`Scheduling notification ${id}: `, detail);

    //Save for synchronization in case of multiple devices
    OGIData.notifications[id] = detail;
    OGIData.Save();
  }

  RescheduleAllNotifications() {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    const idsToCancel = [];
    const notificationsToReschedule = [];
    if (new Date(OGIData.lastSyncNotification).getTime() < now - fiveMinutes) {
      this.logger.info(`Last sync notifications is older than 5 minutes`);

      for (const [id, notification] of Object.entries(OGIData.notifications)) {
        const notificationTime = new Date(notification.when).getTime();
        //if notification is passed since one minute, then cancel it
        if (notificationTime < now - oneMinute) idsToCancel.push(id);
        //if notification is still valid, reschedule it
        else if (notificationTime > now) notificationsToReschedule.push(notification);
      }

      for (const id of idsToCancel) {
        this.CancelScheduledNotification(id);
      }
      for (const notification of notificationsToReschedule) {
        this.ScheduleNotification(
          notification.id,
          notification.title,
          notification.message,
          new Date(notification.when)
        );
      }

      OGIData.lastSyncNotification = new Date().toISOString();
      OGIData.Save();
    }
  }

  CancelScheduledNotification(id) {
    this.#dispatch({ type: "CANCEL_SCHEDULED_NOTIFICATION", id: this.#formatId(id) });
    if (OGIData.notifications[id]) {
      //Save for synchronization in case of multiple devices
      delete OGIData.notifications[id];
      this.logger.info(`Cancelled notification ${id}`);
      OGIData.Save();
    }
  }

  Notify(id, title, message) {
    if (id && title && message) {
      this.#dispatch({ type: "NOTIFICATION", id: this.#formatId(id), title, message });
      this.logger.info(`Sent notification ${id}: ${title} - ${message}`);
    }
  }

  #formatFleetArrivalId(fleetId, isBack) {
    return `fleet-${this.#formatId(fleetId)}-${isBack ? "return" : "arrival"}`;
  }

  IsFleetMissionNotifiable(missionType) {
    /*Only peaceful fleets are affected.
     * For now, managing hostile fleets is complicated due to the possible change in fleet arrival time.*/
    const notifiableMissions = [MissionType.TRANSPORT, MissionType.DEPLOYMENT, MissionType.HARVEST];
    return notifiableMissions.includes(missionType);
  }

  IsFleetArrivalScheduled(fleetId, isBack) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);
    const exists = OGIData.notifications[id] !== undefined && OGIData.notifications[id] !== null;
    return exists;
  }

  NotifyFleetArrival(fleetId, coords, isMoon, missionType, isBack, arrivalDatetime) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);

    const title = Translator.translate(198);
    const missionTranslated = `${Translator.translate(199)}: ${Translator.TranslateMissionType(missionType)}${
      isBack ? ` (${Translator.translate(45)})` : ""
    }`;

    const destinationNameTranslated = `${Translator.translate(73)} ${
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
  CancelFleetArrivalNotification(fleetId, isBack) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);
    this.CancelScheduledNotification(id);
  }
}

export default new Notifier();
