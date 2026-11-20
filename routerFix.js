(() => {
  "use strict";
  let lastUrl = location.href;

  const notifyNavigation = () => {
    const currentUrl = location.href;
    if (currentUrl === lastUrl) return;
    lastUrl = currentUrl;

    try {
      const u = new URL(currentUrl);
      if (u.pathname === "/watch" || u.pathname.startsWith("/shorts/")) {
        window.dispatchEvent(new CustomEvent("YT_DUB_NAVIGATION", { detail: { url: currentUrl } }));
      }
    } catch {}
  };

  window.addEventListener("yt-navigate-finish", notifyNavigation, true);
  window.addEventListener("yt-page-data-updated", notifyNavigation, true);
  window.addEventListener("popstate", notifyNavigation, true);

  const origPush = history.pushState;
  history.pushState = function (...args) {
    const res = origPush.apply(this, args);
    queueMicrotask(notifyNavigation);
    return res;
  };

  const origReplace = history.replaceState;
  history.replaceState = function (...args) {
    const res = origReplace.apply(this, args);
    queueMicrotask(notifyNavigation);
    return res;
  };
})();