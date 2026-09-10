import Player from "./player.js";
import { createDOM } from "./dom.js";
import { tooltip } from "./tooltip.js";
import { toFormattedNumber } from "./numbers.js";
import dateTime from "./dateTime.js";
import highlightTarget, { setHighlightCoords } from "./highlightTarget.js";
import player from "./player.js";
import OgamePageData from "./OgamePageData.js";
import OGIData from "./OGIData.js";
import { loading } from "./loading.js";
import { action } from "./ptre.js";
import Translator from "./translate.js";

const rawUrl = new URL(window.location.href);
const page = rawUrl.searchParams.get("component") || rawUrl.searchParams.get("page");
const universe = window.location.host.replace(/\D/g, "");
let keepTooltip = OGIData.keepTooltip || true;
let undoSideStalkRemoval = null;
let undoSideStalkTimer = null;

const SIDE_STALK_UNDO_DURATION = 6000;
const SIDE_STALK_UNDO_FADE_DURATION = 300;

function sendMessage(id) {
  if (OGIData.tchat) {
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
    page: "ingame",
    component: "highscore",
    searchRelId: playerid,
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
    "br",
    "nl",
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
  ].indexOf(OgamePageData.gameLang);

  return `https://www.mmorpg-stat.eu/0_fiche_joueur.php?pays=${lang}&ftr=${playerid}.dat&univers=_${universe}`;
}

function generatePTRELink(playerId) {
  return `https://ptre.chez.gg/?country=${OgamePageData.gameLang}&univers=${universe}&player_id=${playerId}`;
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

function getRemovedFromHistoricText(playerName) {
  return Translator.translate(226).replace("{player}", playerName);
}

function removeSideStalkPlayer(playerId) {
  playerId = parseInt(playerId);
  const sideStalk = OGIData.sideStalk.slice();
  const index = sideStalk.indexOf(playerId);

  if (index === -1) return null;

  sideStalk.splice(index, 1);
  OGIData.sideStalk = sideStalk;

  return { playerId, index };
}

function restoreSideStalkPlayer(removedPlayer) {
  const sideStalk = OGIData.sideStalk.slice();

  if (!removedPlayer || sideStalk.includes(removedPlayer.playerId)) return;

  sideStalk.splice(removedPlayer.index, 0, removedPlayer.playerId);
  OGIData.sideStalk = sideStalk;
}

function clearSideStalkUndo(resetRemoval = true) {
  if (undoSideStalkTimer) clearTimeout(undoSideStalkTimer);
  undoSideStalkTimer = null;
  if (resetRemoval) undoSideStalkRemoval = null;
}

function getHistoricTitle(sideStalk) {
  return Array.from(sideStalk.children).find((child) => child.classList.contains("title"));
}

function updateHistoricTitle(sideStalk) {
  const title = getHistoricTitle(sideStalk);

  if (title) title.textContent = "Historic " + OGIData.sideStalk.length + "/20";
}

function removeHistoricEmptyState(list) {
  list.querySelector(".ogi-sideStalkEmpty")?.remove();
}

function ensureHistoricEmptyState(list) {
  if (OGIData.sideStalk.length || list.querySelector(".ogi-sideStalkUndo, .ogi-sideStalkEmpty")) return;

  list.appendChild(createDOM("div", { class: "ogi-sideStalkEmpty" }, Translator.translate(228)));
}

function removeExistingSideStalkUndo(sideStalk) {
  sideStalk.querySelectorAll(".ogi-sideStalkUndo").forEach((undo) => undo.remove());
}

function showSideStalkUndo(list, playerName) {
  clearSideStalkUndo(false);
  removeHistoricEmptyState(list);

  const undo = list.querySelector(".ogi-sideStalkUndo") || list.appendChild(createSideStalkUndoRow(playerName));

  undo.querySelector(".ogi-sideStalkUndoButton").addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    restoreSideStalkPlayer(undoSideStalkRemoval);
    clearSideStalkUndo();
    renderHistoricList(list.closest(".ogl-sideStalk"));
  });

  undoSideStalkTimer = setTimeout(() => {
    undo.classList.add("ogi-removing");
    undoSideStalkTimer = setTimeout(() => {
      undo.remove();
      clearSideStalkUndo();
      ensureHistoricEmptyState(list);
    }, SIDE_STALK_UNDO_FADE_DURATION);
  }, SIDE_STALK_UNDO_DURATION);
}

