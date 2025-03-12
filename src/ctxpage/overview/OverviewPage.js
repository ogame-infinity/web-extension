
import { getOption, setOption } from "../conf-options.js";
import { createDOM } from "../../util/dom.js";
import { getLogger } from "../../util/logger.js";
import OGIData from "../../util/OGIData.js";

class OverviewPage {

    logger;

    constructor() {
        this.logger = getLogger("OverviewPage");
    }

    UpdatePlanetOverviewDisplay(toggle, partName) {
        const optionName = `overview_display_planet_${partName}`;
        const attributeName = `${partName}-active`;

        // get the current display status
        let display = getOption(optionName);

        // if the display is not set, set it to true
        display = display === undefined || display === null || display === true;

        if (toggle) {
            const options = OGIData.options;

            //toggle the display
            planet.setAttribute(attributeName, !display);

            //in this context, 'this' is a dom element, so we need to use self instead
            //save the display preference
            setOption(optionName, !display);
            options[optionName] = !display;
            OGIData.options = options;
        }
        else {
            planet.setAttribute(attributeName, display);
        }
    }

    MakePrettierOverview(currentPage) {
        if (currentPage !== "overview") {
            return;
        }

        try {

            const planet = document.querySelector('#overviewcomponent #planet');
            const detailWrapper = planet.querySelector('#detailWrapper');

            // create the toggle planet details button
            const togglePlanetDataButton = createDOM('div', { class: 'togglePlanetDetails' });
            togglePlanetDataButton.addEventListener("click", () => {
                this.UpdatePlanetOverviewDisplay(true, "details");
            });

            // add the toggle planet details button to the header
            detailWrapper.querySelector('#header_text').appendChild(togglePlanetDataButton);

            // create the toggle buff bar button, and add it instead of the spaceObjectHeaderActionIcons
            const toggleBuffBarButton = createDOM('div', { id: "toggleBuffBar" });
            toggleBuffBarButton.addEventListener("click", () => {
                this.UpdatePlanetOverviewDisplay(true, "buffBar");
            });
            planet.insertBefore(toggleBuffBarButton, detailWrapper);

            const spaceObjectHeaderActionIcons = planet.querySelector('#spaceObjectHeaderActionIcon');
            planet.removeChild(spaceObjectHeaderActionIcons);

            // init the display of the planet details and buff bar
            this.UpdatePlanetOverviewDisplay(false, "details");
            this.UpdatePlanetOverviewDisplay(false, "buffBar");

        }
        catch (e) {
            // it would be a shame if a UI error break the game...
            this.logger.error(e);
        }
    }
}

export default OverviewPage;