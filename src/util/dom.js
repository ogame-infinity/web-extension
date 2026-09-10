export function createDOM(element, attributes, ...children) {
  const e = document.createElement(element);
  for (const key in attributes) {
    e.setAttribute(key, attributes[key]);
  }

  // children can be any number of elements or text strings, allowing easy chaining
  if (children.length > 0) {
    e.append(...children);
  }

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
