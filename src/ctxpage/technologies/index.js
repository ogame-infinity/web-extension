import WeaponsTechnologies from "../../ctxcontent/services/TechnologiesDetails/WeaponsTechnologies.js";
import BuildingTechnologies from "../../ctxcontent/services/TechnologiesDetails/BuildingTechnologies.js";
import { getLogger } from "../../util/logger.js";

const pages = ["research", "supplies", "facilities", "shipyard", "defenses", "lfbuildings", "lfresearch"];

class Technologies {
  #providers;
  #logger;

  constructor() {
    this.#providers = [new WeaponsTechnologies(), new BuildingTechnologies()];
    this.#logger = getLogger("technologies");
  }

  apply() {
    const rawURL = new URL(window.location.href);
    const page = rawURL.searchParams.get("component") || rawURL.searchParams.get("page");

    if (!pages.includes(page)) return;

    if (!technologyDetails || typeof technologyDetails === "undefined") return;
    const object = this;

    const technologyDetailWrapper = document.getElementById("technologydetails_wrapper");
    const technologyDetailsAnchor = document.querySelector("header[data-anchor=technologyDetails]");

    // Need to use jquery for a specific method
    const elemTechnologyDetailsContentJquery = $("#technologydetails_content");
    const loader = elemTechnologyDetailsContentJquery.ogameLoadingIndicator();
    const elemTechnologyDetailsContent = document.getElementById("technologydetails_content");

    technologyDetails.show = (technology) => {
      const element = document.querySelector(`.technology.hasDetails[data-technology="${technology}"]`);

      if (!element) {
        this.#logger.error("Element not found", { technology });

        return;
      }

      document.querySelectorAll(".ogi-showsDetails").forEach((e) => e.classList.remove("ogi-showsDetails"));

      element.classList.add(".ogi-showDetails");

      loader.show();

      const url = new URL(technologyDetails.technologyDetailsEndpoint);
      url.searchParams.set("technology", technology);

      fetch(url.toString(), {
        headers: {
          "X-Requested-With": "XMLHttpRequest",
        },
      })
        .then((response) => response.json())
        .then((response) => {
          const technologyDetailsElement = document.getElementById("technologydetails");
          technologyDetailWrapper.classList.toggle("slide-up", true);
          technologyDetailWrapper.classList.toggle("slide-down", false);
          const div = document.createElement("div");
          div.insertAdjacentHTML("afterbegin", response.content[response.target]);

          if (technologyDetailsElement) {
            elemTechnologyDetailsContent.replaceChildren(div);
          } else {
            elemTechnologyDetailsContent.appendChild(div);
          }

          const technologyTreeElement = elemTechnologyDetailsContent.querySelector(".technology_tree");
          const technologyTreeElementCloned = technologyTreeElement.cloneNode(true);

          technologyTreeElement.style.display = "none";
          technologyTreeElementCloned.replaceChildren();
          elemTechnologyDetailsContent.querySelector(".description").appendChild(technologyTreeElementCloned);

          let technologyData;

          object.#providers.forEach((p) => {
            if (p.support(technology)) {
              technologyData = p.apply(technology, elemTechnologyDetailsContent);
            }
          });

          if (!technologyData) {
            object.#logger.warn("No provider found", technology);
          }

          loader.hide();
        });
    };
  }
}

export default Technologies;
