let requestId = 0;

function get(playerId) {
  this.requestId++;
  return new Promise(function (resolve) {
    const listener = function (evt) {
      if (evt.detail.requestId === requestId) {
        window.removeEventListener("ogi-players-rep", listener);
        resolve(evt.detail.player);
      }
    };
    window.addEventListener("ogi-players-rep", listener);
    const payload = { requestId, id: playerId };
    window.dispatchEvent(new CustomEvent("ogi-players", { detail: payload }));
  });
}

function status(status, noob) {
  if (status === "" || status === undefined) {
    if (noob) return "status_abbr_noob";
    return "status_abbr_active";
  }
  if (status.includes("b")) return "status_abbr_banned";
  if (status.includes("v")) return "status_abbr_vacation";
  if (status.includes("i")) return "status_abbr_inactive";
  if (status.includes("I")) return "status_abbr_longinactive";
  if (status.includes("o")) return "status_abbr_outlaw";
}

export default {
  get,
  status,
};
