import { getOption, setOption } from "../conf-options.js";
import * as DOM from "../../util/dom.js";
import OgamePageData from "../../util/OgamePageData.js";
import OGIData from "../../util/OGIData.js";
import OGIObserver from "../../../util/observer.js";
import Translator from "../../../util/translate.js";

export function addTemplateSelector(templateDivId, templateType) {
  const addMxSelectors = (divId, type) => {
    const selectedFleetId = getOption("expedition.standardFleetId");
    const selectedTemplateType = getOption("expedition.standardFleetType");
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
      const isSelected = fleetId === selectedFleetId && type === selectedTemplateType;
      mx.classList.toggle("ogl-active", isSelected);
      mx.classList.toggle("ogl-inactive", !isSelected);
      mx.addEventListener("click", () => updateStandardFleet(fleetId, type));
      editTemplate.before(a);
    });
    const updateStandardFleet = (id, type) => {
      document.querySelectorAll(".ogl-mission-icon.ogl-mission-15.ogi-expedition-fleet").forEach((mx) => {
        const isSelected = mx.getAttribute("data-id") === id && mx.getAttribute("data-type") === type;
        mx.classList.toggle("ogl-active", isSelected);
        mx.classList.toggle("ogl-inactive", !isSelected);
      });
      setOption("expedition.standardFleetId", id);
      setOption("expedition.standardFleetType", type);
      OGIData.Save();
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
