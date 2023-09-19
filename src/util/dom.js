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
