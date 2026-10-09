import { getOption, setOption } from "../conf-options.js";
import * as DOM from "../../util/dom.js";
import OGIData from "../../util/OGIData.js";
import OGIObserver from "../../util/observer.js";
import Translator from "../../util/translate.js";

export function addTemplateSelector(templateDivId, templateType, updateCallback) {
  const addMxSelectors = (divId, type) => {
    const options = getOption("expedition");
    document.querySelectorAll(`${divId} .actions a.editTemplate`).forEach((editTemplate) => {
      const fleetId = editTemplate.getAttribute("onclick").match(/(?<=\", )\d+/)[0];
      const a = DOM.createDOM("a", {
        class: "tooltip js_hideTipOnMobile icon_link",
        style: "margin-right: 3px;",
        title: Translator.translate(165),
      });
      const mx = a.appendChild(
        DOM.createDOM("span", {
          class: "ogl-mission-icon ogl-mission-15 ogi-expedition-fleet",
          "data-id": fleetId,
          "data-type": type,
        })
      );
      const isSelected = fleetId === options.standardFleetId && type === options.standardFleetType;
      mx.classList.toggle("ogl-active", isSelected);
      mx.classList.toggle("ogl-inactive", !isSelected);
      mx.addEventListener("click", () => updateStandardFleet(fleetId, type));
      editTemplate.before(a);
    });
    if (typeof updateCallback === "function") updateCallback();
    const updateStandardFleet = (id, type) => {
      document.querySelectorAll(".ogl-mission-icon.ogl-mission-15.ogi-expedition-fleet").forEach((mx) => {
        const isSelected = mx.getAttribute("data-id") === id && mx.getAttribute("data-type") === type;
        mx.classList.toggle("ogl-active", isSelected);
        mx.classList.toggle("ogl-inactive", !isSelected);
      });
      const options = getOption("expedition");
      options.standardFleetId = id;
      options.standardFleetType = type;
      setOption("expedition", options);
      OGIData.Save();
      if (typeof updateCallback === "function") updateCallback();
    };
  };
  const templateObserver = new OGIObserver();
  const myObs = templateObserver(
    document.querySelector(templateDivId),
    () => {
      addMxSelectors(templateDivId, templateType);
    },
    { subtree: false, childList: true }
  );
  addMxSelectors(templateDivId, templateType);
}
