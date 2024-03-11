import { createDOM } from "./dom.js";
import { tooltip } from "./tooltip.js";
import Player from "./player.js";

const colors = ["red", "orange", "yellow", "green", "blue", "violet", "gray", "brown"];

function add(coords, parent, id) {
  const res = JSON.parse(localStorage.getItem("ogk-data"));
  const json = res || {};
  const div = createDOM("div", { class: "ogl-colorChoice" });

  colors.forEach((color) => {
    const circle = div.appendChild(createDOM("div", { "data-marker": color }));
    div.appendChild(circle);
    if (json.markers[coords] && json.markers[coords].color === color) {
      circle.classList.add("ogl-active");
    }

    circle.addEventListener("click", () => {
      div.querySelectorAll("div[data-marker]").forEach((e) => e.classList.remove("ogl-active"));
      Player.get(id).then((player) => {
        div.setAttribute("data-coords", coords);
        if (json.markers[coords] && json.markers[coords].color === color) {
          delete json.markers[coords];
          if (parent.getAttribute("data-context") === "galaxy") {
            parent.closest(".galaxyRow").removeAttribute("data-marked");
          }
        } else {
          json.markers[coords] = json.markers[coords] || {};
          json.markers[coords].color = color;
          json.markers[coords].id = player.id;
          player.planets.forEach((planet) => {
            if (planet.coords === coords && planet.moon) {
              json.markers[coords].moon = true;
            }
          });
          circle.classList.add("ogl-active");
          if (parent.getAttribute("data-context") === "galaxy") {
            parent.closest(".galaxyRow").setAttribute("data-marked", color);
          }
        }
        document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
        document.querySelector(".ogl-targetIcon").classList.remove("ogl-targetsReady");

        localStorage.setItem("ogk-data", JSON.stringify(json));

        if (parent.getAttribute("data-context") !== "galaxy") {
          window.dispatchEvent(new CustomEvent("ogi-spyTableReload"));
        }

        if (json.options.targetList) {
          // this.targetList(false);
          // this.targetList(true);
        }

        // this.sideStalk();
      });
    });
  });

  parent.addEventListener("ontouchstart" in document.documentElement ? "touchstart" : "mouseenter", () => {
    tooltip(parent, div);
  });

  // this.markedPlayers = this.getMarkedPlayers(json.markers);
}

export default {
  add,
};
