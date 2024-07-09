import ship from "./ship.js";

export default Object.freeze({
  [ship.SmallCargoShip]: [2e3, 2e3, 0e3],
  [ship.LargeCargoShip]: [6e3, 6e3, 0e3],
  [ship.LightFighter]: [3e3, 1e3, 0e3],
  [ship.HeavyFighter]: [6e3, 4e3, 0e3],
  [ship.Cruiser]: [20e3, 7e3, 2e3],
  [ship.Battleship]: [45e3, 15e3, 0e3],
  [ship.ColonyShip]: [10e3, 20e3, 10e3],
  [ship.Recycler]: [10e3, 6e3, 2e3],
  [ship.EspionageProbe]: [0e3, 1e3, 0e3],
  [ship.Bomber]: [50e3, 25e3, 15e3],
  [ship.SolarSatellite]: [0e3, 2e3, 0.5e3],
  [ship.Destroyer]: [60e3, 50e3, 15e3],
  [ship.DeathStar]: [5e6, 4e6, 1e6], /* RIP */
  [ship.Battlecruiser]: [30e3, 40e3, 15e3],
  [ship.Crawler]: [2e3, 2e3, 1e3],
  [ship.Reaper]: [85e3, 55e3, 20e3],
  [ship.Pathfinder]: [8e3, 15e3, 8e3],
});
