import { getLogger } from "./logger.js";
import OGIData from "./OGIData.js";
import Translator from "./translate.js";
import MissionType from "./enum/missionType.js";
import NotificationPriority from "./enum/NotificationPriority.js";

class Notifier {
  constructor() {
    this.logger = getLogger("Notifier");
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
      priority: detail.priority ?? NotificationPriority.NORMAL,
      domain: OGIData.json.universeDomain,
      title: detail.title,
      message: detail.message,
      url: detail.url,
      when: detail.when,
    });

    this.logger.info(`Scheduling notification ${detail.id}: `, detail);

    //Save for synchronization in case of multiple devices
    OGIData.notifications[detail.id] = detail;
    OGIData.Save();
  }
  ScheduleNotification(id, priority, title, message, url, date) {
    this.#scheduleNotification({
      id: this.#formatId(id),
      priority: priority,
      title: this.#formatTitle(title),
      message: message,
      url: url,
      when: date.toISOString(),
    });
  }

  EndSyncNotifications(notificationResult) {
    if (!notificationResult) return;

    // Cancel any notifications that were canceled during the sync
    for (const id of notificationResult.Canceled) {
      this.#cancelScheduledNotification(id, false);
    }

    OGIData.lastSyncNotification = notificationResult.SyncDate;
    OGIData.Save();
    this.logger.info(
      `Synchronized notifications: ${notificationResult.PerfectlySynced.length} perfectly synced, ${notificationResult.Rescheduled.length} rescheduled, ${notificationResult.Canceled.length} canceled`,
      notificationResult
    );
  }

  BeginSyncNotifications(force) {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    const minutesAgoSync = Math.floor((now - new Date(OGIData.lastSyncNotification).getTime()) / 60000);

    this.logger.debug(`Last notifications sync was ${minutesAgoSync} minutes ago (${OGIData.lastSyncNotification})`);
    //if force or last sync was more than 5 minutes ago, then sync
    if (force || new Date(OGIData.lastSyncNotification).getTime() < now - fiveMinutes) {
      this.logger.info(`Start syncing notifications (Forced: ${force})`);
      document.dispatchEvent(
        new CustomEvent("ogi-notification-sync", {
          detail: { domain: OGIData.json.universeDomain, notifications: OGIData.notifications },
        })
      );
    }
  }

  #cancelScheduledNotification(id, sendDispatch = true) {
    if (sendDispatch) {
      this.#dispatch({ type: "CANCEL_SCHEDULED_NOTIFICATION", id: id });
    }
    if (OGIData.notifications[id]) {
      //Save for synchronization in case of multiple devices
      delete OGIData.notifications[id];
      this.logger.info(`Cancelled notification ${id}`);
      OGIData.Save();
    }
  }
  CancelScheduledNotification(id) {
    this.#cancelScheduledNotification(this.#formatId(id), true);
  }

  Notify(id, title, message, priority = 0) {
    if (id && title && message) {
      const formattedId = this.#formatId(id);
      const formattedTitle = this.#formatTitle(title);
      this.#dispatch({ type: "NOTIFICATION", id: formattedId, priority: priority, title: formattedTitle, message });
      this.logger.info(`Sent notification ${formattedId}: ${formattedTitle} - ${message}`);
    }
  }

  #formatFleetArrivalId(fleetId, isBack) {
    return `fleet-${fleetId}-${isBack ? "return" : "arrival"}`;
  }

  IsFleetMissionNotifiable(missionType) {
    /*Only peaceful fleets are affected.
     * For now, managing hostile fleets is complicated due to the possible change in fleet arrival time.*/
    const notifiableMissions = [
      MissionType.TRANSPORT,
      MissionType.DEPLOYMENT,
      MissionType.HARVEST,
      MissionType.COLONISATION,
    ];
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

    const destination = isMoon
      ? OGIData.empire.find((x) => x.coordinates === coords)?.moon
      : OGIData.empire.find((x) => x.coordinates === coords);

    const destinationNameTranslated = destination ? `\n${Translator.translate(127)}: ${destination.name}` : "";

    const coordsTranslated = `${Translator.translate(98)}: ${coords} (${
      isMoon ? Translator.translate(194) : Translator.translate(42)
    })`;

    const link = destination
      ? `https://${OGIData.json.universeDomain}/game/index.php?page=ingame&component=fleetdispatch&cp=${destination.id}`
      : `https://${OGIData.json.universeDomain}/game/index.php?page=ingame&component=overview`;

    const message = `${missionTranslated}${destinationNameTranslated}\n${coordsTranslated}`;

    if (id && coords) {
      this.ScheduleNotification(id, NotificationPriority.VERY_LOW, title, message, link, arrivalDatetime);
    }
  }
  CancelFleetArrivalScheduledNotification(fleetId, isBack) {
    const id = this.#formatFleetArrivalId(fleetId, isBack);
    this.CancelScheduledNotification(id);
  }
}

export default new Notifier();
