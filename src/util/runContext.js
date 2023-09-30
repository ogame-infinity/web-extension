export function isFirefox() {
  return navigator.userAgent.indexOf("Firefox") > 0;
}

export function isChrome() {
  return navigator.userAgent.indexOf("Chrome") > 0;
}

/**
 * @return {boolean} true: plugin context, false: page context
 */
export function isPluginContext() {
  if (isChrome()) {
    return typeof chrome !== "undefined" && chrome.runtime;
  } else if (isFirefox()) {
    return typeof browser !== "undefined" && browser.runtime;
  }

  throw Error("It is not possible to identify the execution context");
}
