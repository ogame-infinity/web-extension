import { createDOM } from "./dom.js";
import { tooltip } from "./tooltip.js";
import Player from "./player.js";
import OGIData from "./OGIData.js";
import * as stalk from "./stalk.js";

const colors = ["red", "orange", "yellow", "green", "blue", "violet", "gray", "brown"];

function addPlayer(parent, playerId) {
  const div = createDOM("div", { class: "ogl-colorChoice" });
  const playerMarkers = OGIData.playerMarkers;

  colors.forEach((color) => {
    const circle = div.appendChild(createDOM("div", { "data-marker": color }));
    div.appendChild(circle);

    if (playerMarkers[playerId] && playerMarkers[playerId].color === color) {
      circle.classList.add("ogl-active");
    }

    circle.addEventListener("click", () => {
      div.querySelectorAll("div[data-marker]").forEach((e) => e.classList.remove("ogl-active"));
      Player.get(playerId).then((player) => {
        
        if (playerMarkers[playerId] && playerMarkers[playerId].color === color) {

          // Remove marker for player
          delete playerMarkers[playerId];

          //remove markers for each planet is marked with the same color (colors can be overridden)
          const coordsMarkers = OGIData.markers;
          player.planets.forEach((planet) => {
            coordsMarkers[planet.coords] = coordsMarkers[planet.coords] || {};

            // if marker is set at these coords and is the same color and player
            if(coordsMarkers[planet.coords].color === color && coordsMarkers[planet.coords].id === playerId) {
              delete coordsMarkers[planet.coords];
            }
          });
          OGIData.markers = coordsMarkers;

          // Update UI
          if (parent.getAttribute("data-context") === "players-highscore") {
            parent.closest(".ogi-ready").removeAttribute("data-marked");
          }
        } else {
          // Add marker for player
          playerMarkers[playerId] = playerMarkers[playerId] || {};
          playerMarkers[playerId].color = color;
                  
          /// Set markers for each planet
          const coordsMarkers = OGIData.markers;
          player.planets.forEach((planet) => {
            coordsMarkers[planet.coords] = coordsMarkers[planet.coords] || {};
            coordsMarkers[planet.coords].id = playerId;
            coordsMarkers[planet.coords].color = color;
            coordsMarkers[planet.coords].moon = planet.moon !== null && planet.moon !== undefined;
          });
          OGIData.markers = coordsMarkers;

          // Update UI
          circle.classList.add("ogl-active");
          if (parent.getAttribute("data-context") === "galaxy") {
            parent.closest(".galaxyRow").setAttribute("data-marked", color);
          }
        }
        document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
        document.querySelector(".ogl-targetIcon").classList.remove("ogl-targetsReady");

        if (parent.getAttribute("data-context") !== "galaxy") {
          displayPlayer(parent, playerId);
        }

        OGIData.playerMarkers = playerMarkers;

        stalk.side();
      });
    });
  });

  parent.addEventListener("ontouchstart" in document.documentElement ? "touchstart" : "mouseenter", () => {
    tooltip(parent, div);
  });
}

function displayPlayer(parent, id) {
  const element = parent.closest("tr");

  const playerMarkers = OGIData.playerMarkers;
  if (playerMarkers[id]) {
    element.classList.add("ogl-marked");
    element.setAttribute("data-marked", playerMarkers[id].color);
  } else {
    element.classList.remove("ogl-marked");
    element.removeAttribute("data-marked");
  }
}


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
  addPlayer,
  display,
};
