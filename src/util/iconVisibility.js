import iconMode from "./enum/iconMode.js";

function shouldDisplayIcon(mode = 1) {
  if (parseInt(mode) === iconMode.HIDDEN) {
    return false;
  }
  return true;
}
function shouldAddIconTooltip(mode = 1) {
  if (parseInt(mode) === iconMode.VISIBLE_WITH_TOOLTIP || parseInt(mode) === iconMode.VISIBLE_WITH_TOOLTIP_AND_LINK) {
    return true;
  }

  return false;
}
function shouldAddIconRedirection(mode = 1) {
  if (parseInt(mode) === iconMode.VISIBLE_WITH_LINK || parseInt(mode) === iconMode.VISIBLE_WITH_TOOLTIP_AND_LINK) {
    return true;
  }
  return false;
}

export { shouldDisplayIcon, shouldAddIconTooltip, shouldAddIconRedirection };