function createSideStalkUndoRow(playerName) {
  const undo = createDOM("div", { class: "ogl-player ogi-sideStalkUndo" });
  undo.appendChild(createDOM("span", { class: "ogi-sideStalkUndoMessage" }, getRemovedFromHistoricText(playerName)));
  undo.appendChild(
    createDOM("button", { class: "ogi-sideStalkUndoButton", type: "button" }, Translator.translate(227))
  );

  return undo;
}

function removeSideStalkPlayerWithFeedback(playerId, playerName, sideStalk, showUndoOnTop = false, playerRow = null) {
  const removedPlayer = removeSideStalkPlayer(playerId);

  if (!removedPlayer) return;

  undoSideStalkRemoval = removedPlayer;

  if (!showUndoOnTop && playerRow?.isConnected && playerRow.closest(".ogl-sideStalk") === sideStalk) {
    const list = playerRow.closest(".ogi-sideStalkList");

    if (list) {
      removeExistingSideStalkUndo(sideStalk);
      removeHistoricEmptyState(list);
      playerRow.replaceWith(createSideStalkUndoRow(playerName));
      updateHistoricTitle(sideStalk);
      showSideStalkUndo(list, playerName);
      return;
    }
  }

  const list = renderHistoricList(sideStalk, { playerName, index: removedPlayer.index, showOnTop: showUndoOnTop });
  showSideStalkUndo(list, playerName);
}

function renderHistoricList(sideStalk, undoRow = null) {
  sideStalk.replaceChildren();
  sideStalk.appendChild(createDOM("div", { class: "title" }, "Historic " + OGIData.sideStalk.length + "/20"));
  sideStalk.appendChild(createDOM("hr"));

  const list = sideStalk.appendChild(createDOM("div", { class: "ogi-sideStalkList" }));

  if (undoRow?.showOnTop) {
    list.appendChild(createSideStalkUndoRow(undoRow.playerName));
  }

  if (!OGIData.sideStalk.length) {
    list.appendChild(createDOM("div", { class: "ogi-sideStalkEmpty" }, Translator.translate(228)));
    return list;
  }

  OGIData.sideStalk
    .slice()
    .reverse()
    .forEach((id, visualIndex) => {
      if (undoRow && !undoRow.showOnTop && visualIndex === OGIData.sideStalk.length - undoRow.index) {
        list.appendChild(createSideStalkUndoRow(undoRow.playerName));
      }

      const playerDiv = list.appendChild(createDOM("div", { class: "ogl-player" }));
      player.get(id).then((p) => {
        if (!OGIData.sideStalk.includes(parseInt(p.id))) {
          playerDiv.remove();
          return;
        }

        playerDiv.appendChild(createDOM("span", { class: player.status(p.status) }, p.name));
        const actions = playerDiv.appendChild(createDOM("span", { class: "ogi-sideStalkPlayerActions" }));
        actions.appendChild(createDOM("span", { class: "ogi-sideStalkRank" }, "#" + p.points.position));
        const removeBtn = actions.appendChild(
          createDOM("button", {
            class: "icon icon_trash tooltip ogi-sideStalkRemove",
            title: Translator.translate(225),
            "aria-label": Translator.translate(225),
            type: "button",
          })
        );

        playerDiv.addEventListener("click", () => {
          side(p.id);
        });
        removeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          removeSideStalkPlayerWithFeedback(p.id, p.name, sideStalk, false, playerDiv);
        });
      });
    });

  if (undoRow && !undoRow.showOnTop && undoRow.index === 0) {
    list.appendChild(createSideStalkUndoRow(undoRow.playerName));
  }

  return list;
}

