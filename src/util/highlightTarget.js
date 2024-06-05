const rawUrl = new URL(window.location.href);
const page = rawUrl.searchParams.get("component") || rawUrl.searchParams.get("page");
let highlighted = [0, 0, 0];

export function setHighlightCoords(coords) {
  highlighted = coords.split(":");
}

export default function () {
  if (page !== "galaxy") return;

  const coords = highlighted;

  document.querySelectorAll("#galaxyContent .ogl-highlighted").forEach(function (el) {
    el.classList.remove("ogl-highlighted");
  });

  if (
    document.querySelector("#galaxy_input").value === coords[0] &&
    document.querySelector("#system_input").value === coords[1]
  ) {
    const target = document.querySelectorAll("#galaxyContent .galaxyRow.ctContentRow")[parseInt(coords[2]) - 1];
    if (target) target.classList.add("ogl-highlighted");
  }
  document.querySelectorAll("a[data-coords]").forEach((a) => {
    const hCoords = a.getAttribute("data-coords").split(":");
    if (
      document.querySelector("#galaxy_input").value === hCoords[0] &&
      document.querySelector("#system_input").value === hCoords[1]
    ) {
      a.classList.add("ogl-active");
    } else {
      a.classList.remove("ogl-active");
    }
  });
}
