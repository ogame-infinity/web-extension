import defence from "./defence.js";

export default Object.freeze({
  [defence.RocketLauncher]: [2e3, 0e3, 0e3],
  [defence.LightLaser]: [15e2, 5e2, 0e2],
  [defence.HeavyLaser]: [6e3, 2e3, 0e3],
  [defence.GaussCannon]: [20e3, 15e3, 2e3],
  [defence.IonCannon]: [5e3, 3e3, 0e3],
  [defence.PlasmaTurret]: [50e3, 50e3, 30e3],
  [defence.SmallShieldDome]: [10e3, 10e3, 0e3],
  [defence.LargeShieldDome]: [50e3, 50e3, 0e3],
  [defence.AntiBallisticMissiles]: [8e3, 2e3, 0e3],
  [defence.InterplanetaryMissiles]: [125e2, 25e2, 100e2],
});
