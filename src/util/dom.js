export function createDOM(element, attributes, textContent) {
  const e = document.createElement(element);
  for (const key in attributes) {
    e.setAttribute(key, attributes[key]);
  }
  if (textContent) e.textContent = textContent;

  //if element is a select, and doesn't have dropdownInitialized claass, add it => it prevent Ogame restyling it
  if (element === "select" && !e.classList.contains("dropdownInitialized")) {
    e.classList.add("dropdownInitialized");
  }

  return e;
}

export function createSVG(element, attributes) {
  const e = document.createElementNS("http://www.w3.org/2000/svg", element);
  for (const key in attributes) {
    e.setAttributeNS(null, key, attributes[key]);
  }
  return e;
}
