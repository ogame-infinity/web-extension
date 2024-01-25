/**
 * @typedef {Object} OptionExpedition
 * @property {number} cargoShip
 * @property {number} combatShip
 * @property {number} defaultTime
 * @property {number} limitCargo 1 to 500 (is percentage)
 * @property {boolean} rotation
 * @property {number} rotationAfter
 * @property {boolean} sendCombat
 * @property {boolean} sendProbe
 * @property {boolean} standardFleet
 * @property {number} standardFleetId
 */

/**
 * @typedef {Object} OptionCollect_Target
 * @property {number} galaxy
 * @property {number} system
 * @property {number} position
 * @property {number} type
 */

/**
 * @typedef {Object} OptionCollect
 * @property {OptionCollect_Target} target
 * @property {number} mission
 * @property {number} ship
 */

const _options = {
  maxCrawler: false,
  crawlerPercent: 1.5,
  tradeRate: [2.5, 1.5, 1, 0],
  dispatcher: false,
  sideStalkVisible: true,
  eventBoxExps: true,
  eventBoxKeep: false,
  empire: false,
  targetList: false,
  fret: 202,
  spyFret: 202,
  expeditionMission: 15,
  foreignMission: 3,
  harvestMission: 4,
  activitytimers: false,
  disableautofetchempire: false,
  autofetchempire: true,
  spyFilter: "DATE",
  ptreTK: "",
  pantryKey: "",
  simulator: "",
  rvalLimit: 1e6, // needs revision to consider the speed of the universe.
  spyTableEnable: true,
  spyTableAppend: true,
  compactViewEnable: true,
  autoDeleteEnable: false,
  kept: {},
  defaultKept: {},
  hiddenTargets: {},
  timeZone: true,
  collect: {
    ship: 202,
    mission: 3,
    target: {
      galaxy: 0,
      system: 0,
      position: 0,
      type: 1,
    },
  },
  expedition: {
    cargoShip: 202,
    combatShip: 218,
    defaultTime: 1,
    limitCargo: 1,
    rotation: false,
    rotationAfter: 3,
    sendCombat: true,
    sendProbe: true,
    standardFleet: false,
    standardFleetId: 0,
  },
};

export function initConfOptions(options) {
  if (undefined === options) {
    options = {};
  }

  const collect = options?.collect || _options.collect;
  delete options["collect"];

  const expedition = options?.expedition || _options.expedition;
  delete options["expedition"];

  /** @type {string} */
  const ptreTK = options.ptreTK || _options.ptreTK;
  options.ptreTK = "";
  if (ptreTK && ptreTK.replace(/-/g, "").length === 18 && ptreTK.startsWith("TM")) {
    options.ptreTK = ptreTK;
  }

  Object.assign(_options, options);
  Object.assign(_options.collect, collect);
  Object.assign(_options.expedition, expedition);
}

/** @type {ProxyHandler} */
const handlerProxy = {
  set(target, prop, newValue, receiver) {
    if (typeof prop !== "string") {
      return Reflect.set(...arguments);
    }

    if (Object.hasOwn(target, prop)) {
      target[prop] = newValue;
    }
    return true;
  },
  get(target, prop, receiver) {
    return Reflect.get(...arguments);
  },
  ownKeys(target) {
    return Reflect.ownKeys(target);
  },
  has(target, prop) {
    return Reflect.has(target, prop);
  },

  preventExtensions(_) {
    return false;
  },
  isExtensible(_) {
    return false;
  },

  defineProperty(target, prop, _) {
    if (Object.hasOwn(target, prop)) {
      return true;
    }

    throw new Error(`Not allowed to define '${prop}' configuration property from option proxy`);
  },

  deleteProperty(target, prop) {
    throw new Error(`Not allowed to delete '${prop}' configuration property from option proxy`);
  },
};

const proxyOptions = new Proxy(_options, handlerProxy);

/**
 * Gets all declared options.
 * @return {typeof _options} Proxy
 */
export function getOptions() {
  return proxyOptions;
}

/**
 * Gets the value of an existing option.
 * @param {string} name
 * @return {*|undefined}
 */
export function getOption(name) {
  if (Object.hasOwn(_options, name)) {
    return _options[name];
  }
  return undefined;
}

/**
 * Allows to set the value of a previously existing or non-existing option.
 * @param {string} name
 * @param {*} value
 */
export function setOption(name, value) {
  _options[name] = value;
}
