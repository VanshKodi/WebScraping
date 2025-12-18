console.log("Background started");

let activeTabId = null;

// Track focused tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId;
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (tabs[0]) activeTabId = tabs[0].id;
  });
});

// Answer focus queries
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "IS_ACTIVE_TAB") {
    sendResponse({ active: sender.tab?.id === activeTabId });
    return;
  }

  if (msg.type !== "PAGE_CAPTURE") return;

  chrome.storage.local.get(
    ["enabled", "sizeThreshold", "forceSave", "pageState"],
    (res) => {
      if (!res.enabled) return;

      const threshold = (res.sizeThreshold ?? 5) * 1024;
      const pageState = res.pageState ?? {};
      const prev = pageState[msg.url];

      let shouldSave = false;

      if (!prev) {
        shouldSave = true;
      } else if (res.forceSave) {
        shouldSave = true;
      } else if (Math.abs(msg.size - prev.size) >= threshold) {
        shouldSave = true;
      }

      if (!shouldSave) {
        console.log("Skipped (no significant change)");
        return;
      }

      // Save metadata
      pageState[msg.url] = {
        size: msg.size,
        savedAt: Date.now()
      };

      chrome.storage.local.set({ pageState });

      saveData(msg);
    }
  );
});

function saveData(payload) {
  const date = new Date().toISOString().slice(0, 10);
  const slug = payload.url
    .replace(/https?:\/\//, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 80);

  const filename = `${date}__${slug}.txt`;

  const dataUrl =
    "data:text/plain;charset=utf-8," +
    encodeURIComponent(payload.content);

  chrome.downloads.download({
    url: dataUrl,
    filename: `web_archive/${filename}`,
    conflictAction: "overwrite",
    saveAs: false
  });

  console.log("Saved:", filename);
}
