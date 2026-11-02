# Nelly

A voice assistant for your computer. Clap twice or say **"Hey Nelly"** and she greets you with the weather, answers out loud in a calm, low female voice, and opens your apps on request. Her brain is your logged-in **Claude Code**, so no API key is needed.

## Link to the website (nelly-ai.onrender.com)
`nelly.py` listens for the double clap / "Hey Nelly" and wakes the website Nelly.
1. Follow `website/ADD-TO-SITE.md`: copy `website/nelly-wake.js` into your site's repo and add `<script src="nelly-wake.js"></script>` before `</body>`, then push. Open `website/test.html` to check the connection first.
2. Run `python nelly.py`. On a wake it pings the open site tab over a local websocket, or opens the site if it isn't open.
3. Chrome may ask to allow access to local devices for the site. Click Allow.
4. Set `WAKE_TARGET = "desktop"` in `nelly.py` to use the desktop-only Nelly instead, or `WEB_URL = ""` to turn the bridge off.

## Features
- Wake with a double clap or "Hey Nelly" (you can add a command: "Hey Nelly, open Spotify")
- Spoken greeting with the time of day and current weather
- Calm neural voice (edge-tts), with an offline fallback
- Opens apps and websites from `apps.json` (Windows, Mac, Linux)
- Weather, time and date built in
- Everything else goes to Claude Code (`claude -p`) and is answered in a few spoken sentences

## Setup
1. Install Python 3.9+
2. Install [Claude Code](https://claude.com/claude-code) and run `claude` once to log in
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
   Linux also needs: `sudo apt install libportaudio2`
4. Run:
   ```
   python nelly.py
   ```

## Configure
Edit the top of `nelly.py`:

| Setting | What it does |
|---|---|
| `USER_NAME` | Name she greets you with |
| `VOICE`, `RATE`, `PITCH` | Her voice, speed and pitch |
| `UNITS` | `"fahrenheit"` or `"celsius"` |
| `LOCATION` | `None` for auto by IP, or `(lat, lon)` |
| `CLAP_PEAK` | Lower (about 0.15) if claps aren't detected |
| `CLAUDE_MODEL` | `None`, or `"haiku"` for faster answers |

Add your own apps in `apps.json`. A target can be a name, a URL, or a per-OS object:
```json
"spotify": {"windows": "spotify", "mac": "Spotify", "linux": "spotify"},
"github": "https://github.com"
```

## Seeing what she hears
Every phrase is transcribed and printed in the terminal (`Heard: ...`) and sent to the site, where it shows as a "You: ..." bubble. See `website/ADD-TO-SITE.md` to put it into your chat box.

## Spotify voice commands
These work from the always-on listener, without waking the website:
- "Wake Spotify" / "open Spotify"
- "Hey Nelly, play", "Hey Nelly, pause", "Hey Nelly, skip", "Hey Nelly, previous"
- Saying "Spotify" in the phrase also works: "Spotify pause"

On Windows, play and pause both send the play/pause key, so they toggle. Mac and Linux (needs `playerctl`) use real play and pause.

## Commands
- "Open / launch / start *app*"
- "What's the weather?", "What time is it?", "What's the date?"
- "Goodbye" or "go to sleep" returns her to waiting; she also sleeps after 8 seconds of silence
- Anything else is answered by Claude

## Notes
- "Hey Nelly" uses Google's free speech recognition and needs internet.
- Claude Code runs with your user's permissions. Nelly's prompt tells it not to use tools, but that is a request, not a hard block.
- Tested only for syntax; audio behavior depends on your mic, so tune `CLAP_PEAK`.

## License
MIT
