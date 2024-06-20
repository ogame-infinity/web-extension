import { createDOM } from "./dom.js";
import OGIData from "./OGIData.js";

const senders = [];
let keepTooltip = OGIData.keepTooltip || true;
let currentSender = null;

export function tooltip(sender, content, autoHide, side, timer, mouseoverEnable = false) {
  side = side || {};
  timer = timer || 500;

  let tooltip = document.querySelector(".ogl-tooltip");

  if (currentSender === sender && !!tooltip?.classList.contains("ogl-active")) {
    return;
  }

  currentSender = sender;

  if (tooltip) {
    tooltip.remove();
  }

  tooltip = document.body.appendChild(createDOM("div", { class: "ogl-tooltip" }));
  const close = tooltip.appendChild(createDOM("a", { class: "close-tooltip" }));
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
      OGIData.keepTooltip = keepTooltip;
    }
  });

  tooltip.classList.remove("ogl-update");

  if (!senders.includes(sender)) {
    tooltip.classList.remove("ogl-active");
  }

  tooltip.classList.remove("ogl-autoHide");
  tooltip.classList.remove("ogl-tooltipLeft");
  tooltip.classList.remove("ogl-tooltipRight");
  tooltip.classList.remove("ogl-tooltipBottom");

  senders.push(sender);

  const copy = content.cloneNode(true);
  copy.style.opacity = 0;
  document.querySelector("body").appendChild(copy);
  const contentHeight = copy.offsetHeight;
  copy.remove();

  const rect = sender.getBoundingClientRect();
  const win = sender.ownerDocument.defaultView;
  const position = {
    x: rect.left + win.scrollX,
    y: rect.top + win.scrollY,
  };

  if (side.auto) {
    if (contentHeight > position.y) side.bottom = true;
  }

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

    tooltip.addEventListener("mouseleave", (e) => {
      if (e.relatedTarget === sender || !mouseoverEnable) return;

      if (autoHide) {
        tooltip.classList.remove("ogl-active");
        sender.classList.remove("ogl-tooltipInit");
      }

      clearTimeout(tooltipTimer);
    });

    sender.addEventListener("mouseleave", (e) => {
      if (e?.relatedTarget?.classList?.contains("ogl-tooltip") && mouseoverEnable) return;

      if (autoHide) {
        tooltip.classList.remove("ogl-active");
        sender.classList.remove("ogl-tooltipInit");
      }

      clearTimeout(tooltipTimer);
    });
  }
  return tooltip;
}
