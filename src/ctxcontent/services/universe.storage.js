import { fromNative, toNative } from "../../util/json.js";

const storageUniverseKeyBuilder = (universe, key) => `${universe}-${key}-information`;

/**
 * Saves the provided data to Chrome's local storage.
 * @template V
 * @param {string} universe - The universe associated with the data.
 * @param {string} key - The key associated with the data.
 * @return {(function(V): Promise<V>)|V} - Returns a promise that will be resolved with the provided data after
 * saving it in storage.
 */
export function universeStorageOperator(universe, key) {
  const universeStorageKey = storageUniverseKeyBuilder(universe, key);
  return async (data) => {
    chrome.storage.local.set({ [universeStorageKey]: toNative(data) }).then((_) => void 0);
    return data;
  };
}

/**
 * Retrieves data from Chrome's local storage.
 * @template V
 * @param {string} universe - The universe whose data is to be retrieved.
 * @param {string} key - The key whose data is to be retrieved.
 * @return {(function(): Promise<V|undefined>)|V} - Returns a promise that will be resolved with the retrieved data
 * or "undefined" if no data was found.
 */
export function universeStorageSupplier(universe, key) {
  const universeStorageKey = storageUniverseKeyBuilder(universe, key);
  return async () => {
    const result = await chrome.storage.local.get(universeStorageKey);
    if (Object.hasOwn(result, universeStorageKey)) {
      return fromNative(result[universeStorageKey]);
    }

    return undefined;
  };
}
