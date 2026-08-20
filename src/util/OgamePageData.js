class OgamePageData {
  constructor() {
    this._version = document.querySelector("meta[name='ogame-version']")?.content || "0.0.0";
    this._isAtLeast_13_0_0 = OgamePageData.#IsVersionEqualOrGreaterThan(this._version, "13.0.0");
    this._gameLang = document.querySelector('meta[name="ogame-language"]').getAttribute("content");
    this._playerLang = document.cookie.match(/oglocale=([a-z]+)/)?.[1] || this._gameLang;
    this._commander = !!document.querySelector("#officers > a.commander.on");
    this._geologist = !!document.querySelector("#officers > a.geologist.on");
    this._technocrat = !!document.querySelector("#officers > a.technocrat.on");
    this._admiral = !!document.querySelector("#officers > a.admiral.on");
    this._engineer = !!document.querySelector("#officers > a.engineer.on");
    this._allOfficers = !!document.querySelector("#officers.all");
  }

  /** @type {string} */
  get version() {
    return this._version;
  }
  /** @type {boolean} */
  get isAtLeast_13_0_0() {
    return this._isAtLeast_13_0_0;
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
  get commander() {
    return this._commander;
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
  get admiral() {
    return this._admiral;
  }
    /** @type {boolean} */
  get engineer() {
    return this._engineer;
  }
    /** @type {boolean} */
  get allOfficers() {
    return this._allOfficers;
  }
  
  static #IsVersionEqualOrGreaterThan(ogameVersion, compareVersion) {
    // Extract the numeric parts of the version strings and convert them to numbers for comparison (ex: "13.0.0-r1" -> "13.0.0")
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
