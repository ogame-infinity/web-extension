import { getLogger } from "../logger.js";
import NotificationType from "./NotificationType.js";
import OGIData from "../OGIData.js";
import Translator from "../translate.js";
import MissionType from "../enum/missionType.js";

class Notifier {
  static OGI_NOTIFICATION = "ogi-notification";

  constructor() {
    this.logger = getLogger("Notifier");
  }

  #dispatch(type, detail) {
    detail.type = type;
    detail.id = `${OGIData.json.universeId}-${detail.id}`;
    document.dispatchEvent(new CustomEvent(Notifier.OGI_NOTIFICATION, { detail: detail }));
  }

  #formatId(id) {
    return id.toString().trim();
  }

  ScheduleNotification(id, title, message, date) {
    const delay = date.getTime() - Date.now();
    const when = Date.now() + delay;
    const detail = { id: this.#formatId(id), title: title, message: message, when: date };

    this.#dispatch(NotificationType.CREATE_SCHEDULED_NOTIFICATION, {
      id: detail.id,
      title: `${OGIData.json.universeName} - ${detail.title}`,
      message: detail.message,
      when: when, //date is recalculated for the notification
    });

    this.logger.info(`Scheduling notification ${id} at ${when} (${date})`);
    OGIData.notifications[id] = detail;
    OGIData.Save();
  }

  RescheduleAllNotifications() {
    for (const id in OGIData.notifications) {
      const notification = OGIData.notifications[id];

      const date = new Date(notification.when);
      //if date is passed, cancel notification
      if (date < Date.now()) {
        this.CancelScheduledNotification(notification.id);
      } else {
        this.ScheduleNotification(notification.id, notification.title, notification.message, date);
      }
    }
  }

  CancelScheduledNotification(id) {
    this.#dispatch(NotificationType.CANCEL_SCHEDULED_NOTIFICATION, { id: this.#formatId(id) });
    if (OGIData.notifications[id]) {
      delete OGIData.notifications[id];
      this.logger.info(`Cancelled notification ${id}`);
      OGIData.Save();
    }
  }

  Notify(id, title, message) {
    if (id && title && message) {
      this.#dispatch(NotificationType.NOTIFICATION, { id: this.#formatId(id), title, message });
      this.logger.info(`Sent notification ${id}: ${title} - ${message}`);
    }
  }

  #formatFleetArrivalId(fleetId) {
    return `fleet-arrival-${this.#formatId(fleetId)}`;
  }

  IsFleetMissionNotifiable(missionType) {
    const notifiableMissions = [
      MissionType.ATTACK,
      MissionType.ACS_ATTACK,
      MissionType.TRANSPORT,
      MissionType.DEPLOYMENT,
      MissionType.ACS_DEFEND,
      //MissionType.SPY,
      MissionType.COLONISATION,
      MissionType.HARVEST,
      MissionType.MOON_DESTRUCTION,
      //MissionType.MISSILE_ATTACK,
      //MissionType.EXPEDITION,
      //MissionType.EXPLORATION,
    ];
    return notifiableMissions.includes(parseInt(missionType));
  }

  IsFleetArrivalScheduled(fleetId) {
    const id = this.#formatFleetArrivalId(fleetId);
    const exists = OGIData.notifications[id] !== undefined && OGIData.notifications[id] !== null;
    return exists;
  }

  NotifyFleetArrival(fleetId, coords, missionType, isBack, date) {
    const id = this.#formatFleetArrivalId(fleetId);

    const title = Translator.translate(198);
    const missionTranslated = `${Translator.translate(199)}: ${Translator.TranslateMissionType(missionType)}${
      isBack ? ` (${Translator.translate(45)})` : ""
    }`;
    const coordsTranslated = `${Translator.translate(98)}: ${coords}`;

    if (id && coords) {
      this.ScheduleNotification(id, title, `${missionTranslated}\n${coordsTranslated}`, date);
    }
  }
  CancelFleetArrivalNotification(fleetId) {
    const id = this.#formatFleetArrivalId(fleetId);
    this.CancelScheduledNotification(id);
  }
}

export default new Notifier();
