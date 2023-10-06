import { isPluginContext } from "./runContext.js";
import VERSION from "./version.js";

const APP_VERSION_STYLE = [
  "font-size:1em",
  "background-color:#195ee6",
  "color:#b9f4ff",
  "font-family:monospace",
  "border-radius:0.5em",
  "padding:0 0.5em",
].join(";");
const LOG_NAME_STYLE = [
  "font-size:1em",
  "background-color:#70ce37",
  "color:#16531e",
  "font-family:monospace",
  "border-radius:0.5em",
  "padding:0 0.5em",
  "margin-left:0.25em",
].join(";");

const importContest = isPluginContext() ? "📦" : "🌐";

/** @param {Function} on */
function print(on) {
  /**
   * @param {string} message
   * @param {any[]} data
   */
  return function (message, ...data) {
    const name = this.name ?? "";

    on.call(
      null,
      `%cOGame Infinity/v${VERSION}%c%s%c %s> ${message}`,
      APP_VERSION_STYLE,
      LOG_NAME_STYLE,
      name,
      "color: inherit",
      importContest,
      ...data
    );
  };
}

/**
 * @param {string} name
 * @constructor
 */
function Logger(name) {
  this.name = name;
  Object.freeze(this);
}

Logger.prototype.debug = print(console.debug);
Logger.prototype.error = print(console.error);
Logger.prototype.info = print(console.info);
Logger.prototype.log = print(console.log);
Logger.prototype.warn = print(console.warn);

let contextLogger = {
  undefined: new Logger(undefined),
};

/**
 * Get current logger context
 * @param {string?} name
 * @return {Logger}
 */
export const getLogger = (name = undefined) => {
  name = String(name);
  if (name === "undefined") {
    if (contextLogger[name] === undefined) {
      throw new Error("Main context logger is not initialized");
    }
    return contextLogger[name];
  }

  if (Object.hasOwn(contextLogger, String(name))) {
    return contextLogger[name];
  }

  contextLogger[name] = new Logger(name);
  return contextLogger[name];
};
