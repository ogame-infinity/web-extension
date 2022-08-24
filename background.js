chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.type == "notification") {
    chrome.notifications.create("", request.message);
    return sendResponse(request.message);
  }
});
