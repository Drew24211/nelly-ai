# Add Nelly's wake to your website (GitHub + Render)

This lets the desktop `nelly.py` (double clap / "Hey Nelly") wake the Nelly on your site.

## Steps
1. Copy `nelly-wake.js` into your site's repo, in the same folder as `index.html`.
   - React/Vite/Next sites: put it in the `public/` folder instead.
2. Open `index.html` and add this line just before `</body>`:
   ```html
   <script src="nelly-wake.js"></script>
   ```
   (Use `/nelly-wake.js` if your page is not at the site root.)
3. Commit and push:
   ```
   git add nelly-wake.js index.html
   git commit -m "Add desktop wake bridge"
   git push
   ```
   Render redeploys automatically if it's connected to the repo.
4. On your computer run `python nelly.py`, open the site in Chrome, and clap twice.
   Chrome may ask to allow local network access for the site. Click Allow.

## Test it first (optional)
Open `test.html` in Chrome while `nelly.py` is running and clap twice. The page shows
"Connected" and logs each wake. If that works, the bridge is fine and any remaining
issue is just what the site does on wake.

## Seeing what Nelly hears
Everything `nelly.py` hears is turned into text and sent to the site. By default it shows as a
small "You: ..." bubble at the bottom of the screen, plus "Listening..." while you speak.
The same text prints in the terminal as `Heard: ...`.

To drop it into your site's chat box instead, define this before the script tag:
```html
<script>
  window.nellyHeard = (text) => {
    // add `text` as a user message in your chat, e.g. addMessage("user", text);
  };
</script>
```
Set `window.NELLY_OVERLAY = false;` to hide the bubble.
If "Heard: (couldn't make that out)" shows up a lot, your mic is picking up but speech
recognition can't parse it. Speak closer to the mic or check your input device.

## What "wake" does on your site
By default the script taps the Nelly portrait image (`<img alt="...Nelly...">`), which is
the page's "say hello" action. To run your own code instead, add this BEFORE the script tag:
```html
<script>
  window.nellyWake = (source) => {
    // your function here, e.g. startListening(); or greet();
  };
</script>
<script src="nelly-wake.js"></script>
```

## Troubleshooting
- **Nothing happens:** check `nelly.py` is running and the site is open in Chrome or Edge. Safari often blocks this.
- **Not connecting:** open the browser console (F12). Look for "[Nelly] wake from desktop" when you clap.
- **Content Security Policy:** if your site sets one, allow `connect-src ws://127.0.0.1:8765`.
- **Wrong site address:** in `nelly.py`, `WEB_URL` must match your site's address.
- **Wake works but she doesn't greet:** the portrait tap isn't the right action. Use the `window.nellyWake` hook above.
