class OgamePageData {
  constructor() {
    this._gameLang = document.querySelector('meta[name="ogame-language"]').getAttribute("content");
    this._playerLang = document.cookie.match(/oglocale=([a-z]+)/)?.[1] || this._gameLang;
  }
  /** @type {string} */
  get gameLang() {
    return this._gameLang;
  }
  /** @type {string} */
  get playerLang() {
    return this._playerLang;
  }
}

export default new OgamePageData();
