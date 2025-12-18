console.log("content.js loaded");

function sendText(reason) {
  const text = document.body ? document.body.innerText : "";

  chrome.runtime.sendMessage({
    type: "PAGE_TEXT",
    reason,
    url: location.href,
    title: document.title,
    text,
    textLength: text.length,
    timestamp: Date.now()
  });

  console.log("Text sent:", reason);
}

// Archive once after 10 seconds
setTimeout(() => {
  sendText("initial_archive");
}, 10_000);

// Replace/update every 1 minute
setInterval(() => {
  sendText("periodic_update");
}, 60_000);
