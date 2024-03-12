import { getLogger } from "./logger.js";

const OGIObserver = function () {
  const logger = getLogger("OGI - Observer");

  const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

  return (element, callback, options) => {
    if (!element || element.nodeType !== 1) return;

    options = {
      ...{ childList: true, subtree: true },
      ...options,
    };

    const observer = new MutationObserver(callback);

    logger.log(" Observer started ", { element });

    observer.observe(element, options);

    return observer;
  };
};

export default OGIObserver;
