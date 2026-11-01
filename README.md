# N.E.L.L.Y. Web — Pink / Black / Gold / Purple

Responsive web companion with text chat via Claude API, browser speech recognition, voice replies, wake phrase (where supported), animated avatar, and voice settings.

## Run locally
1. Install Node.js 18 or later.
2. Open a terminal in this folder and run `npm install`.
3. Copy `.env.example` to `.env` and put your **Anthropic API key** in `ANTHROPIC_API_KEY`.
4. Run `npm start`.
5. Open `http://localhost:3000` in Chrome or Edge.

## Important
- Signing in to Claude's website is **not** the same as having an Anthropic API key. Obtain an API key from console.anthropic.com; API billing is separate from Claude web subscriptions. Never paste an API key into the web page or expose `.env` publicly.
- The API key is read only by the server, not sent to the browser. For public hosting, add authentication, durable rate limiting, and other abuse controls before sharing widely.
- Browser microphone access requires localhost or HTTPS, plus user permission. Browser speech recognition availability differs by device/browser. Wake phrase only works while the tab is open and listening; mobile/background restrictions apply. Browser speech recognition may use the browser vendor's online service.
- This is a stylized CSS avatar, not a real 3D model. It animates when listening/speaking.
- This web edition cannot directly launch arbitrary desktop apps or access local files; those features remain in the desktop version.
- The default model is configured in `.env`; if Anthropic no longer offers it, set `ANTHROPIC_MODEL` to a model available to your account.


## Version 2 — portrait status lighting
The supplied portrait is used as Nelly's avatar in `public/nelly-avatar.jpg`. Idle is pink, thinking is blue-purple, errors are red, listening is pink-purple, and speaking is bright pink. These states are driven by browser chat/microphone events. API keys stay only in `.env` on the server; do not place keys in browser code.

**Privacy:** The supplied portrait is served to visitors of this site. Do not deploy publicly unless you have the pictured person's permission. The website does not include login/access control; add authentication before public hosting to prevent others from using your paid Claude API.
