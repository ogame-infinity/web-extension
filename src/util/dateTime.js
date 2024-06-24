export default {
  timeSince: (date) => {
    let seconds = Math.floor((new Date(localTime) - date) / 1e3);
    let interval = Math.floor(seconds / 86400);
    let since = "";
    if (interval >= 1) {
      since += interval + "d ";
    }
    seconds = seconds % 86400;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
      since += interval + "h ";
    }
    seconds = seconds % 3600;
    interval = Math.floor(seconds / 60);
    if (interval >= 1 && since.indexOf("d") === -1) {
      since += interval + "m";
    }
    if (since === "") {
      since = "Just now";
    } else {
      since += " ago";
    }
    return since;
  },
};
