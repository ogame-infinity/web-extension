import { createDOM } from "./dom.js";
import { tooltip } from "./tooltip.js";
import Player from "./player.js";
import OGIData from "./OGIData.js";
import * as stalk from "./stalk.js";

const colors = ["red", "orange", "yellow", "green", "blue", "violet", "gray", "brown"];

function add(coords, parent, id) {
  const div = createDOM("div", { class: "ogl-colorChoice" });
  const markers = OGIData.markers;

  colors.forEach((color) => {
    const circle = div.appendChild(createDOM("div", { "data-marker": color }));
    div.appendChild(circle);
    if (markers[coords] && markers[coords].color === color) {
      circle.classList.add("ogl-active");
    }

    circle.addEventListener("click", () => {
      div.querySelectorAll("div[data-marker]").forEach((e) => e.classList.remove("ogl-active"));
      Player.get(id).then((player) => {
        div.setAttribute("data-coords", coords);
        if (markers[coords] && markers[coords].color === color) {
          delete markers[coords];
          if (parent.getAttribute("data-context") === "galaxy") {
            parent.closest(".galaxyRow").removeAttribute("data-marked");
          }
        } else {
          markers[coords] = markers[coords] || {};
          markers[coords].color = color;
          markers[coords].id = player.id;
          player.planets.forEach((planet) => {
            if (planet.coords === coords && planet.moon) {
              markers[coords].moon = true;
            }
          });
          circle.classList.add("ogl-active");
          if (parent.getAttribute("data-context") === "galaxy") {
            parent.closest(".galaxyRow").setAttribute("data-marked", color);
          }
        }
        document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
        document.querySelector(".ogl-targetIcon").classList.remove("ogl-targetsReady");

        if (parent.getAttribute("data-context") !== "galaxy") {
          display(parent, coords);
        }

        OGIData.markers = markers;

        stalk.side();
      });
    });
  });

  parent.addEventListener("ontouchstart" in document.documentElement ? "touchstart" : "mouseenter", () => {
    tooltip(parent, div);
  });
}

function display(parent, coords) {
  const element = parent.closest("tr");
  if (OGIData.markers[coords]) {
    element.classList.add("ogl-marked");
    element.setAttribute("data-marked", OGIData.markers[coords].color);
  } else {
    element.classList.remove("ogl-marked");
    element.removeAttribute("data-marked");
  }
}

export default {
  add,
  display,
};
