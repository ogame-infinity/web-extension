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

/**
 * **PLUGIN CONTEXT**
 *
 * @param {string} path
 * @param {()=>void} [onLoadCallback]
 * @param {boolean} [module=false]
 */
export function injectScript(path, onLoadCallback, module = false) {
  if (!isPluginContext()) {
    throw Error("Invalid execution context");
  }

  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = chrome.runtime.getURL(path);
  script.id = "ogi-script";
  script.setAttribute("data-base-uri", chrome.runtime.getURL("/"));

  if (module) {
    script.type = "module";
  }

  (document.head || document.documentElement).appendChild(script);
  script.onload = function () {
    script.remove();
    onLoadCallback && onLoadCallback();
  };
}
