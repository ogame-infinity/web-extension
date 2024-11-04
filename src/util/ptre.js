import * as ptreService from "./service.ptre.js";
import OgamePageData from "./OgamePageData.js";
import { translate } from "./translate.js";
import { createDOM } from "./dom.js";
import { formatToUnits } from "./numbers.js";
import { popup } from "./popup.js";
import OGIData from "./OGIData.js";

const universe = window.location.host.replace(/\D/g, "");

export function action(frame, player) {
  frame = frame || "week";

  let container = createDOM("div", { class: "ptreContent" });

  if (!OGIData.options.ptreTK) {
    container.textContent = translate(151);
    popup(null, container);
    return;
  }

  let cleanPlayerName = encodeURIComponent(player.name);
  ptreService
    .getPlayerInfos(OgamePageData.gameLang, universe, OGIData.options.ptreTK, cleanPlayerName, player.id, frame)
    .then((result) => {
      if (result.code == 1) {
        let arrData = result.activity_array.succes == 1 ? JSON.parse(result.activity_array.activity_array) : null;
        let checkData = result.activity_array.succes == 1 ? JSON.parse(result.activity_array.check_array) : null;

        container.appendChild(createDOM("h3", {}, translate(152)));

        const ptreBestReport = createDOM("div", { class: "ptreBestReport" });
        const fleetPointsDiv = createDOM("div");
        fleetPointsDiv.append(
          createDOM("div").appendChild(
            createDOM(
              "b",
              { class: "ogl_fleet" },
              formatToUnits(result.top_sr_fleet_points) + " pts"
            ).insertAdjacentElement("afterbegin", createDOM("i", { class: "material-icons" }, "military_tech"))
              .parentElement
          ),
          createDOM("div").appendChild(
            createDOM("b", {}, new Date(result.top_sr_timestamp * 1000).toLocaleDateString("fr-FR"))
          ).parentElement
        );
        const buttonsDiv = createDOM("div");
        buttonsDiv.append(
          createDOM(
            "a",
            { class: "ogl_button", target: "result.top_sr_link", href: result.top_sr_link },
            translate(153)
          ),
          createDOM(
            "a",
            {
              class: "ogl_button",
              target: `https://ptre.chez.gg/?country=${OgamePageData.gameLang}&univers=${universe}&player_id=${player.id}`,
              href: `https://ptre.chez.gg/?country=${OgamePageData.gameLang}&univers=${universe}&player_id=${player.id}`,
            },
            translate(154)
          )
        );
        ptreBestReport.append(fleetPointsDiv, buttonsDiv);

        container.appendChild(ptreBestReport);
        container.appendChild(createDOM("div", { class: "splitLine" }));
        container.appendChild(createDOM("h3", {}, result.activity_array.title || ""));

        const domPtreActivities = createDOM("div", { class: "ptreActivities" });
        domPtreActivities.appendChild(createDOM("span"));
        domPtreActivities.appendChild(createDOM("div"));
        container.appendChild(domPtreActivities);

        container.appendChild(createDOM("div", { class: "splitLine" }));
        container.appendChild(createDOM("div", { class: "ptreFrames" }));

        ["last24h", "2days", "3days", "week", "2weeks", "month"].forEach((f) => {
          let btn = container.querySelector(".ptreFrames").appendChild(createDOM("div", { class: "ogl_button" }, f));
          btn.addEventListener("click", () => action(f, player));
        });

        if (result.activity_array.succes == 1) {
          arrData.forEach((line, index) => {
            if (!isNaN(line[1])) {
              let div = createDOM("div", { class: "tooltip" });
              div.appendChild(createDOM("div", {}, line[0]));
              let span = div.appendChild(createDOM("span", { class: "ptreDotStats" }));
              let dot = span.appendChild(createDOM("div", { "data-acti": line[1], "data-check": checkData[index][1] }));

              let dotValue = (line[1] / result.activity_array.max_acti_per_slot) * 100 * 7;
              dotValue = Math.ceil(dotValue / 30) * 30;

              dot.style.color = `hsl(${Math.max(0, 100 - dotValue)}deg 75% 40%)`;
              dot.style.opacity = checkData[index][1] + "%";
              dot.style.padding = "7px";

              let title;
              let checkValue = Math.max(0, 100 - dotValue);

              if (checkValue === 100) title = translate(155);
              else if (checkValue >= 60) title = translate(156);
              else if (checkValue >= 40) title = translate(157);
              else title = translate(158);

              if (checkData[index][1] == 100) title += translate(159);
              else if (checkData[index][1] >= 75) title += translate(160);
              else if (checkData[index][1] >= 50) title += translate(161);
              else if (checkData[index][1] > 0) title = translate(162);
              else title = translate(163);

              div.setAttribute("title", title);

              if (checkData[index][1] === 100 && line[1] == 0) dot.classList.add("ogl_active");

              container.querySelector(".ptreActivities > div").appendChild(div);
            }
          });
        } else {
          container.querySelector(".ptreActivities > span").textContent = result.activity_array.message;
        }
      } else container.textContent = result.message;
      popup(null, container);
    });
}