export function stalk(sender, player, delay = undefined) {
  let finalPlayer;
  const render = (p) => {
    finalPlayer = p;
    const content = createDOM("div");
    content.replaceChildren(
      createDOM("h1", { class: `${Player.status(p.status)}` }, `${p.name}`).appendChild(
        createDOM(
          "a",
          {
            href: `${generateHighScoreLink(p.id) || ""}`,
            class: "ogl-ranking",
          },
          ` #${p.points.position || "b"}`
        )
      ).parentElement,
      createDOM("hr", { style: "margin-bottom: 8px" })
    );
    const actions = content.appendChild(createDOM("div", { class: "ogi-actions" }));
    actions.replaceChildren(
      createDOM("a", { href: `${generateIgnoreLink(p.id)}`, class: "icon icon_against" }),
      createDOM("a", { href: `${generateBuddyLink(p.id)}`, class: "icon icon_user overlay buddyrequest" })
    );
    initBuddyRequestForm();
    const msgBtn = actions.appendChild(createDOM("a", { class: "icon icon_chat" }));
    msgBtn.addEventListener("click", () => {
      sendMessage(p.id);
    });
    const actBtn = actions.appendChild(createDOM("a", { style: "margin-left: 10px", class: "ogl-text-btn" }, "⚠"));
    let first = false;
    actBtn.addEventListener("click", (e) => {
      const searchHistory = OGIData.searchHistory;

      // Add player to History in order to send his activities
      searchHistory.forEach((elem, i) => {
        if (elem.id === p.id) {
          searchHistory.splice(i, 1);
        }
      });
      searchHistory.push(p);
      if (searchHistory.length > 5) {
        searchHistory.shift();
      }

      OGIData.searchHistory = searchHistory;

      keepTooltip = true;
      OGIData.keepTooltip = keepTooltip;

      if (page !== "galaxy") {
        let coords = document
          .querySelector(".ogl-tooltip .ogl-stalkPlanets a.ogl-main")
          .getAttribute("data-coords")
          .split(":");

        location.href = generateGalaxyLink(coords, p.id);
        return;
      }

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
    const list = content.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": p.id }));
    const count = content.appendChild(createDOM("div", { class: "ogl-fullGrid ogl-right" }));
    const sideStalk = content.appendChild(createDOM("a", { class: "ogl-pin" }));
    if (OGIData.sideStalk.includes(parseInt(p.id))) {
      sideStalk.classList.add("ogl-active");
    }
    sideStalk.addEventListener("click", () => side(p.id));
    content.appendChild(
      createDOM(
        "a",
        {
          class: "ogl-mmorpgstats",
          href: generateMMORPGLink(p.id),
          target: generateMMORPGLink(p.id),
        },
        "P"
      )
    );

    if (OGIData.options.ptreTK) {
      content.appendChild(
        createDOM("a", { class: "ogl-ptre", href: generatePTRELink(p.id), target: generatePTRELink(p.id) }, "P")
      );
    }

    first = false;
    let pos = 0;
    if (page === "galaxy") {
      pos = sender.parentElement.parentElement.children[0].textContent;
    }
    page === "galaxy" ? (pos = { bottom: pos < 4, top: pos > 4 }) : (pos = {});
    tooltip(sender, content, false, pos, delay);

    //at tooltip creation, we need to check if the player has a color assigned
    //and if so, we need to assign the same color to all planets of this player
    const playerMarkers = OGIData.playerMarkers;
    if (playerMarkers[p.id] && playerMarkers[p.id].color) {
      let hadCoordsMarkerHanged = false;
      const coordsMarkers = OGIData.markers;
      p.planets.forEach((planet) => {
        //check if the planet is deleted, if so, we don't need to assign a color
        //we need to remove the marker from the coordsMarkers
        if (planet.deleted) {
          if (coordsMarkers[planet.coords]) {
            delete coordsMarkers[planet.coords];
            hadCoordsMarkerHanged = true;
          } else return;
        }
        //check if the planet has a color assigned, or if ther planet is not assigned to the right player
        //if not, we need to assign the same color as the player
        else if (!coordsMarkers[planet.coords] || coordsMarkers[planet.coords].id !== p.id) {
          coordsMarkers[planet.coords] = coordsMarkers[planet.coords] || {};
          coordsMarkers[planet.coords].id = p.id;
          coordsMarkers[planet.coords].color = playerMarkers[p.id].color;
          coordsMarkers[planet.coords].moon = planet.moon !== null && planet.moon !== undefined;
          hadCoordsMarkerHanged = true;
        }
      });
      //if we had to change the color of the planets, we need to update the markers
      if (hadCoordsMarkerHanged) {
        OGIData.markers = coordsMarkers;
      }
    }

    const planets = update(p.planets, p.id);
    planets.forEach((e) => {
      return list.appendChild(e);
    });

    highlightTarget();

    date.textContent = dateTime.timeSince(new Date(p.lastUpdate));
    count.textContent = `${p.planets.length} planets`;
    const detailRankDiv1 = createDOM("div");
    detailRankDiv1.replaceChildren(
      createDOM("div", { class: "ogl-totalIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.points.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv2 = createDOM("div");
    detailRankDiv2.replaceChildren(
      createDOM("div", { class: "ogl-ecoIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.economy.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv3 = createDOM("div");
    detailRankDiv3.replaceChildren(
      createDOM("div", { class: "ogl-techIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.research.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv4 = createDOM("div");
    detailRankDiv4.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.military.score), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv5 = createDOM("div");
    detailRankDiv5.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon grey" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.def), null, true)} `),
      createDOM("small", {}, "pts")
    );
    const detailRankDiv6 = createDOM("div");
    detailRankDiv6.replaceChildren(
      createDOM("div", { class: "ogl-fleetIcon orange" }),
      document.createTextNode(` ${toFormattedNumber(Number(p.military.ships), null, true)} `),
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

        OGIData.keepTooltip = keepTooltip;
      });
      keepTooltip = true;

      OGIData.keepTooltip = keepTooltip;
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
      if (
        document.getElementById("galaxyLoading") &&
        window.getComputedStyle(document.getElementById("galaxyLoading")).display !== "none"
      )
        return;
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

    const targeted = OGIData.markers[planet.coords];

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

function getVisibleSideStalkPlanetCount(container) {
  return Array.from(container.children).filter(
    (planet) => planet.tagName === "A" && !Array.from(planet.classList).some((className) => /delete/i.test(className))
  ).length;
}

function updateSideStalkPlayerTitle(playerTitle, playerName, container) {
  const planetCount = getVisibleSideStalkPlanetCount(container);
  const playerTitleText = `${playerName} - [${planetCount}]`;

  playerTitle.textContent = playerTitleText;
  playerTitle.title = playerTitleText;
}

function observeSideStalkPlayerTitle(playerTitle, playerName, container) {
  const shouldUpdateTitle = (mutation) => {
    if (mutation.type === "childList" && mutation.target === container) {
      return Array.from(mutation.addedNodes)
        .concat(Array.from(mutation.removedNodes))
        .some((node) => node.tagName === "A");
    }

    return (
      mutation.type === "attributes" && mutation.target.parentElement === container && mutation.target.tagName === "A"
    );
  };

  const observer = new MutationObserver((mutations) => {
    if (!container.isConnected) {
      observer.disconnect();
      return;
    }

    if (mutations.some(shouldUpdateTitle)) {
      updateSideStalkPlayerTitle(playerTitle, playerName, container);
    }
  });

  observer.observe(container, {
    childList: true,
    attributes: true,
    attributeFilter: ["class"],
    subtree: true,
  });
}

export function side(playerId) {
  const sideStalk = OGIData.sideStalk;
  if (playerId) {
    playerId = parseInt(playerId);

    sideStalk.forEach((e, i, o) => {
      if (e === playerId) o.splice(i, 1);
    });

    sideStalk.push(playerId);

    if (sideStalk.length > 20) {
      sideStalk.shift();
    }

    OGIData.sideStalk = sideStalk;
  }

  const last = sideStalk[sideStalk.length - 1];
  if (last) {
    playerId = last;
    let sideStalk = document.querySelector(".ogl-sideStalk");
    if (sideStalk) {
      sideStalk.remove();
    }
    sideStalk = document.querySelector("#links").appendChild(createDOM("div", { class: "ogl-sideStalk" }));
    let actBtn, watchlistBtn, ptreBtn, removeBtn;
    const options = OGIData.options;
    if (!options.sideStalkVisible) {
      sideStalk.classList.add("ogi-hidden");
      sideStalk.addEventListener("click", () => {
        options.sideStalkVisible = true;
        OGIData.options = options;
        side();
      });
    } else {
      watchlistBtn = sideStalk.appendChild(
        createDOM("a", { class: "ogl-text-btn material-icons", title: "History" }, "history")
      );
      actBtn = sideStalk.appendChild(createDOM("a", { class: "ogl-text-btn material-icons", title: "" }, "warning"));
      if (OGIData.options.ptreTK) {
        ptreBtn = sideStalk.appendChild(
          createDOM("a", { class: "ogl-text-btn ogl-ptre-acti tooltip", title: "Display PTRE data" }, "PTRE")
        );
      }
      removeBtn = sideStalk.appendChild(
        createDOM("button", {
          class: "icon icon_trash tooltip ogi-sideStalkRemoveDetail",
          title: Translator.translate(225),
          "aria-label": Translator.translate(225),
          type: "button",
        })
      );
      const closeBtn = sideStalk.appendChild(
        createDOM(
          "span",
          { class: "ogl-text-btn material-icons ogi-sideStalk-minBtn", title: "Minimize" },
          "close_fullscreen"
        )
      );
      closeBtn.addEventListener("click", () => {
        const options = OGIData.options;
        options.sideStalkVisible = false;
        OGIData.options = options;

        side();
      });
    }
    player.get(playerId).then((p) => {
      const playerTitle = sideStalk.appendChild(
        createDOM("div", { style: "cursor: pointer", class: "ogi-title " + player.status(p.status) }, p.name)
      );
      sideStalk.appendChild(createDOM("hr"));
      let container = sideStalk.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": p.id }));
      let planets = update(p.planets);
      planets.forEach((dom) => container.appendChild(dom));
      updateSideStalkPlayerTitle(playerTitle, p.name, container);
      observeSideStalkPlayerTitle(playerTitle, p.name, container);

      highlightTarget();

      actBtn &&
        actBtn.addEventListener("click", () => {
          if (page !== "galaxy") {
            let coords = document.querySelector(".ogl-stalkPlanets a.ogl-main").getAttribute("data-coords").split(":");
            location.href = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
          }
          if ($("#galaxyLoading").is(":visible")) return;
          let active = sideStalk.querySelectorAll("a.ogl-active");
          let next = active.length > 0 ? active[active.length - 1].nextElementSibling : null;
          if (!next || !next.getAttribute("data-coords")) {
            next = sideStalk.querySelectorAll(".ogl-stalkPlanets a")[0];
          }
          let splits = next.getAttribute("data-coords").split(":");
          galaxy = document.getElementById("galaxy_input").value = splits[0];
          system = document.getElementById("system_input").value = splits[1];
          submitForm();
        });
      watchlistBtn &&
        watchlistBtn.addEventListener("click", () => {
          renderHistoricList(sideStalk);
        });

      removeBtn &&
        removeBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          removeSideStalkPlayerWithFeedback(p.id, p.name, sideStalk, true);
        });
      if (ptreBtn) {
        ptreBtn.addEventListener("click", () => {
          loading();
          let inter = setInterval(() => {
            clearInterval(inter);
            action(null, p);
          }, 20);
        });
      }
      container.appendChild(
        createDOM("div", { class: "ogl-right ogl-date" }, dateTime.timeSince(new Date(p.lastUpdate)))
      );
    });
  }
}
