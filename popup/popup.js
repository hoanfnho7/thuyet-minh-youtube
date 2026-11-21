(() => {
  "use strict";

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const msg = chrome.i18n?.getMessage(key);
    if (msg) el.textContent = msg;
  });

  const openaiInput = document.getElementById("openaiKey");
  const googleInput = document.getElementById("googleKey");
  const saveBtn = document.getElementById("saveBtn");
  const savedStatus = document.getElementById("savedStatus");

  chrome.storage.local.get(["byokConfig"], (res) => {
    if (res?.byokConfig) {
      openaiInput.value = res.byokConfig.openaiApiKey || "";
      googleInput.value = res.byokConfig.googleApiKey || "";
    }
  });

  saveBtn.addEventListener("click", () => {
    chrome.storage.local.set(
      {
        byokConfig: {
          openaiApiKey: openaiInput.value.trim(),
          googleApiKey: googleInput.value.trim()
        }
      },
      () => {
        savedStatus.textContent = chrome.i18n?.getMessage("popupSavedMsg") || "Saved!";
        setTimeout(() => {
          savedStatus.textContent = "";
        }, 1800);
      }
    );
  });
})();