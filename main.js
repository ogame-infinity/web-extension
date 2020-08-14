function injectScript(path) {
  var s = document.createElement("script");
  s.src = chrome.extension.getURL(path);
  document.head.appendChild(s);
  s.onload = function () {
    s.remove();
  };
}

const UNIVERSE = window.location.host.split(".")[0];

if (window.location.href.includes("galaxy")) {
  let inter = setInterval(() => {
    if (document.head) {
      clearInterval(inter);
      var s = document.createElement("script");
      s.innerHTML = `
        let inter = setInterval(() => {
          if (loadContent) {
            clearInterval(inter)
            window.loadGalaxy = loadContent;
            loadContent = () => {}
          }
        }, 10);`;
      document.head.appendChild(s);
      s.onload = function () {
        s.remove();
      };
    }
  }, 1);
}

window.addEventListener("DOMContentLoaded", (event) => {
  injectScript("ogkush.js");
});

document.addEventListener("ogi-chart", function (e) {
  injectScript("libs/chart.min.js");
  setTimeout(() => {
    injectScript("libs/chartjs-plugin-labels.js");
  }, 150);
});

window.addEventListener(
  "ogi-expedition",
  function (evt) {
    let request = evt.detail;
    // do Chrome things with request.data, add stuff to response.data
    chrome.runtime.sendMessage(
      { type: "expedition", message: request.message },
      function (response) {
        var clone = response;
        if (navigator.userAgent.indexOf("Firefox") > 0) {
          clone = cloneInto(response, document.defaultView);
        }
        clone.requestId = request.requestId;
        window.dispatchEvent(
          new CustomEvent("ogi-expedition-rep", { detail: clone })
        );
      }
    );
  },
  false
);

window.addEventListener(
  "ogi-players",
  function (evt) {
    let request = evt.detail;
    // var response = {requestId: request.id};
    // do Chrome things with request.data, add stuff to response.data
    chrome.runtime.sendMessage(
      { type: "get", universe: UNIVERSE, id: request.id },
      function (response) {
        var clone = response;
        if (navigator.userAgent.indexOf("Firefox") > 0) {
          clone = cloneInto(response, document.defaultView);
        }
        clone.requestId = request.requestId;
        window.dispatchEvent(
          new CustomEvent("ogi-players-rep", { detail: clone })
        );
        // }
      }
    );
  },
  false
);

window.addEventListener(
  "ogi-filter",
  function (evt) {
    let request = evt.detail;
    // var response = {requestId: request.id};
    // do Chrome things with request.data, add stuff to response.data
    chrome.runtime.sendMessage(
      {
        type: "filter",
        universe: UNIVERSE,
        name: request.name,
        alliance: request.alliance,
      },
      function (response) {
        var clone = response;
        if (navigator.userAgent.indexOf("Firefox") > 0) {
          clone = cloneInto(response, document.defaultView);
        }

        clone.requestId = request.requestId;
        window.dispatchEvent(
          new CustomEvent("ogi-filter-rep", { detail: clone })
        );
        // }
      }
    );
  },
  false
);

document.addEventListener("ogi-galaxy", function (e) {
  chrome.runtime.sendMessage(
    { type: "galaxy", universe: UNIVERSE, changes: e.detail },
    function (response) {}
  );
});

document.addEventListener("ogi-clear", function (e) {
  chrome.runtime.sendMessage(
    { type: "clear", universe: UNIVERSE, changes: e.detail },
    function (response) {}
  );
});
