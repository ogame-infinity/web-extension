import { createDOM } from "./dom.js";
import OGIData from "./OGIData.js";
import PlayerClass from "./enum/playerClass.js";

let playerClass = PlayerClass.NONE;

if (document.querySelector("#characterclass .explorer")) {
  playerClass = PlayerClass.EXPLORER;
} else if (document.querySelector("#characterclass .warrior")) {
  playerClass = PlayerClass.WARRIOR;
} else if (document.querySelector("#characterclass .miner")) {
  playerClass = PlayerClass.MINER;
}

export function popup(header, content) {
  let overlay = document.querySelector(".ogl-dialogOverlay");
  if (!overlay) {
    overlay = document.body.appendChild(createDOM("div", { class: "ogl-dialogOverlay" }));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && !OGIData.welcome) {
        overlay.classList.remove("ogl-active");
      }
    });
  }
  let dialog = overlay.querySelector(".ogl-dialog");
  if (!dialog) {
    dialog = overlay.appendChild(createDOM("div", { class: "ogl-dialog" }));
    let close = dialog.appendChild(createDOM("div", { class: "close-tooltip" }));
    close.addEventListener("click", () => {
      let welcome = OGIData.welcome;
      if (welcome) {
        welcome = false;
        OGIData.welcome = welcome;
        if (playerClass === PlayerClass.NONE) {
          window.location.href = "?page=ingame&component=characterclassselection";
        } else {
          window.location.href = "?page=ingame&component=overview";
        }
      }
      overlay.classList.remove("ogl-active");
    });
  }
  const top = dialog.querySelector("header") || dialog.appendChild(createDOM("header"));
  const body =
    dialog.querySelector(".ogl-dialogContent") || dialog.appendChild(createDOM("div", { class: "ogl-dialogContent" }));
  top.replaceChildren();
  body.replaceChildren();
  if (header) {
    top.appendChild(header);
  }
  if (content) {
    body.appendChild(content);
  }
  overlay.classList.add("ogl-active");
}
