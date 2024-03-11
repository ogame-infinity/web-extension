const domParser = new DOMParser();

const abortController = new AbortController();
window.onbeforeunload = () => abortController.abort();

/** @template T */
export class FetchResponse {
  /** @type {T} */
  document;
  /** @type {Headers}  */
  headers;
  /** @type {number} */
  #expirationTimestamp = -1;

  /**
   * @param {T} document
   * @param {Headers} headers
   */
  constructor(document, headers) {
    this.document = document;
    this.headers = headers;

    if (headers.has("Expires")) {
      this.#expirationTimestamp = new Date(headers.get("Expires")).getTime();
    }
  }

  /** @return {number} */
  get expires() {
    return this.#expirationTimestamp;
  }
}

/**
 * @param {RequestInfo|URL} input
 * @param {RequestInit} [init]
 * @return {Promise<FetchResponse<Document>>}
 */
export function fetchXml(input, init) {
  init = fixInit(init);
  return fetch(input, init).then(async (response) => {
    return new FetchResponse(domParser.parseFromString(await response.text(), "text/xml"), response.headers);
  });
}

/**
 * @param {RequestInfo|URL} input
 * @param {RequestInit} [init]
 * @return {Promise<FetchResponse<Object>>}
 */
export function fetchJson(input, init) {
  init = fixInit(init);
  return fetch(input, init).then(async (response) => {
    return new FetchResponse(await response.json(), response.headers);
  });
}

/**
 *
 * @param {RequestInit} init
 * @return {RequestInit}
 */
function fixInit(init) {
  if (!init) {
    return {
      signal: abortController.signal,
      cache: "default",
    };
  }

  if (!Object.hasOwn(init, "signal")) {
    init.signal = abortController.signal;
  }

  if (!Object.hasOwn(init, "cache")) {
    init.cache = "default";
  }

  return init;
}
