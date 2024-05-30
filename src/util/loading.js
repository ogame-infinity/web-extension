import { createDOM, createSVG } from "./dom.js";
import { popup } from "./popup.js";

export function loading() {
  const svg = createSVG("svg", {
    width: "200px",
    height: "100px",
    viewBox: "0 0 187.3 93.7",
    preserveAspectRatio: "xMidYMid meet",
  });
  svg.append(
    createSVG("path", {
      stroke: "#3c536c",
      id: "outline",
      fill: "none",
      "stroke-width": "4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "10",
      d:
        "M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
        "3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
    }),
    createSVG("path", {
      opacity: "0.1",
      stroke: "#eee",
      id: "outline-bg",
      fill: "none",
      "stroke-width": "4",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "stroke-miterlimit": "10",
      d:
        "M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
        "3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
    })
  );
  const body = createDOM("div", { id: "ogk-loadingDialog" });
  const text = createDOM("small", {}, "Loading data. Please, wait...");
  body.append(svg, text);
  popup(null, body);
}
