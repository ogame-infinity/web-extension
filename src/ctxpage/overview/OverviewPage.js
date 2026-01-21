import { getOption, setOption } from "../conf-options.js";
import { createDOM } from "../../util/dom.js";
import { getLogger } from "../../util/logger.js";
import OGIData from "../../util/OGIData.js";

class OverviewPage {
  logger;

  constructor() {
    this.logger = getLogger("OverviewPage");
  }

  #updatePlanetOverviewDisplay(toggle) {
    const optionName = `overview_display_planet_details`;
    const attributeName = `details-active`;

    // get the current display status
    const display = getOption(optionName);

    if (toggle) {
      const options = OGIData.options;

      //toggle the display
      planet.setAttribute(attributeName, !display);

      //save the display preference
      setOption(optionName, !display);
      options[optionName] = !display;
      OGIData.options = options;
    } else {
      planet.setAttribute(attributeName, display);
    }
  }

  MakePrettierOverview(currentPage) {
    if (currentPage !== "overview") return;

    try {
      const planet = document.querySelector("#overviewcomponent #planet");
      const detailWrapper = planet.querySelector("#detailWrapper");

      // create the toggle planet details button
      const togglePlanetDataButton = createDOM("div", { class: "togglePlanetDetails" });
      togglePlanetDataButton.addEventListener("click", () => {
        this.#updatePlanetOverviewDisplay(true);
      });

      // add the toggle planet details button to the header
      detailWrapper.querySelector("#header_text").appendChild(togglePlanetDataButton);

      // init the display of the planet details
      this.#updatePlanetOverviewDisplay(false);

      const planetOptions = detailWrapper.querySelector("#planetOptions");
      if (planetOptions) detailWrapper.appendChild(planetOptions);
    } catch (e) {
      // it would be a shame if a UI error break the game...
      this.logger.error(e);
    }
  }
}

export default OverviewPage;
