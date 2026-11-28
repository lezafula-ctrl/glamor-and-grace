(function () {
  "use strict";

  let installPrompt = null;
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./service-worker.js", { scope: "./" }).catch(function (error) {
        console.warn("G&G app setup could not register its offline helper:", error);
      });
    });
  }

  if (isStandalone) return;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    installPrompt = event;
    showInstallCard("install");
  });

  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    const card = document.getElementById("gg-pwa-card");
    if (card) card.remove();
  });

  function showInstallCard(mode) {
    if (document.getElementById("gg-pwa-card")) return;

    const card = document.createElement("aside");
    card.id = "gg-pwa-card";
    card.className = "gg-pwa-card";
    card.setAttribute("aria-label", "Install Glamor and Grace");
    card.innerHTML =
      '<img class="gg-pwa-card-icon" src="./icons/gg-app-icon.svg" alt="">' +
      '<div class="gg-pwa-card-copy"><strong>Get Glamor &amp; Grace</strong><span>' +
      (mode === "ios" ? "Add our store to your Home Screen for quick access." : "Install our store on your device for quick access.") +
      '</span><div id="gg-pwa-help" class="gg-pwa-help" hidden></div></div>' +
      '<div class="gg-pwa-actions"><button type="button" class="gg-pwa-install" id="gg-pwa-action">' +
      (mode === "ios" ? "How?" : "Install") +
      '</button><button type="button" class="gg-pwa-close" aria-label="Dismiss install message">×</button></div>';

    document.body.appendChild(card);
    card.querySelector(".gg-pwa-close").addEventListener("click", function () { card.remove(); });

    card.querySelector("#gg-pwa-action").addEventListener("click", async function () {
      const help = card.querySelector("#gg-pwa-help");
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        card.remove();
        return;
      }
      help.hidden = false;
      help.textContent = isIOS
        ? "In your browser, tap Share (the square with an arrow) or the browser menu, then choose “Add to Home Screen”. Confirm the name Glamor & Grace and tap Add."
        : "Open your browser menu (⋮ on Chrome or … on Edge) and choose “Install app” or “Add to Home screen”, if available.";
    });
  }

  if (isIOS) {
    window.addEventListener("DOMContentLoaded", function () { showInstallCard("ios"); });
  } else if (isAndroid) {
    window.addEventListener("DOMContentLoaded", function () {
      if (!installPrompt) showInstallCard("manual");
    });
  }
})();
