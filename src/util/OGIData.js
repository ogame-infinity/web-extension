const localStorageKey = "ogk-data";

class OGIData {
  _json;
  get options() {
    return this._json.options;
  }
  set options(options) {
    this._json.options = options;

    this.#save();
  }
  get universeSettingsTooltip() {
    return this._json.universeSettingsTooltip;
  }
  set universeSettingsTooltip(universeSettingsTooltip) {
    this._json.universeSettingsTooltip = universeSettingsTooltip;

    this.#save();
  }
  get technology() {
    return this._json.technology;
  }
  set technology(technology) {
    this._json.technology = technology;

    this.#save();
  }
  get markers() {
    return this._json.markers;
  }
  set markers(markers) {
    this._json.markers = markers;

    this.#save();
  }
  get ships() {
    return this._json.ships;
  }
  set ships(ships) {
    this._json.ships = ships;

    this.#save();
  }
  get expeditions() {
    return this._json.expeditions;
  }
  set expeditions(expeditions) {
    this._json.expeditions = expeditions;

    this.#save();
  }
  get discoveries() {
    return this._json.discoveries;
  }
  set discoveries(discoveries) {
    this._json.discoveries = discoveries;

    this.#save();
  }
  get expeditionSums() {
    return this._json.expeditionSums;
  }
  set expeditionSums(expeditionSums) {
    this._json.expeditionSums = expeditionSums;

    this.#save();
  }
  get discoveriesSums() {
    return this._json.discoveriesSums;
  }
  set discoveriesSums(discoveriesSums) {
    this._json.discoveriesSums = discoveriesSums;

    this.#save();
  }
  get keepTooltip() {
    return this._json.keepTooltip;
  }
  set keepTooltip(keepTooltip) {
    this._json.keepTooltip = keepTooltip;

    this.#save();
  }
  get tchat() {
    return this._json.tchat;
  }
  set tchat(tchat) {
    this._json.tchat = tchat;

    this.#save();
  }
  get searchHistory() {
    return this._json.searchHistory;
  }
  set searchHistory(searchHistory) {
    this._json.searchHistory = searchHistory;

    this.#save();
  }
  get sideStalk() {
    return this._json.sideStalk;
  }
  set sideStalk(sideStalk) {
    this._json.sideStalk = sideStalk;

    this.#save();
  }
  constructor() {
    const res = JSON.parse(localStorage.getItem(localStorageKey));
    this._json = res || {};
  }

  #save() {
    localStorage.setItem(localStorageKey, JSON.stringify(this._json));
  }
}

export default new OGIData();