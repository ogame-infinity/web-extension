import Player from "./player.js";
import { createDOM } from "./dom.js";
import { tooltip } from "./tooltip.js";
import { toFormattedNumber } from "./numbers.js";
import dateTime from "./dateTime.js";
import highlightTarget, { setHighlightCoords } from "./highlightTarget.js";
import player from "./player.js";

const rawUrl = new URL(window.location.href);
const page = rawUrl.searchParams.get("component") || rawUrl.searchParams.get("page");
const universe = window.location.host.replace(/\D/g, "");
const gameLang = document.querySelector('meta[name="ogame-language"]').getAttribute("content");
const res = JSON.parse(localStorage.getItem("ogk-data"));
const json = res || {};
let keepTooltip = json.keepTooltip || true;

function sendMessage(id) {
  if (json.tchat) {
    ogame.chat.loadChatLogWithPlayer(Number(id));
  } else {
    const url = new URLSearchParams({
      page: "chat",
      playerId: id,
    });

    document.location = `?${url.toString()}`;
  }
}

function generateIgnoreLink(playerId) {
  const url = new URLSearchParams({
    page: "ignorelist",
    action: 1,
    id: playerId,
  });

  return `?${url.toString()}`;
}

function generateBuddyLink(playerId) {
  const url = new URLSearchParams({
    page: "ingame",
    component: "buddies",
    action: 7,
    id: playerId,
    ajax: 1,
  });

  return `?${url.toString()}`;
}

function generateHighScoreLink(playerid) {
  const url = new URLSearchParams({
    page: "highscore",
    searchRelId: playerId,
  });

  return `?${url.toString()}`;
}

function generateMMORPGLink(playerid) {
  const lang = [
    "fr",
    "de",
    "en",
    "es",
    "pl",
    "it",
    "ru",
    "ar",
    "mx",
    "tr",
    "fi",
    "tw",
    "gr",
    "nl",
    "br",
    "hr",
    "sk",
    "cz",
    "ro",
    "us",
    "pt",
    "dk",
    "no",
    "se",
    "si",
    "hu",
    "jp",
    "ba",
  ].indexOf(gameLang);

  return `https://www.mmorpg-stat.eu/0_fiche_joueur.php?pays=${lang}&ftr=${playerid}.dat&univers=_${universe}`;
}

function generatePTRELink(playerId) {
  return `https://ptre.chez.gg/?country=${gameLang}&univers=${universe}&player_id=${playerId}`;
}

function generateGalaxyLink(coords, playerId = undefined) {
  const url = new URLSearchParams({
    page: "ingame",
    component: "galaxy",
    galaxy: coords[0],
    system: coords[1],
    position: coords[2],
    id: playerId,
  });

  return `?${url.toString()}`;
}

