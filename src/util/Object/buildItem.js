import { Planet } from "./planet.js";
import buildItemStatus from "../enum/buildItemStatus.js";

export class BuildItem {
  _planet;
  _technologyId;
  _target;
  _status = buildItemStatus.WAITING;

  set planet(planet) {
    if (!(planet instanceof Planet)) {
      planet = Object.assign(new Planet(), planet);
    }

    this._planet = planet;
  }

  get planet() {
    return this._planet;
  }

  set technologyId(technologyId) {
    this._technologyId = technologyId;
  }

  get technologyId() {
    return this._technologyId;
  }

  set target(target) {
    this._target = target;
  }

  get target() {
    return this._target;
  }

  set status(status) {
    this._status = status;
  }

  get status() {
    return this._status;
  }

  toJSON() {
    return {
      planet: this._planet,
      technologyId: this._technologyId,
      target: this._target,
      status: this._status,
    };
  }
}
