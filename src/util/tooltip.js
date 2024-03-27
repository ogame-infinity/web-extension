import { createDOM } from "./dom.js";

const senders = [];
let keepTooltip = true;

export function tooltip(sender, content, autoHide, side, timer) {
  side = side || {};
  timer = timer || 500;
  let tooltip = document.querySelector(".ogl-tooltip");
  document.querySelector(".ogl-tooltip > div") && document.querySelector(".ogl-tooltip > div").remove();
  let close = document.querySelector(".close-tooltip");
  if (!tooltip) {
    tooltip = document.body.appendChild(createDOM("div", { class: "ogl-tooltip" }));
    close = tooltip.appendChild(createDOM("a", { class: "close-tooltip" }));
    close.addEventListener("click", (e) => {
      e.stopPropagation();
      tooltip.classList.remove("ogl-active");
    });
    document.body.addEventListener("click", (event) => {
      if (
        !event.target.getAttribute("rel") &&
        !event.target.closest(".tooltipRel") &&
        !event.target.classList.contains("ogl-colors") &&
        !tooltip.contains(event.target)
      ) {
        tooltip.classList.remove("ogl-active");
        keepTooltip = false;
      }
    });
  }
  tooltip.classList.remove("ogl-update");

  if (!senders.includes(sender)) {
    tooltip.classList.remove("ogl-active");
  }

  tooltip.classList.remove("ogl-autoHide");
  tooltip.classList.remove("ogl-tooltipLeft");
  tooltip.classList.remove("ogl-tooltipRight");
  tooltip.classList.remove("ogl-tooltipBottom");

  senders.push(sender);

  const rect = sender.getBoundingClientRect();
  const win = sender.ownerDocument.defaultView;
  const position = {
    x: rect.left + win.pageXOffset,
    y: rect.top + win.pageYOffset,
  };
  if (side.left) {
    tooltip.classList.add("ogl-tooltipLeft");
    position.y -= 20;
    position.y += rect.height / 2;
  } else if (side.right) {
    tooltip.classList.add("ogl-tooltipRight");
    position.x += rect.width;
    position.y -= 20;
    position.y += rect.height / 2;
  } else if (side.bottom) {
    tooltip.classList.add("ogl-tooltipBottom");
    position.x += rect.width / 2;
    position.y += rect.height;
  } else {
    position.x += rect.width / 2;
  }
  if (sender.classList.contains("tooltipOffsetX")) {
    position.x += 33;
  }
  if (autoHide) {
    tooltip.classList.add("ogl-autoHide");
  }
  tooltip.appendChild(content);
  tooltip.style.top = position.y + "px";
  tooltip.style.left = position.x + "px";
  const tooltipTimer = setTimeout(() => tooltip.classList.add("ogl-active"), timer);
  if (!sender.classList.contains("ogl-tooltipInit")) {
    sender.classList.add("ogl-tooltipInit");
    sender.addEventListener("mouseleave", () => {
      if (autoHide) {
        tooltip.classList.remove("ogl-active");
      }
      clearTimeout(tooltipTimer);
    });
  }
  return tooltip;
}
