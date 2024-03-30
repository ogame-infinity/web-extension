/**
 *
 * @param {string} ISO 8601 format time string
 * @return {number} time in seconds
 */
export function getTimeFromISOString(string) {
    const regexString = string.match(/[a-z]+|[^a-z]+/gi);
    let time = 0;
    for (let i = 0; i < regexString.length; i++) {
      let number = Number(regexString[i]);
      if (!isNaN(number)) {
        if (regexString[i + 1] === "M") number *= 60;
        if (regexString[i + 1] === "H") number *= 60 * 60;
        if (regexString[i + 1] === "DT") number *= 60 * 60 * 24;
        time += number;
        i++;
      }
    }
    return time;
  }
  