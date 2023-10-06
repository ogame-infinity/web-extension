const expeditionsFile = chrome.runtime.getURL("assets/expeditions.tsv");
/** @type {Map<string, string>} */
const expeditionsMap = new Map();
/** @type {Map<string, string>} */
const logbooks = new Map();

fetch(expeditionsFile)
  .then((response) => response.text())
  .then((text) => {
    const lines = text.split("\n");
    const headers = lines.shift().split("\t");

    lines
      .reduce((inLines, line) => {
        inLines.push(line.split("\t"));
        return inLines;
      }, [])
      .forEach((splits) => {
        const type = splits.shift();
        splits.forEach((msg) => expeditionsMap.set(msg, type));
      });
  });

/**
 * @param {string} message
 * @return {{busy: boolean, type: string}}
 */
export function getExpeditionType(message) {
  const splits = message.split("\n\n");
  const logbook = splits[splits.length - 1];

  if (logbook.includes(":")) {
    splits.pop();
  }

  message = splits.join("\n\n");

  let result = { type: "Unknown", busy: false };
  let max = 0;
  let type = "";

  for (let [_text, _type] of expeditionsMap) {
    let sim = similarity(message, _text);
    if (sim > max) {
      max = sim;
      type = _type;
    }
  }

  if (max > 0.35) {
    result.type = type;
  }

  return result;
}

function similarity(s1, s2) {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function editDistance(s1, s2) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();
  const costs = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}
