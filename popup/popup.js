(() => {
  "use strict";
  const openaiInput = document.getElementById("openaiApiKey");
  const googleInput = document.getElementById("googleApiKey");
  const saveBtn = document.getElementById("saveBtn");
  const statusEl = document.getElementById("status");

  chrome.storage.local.get(["byokConfig"], (res) => {
    const cfg = res?.byokConfig || {};
    if (cfg.openaiApiKey) openaiInput.value = cfg.openaiApiKey;
    if (cfg.googleApiKey) googleInput.value = cfg.googleApiKey;
  });

  saveBtn.addEventListener("click", () => {
    const byokConfig = {
      openaiApiKey: openaiInput.value.trim(),
      googleApiKey: googleInput.value.trim()
    };
    chrome.storage.local.set({ byokConfig }, () => {
      statusEl.textContent = "Đã lưu cài đặt!";
      setTimeout(() => (statusEl.textContent = ""), 2000);
    });
  });
})();