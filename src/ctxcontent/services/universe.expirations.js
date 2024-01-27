import { fromNative, toNative } from "../../util/json.js";

/**
 * @type {Map<string, Map<string, number>>}
 * @private
 */
const _temp = new Map();

const expiryUniverseKeyBuilder = (universe) => `${universe}-expirations`;

/**
 * @param {string} universeExpiryKey
 * @param {string} expiryName
 * @return {function(Object): undefined|number}
 * @private
 */
const _fetchTimestamp = (universeExpiryKey, expiryName) => {
  return (result) => {
    if (!Object.hasOwn(result, universeExpiryKey)) {
      return undefined;
    }

    /** @type {Map<string, number>} */
    const expirations = fromNative(result[universeExpiryKey]);
    _temp.set(universeExpiryKey, expirations);
    return expirations.get(expiryName);
  };
};

/**
 * Function to check if a universe has expired key.
 * @param {string} universe
 * @param {string} name
 * @return {Promise<boolean>}
 */
export function isUniverseExpired(universe, name) {
  const universeExpiryName = expiryUniverseKeyBuilder(universe);

  if (_temp.has(universeExpiryName) && _temp.get(universeExpiryName).has(name)) {
    const now = new Date().getTime();
    return Promise.resolve(now > _temp.get(universeExpiryName).get(name));
  }

  return chrome.storage.local
    .get(uni)
    .then(_fetchTimestamp(universeExpiryName, name), (_) => undefined)
    .then((expiryTimestamp) => {
      if (!expiryTimestamp) {
        return true;
      }
      const now = new Date().getTime();
      return now > expiryTimestamp;
    });
}

/**
 * Function to set an expiry date for a universe key
 * @param {string} universe
 * @param {string} key
 * @param {number|Date} date
 * @return {Promise<void>}
 */
export async function setUniverseExpiration(universe, key, date) {
  const universeExpiryName = expiryUniverseKeyBuilder(universe);

  const timestamp = Number(date);
  if (!_temp.has(universeExpiryName)) {
    _temp.set(universeExpiryName, new Map());
  }

  _temp.get(universeExpiryName).set(key, timestamp);
  chrome.storage.local.set({ [universe]: toNative(_temp.get(universe)) }).then((_) => void 0);
}

/**
 * Function to set the Time to Live (TTL) for a universe's expiration key.
 * @param {string} universe
 * @param {string} key
 * @param {number} ttl
 * @return {Promise<void>}
 */
export function setUniverseExpirationTTL(universe, key, ttl) {
  const date = new Date().getTime() + ttl;
  return setUniverseExpiration(universe, key, date);
}
