/*
 * nelly-wake.js - lets desktop Nelly (nelly.py) wake the on-page Nelly.
 * Add to your site's HTML, before </body>:   <script src="/nelly-wake.js"></script>
 *
 * Wake sources: the local nelly.py (double clap / "Hey Nelly") over ws://127.0.0.1:8765,
 * or opening the page with ?wake=1 (what nelly.py does when the site isn't open yet).
 *
 * To control what "wake" does, define your own before this script loads:
 *   window.nellyWake = (source) => { ... };
 * Otherwise it taps Nelly's portrait, which is the page's "say hello" action.
 */
(() => {
  const PORT = 8765, COOLDOWN = 4000;
  let last = 0;

  function wake(source) {
    const now = Date.now();
    if (now - last < COOLDOWN) return;
    last = now;
    console.log("[Nelly] wake from", source);
    if (typeof window.nellyWake === "function") return window.nellyWake(source);
    const portrait = document.querySelector('img[alt*="Nelly" i]');
    if (portrait) portrait.click();
  }

  function connect() {
    let ws;
    try { ws = new WebSocket(`ws://127.0.0.1:${PORT}`); } catch { return; }
    ws.onmessage = (e) => { if (e.data === "wake") wake("desktop"); };
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
