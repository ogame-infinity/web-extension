import { getOption } from "../conf-options.js";
import { createDOM } from "../../util/dom.js";
import { getLogger } from "../../util/logger.js";
import { toFormattedNumber } from "../../util/numbers.js";
import OgamePageData from "../../util/OgamePageData.js";
import OGIData from "../../util/OGIData.js";
import Translator from "../../util/translate.js";

class storageTimers {
  logger;

  constructor() {
    this.logger = getLogger("storageTimers");
  }

  show() {
    if (OgamePageData.page !== "overview") return;
    try {
      const currentDate = new Date();
      const timeZoneChange = getOption("timeZone") ? 0 : OGIData.json.timezoneDiff;

      const analizeStorage = ({ storage, amount, production }, currentDate) => {
        const resourceAmount = Math.floor(amount);
        const resourceFull = resourceAmount >= storage;
        const resourceProduction = resourceFull ? 0 : Math.floor(production * 3600);
        const time = resourceProduction > 0 ? (storage - resourceAmount) / resourceProduction : 0;
        const date = new Date(currentDate.getTime() + (time * 3600 - timeZoneChange) * 1e3);
        return {
          amount: resourceAmount,
          production: resourceProduction,
          fillingDate: date,
          full: resourceFull,
          storage,
          storing: time > 0,
        };
      };

      const resources = {
        metal: { translateId: 22 },
        crystal: { translateId: 23 },
        deuterium: { translateId: 24 },
      };

      const cachedElements = {};
      const storageRows = [];

      Object.entries(resources).forEach(([name, attributes]) => {
        const data = analizeStorage(resourcesBar.resources[name], currentDate);
        const productionElement = createDOM(
          "span",
          { class: data.storing ? "undermark" : "overmark" },
          `(${data.storing ? "+" : ""}${toFormattedNumber(data.production)})`
        );
        const storageElement = createDOM(
          "span",
          { class: data.full ? "overmark" : "" },
          ` ${toFormattedNumber(Math.floor(data.amount))} / ${toFormattedNumber(data.storage, null, true)}`
        );
        const timeElement = createDOM(
          "span",
          { class: data.storing ? "ogl-date" : "overmark" },
          ` ${data.storing ? getFormatedDate(data.fillingDate.getTime(), "[d].[m].[y] - [G]:[i]:[s]") : "-"}`
        );

        cachedElements[name] = {
          production: productionElement,
          storage: storageElement,
          time: timeElement,
        };

        storageRows.push(
          createDOM(
            "tr",
            {},
            createDOM("td", { class: "desc" }, `${Translator.translate(attributes.translateId, "tech")}:`),
            createDOM("td", { class: "data" }, productionElement, storageElement)
          ),
          createDOM("tr", {}, createDOM("td", { class: "desc" }), createDOM("td", { class: "data" }, timeElement))
        );
      });
      document.querySelector("#planetDetails tbody").prepend(...storageRows);

      const updater = setInterval(() => {
        const currentDate = new Date();
        let storing = false;

        Object.entries(resources).forEach(([name]) => {
          const data = analizeStorage(resourcesBar.resources[name], currentDate);
          if (data.storing) storing = true;

          const production = cachedElements[name].production;
          production.classList.toggle("undermark", data.storing);
          production.classList.toggle("overmark", !data.storing);
          const productionText = `(${data.storing ? "+" : ""}${toFormattedNumber(data.production)})`;
          if (production.textContent !== productionText) production.textContent = productionText;

          const storage = cachedElements[name].storage;
          storage.classList.toggle("overmark", data.full);
          const storageText = ` ${toFormattedNumber(Math.floor(data.amount))} / ${toFormattedNumber(data.storage, null, true)}`;
          if (storage.textContent !== storageText) storage.textContent = storageText;

          const time = cachedElements[name].time;
          time.classList.toggle("ogl-date", data.storing);
          time.classList.toggle("overmark", !data.storing);
          const timeText = ` ${data.storing ? getFormatedDate(data.fillingDate.getTime(), "[d].[m].[y] - [G]:[i]:[s]") : "-"}`;
          if (time.textContent !== timeText) time.textContent = timeText;
        });

        if (!storing) clearInterval(updater);
      }, 2000);
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export default new storageTimers();
