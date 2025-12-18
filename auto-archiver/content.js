console.log("content.js loaded");

let initialTimeout = null;
let autosaveInterval = null;

function clearTimers() {
  if (initialTimeout) clearTimeout(initialTimeout);
  if (autosaveInterval) clearInterval(autosaveInterval);
  initialTimeout = autosaveInterval = null;
}

function setupTimers() {
  chrome.storage.local.get(
    ["enabled", "initialDelay", "autosaveDelay"],
    (res) => {
      if (!res.enabled) return;

      const initial = (res.initialDelay ?? 10) * 1000;
      const autosave = (res.autosaveDelay ?? 60) * 1000;

      clearTimers();

      initialTimeout = setTimeout(() => capture("initial"), initial);
      autosaveInterval = setInterval(() => capture("periodic"), autosave);

      console.log("Timers started");
    }
  );
}
function extractCleanText() {
  if (!document.body) return "";

  // Clone DOM so we don't modify the page
  const clone = document.body.cloneNode(true);

  // Remove common semantic elements
  clone.querySelectorAll(
    "nav, footer, header, aside, script, style, noscript"
  ).forEach(el => el.remove());

  // Remove by class (add as needed)
  const bannedClasses = [
    "navbar",
    "nav",
    "sidebar",
    "footer",
    "header",
    "menu",
    "ads",
    "advertisement"
  ];

  bannedClasses.forEach(cls => {
    clone.querySelectorAll(`.${cls}`).forEach(el => el.remove());
  });

  return clone.innerText;
}
function extractCleanHTML() {
  const clone = document.documentElement.cloneNode(true);

  clone.querySelectorAll(
    "nav, footer, header, aside, script, style, noscript"
  ).forEach(el => el.remove());

  return "<!DOCTYPE html>\n" + clone.outerHTML;
}

function capture(reason) {
  chrome.runtime.sendMessage({ type: "IS_ACTIVE_TAB" }, (res) => {
    if (!res?.active) return;

    const content = document.body ? extractCleanText() : "";

    chrome.runtime.sendMessage({
      type: "PAGE_CAPTURE",
      url: location.href,
      title: document.title,
      content,
      size: content.length,
      reason
    });

    console.log("Captured:", reason);
  });
}

// Initial focus check
chrome.runtime.sendMessage({ type: "IS_ACTIVE_TAB" }, (res) => {
  if (res?.active) setupTimers();
});

// React to focus / settings changes
chrome.storage.onChanged.addListener(() => {
  clearTimers();
  chrome.runtime.sendMessage({ type: "IS_ACTIVE_TAB" }, (res) => {
    if (res?.active) setupTimers();
  });
});
