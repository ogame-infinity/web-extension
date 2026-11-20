import planetType from "./enum/planetType.js";

class OgamePageData {
  constructor() {
    this._rawURL = new URL(window.location.href);
    this._mode = Number(this._rawURL.searchParams.get("oglMode"));
    this._page = this._rawURL.searchParams.get("component") || this._rawURL.searchParams.get("page");

    // officers
    const officersContainer = document.querySelector("#officers");
    for (const officer of ["commander", "admiral", "engineer", "geologist", "technocrat"]) {
      this[`_${officer}`] = !!officersContainer.querySelector(`a.${officer}.on`);
    }
    this._allOfficers = officersContainer.classList.contains("all");

    // meta tags
    /* TODO: remaining tags to be implemented later / when needed
    "ogame-session"
    "ogame-timestamp"
    "ogame-universe-name"
    "ogame-universe-speed"
    "ogame-universe-speed-fleet-peaceful"
    "ogame-universe-speed-fleet-war"
    "ogame-universe-speed-fleet-holding"
    "ogame-player-name"
    "ogame-planet-id"
    "ogame-planet-name"
    "ogame-alliance-id"
    "ogame-alliance-name"
    "ogame-alliance-tag"
    ** alliance tags only appears when player has alliance **
    */
    const metaTags = {};
    for (const meta of document.head.querySelectorAll("meta[name^='ogame-']")) {
      metaTags[meta.name] = meta.content;
    }
    this._version = metaTags["ogame-version"] || "0.0.0";
    this._universeUrl = metaTags["ogame-universe"];
    this._gameLang = metaTags["ogame-language"];
    this._playerLang = metaTags["ogame-ui-language"];
    this._donutGalaxy = metaTags["ogame-donut-galaxy"] === "1";
    this._donutSystem = metaTags["ogame-donut-system"] === "1";
    this._playerId = Number(metaTags["ogame-player-id"]);
    this._playerClass = Number(metaTags["ogame-player-characterclass-id"]);
    this._currentCoordinates = metaTags["ogame-planet-coordinates"];
    this._currentPositionType = planetType[metaTags["ogame-planet-type"]];
    this._spyProbes = Number(metaTags["ogame-player-espionage-probe-quantity"]);
    this._allianceClass = Number(metaTags["ogame-allianceclass-id"] || 0);

    const splitCoords = this._currentCoordinates.split(":");
    this._currentGalaxy = Number(splitCoords[0]);
    this._currentSystem = Number(splitCoords[1]);
    this._currentPosition = Number(splitCoords[2]);
    this._universe = this._universeUrl.split("-")[0].slice(1);
    this._isAtLeast_13_0_0 = OgamePageData.#IsVersionEqualOrGreaterThan(this._version, "13.0.0");
  }

  /** @type {string} */
  get rawURL() {
    return this._rawURL;
  }
  /** @type {number} */
  get mode() {
    return this._mode;
  }
  /** @type {string} */
  get page() {
    return this._page;
  }
  /** @type {boolean} */
  get commander() {
    return this._commander;
  }
  /** @type {boolean} */
  get admiral() {
    return this._admiral;
  }
  /** @type {boolean} */
  get engineer() {
    return this._engineer;
  }
  /** @type {boolean} */
  get geologist() {
    return this._geologist;
  }
  /** @type {boolean} */
  get technocrat() {
    return this._technocrat;
  }
  /** @type {boolean} */
  get allOfficers() {
    return this._allOfficers;
  }
  /** @type {string} */
  get version() {
    return this._version;
  }
  /** @type {string} */
  get universeUrl() {
    return this._universeUrl;
  }
  /** @type {string} */
  get gameLang() {
    return this._gameLang;
  }
  /** @type {string} */
  get playerLang() {
    return this._playerLang;
  }
  /** @type {boolean} */
  get donutGalaxy() {
    return this._donutGalaxy;
  }
  /** @type {boolean} */
  get donutSystem() {
    return this._donutSystem;
  }
  /** @type {number} */
  get playerId() {
    return this._playerId;
  }
  /** @type {number} */
  get playerClass() {
    return this._playerClass;
  }
  /** @type {string} */
  get currentCoordinates() {
    return this._currentCoordinates;
  }
  /** @type {number} */
  get currentPositionType() {
    return this._currentPositionType;
  }
  /** @type {number} */
  get spyProbes() {
    return this._spyProbes;
  }
  /** @type {number} */
  get allianceClass() {
    return this._allianceClass;
  }
  /** @type {number} */
  get currentGalaxy() {
    return this._currentGalaxy;
  }
  /** @type {number} */
  get currentSystem() {
    return this._currentSystem;
  }
  /** @type {number} */
  get currentPosition() {
    return this._currentPosition;
  }
  /** @type {number} */
  get universe() {
    return this._universe;
  }
  /** @type {boolean} */
  get isAtLeast_13_0_0() {
    return this._isAtLeast_13_0_0;
  }

  static #IsVersionEqualOrGreaterThan(ogameVersion, compareVersion) {
    // Extract the numeric parts of the version strings and convert them to numbers for comparison
    // (ex: "13.0.0-r1" -> "13.0.0")
    const cleanVersion = (v) => v.split("-")[0].split(".").map(Number);

    const ogameVersionParts = cleanVersion(ogameVersion);
    const compareVersionParts = cleanVersion(compareVersion);

    const maxLength = Math.max(ogameVersionParts.length, compareVersionParts.length);

    for (let i = 0; i < maxLength; i++) {
      const ogameV = ogameVersionParts[i] || 0;
      const b = compareVersionParts[i] || 0;

      if (ogameV > b) return true; // Ogame version is greater
      if (ogameV < b) return false; // Ogame version is lesser
    }

    return true; // Versions are equal
  }
}

export default new OgamePageData();
