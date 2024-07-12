export function createDOM(element, attributes, textContent) {
  const e = document.createElement(element);
  for (const key in attributes) {
    e.setAttribute(key, attributes[key]);
  }
  if (textContent) e.textContent = textContent;
  return e;
}

export function createSVG(element, attributes) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", element);
  for (const key in attributes) {
    e.setAttributeNS(null, key, attributes[key]);
  }
  return e;
}

export function createDOMFromString(text) {
  if (text.length <= 1e3) {
    const div = document.createElement("div");
    return div.insertAdjacentHTML("afterbegin", text);
  } else {
    return new window.DOMParser().parseFromString(string, "text/html");
  }
}
