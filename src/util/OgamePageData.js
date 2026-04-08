class OgamePageData {
  constructor() {
    this._gameLang = document.querySelector('meta[name="ogame-language"]').getAttribute("content");
    this._playerLang = document.cookie.match(/oglocale=([a-z]+)/)?.[1] || this._gameLang;
    this._currentCoordinates = document.querySelector('meta[name="ogame-planet-coordinates"]').getAttribute("content");
    this._currentGalaxy = parseInt(this._currentCoordinates.split(":")[0]);
    this._currentSystem = parseInt(this._currentCoordinates.split(":")[1]);
    this._currentPosition = parseInt(this._currentCoordinates.split(":")[2]);
    this._currentPositionType =  document.querySelector('meta[name="ogame-planet-type"]').getAttribute("content") === 'planet' ? 1 : 3;
    this._donutSystem = document.querySelector('meta[name="ogame-donut-system"]').getAttribute("content") === "1";
    
  }
  /** @type {string} */
  get gameLang() {
    return this._gameLang;
  }
  /** @type {string} */
  get playerLang() {
    return this._playerLang;
  }
  /** @type {string} */
  get currentCoordinates() {
    return this._currentCoordinates;
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
  get currentPositionType() {
    return this._currentPositionType;
  }
  /** @type {boolean} */
  get donutSystem() {
    return this._donutSystem;
  }

}

export default new OgamePageData();
