document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const init = document.getElementById("initialDelay");
  const auto = document.getElementById("autosaveDelay");
  const size = document.getElementById("sizeThreshold");
  const force = document.getElementById("forceSave");

  const initVal = document.getElementById("initVal");
  const autoVal = document.getElementById("autoVal");
  const sizeVal = document.getElementById("sizeVal");

  function updateLabels() {
    initVal.textContent = `${init.value}s`;
    autoVal.textContent = `${auto.value}s`;
    sizeVal.textContent = `${size.value}kb`;
  }

  chrome.storage.local.get(
    ["enabled", "initialDelay", "autosaveDelay", "sizeThreshold", "forceSave"],
    (res) => {
      toggle.textContent = res.enabled ? "Disable" : "Enable";
      init.value = res.initialDelay ?? 10;
      auto.value = res.autosaveDelay ?? 60;
      size.value = res.sizeThreshold ?? 5;
      force.checked = res.forceSave ?? false;
      updateLabels();
    }
  );

  toggle.onclick = () => {
    chrome.storage.local.get(["enabled"], (res) => {
      chrome.storage.local.set({ enabled: !res.enabled });
      toggle.textContent = res.enabled ? "Enable" : "Disable";
    });
  };

  init.oninput = () => {
    chrome.storage.local.set({ initialDelay: +init.value });
    updateLabels();
  };

  auto.oninput = () => {
    chrome.storage.local.set({ autosaveDelay: +auto.value });
    updateLabels();
  };

  size.oninput = () => {
    chrome.storage.local.set({ sizeThreshold: +size.value });
    updateLabels();
  };

  force.onchange = () => {
    chrome.storage.local.set({ forceSave: force.checked });
  };
});
