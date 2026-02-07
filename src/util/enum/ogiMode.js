export default Object.freeze({
  DEFAULT: 0,
  HARVEST: 1, //click on planet/moon picture
  LOCK: 2, //click enabled lock on planet list
  AUTOHARVEST: 3, //not in use, remanent code, we have collect() instead, to be reworked to autoharvest to moons?
  RAID: 4, //click ship amount in spylist
  UNKNOWN_NB_5: 5, //? (seems some harvest mode, not in use, remanent traces of code, use for autoraid? (to be implemented))
  AUTOEXPEDITION: 6, //click expedition button/keyE or expedition button in galaxy
  CUSTOM_MISSION: 7, //custom mission, set by the player
});
