/**
 *
 * @param {()=>boolean} predicateCallback
 * @param {number} checkIntervals time in milliseconds between each revision of the predicate being satisfied
 * @param {number} timeout waiting time in milliseconds to reject waiting
 * @return {Promise<boolean>}
 */
export function waitFor(predicateCallback, checkIntervals = 10, timeout = -1) {
  return new Promise((resolve, reject) => {
    let timeoutId = NaN;
    const intervalId = setInterval(() => {
      if (predicateCallback()) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        resolve(true);
      }
    }, checkIntervals);

    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        reject(new Error("Wait for timeout exception"));
      }, timeout);
    }
  });
}

/**
 *
 * @param {object} object The JavaScript object instance to test
 * @param {PropertyKey} propertyKey The String name or Symbol  of the property to test.
 * @param {number} checkIntervals time in milliseconds between each revision of the predicate being satisfied
 * @param {number} timeout waiting time in milliseconds to reject waiting
 * @return {Promise<boolean>}
 */
export function waitForDefinition(object, propertyKey, checkIntervals = 10, timeout = 5e3) {
  return waitFor(() => Object.hasOwn(object, propertyKey), checkIntervals, timeout);
}

/**
 *
 * @param selector A group of selectors  to match the descendant elements of the Element baseElement against;
 *  this must be valid CSS syntax, or a SyntaxError exception will occur.
 *  The first element found which matches this group of selectors stops the awaiting.
 * @param {number} checkIntervals time in milliseconds between each revision of the predicate being satisfied
 * @param {number} timeout waiting time in milliseconds to reject waiting
 * @return {Promise<boolean>}
 */
export function waitForQuerySelector(selector, checkIntervals = 10, timeout = 5e3) {
  return waitFor(() => document.querySelector(selector) !== null, checkIntervals, timeout);
}
