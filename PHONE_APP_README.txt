NELLY — SEPARATE PC AND ANDROID PRIVATE TEST

FILES
index.html: asks “Are you on PC or mobile?”
pc.html: original Nelly/Drew v12 desktop design. No official-home redesign stylesheet.
mobile.html: separate mobile page using the original responsive Nelly/Drew design.
mobile-download.html: private Play Store route plus protected APK fallback.
Nelly-Android-Test.apk: signed Android test app (Android 8.0+), package com.coachbowe.nelly.personal.
android-test/: native Java source, manifest, icon, and TEST-ONLY signing keystore.

INSTALL THE ATTACHED ANDROID APK NOW
Open Nelly-Android-Test.apk on your Android phone and follow Android's installation prompts. You may need to allow installation from the app you used to download it. Its launcher name is “Nelly AI Test”.
This is a native WebView test shell that opens https://nelly-ai.onrender.com/?platform=mobile. It needs your online Nelly service. Before the website update is deployed it will display whatever version is currently hosted there; after deployment it opens mobile.html directly.
It does not include a local AI model or enable locked-screen listening / system-wide phone control.
Microphone recording asks Android permission. Cloud transcription and voice still depend on your existing server credentials. Browser speech recognition/speech synthesis support differs in Android WebView; those features have not been verified on a physical phone. Use configured Deepgram/ElevenLabs services where supported.
Imported files are selected through Android's file picker. App data is separate from your PC/browser data.

DEPLOY THE WEBSITE UPDATE
Replace the files in the GitHub repository linked to your existing Render service with this ZIP's contents. Keep server.js and package.json at the root. Keep ALL frontend files together at the root (this package's layout). If you intentionally use public/, put all frontend assets together there, including index.html, pc.html, mobile.html, mobile-download.html, device.js, device.css, manifest, worker and icons. The APK stays at the server root.
Keep existing Claude/Deepgram/ElevenLabs environment variables. Start command remains npm start.
Add NELLY_TEST_CODE in Render Environment with a strong private code you choose. The website APK download is unavailable unless this code is set. The mobile download form grants a 15-minute HttpOnly session after the correct code; unauthorized requests cannot download the APK. Only share the APK/code with yourself. A downloaded APK can still be copied; this is private distribution, not device-bound licensing.

GOOGLE PLAY PRIVATE TESTING
The app has NOT been uploaded or published to Google Play. No store URL has been invented.
Use your Google Play Console's internal testing/internal sharing workflow and restrict downloaders to your own Google account. A production listing is not needed for this personal test. Play Console may require additional account/app setup.
When Play gives you the real HTTPS test link, put it in Render's NELLY_PLAY_TEST_URL. Only play.google.com links are accepted. Then choosing Mobile automatically opens that test link. The download page always offers a manual APK fallback when enabled. If no Play link is configured, it explains that and keeps the APK option available instead of opening a broken store listing. The website cannot reliably detect whether installation in another app succeeded.

TEST SIGNING
This APK is signed with the included test keystore: alias nelly-test, password android. This key is for private test builds only, not a production signing credential. Retain it for compatible direct-download updates. Google Play internal app sharing can re-sign an uploaded APK, so switching between a directly signed APK and Play's re-signed build may require uninstalling first (which clears app data).

VALIDATION
Android Java compiled to DEX; manifest/resources packaged; APK signature verification completed. Website JavaScript syntax and HTTP routing/download authorization tests completed. No physical phone/emulator or visual browser test was available. No Render deployment or Google Play publication was performed.
