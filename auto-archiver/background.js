console.log("Background service worker started");

function identifySite(url) {
  try {
    const host = new URL(url).hostname;
    if (host.includes("youtube.com")) return "youtube";
    if (host.includes("medium.com")) return "medium";
    if (host.includes("github.com")) return "github";
    return "generic";
  } catch {
    return "generic";
  }
}

function makeFilename(url) {
  const u = new URL(url);
  const date = new Date().toISOString().slice(0, 10);
  const site = identifySite(url);

  let slug = u.pathname
    .replace(/\/+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "");

  if (!slug || slug === "_") slug = "home";

  return `${date}__${site}__${slug}.txt`;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "PAGE_TEXT") return;

  const filename = makeFilename(message.url);

  console.log(
    `Downloading (${message.reason}) → ${filename}`,
    "length:",
    message.textLength
  );

  const dataUrl =
    "data:text/plain;charset=utf-8," +
    encodeURIComponent(message.text);

  chrome.downloads.download({
    url: dataUrl,
    filename: `web_archive/${filename}`,
    conflictAction: "overwrite",
    saveAs: false
  });
});
