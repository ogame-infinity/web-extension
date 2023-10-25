export const COORDINATE_PLANET = 1;
export const COORDINATE_DERBIS = 2;
export const COORDINATE_MOON = 3;

const coordinateStringRegex = /(?<G>\d):(?<S>\d{1,3}):(?<P>\d{1,3})/;
const coordinateNumberRegex = /^(?<G>\d)(?<S>\d{3})(?<P>\d{3})(?<T>\d?)/;

/** @typedef {[number, number, number]} OGameCoordinateArray
 * Index:
 * 0: galaxy
 * 1: system
 * 2: position
 */

/** */
class InvalidCoordinateArgument extends Error {
  /** @param {string?} message */
  constructor(message) {
    super(message);
  }
}

/**
 * @param {string} coordinate Coordinate in OGame format `S:GGG:PPP`
 * @return {OGameCoordinateArray}
 */
function fromOGameToArray(coordinate) {
  let match;
  if ((match = coordinateStringRegex.exec(coordinate)) === null) {
    throw InvalidCoordinateArgument("Coordinate is not in OGame format.");
  }

  return [Number(match.groups["G"]), Number(match.groups["S"]), Number(match.groups["P"])];
}

/**
 * @param {number} nCoordinate
 * @return {OGameCoordinateArray}
 */
function fromNumberToArray(nCoordinate) {
  let match;
  const coordinate = String(nCoordinate);
  if ((match = coordinateNumberRegex.exec(coordinate)) === null) {
    throw InvalidCoordinateArgument("Coordinate number is not a valid argument");
  }

  return [Number(match.groups["G"]), Number(match.groups["S"]), Number(match.groups["P"])];
}

/**
 *
 * @param {string|OGameCoordinate} coordinate
 * @param {number?} type
 * @return {number} `GSSSPPPT` - G: Galaxy, SSS: System, PPP: Position, T: coordinate type
 */
export function toNumber(coordinate, type = 0) {
  let parts = undefined;
  if (coordinate instanceof OGameCoordinate) {
    parts = toArray(coordinate);
  } else if ("string" === typeof coordinate) {
    parts = fromOGameToArray(coordinate);
  }

  if (parts === undefined) {
    throw InvalidCoordinateArgument("Invalid coordinate argument, expected string or OGameCoordinate instance");
  }

  return Number(parts.map((v) => String(v).padStart(3, "0")).join("") + String(type));
}

/**
 * @param {OGameCoordinate|number} coordinate
 * @param {boolean?} withBrackets
 * @return {string}
 */
export function toString(coordinate, withBrackets = false) {
  let text = undefined;
  if (coordinate instanceof OGameCoordinate) {
    text = toArray(coordinate).join(":");
  } else if ("number" === typeof coordinate) {
    text = fromNumberToArray(coordinate).join(":");
  }

  if (text === undefined) {
  }

  if (withBrackets) {
    text = `[${text}]`;
  }

  return text;
}

/**
 *
 * @param {string} coordinate
 * @param {number} type
 * @return {OGameCoordinate}
 */
export function fromString(coordinate, type) {
  const [g, s, p] = fromOGameToArray(coordinate);
  const instance = new OGameCoordinate(g, s, p, type);
  Object.seal(instance);
  return instance;
}

/**
 *
 * @param {OGameCoordinate} coordinate
 * @return {OGameCoordinateArray}
 */
export const toArray = (coordinate) => [coordinate.galaxy, coordinate.system, coordinate.position];
/**
 * @param {OGameCoordinate} a
 * @param {OGameCoordinate} b
 * @return {number}
 */
export const comparePosition = (a, b) => {
  return a.toNumber() - b.toNumber();
};

/**
 *
 * @param {OGameCoordinate} a
 * @param {OGameCoordinate} b
 * @return {boolean}
 */
export const equals = (a, b) => a.toNumber() === b.toNumber();

class OGameCoordinate {
  /** @type {number} */
  galaxy;
  /** @type {number} */
  system;
  /** @type {number} */
  position;
  /** @type {number} */
  type;

  /**
   *
   * @param {number} galaxy
   * @param {number} system
   * @param {number} position
   * @param {number} type
   */
  constructor(galaxy, system, position, type) {
    this.galaxy = galaxy;
    this.system = system;
    this.position = position;
    this.type = type ?? 0;
  }

  get isMoon() {
    return this.type === COORDINATE_MOON;
  }

  get isDerbis() {
    return this.type === COORDINATE_DERBIS;
  }

  get isPlanet() {
    return this.type === COORDINATE_PLANET;
  }

  /**
   * @param {OGameCoordinate} o
   * @return {number}
   */
  compareTo(o) {
    return comparePosition(this, o);
  }

  /**
   * @param {OGameCoordinate} o
   * @return {boolean}
   */
  equalsTo(o) {
    return equals(this, o);
  }

  /**
   * @return {OGameCoordinateArray}
   */
  toArray() {
    return toArray(this);
  }

  /**
   * @return {number}
   */
  toNumber() {
    return toNumber(this, this.type);
  }
}
