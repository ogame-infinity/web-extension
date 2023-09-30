(async () => {
  const src = chrome.runtime.getURL("./ctxcontent/index.js");
  const contentScript = await import(src);
  contentScript.main();
})();
