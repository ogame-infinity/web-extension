const language = document.cookie.match(/oglocale=([a-z]+)/)?.[1] || "en";

let currentLanguage = ["ar", "mx"].includes(language) ? "es" : language;
currentLanguage = ["de", "en", "es", "fr", "tr", "br"].includes(currentLanguage) ? currentLanguage : "en";

const baseUri = document.getElementById("ogi-script").getAttribute("data-base-uri");

const response = await fetch(`${baseUri}util/translations/${currentLanguage}.json`);
const translations = await response.json();

export function translate(key, type = "text") {
  return translations?.[type]?.[key] || "";
}
