// chrome.action.onClicked.addListener((() => {
//     chrome.tabs.create({url: "https://lobby.ogame.gameforge.com/"})
// }));

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == 'notification') {
    chrome.notifications.create('', request.message);
    return sendResponse(request.message);
  }
});

/*
chrome.runtime.onStartup.addListener(function () {
    chrome.storage.local.clear()
}) */
