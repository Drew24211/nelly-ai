/*
 * nelly-wake.js - connects your site to the desktop nelly.py.
 * Add to your site's HTML, before </body>:   <script src="nelly-wake.js"></script>
 *
 * It does two things:
 *  1. WAKE   - nelly.py hears a double clap / "Hey Nelly" and wakes the on-page Nelly.
 *  2. HEARD  - everything nelly.py hears is shown on screen as text, so you can see she's listening.
 *
 * Hooks (define BEFORE this script to customise):
 *   window.nellyWake  = (source) => { ... };   // what "wake" does (default: taps the Nelly portrait)
 *   window.nellyHeard = (text)   => { ... };   // put the heard text into your chat
 *   window.NELLY_OVERLAY = false;              // hide the built-in "You: ..." bubble
 */
(() => {
  const PORT = 8765, COOLDOWN = 4000;
  let last = 0, bubbleEl = null, bubbleTimer = null;

  function wake(source) {
    const now = Date.now();
    if (now - last < COOLDOWN) return;
    last = now;
    console.log("[Nelly] wake from", source);
    if (typeof window.nellyWake === "function") return window.nellyWake(source);
    const portrait = document.querySelector('img[alt*="Nelly" i]');
    if (portrait) portrait.click();
  }

  function bubble(text, ms) {
    if (window.NELLY_OVERLAY === false) return;
    if (!bubbleEl) {
      bubbleEl = document.createElement("div");
      bubbleEl.style.cssText =
        "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(90vw,34rem);" +
        "padding:10px 16px;border-radius:999px;background:rgba(16,8,17,.92);color:#fbe9f6;" +
        "border:1px solid #ff8fd0;font:15px system-ui,sans-serif;z-index:2147483647;" +
        "box-shadow:0 4px 24px rgba(255,143,208,.35);transition:opacity .3s;pointer-events:none;";
      document.body.appendChild(bubbleEl);
    }
    bubbleEl.textContent = text;
    bubbleEl.style.opacity = "1";
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubbleEl.style.opacity = "0"; }, ms);
  }

  function onEvent(e) {
    let m;
    try { m = JSON.parse(e.data); } catch { m = { type: e.data }; }
    switch (m.type) {
      case "wake": wake("desktop"); break;
      case "listening": bubble("\u{1F399} Listening\u2026", 3000); break;
      case "unclear": bubble("\u{1F442} Heard something, couldn't make it out", 3000); break;
      case "error": bubble("\u26A0 " + (m.text || "error"), 4000); break;
      case "heard":
        bubble("You: " + m.text, 6000);
        if (typeof window.nellyHeard === "function") window.nellyHeard(m.text);
        break;
    }
  }

  function connect() {
    let ws;
    try { ws = new WebSocket(`ws://127.0.0.1:${PORT}`); } catch { return; }
    ws.onmessage = onEvent;
    ws.onclose = () => setTimeout(connect, 3000);
    ws.onerror = () => ws.close();
  }

  window.addEventListener("load", () => {
    connect();
    const p = new URLSearchParams(location.search);
    if (p.get("wake") === "1") {
      history.replaceState(null, "", location.pathname);
      setTimeout(() => wake("url"), 1200);
    }
  });
})();