export function stalk(sender, player, delay = undefined) {
  let finalPlayer;
  const render = (player) => {
    finalPlayer = player;
    const content = createDOM("div");
    content.replaceChildren(
      createDOM("h1", { class: `${Player.status(player.status)}` }, `${player.name}`).appendChild(
        createDOM(
          "a",
          {
            href: `${generateHighScoreLink(player.id) || ""}`,
            class: "ogl-ranking",
          },
          ` #${player.points.position || "b"}`
        )
      ).parentElement,
      createDOM("hr", { style: "margin-bottom: 8px" })
    );
    const actions = content.appendChild(createDOM("div", { class: "ogi-actions" }));
    actions.replaceChildren(
      createDOM("a", { href: `${generateIgnoreLink(player.id)}`, class: "icon icon_against" }),
      createDOM("a", { href: `${generateBuddyLink(player.id)}`, class: "icon icon_user overlay buddyrequest" })
    );
    initBuddyRequestForm();
    const msgBtn = actions.appendChild(createDOM("a", { class: "icon icon_chat" }));
    msgBtn.addEventListener("click", () => {
      sendMessage(player.id);
    });
    const actBtn = actions.appendChild(createDOM("a", { style: "margin-left: 10px", class: "ogl-text-btn" }, "⚠"));
    let first = false;
    actBtn.addEventListener("mouseout", () => {
      keepTooltip = false;
    });
    actBtn.addEventListener("click", (e) => {
      // Add player to History in order to send his activities
      json.searchHistory.forEach((elem, i) => {
        if (elem.id === player.id) {
          json.searchHistory.splice(i, 1);
        }
      });
      json.searchHistory.push(player);
      if (json.searchHistory.length > 5) {
        json.searchHistory.shift();
      }

      localStorage.setItem("ogk-data", JSON.stringify(json));

      if (page !== "galaxy") {
        let coords = document
          .querySelector(".ogl-tooltip .ogl-stalkPlanets a.ogl-main")
          .getAttribute("data-coords")
          .split(":");

        location.href = generateGalaxyLink(coords, player.id);
      }

      if (keepTooltip) return;
      keepTooltip = true;

      let active = document.querySelectorAll(".ogl-tooltip .ogl-stalkPlanets a.ogl-active");
      active = active[active.length - 1];
      if (first && first.getAttribute("data-coords") === active.getAttribute("data-coords")) {
        return;
      }
      let next = active.nextElementSibling;
      if (!next) {
        next = document.querySelector(".ogl-tooltip .ogl-stalkPlanets a");
      }
      let splits = next.getAttribute("data-coords").split(":");
      document.getElementById("galaxy_input").value = splits[0];
      galaxy = document.getElementById("galaxy_input");

      document.getElementById("system_input").value = splits[1];
      system = document.getElementById("system_input");
      submitForm();
      if (!first) first = active;
      e.preventDefault();
      e.stopPropagation();
    });

    const date = content.appendChild(createDOM("span", { style: "margin-top: 2px;", class: "ogl-right ogl-date" }));
    content.appendChild(createDOM("hr"));
    const detailRank = content.appendChild(createDOM("div", { class: "ogl-detailRank" }));
    content.appendChild(createDOM("hr"));
    const list = content.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": player.id }));
    const count = content.appendChild(createDOM("div", { class: "ogl-fullGrid ogl-right" }));
    const sideStalk = content.appendChild(createDOM("a", { class: "ogl-pin" }));
    sideStalk.addEventListener("click", () => this.sideStalk(player.id));
    content.appendChild(
      createDOM(
        "a",
        {
          class: "ogl-mmorpgstats",
          href: generateMMORPGLink(player.id),
          target: generateMMORPGLink(player.id),
        },
        "P"
      )
    );

    if (json.options.ptreTK) {
      content.appendChild(
        createDOM(
          "a",
          { class: "ogl-ptre", href: generatePTRELink(player.id), target: generatePTRELink(player.id) },
          "P"
        )
      );
    }

    first = false;
    let pos = 0;
    if (page === "galaxy") {
      pos = sender.parentElement.parentElement.children[0].textContent;
    }
    page === "galaxy" ? (pos = { bottom: pos < 4, top: pos > 4 }) : (pos = {});
    tooltip(sender, content, false, pos, delay);
    const planets = update(player.planets, player.id);
    planets.forEach((e) => {
      return list.appendChild(e);
    });

    highlightTarget();

    date.textContent = dateTime.timeSince(new Date(player.lastUpdate));
    count.textContent = `${player.planets.length} planets`;
    const detailRankDiv1 = createDOM("div");
    detailRankDiv1.replaceChildren(
      createDOM("div", { class: "ogl-totalIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.points.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv2 = createDOM("div");
    detailRankDiv2.replaceChildren(
      createDOM("div", { class: "ogl-ecoIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.economy.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv3 = createDOM("div");
    detailRankDiv3.replaceChildren(
      createDOM("div", { class: "ogl-techIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.research.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv4 = createDOM("div");
    detailRankDiv4.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.military.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv5 = createDOM("div");
    detailRankDiv5.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon grey" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.def), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv6 = createDOM("div");
    detailRankDiv6.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon orange" }),
      document.createTextNode(` ${toFormattedNumber(Number(player.military.ships), null, true)} `),
      createDOM("small", {}, "ships")
    );
    detailRank.replaceChildren(
      detailRankDiv1,
      detailRankDiv2,
      detailRankDiv3,
      detailRankDiv4,
      detailRankDiv5,
      detailRankDiv6
    );
  };

  if (isNaN(Number(player))) {
    finalPlayer = player;
  }

  sender.addEventListener("ontouchstart" in document.documentElement ? "touchstart" : "mouseenter", () => {
    if (!finalPlayer) {
      Player.get(player).then((p) => {
        render(p);
      });
    } else {
      render(finalPlayer);
    }
  });

  if (rawUrl.searchParams.get("id") === player) {
    rawUrl.searchParams.delete("id");
    Player.get(player).then((p) => {
      render(p);
      document.querySelector(".ogl-tooltip").addEventListener("mouseover", () => {
        keepTooltip = false;
      });
      keepTooltip = true;
    });
  }
}

export function update(planets) {
  const sorted = Object.values(planets);

  sorted.sort((a, b) => {
    const coordsA = a.coords
      .split(":")
      .map((x) => x.padStart(3, "0"))
      .join("");
    const coordsB = b.coords
      .split(":")
      .map((x) => x.padStart(3, "0"))
      .join("");
    return coordsA - coordsB;
  });

  const domArr = [];
  const validIds = sorted.map((planet) => parseFloat(planet.id)).filter((id) => !isNaN(id));
  const mainId = Math.min(...validIds);

  sorted.forEach((planet) => {
    const coords = planet.coords.split(":");
    const a = createDOM("a");
    const planetDiv = a.appendChild(createDOM("div", { class: "ogl-planet-div" }));
    const planetIcon = planetDiv.appendChild(createDOM("div", { class: "ogl-planet" }));
    let panel = planetDiv.appendChild(createDOM("div", { class: "ogl-planet-hover" }));
    let plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));

    /*    plaspy.addEventListener("click", (e) => {
      // sendShipsWithPopup(6, coords[0], coords[1], coords[2], 0, json.spyProbes);
      // disable direct probing in stalks and target list until complete removal or GF start to wake up
      this.probingWarning();
      e.stopPropagation();
    }); */

    planetDiv.appendChild(createDOM("div", { class: "ogl-planet-act" }));
    a.appendChild(createDOM("span", {}, planet.coords));
    a.setAttribute("data-coords", planet.coords);

    if (planet.id === mainId) {
      a.classList.add("ogl-main");
      planetIcon.classList.add("ogl-active");
    }

    if (planet.deleted) {
      a.classList.add("ogl-deleted");
    } else if (planet.scanned) {
      a.classList.add("ogl-scan");
    }

    const moonDiv = a.appendChild(createDOM("div", { class: "ogl-moon-div" }));
    moonDiv.appendChild(createDOM("div", { class: "ogl-moon-act" }));
    const mIcon = moonDiv.appendChild(createDOM("div", { class: "ogl-moon" }));
    panel = moonDiv.appendChild(createDOM("div", { class: "ogl-moon-hover" }));
    plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));

    /*    plaspy.addEventListener("click", (e) => {
      // sendShipsWithPopup(6, coords[0], coords[1], coords[2], 3, json.spyProbes);
      // disable direct probing in stalks and target list until complete removal or GF start to wake up
      this.probingWarning();
      e.stopPropagation();
    }); */

    a.addEventListener("click", (event) => {
      if (window.getComputedStyle(document.getElementById("galaxyLoading")).display !== "none") return;
      const link = generateGalaxyLink(coords);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        window.open(link, "_blank");
      } else {
        if (page === "galaxy") {
          document.querySelector("#galaxy_input").value = coords[0];
          document.querySelector("#system_input").value = coords[1];
          submitForm();
          setHighlightCoords(coords.join(":"));
        } else window.location.href = link;
      }
    });

    if (planet.moon) {
      mIcon.classList.add("ogl-active");
      moonDiv.classList.add("ogl-active");
    }

    const targeted = json.markers[planet.coords];

    if (targeted) {
      a.classList.add("ogl-marked");
      a.setAttribute("data-marked", targeted.color);
    } else {
      a.classList.remove("ogl-marked");
      a.removeAttribute("data-marked");
    }

    domArr.push(a);
  });
  return domArr;
}

export function side(playerId) {
  if (playerId) {
    json.sideStalk.forEach((e, i, o) => {
      if (e === playerId) o.splice(i, 1);
    });

    json.sideStalk.push(playerId);

    if (json.sideStalk.length > 20) {
      json.sideStalk.shift();
    }

    localStorage.setItem("ogk-data", JSON.stringify(json));

    const last = json.sideStalk[json.sideStalk.length - 1];
    if (last) {
      playerId = last;
      let sideStalk = document.querySelector(".ogl-sideStalk");
      if (sideStalk) {
        sideStalk.remove();
      }
      sideStalk = document.querySelector("#links").appendChild(createDOM("div", { class: "ogl-sideStalk" }));
      let actBtn, watchlistBtn, ptreBtn;
      if (!json.options.sideStalkVisible) {
        sideStalk.classList.add("ogi-hidden");
        sideStalk.addEventListener("click", () => {
          json.options.sideStalkVisible = true;
          this.saveData();
          this.sideStalk();
        });
      } else {
        watchlistBtn = sideStalk.appendChild(
          createDOM("a", { class: "ogl-text-btn material-icons", title: "History" }, "history")
        );
        actBtn = sideStalk.appendChild(createDOM("a", { class: "ogl-text-btn material-icons", title: "" }, "warning"));
        if (json.options.ptreTK) {
          ptreBtn = sideStalk.appendChild(
            createDOM("a", { class: "ogl-text-btn ogl-ptre-acti tooltip", title: "Display PTRE data" }, "PTRE")
          );
        }
        const closeBtn = sideStalk.appendChild(
          createDOM(
            "span",
            { class: "ogl-text-btn material-icons ogi-sideStalk-minBtn", title: "Minimize" },
            "close_fullscreen"
          )
        );
        closeBtn.addEventListener("click", () => {
          json.options.sideStalkVisible = false;
          this.saveData();
          this.sideStalk();
        });
      }
      player.get(playerId).then((p) => {
        sideStalk.appendChild(
          createDOM("div", { style: "cursor: pointer", class: "ogi-title " + player.status(p.status) }, p.name)
        );
        sideStalk.appendChild(createDOM("hr"));
        let container = sideStalk.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": p.id }));
        let planets = update(p.planets);
        planets.forEach((dom) => container.appendChild(dom));

        this.highlightTarget();

        actBtn &&
          actBtn.addEventListener("click", () => {
            if (page !== "galaxy") {
              let coords = document
                .querySelector(".ogl-stalkPlanets a.ogl-main")
                .getAttribute("data-coords")
                .split(":");
              location.href = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
            }
            if ($("#galaxyLoading").is(":visible")) return;
            let active = sideStalk.querySelectorAll("a.ogl-active");
            let next = active.length > 0 ? active[active.length - 1].nextElementSibling : null;
            if (!next || !next.getAttribute("data-coords")) {
              next = sideStalk.querySelectorAll(".ogl-stalkPlanets a")[0];
            }
            let splits = next.getAttribute("data-coords").split(":");
            galaxy = document.getElementById("#galaxy_input").value = splits[0];
            system = document.getElementById("#system_input").value = splits[1];
            submitForm();
          });
        watchlistBtn &&
          watchlistBtn.addEventListener("click", () => {
            sideStalk.replaceChildren();
            sideStalk.appendChild(createDOM("div", { class: "title" }, "Historic " + json.sideStalk.length + "/20"));
            sideStalk.appendChild(createDOM("hr"));
            json.sideStalk
              .slice()
              .reverse()
              .forEach((id) => {
                player.get(id).then((player) => {
                  let playerDiv = sideStalk.appendChild(createDOM("div", { class: "ogl-player" }));
                  playerDiv.appendChild(createDOM("span", { class: player.status(player.status) }, player.name));
                  playerDiv.appendChild(createDOM("span", {}, "#" + player.points.position));
                  playerDiv.addEventListener("click", () => {
                    side(player.id);
                  });
                });
              });
          });

        if (ptreBtn) {
          ptreBtn.addEventListener("click", () => {
            this.loading();
            let inter = setInterval(() => {
              if (!this.isLoading) {
                clearInterval(inter);
                // this.ptreAction(null, p);
              }
            }, 20);
          });
        }
        container.appendChild(
          createDOM("div", { class: "ogl-right ogl-date" }, this.timeSince(new Date(p.lastUpdate)))
        );
      });
    }
  }
}
