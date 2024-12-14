class Coords {
  _galaxy;
  _system;
  _position;

  set galaxy(galaxy) {
    this._galaxy = parseInt(galaxy);
  }

  get galaxy() {
    return this._galaxy;
  }

  set system(system) {
    this._system = parseInt(system);
  }

  get system() {
    return this._system;
  }

  set position(position) {
    this._position = parseInt(position);
  }

  get position() {
    return this._position;
  }

  toJSON() {
    return this.toString();
  }

  toString() {
    return `${this._galaxy}:${this._system}:${this._position}`;
  }
}

export function createFromString(coords) {
  const split = coords.split(":");

  return Object.assign(new Coords(), { galaxy: split[0], system: split[1], position: split[2] });
}
