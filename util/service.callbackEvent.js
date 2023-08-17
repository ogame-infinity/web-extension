/*
 * This module implements the functionality to send a request from the page
 * context to the extension context and get a response from it.
 */

/** @type {string} */
let callbackToken = undefined;
const DATASET_NAME = "ogiCallbackEventToken";

function _createToken() {
  return (Math.floor(Math.random() * 0xffffffffffff) + 1e6).toString(16).padStart(12, "0");
}

function _buildRefererEvent(referer) {
  return DATASET_NAME.concat(callbackToken).concat("-").concat(referer);
}

/**
 * @typedef {object} RequestCallbackEvent
 * @property {string} referer - Unique request identifier
 * @property {string} command - Main command
 * @property {string} action - Callback to execute
 * @property {(string|number|boolean|undefined)[]} args - Arguments
 */

/**
 * @typedef {object} ResponseCallbackEvent
 * @property {boolean} success - Indicates if callback execution is success or not
 * @property {string} referer - Unique request identifier
 * @property {any} response - Result of callback execution
 */

/** @typedef {{[action:string]: Function}} CallbackCommandActionMap */
/** @typedef {{[command:string] : CallbackCommandActionMap}} CallbackCommandMap */

class CallbackRouter {
  #callbackCommandMap;

  /**
   * @param {CallbackCommandMap} callbackCommandMap
   */
  constructor(callbackCommandMap) {
    this.#callbackCommandMap = callbackCommandMap;
  }

  /**
   *
   * @param {RequestCallbackEvent} request
   * @return {CallbackCommandActionMap | undefined}
   */
  #getAction(request) {
    return Object.hasOwn(this.#callbackCommandMap, request.command) &&
      Object.hasOwn(this.#callbackCommandMap[request.command], request.action)
      ? this.#callbackCommandMap[request.command][request.action]
      : undefined;
  }

  /**
   *
   * @param {RequestCallbackEvent} request
   * @return {Promise<ResponseCallbackEvent>}
   */
  async resolve(request) {
    if (!this.#getAction(request)) {
      return { referer: request.referer, success: false, response: "Request callback not found" };
    }

    let success = true;
    let response;

    try {
      response = await this.#callbackCommandMap[request.command][request.action].call(
        this.#callbackCommandMap[request.command],
        ...request.args
      );
    } catch (e) {
      success = false;
      response = String(e);
    }

    return { referer: request.referer, success, response };
  }
}

/**
 * @param {CallbackCommandMap} callbackCommandMap
 */
export function contentContextInit(callbackCommandMap) {
  if (!chrome.runtime) {
    throw new Error("Invalid context execution");
  }

  if (Boolean(document.documentElement.dataset[DATASET_NAME]) === true) {
    throw new Error("service callback event is already initialized");
  }

  const router = new CallbackRouter(callbackCommandMap);

  callbackToken = _createToken();
  document.documentElement.dataset[DATASET_NAME] = callbackToken;
  document.addEventListener(DATASET_NAME.concat(callbackToken), (eRequest) => {
    router.resolve(eRequest.detail).then((response) => {
      const eResponse = new CustomEvent(_buildRefererEvent(response.referer), { detail: response });
      document.dispatchEvent(eResponse);
    });
  });
}

export function pageContextInit() {
  if (chrome.runtime) {
    throw new Error("Invalid context execution");
  }

  if (!document.documentElement.dataset[DATASET_NAME]) {
    throw new Error("service callback event is not initialized");
  }

  callbackToken = document.documentElement.dataset[DATASET_NAME];
  document.documentElement.dataset[DATASET_NAME] = "1";
}

/**
 * @param {string} command
 * @param {string }action
 * @param {any[]} args
 * @return {Promise<ResponseCallbackEvent>}
 */
export function pageContextRequest(command, action, ...args) {
  return new Promise((resolve, reject) => {
    /** @type {RequestCallbackEvent} */
    const detail = {
      referer: `${_createToken()}[${command}.${action}]`,
      command,
      action,
      args: args,
    };

    document.addEventListener(
      _buildRefererEvent(detail.referer),
      function (evt) {
        /** @type {ResponseCallbackEvent} */
        const detail = evt.detail;
        detail.success ? resolve(detail) : reject(detail);
      },
      { once: true }
    );

    const eRequest = new CustomEvent(DATASET_NAME.concat(callbackToken), { detail });
    document.dispatchEvent(eRequest);
  });
}
