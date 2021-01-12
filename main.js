function injectScript(path, cb, module = false) {
  var s = document.createElement("script");
  s.src = chrome.extension.getURL(path);
  if (module) {
    s.type = "module";
  }

  (document.head || document.documentElement).appendChild(s);
  s.onload = () => {
    s.remove();
    cb && cb();
  };
}

const UNIVERSE = window.location.host.split(".")[0];

if (window.location.href.includes("galaxy")) {
  var s = document.createElement("script");
  s.innerHTML = `
    const check = () => {
      if (window.loadContent != undefined) {
        window.loadGalaxy = loadContent;
        loadContent = () => {}
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  `;
  s.onload = function () {
    s.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

if (window.location.href.includes("highscore")) {
  var s = document.createElement("script");
  s.innerHTML = `
    const check = () => {
      if (window.initHighscoreContent != undefined) {
        initHighscoreContent = () => {}
      } else {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  `;
  s.onload = function () {
    s.remove();
  };
  (document.head || document.documentElement).appendChild(s);
}

window.addEventListener("DOMContentLoaded", (event) => {
  injectScript("ogkush.js", null, true);
});

document.addEventListener("ogi-chart", function (e) {
  injectScript("libs/chart.min.js", () => {
    injectScript("libs/chartjs-plugin-labels.js");
  });
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

document.addEventListener("ogi-notification", function (e) {
  const msg = Object.assign({ iconUrl: "res/logo128.png" }, e.detail);
  chrome.runtime.sendMessage(
    { type: "notification", universe: UNIVERSE, message: msg },
    function (response) {}
  );
});
