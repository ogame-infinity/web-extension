const DATA_TYPE_KEY = "@DT";
const DATA_VALUE_KEY = "@v";

const _dtv = (k, v) => ({ [DATA_TYPE_KEY]: k, [DATA_VALUE_KEY]: v });

function _json_replacer(key, value) {
  if (value instanceof Map) {
    return _dtv("map", Array.from(value.entries()));
  } else if (value instanceof Set) {
    return _dtv("set", Array.from(value.values()));
  }

  return value;
}

function _json_reviver(key, value) {
  if (typeof value === "object" && value !== null && Object.hasOwn(value, DATA_TYPE_KEY)) {
    if (value[DATA_TYPE_KEY] === "map") {
      return new Map(value[DATA_VALUE_KEY]);
    } else if (value[DATA_TYPE_KEY] === "set") {
      return new Set(value[DATA_VALUE_KEY]);
    }
  }

  return value;
}

/**
 * Converts a JavaScript value to a JavaScript Object Notation (JSON) string.
 * @param {any} value A JavaScript value, usually an object or array, to be converted.
 * @param {string|number?} space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
 * @return {string}
 */
export function toJSON(value, space) {
  return JSON.stringify(value, _json_replacer, space);
}

/**
 * Converts a JavaScript Object Notation (JSON) string into an object.
 * @param text A valid JSON string.
 * @return {any}
 */
export function fromJSON(text) {
  return JSON.parse(text, _json_reviver);
}

/**
 * @param {any} value A JavaScript value, usually an object or array, to be converted.
 * @return {any}
 */
export function toNative(value) {
  const plain = toJSON(value);
  return JSON.parse(plain);
}

/**
 * @param native A valid native object to convert.
 * @return {*}
 */
export function fromNative(native) {
  const text = JSON.stringify(native);
  return fromJSON(text);
}
