import ship from "./ship.js";
import defense from "./defense.js";
import missile from "./missile.js";

export default Object.freeze({
  ...ship,
  ...defense,
  ...missile,
});
