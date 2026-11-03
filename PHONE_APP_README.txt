NELLY OFFICIAL HOME — PHONE APP UPDATE

This package upgrades your Nelly/Drew v12 Node website to an installable web app (PWA). It is not an Android APK.

DEPLOY ON YOUR EXISTING RENDER SERVICE
1. Replace the website source files in the GitHub repository linked to your existing Render service with the contents of this ZIP. Keep package.json, index.html and server.js at the repository root, as in this ZIP.
2. Keep your existing Render Environment values (Claude, Deepgram and ElevenLabs credentials). Do not put credentials into frontend files.
3. Deploy the updated repository in Render. Existing start command: npm start.
4. Open https://nelly-ai.onrender.com on your phone after the deployment completes.
5. Tap Install Nelly in the phone app panel, or use the browser menu's Install app / Add to home screen option. Availability depends on your browser. Open the resulting Nelly icon.

If you use the public/ upload layout, place ALL frontend assets (including manifest.webmanifest, sw.js, phone.js, phone.css, offline.html and both icons) alongside index.html inside public/. server.js and package.json stay at the repository root.

OFFICIAL DESIGN UPDATE
- Approved Nelly character portrait, pink idle glow, blue/purple thinking state and red error state.
- Greeting, voice control, Research composer shortcut, My day planner, live weather panel, music library, and bottom Home/Chat/Planner/Settings navigation.
- Voice, Models, Memory and additional tools remain available from Settings.
- Research opens a draft prompt in the existing chat; this update does not add a web-search provider.

WHAT THIS UPDATE ADDS
- Nelly home-screen icon and standalone window on supported browsers.
- Install button with browser-specific fallback guidance.
- Optional screen wake lock, available only while the app is visible.
- Offline fallback and connectivity notice. Conversations and API data are not cached by the new service worker.
- Existing Nelly/Drew interface and provider integrations retained.

LIMITS
- This ZIP must be deployed; opening index.html from your Downloads folder will not install or connect the assistant.
- The app requires your existing online backend and configured credentials for AI replies and cloud voices.
- Wake phrase operation remains limited to a visible, active app session with browser support and microphone permission. This update does not enable background/locked-screen listening.
- This web app cannot become Android's system assistant, read other apps, control calls, or operate the phone like a native system service.
- Local conversations/preferences remain tied to this website origin and your browser profile. Do not clear site data if you want to keep them.

VALIDATION
Syntax checks completed for added JavaScript and modified server. Home-screen structure and existing control IDs verified. Visual browser preview could not be started in this environment. Installation, microphone hardware and existing provider accounts require testing on the phone after deployment. No production deployment has been performed from this workspace.
