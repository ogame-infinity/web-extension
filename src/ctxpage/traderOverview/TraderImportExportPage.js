import { getOption, setOption } from "../conf-options.js";
import * as DOM from "../../util/dom.js";
import { getLogger } from "../../util/logger.js";
import OGIData from "../../util/OGIData.js";
import * as wait from "../../util/wait.js";
import OgamePageData from "../../util/OgamePageData.js";

class TraderImportExportPage {
  logger;

  constructor() {
    this.logger = getLogger("TraderImportExportPage");
  }

  #isImportExportActiveRequest() {
    const abortController = new AbortController();
    window.onbeforeunload = () => abortController.abort();

    const searchParams = OgamePageData.isAtLeast_13_0_0
      ? new URLSearchParams({ page: "componentOnly", component: "externaldataexport", action: "importExportInfo", asJson: "1" })
      : new URLSearchParams({ page: "ajax", component: "traderimportexport" })

    if(OgamePageData.isAtLeast_13_0_0) {
      return fetch(`?${searchParams.toString()}`, { signal: abortController.signal, headers: {"X-Requested-With": "XMLHttpRequest"} })
      .then((response) => response.json())
      .then((data) =>  {
        if(data)
        {
          if(data.hasBought == 'false' || data.gotItem == 'false') return { active: true, rarity: data.rarity };
          return { active: false };
          /*
          rarity:
          rare ?
          uncommon => confirmed
          common ?
          buddy ?
          epic ?
           */
        }
      });
    }
    else
    {
      return fetch(`?${searchParams.toString()}`, { signal: abortController.signal })
        .then((response) => response.text())
        .then((string) => new DOMParser()
          .parseFromString(string, "text/html")
          .querySelector("#div_traderImportExport .content .right_content"))
        .then((element) => this.#isImportExportActive(element));
    }
  }

  #isImportExportActive(element) {
    const paymentElement = element.querySelector(".payment");
    const bargain_overlay = element.querySelector(".bargain_overlay");

    if (paymentElement.style.display === "block") {
      return { active: true };
    }

    if (
      bargain_overlay &&
      (bargain_overlay.querySelector(".bargain.import_bargain.change:not(.hidden)") ||
        bargain_overlay.querySelector(".bargain.import_bargain.take:not(.hidden)"))
    ) {
      return { active: true };
    }
    return { active: false };
  }

  RemindMeImportExport(page) {
    const importExportReminderMode = getOption("importExportReminderMode");
    if (importExportReminderMode == 0) return;

    const addHint = (element) => {
      if (!element) return;

      if (importExportReminderMode == 1 && !element.querySelector(".smoothSpanReminder"))
        element.appendChild(DOM.createDOM("span", { class: "smoothSpanReminder" }, "*"));
      else if (importExportReminderMode == 2) {
        if (!element.classList.contains("ipiHintable")) {
          element.classList.add("ipiHintable");
        }
        if (!element.classList.contains("ipiHintActive")) {
          element.classList.add("ipiHintActive");
        }
      }
    };

    const getNextReminderDate = () => {
      //get the next quarter hour
      const next = new Date();
      const minutes = next.getMinutes();
      const nextQuarter = Math.ceil(minutes / 15) * 15;

      if (nextQuarter === 60) {
        next.setMinutes(0);
        next.setHours(next.getHours() + 1);
      } else {
        next.setMinutes(nextQuarter);
      }

      next.setSeconds(0);
      next.setMilliseconds(0);

      return next.toISOString();
    };
    const isObsolete = () => {
      const now = new Date();
      const nextReminder = new Date(OGIData._json.reminders["importExport"].next);
      return nextReminder < now;
    };

    const updateReminder = (date, mustRemind, rarity = null) => {
      const importExportData = OGIData._json.reminders["importExport"] || {};
      importExportData.next = date;
      importExportData.mustRemind = mustRemind;
      if(rarity) importExportData.rarity = rarity;

      OGIData._json.reminders["importExport"] = importExportData;
      OGIData.Save();
    };

    // Initialize reminder if not set
    if (!OGIData._json.reminders["importExport"]) updateReminder(new Date(0).toISOString(), false);

    const remind = () => {
      if (OGIData._json.reminders["importExport"].mustRemind) {
        this.logger.debug("Showing import/export reminder");

        const menuItem =
          document.querySelector("#left .menubutton[data-ipi-hint='ipiToolbarTrader']") ??
          document.querySelector("#leftMenu .menubutton[data-ipi-hint='ipiToolbarTrader']");
        if (page == (OgamePageData.isAtLeast_13_0_0 ? "trader" : "traderOverview")) {
          const importExportShop = document.querySelector(OgamePageData.isAtLeast_13_0_0 ? "#js_importexport" : "#js_traderImportExport");
          if (importExportShop) {
            if (importExportReminderMode == 1) {
              addHint(menuItem);
              addHint(importExportShop.querySelector("h2"));
            } else if (importExportReminderMode == 2) addHint(importExportShop);
            importExportShop.addEventListener("click", () => {
              wait.waitForQuerySelector(OgamePageData.isAtLeast_13_0_0 ? "#div_importexport" : "#div_traderImportExport", 250, 10000).then((traderImportExportDiv) => {
                const importExportStatus = this.#isImportExportActive(traderImportExportDiv);
                if (importExportStatus.active) {
                  // Import/export is active, wee need to detect when user clicks the take button
                  const paymentElement = traderImportExportDiv.querySelector(".payment");
                  const payButton = traderImportExportDiv.querySelector("a.pay ");
                  if (payButton && paymentElement && paymentElement.style.display === "block") {
                    payButton.addEventListener("click", () => {
                      wait.waitForQuerySelector("a.bargain.import_bargain.take", 250, 10000).then((takeButton) => {
                        addHint(takeButton);
                        //take button is now available, we can update the reminder (in case user does not take it now), and add a listener to it
                        updateReminder(getNextReminderDate(), true);
                        takeButton.addEventListener("click", () => {
                          // User has clicked the import/export take, do not remind for a while
                          updateReminder(getNextReminderDate(), false);
                        });
                      });
                    });
                  } else {
                    // No pay button, probably an active import/export ready to take
                    const takeButton = traderImportExportDiv.querySelector("a.bargain.import_bargain.take");
                    if (takeButton) {
                      addHint(takeButton);
                      //take button is now available, we can update the reminder (in case user does not take it now), and add a listener to it
                      updateReminder(getNextReminderDate(), true);
                      takeButton.addEventListener("click", () => {
                        // User has clicked the import/export take, do not remind for a while
                        updateReminder(getNextReminderDate(), false);
                      });
                    }
                  }
                } else {
                  // Import/export is not active, do not remind for a while
                  updateReminder(getNextReminderDate(), false);
                }
              });
            });
          }
        } else {
          addHint(menuItem);
        }
      }
    };

    if (isObsolete()) {
      //check the import/export page only if the reminder is obsolete.
      this.#isImportExportActiveRequest().then((status) => {
        //immediately update the reminder to avoid multiple checks
        updateReminder(getNextReminderDate(), status.active, status.rarity);
        // show the reminder if import/export is active
        if (status.active) remind();
      });
    } else remind();
  }
}

export default TraderImportExportPage;
