#!/usr/bin/env python3
"""
Nelly - a voice assistant for this computer.
Wake: clap twice, or say "Hey Nelly".
"""
import asyncio, difflib, json, os, platform, queue, re, shutil, subprocess
import tempfile, time, uuid, webbrowser
from collections import deque
from datetime import datetime
from pathlib import Path
import threading
from urllib.parse import urlparse

import numpy as np
import requests
import sounddevice as sd
import speech_recognition as sr

# ───────────────────────── CONFIG ─────────────────────────
USER_NAME   = ""                 # e.g. "Alex" - Nelly will use it in greetings
VOICE       = "en-GB-SoniaNeural"  # try: en-US-AriaNeural, en-US-JennyNeural, en-AU-NatashaNeural
RATE        = "-12%"             # slower = calmer
PITCH       = "-6Hz"             # lower = smokier
UNITS       = "fahrenheit"       # or "celsius"
LOCATION    = None               # None = auto by IP, or (lat, lon) e.g. (25.04, -77.35)
WEB_URL     = "https://nelly-ai.onrender.com/"  # "" = desktop-only Nelly
WAKE_TARGET = "web"              # "web" = clap/"Hey Nelly" wakes the website Nelly; "desktop" = this script answers
CLAP_PEAK   = 0.30               # lower this if claps aren't detected (0.1 - 0.5)
CLAP_RATIO  = 5.0                # claps must be this much louder than the room
CLAUDE_MODEL = None              # None = your Claude Code default, or e.g. "sonnet" / "haiku" (haiku = fastest)
# ──────────────────────────────────────────────────────────

SR, BLOCK = 16000, 320           # 16 kHz, 20 ms blocks
SYSTEM = platform.system()
HERE = Path(__file__).parent
audio_q: "queue.Queue[np.ndarray]" = queue.Queue()
speaking = threading.Event()
recognizer = sr.Recognizer()
noise_floor = 0.01
speech_thr = 0.02
history = []                     # chat memory for Claude fallback

# ───────────────────────── VOICE ─────────────────────────
_mixer_ready = False

def _speak_edge(text):
    global _mixer_ready
    import edge_tts, pygame
    path = tempfile.mktemp(suffix=".mp3")
    asyncio.run(edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH).save(path))
    if not _mixer_ready:
        pygame.mixer.init(); _mixer_ready = True
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    while pygame.mixer.music.get_busy():
        time.sleep(0.05)
    pygame.mixer.music.unload()
    os.remove(path)

def _speak_offline(text):
    import pyttsx3
    eng = pyttsx3.init()
    for v in eng.getProperty("voices"):
        if any(k in (v.name + v.id).lower() for k in ("zira", "samantha", "female", "susan", "hazel")):
            eng.setProperty("voice", v.id); break
    eng.setProperty("rate", 150)
    eng.say(text); eng.runAndWait()

def speak(text):
    print(f"Nelly: {text}")
    speaking.set()
    try:
        try:
            _speak_edge(text)
        except Exception as e:
            print(f"(neural voice unavailable: {e}; using offline voice)")
            _speak_offline(text)
    finally:
        time.sleep(0.3)
        speaking.clear()

# ───────────────────────── WEATHER ─────────────────────────
_loc = None
WMO = {0: "clear", 1: "mostly clear", 2: "partly cloudy", 3: "overcast", 45: "foggy", 48: "foggy",
       51: "drizzling", 53: "drizzling", 55: "drizzling", 61: "rainy", 63: "rainy", 65: "pouring rain",
       71: "snowy", 73: "snowy", 75: "heavy snow", 80: "showery", 81: "showery", 82: "stormy",
       95: "thunderstorming", 96: "thunderstorming", 99: "thunderstorming"}

def weather_report():
    global _loc
    try:
        if _loc is None:
            if LOCATION:
                _loc = LOCATION
            else:
                j = requests.get("http://ip-api.com/json/", timeout=5).json()
                _loc = (j["lat"], j["lon"])
        r = requests.get("https://api.open-meteo.com/v1/forecast", timeout=8, params={
            "latitude": _loc[0], "longitude": _loc[1], "timezone": "auto", "forecast_days": 1,
            "temperature_unit": UNITS,
            "current": "temperature_2m,weather_code",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max"}).json()
        now, day = r["current"], r["daily"]
        sky = WMO.get(now["weather_code"], "calm")
        s = (f"It's {round(now['temperature_2m'])} degrees and {sky} outside. "
             f"Today's high is {round(day['temperature_2m_max'][0])}, low {round(day['temperature_2m_min'][0])}.")
        rain = day["precipitation_probability_max"][0]
        if rain and rain >= 30:
            s += f" There's a {rain} percent chance of rain, so maybe keep an umbrella close."
        return s
    except Exception:
        return "I couldn't reach the weather service just now."

def greet():
    h = datetime.now().hour
    part = "morning" if h < 12 else "afternoon" if h < 18 else "evening"
    who = f", {USER_NAME}" if USER_NAME else ""
    speak(f"Good {part}{who}. I'm here. {weather_report()} What would you like?")

# ───────────────────────── APPS ─────────────────────────
def load_apps():
    try:
        return json.loads((HERE / "apps.json").read_text())
    except Exception:
        return {}

def _pick_target(t):
    if isinstance(t, dict):
        return t.get({"Windows": "windows", "Darwin": "mac"}.get(SYSTEM, "linux"))
    return t

def launch(target):
    if not target:
        return False
    try:
        if target.startswith("http"):
            webbrowser.open(target); return True
        if SYSTEM == "Windows":
            try:
                os.startfile(target)
            except OSError:
                subprocess.Popen(f'start "" "{target}"', shell=True)
            return True
        if SYSTEM == "Darwin":
            return subprocess.run(["open", "-a", target], capture_output=True).returncode == 0
        exe = shutil.which(target)
        if exe:
            subprocess.Popen([exe], start_new_session=True); return True
        return subprocess.run(["gtk-launch", target], capture_output=True).returncode == 0
    except Exception as e:
        print("launch error:", e); return False

def open_app(name):
    apps = load_apps()
    name = name.strip().lower()
    key = name if name in apps else (difflib.get_close_matches(name, apps.keys(), n=1, cutoff=0.6) or [None])[0]
    ok = launch(_pick_target(apps[key])) if key else launch(name)
    speak(f"Opening {key or name}." if ok else f"I couldn't find {name}. You can add it to my apps file.")

# ───────────────────────── BRAIN ─────────────────────────
PERSONA = ("You are Nelly, a voice assistant living on this computer. Your voice is calm, low, warm and smooth. "
           "Reply in one to three short spoken sentences. No markdown, no lists, no emojis, no code blocks. "
           "Do not use tools or touch files; just answer.")
_session = str(uuid.uuid4())
_session_started = False

def ask_claude(text):
    """Brain = your logged-in Claude Code (headless `claude -p`). No API key needed."""
    global _session_started
    exe = shutil.which("claude")
    if not exe:
        return "I can't find Claude Code. Install it and log in, then I'll be able to think."
    cmd = [exe, "-p", text, "--append-system-prompt", PERSONA,
           "--resume" if _session_started else "--session-id", _session]
    if CLAUDE_MODEL:
        cmd += ["--model", CLAUDE_MODEL]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=90, cwd=HERE)
        if r.returncode != 0 or not r.stdout.strip():
            print("claude error:", r.stderr.strip()[:300])
            if not _session_started and "session" in r.stderr.lower():
                _session_started = True      # session id already exists, resume next time
            return "I'm having trouble thinking right now. Check that Claude Code is logged in."
        _session_started = True
        return r.stdout.strip()
    except subprocess.TimeoutExpired:
        return "Sorry, that took me too long."
    except Exception as e:
        print("claude error:", e)
        return "I'm having trouble thinking right now."

# ───────────────────────── SPOTIFY / MUSIC ─────────────────────────
def media(action):
    """action: play | pause | next | previous. Mac/Linux target Spotify; Windows uses media keys
    (play and pause both toggle there)."""
    try:
        if SYSTEM == "Darwin":
            cmd = {"play": "play", "pause": "pause", "next": "next track", "previous": "previous track"}[action]
            subprocess.run(["osascript", "-e", f'tell application "Spotify" to {cmd}'])
        elif SYSTEM == "Windows":
            import ctypes
            vk = {"play": 0xB3, "pause": 0xB3, "next": 0xB0, "previous": 0xB1}[action]
            u = ctypes.windll.user32
            u.keybd_event(vk, 0, 0, 0); u.keybd_event(vk, 0, 2, 0)
        else:
            subprocess.run(["playerctl", "-p", "spotify", action])
    except Exception as e:
        print("media error:", e)

def music_command(text, allowed=True):
    """Handle 'wake spotify', play, pause, skip, previous. Returns True if handled.
    allowed=False means the phrase had neither 'Nelly' nor 'Spotify', so ignore it."""
    t = text.lower()
    if re.search(r"\b(wake|open|launch|start)( up)? (my )?spotify\b", t):
        open_app("spotify"); return True
    if not allowed:
        return False
    for pat, act in ((r"\b(pause|stop (the )?(music|spotify))\b", "pause"),
                     (r"\b(skip|next( song| track)?)\b", "next"),
                     (r"\b(previous|last song|go back)\b", "previous"),
                     (r"\b(play|resume|unpause)\b", "play")):
        if re.search(pat, t):
            print(f"music -> {act}"); media(act); return True
    return False

def handle(cmd):
    """Returns False when it's time to go back to sleep."""
    c = cmd.lower().strip()
    if music_command(c, True):
        return True
    if re.search(r"\b(go to sleep|goodbye|good night|that'?s all|stop listening|never ?mind|thank you)\b", c):
        speak("Of course. I'll be right here."); return False
    m = re.match(r"^(?:please\s+)?(?:open|launch|start|run|pull up)\s+(?:up\s+)?(?:my\s+)?(.+)", c)
    if m:
        open_app(m.group(1)); return True
    if "weather" in c or "temperature" in c or "outside" in c:
        speak(weather_report())
    elif re.search(r"\btime\b", c):
        speak(datetime.now().strftime("It's %I:%M %p.").replace(" 0", " "))
    elif re.search(r"\b(date|day is it|today)\b", c):
        speak(datetime.now().strftime("It's %A, %B %d.").replace(" 0", " "))
    else:
        speak(ask_claude(cmd))
    return True

# ───────────────────────── EARS ─────────────────────────
def _callback(indata, frames, t, status):
    if not speaking.is_set():
        audio_q.put(indata[:, 0].copy())

def drain():
    while not audio_q.empty():
        try: audio_q.get_nowait()
        except queue.Empty: break

def transcribe(audio):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16).tobytes()
    try:
        return recognizer.recognize_google(sr.AudioData(pcm, SR, 2)).lower()
    except sr.UnknownValueError:
        return ""
    except sr.RequestError as e:
        print("speech service error:", e); return ""

def listen(wake, timeout=None):
    """wake=True: returns ('clap',None) or ('speech',audio). wake=False: command capture."""
    clap, hist, preroll = [], deque(maxlen=30), deque(maxlen=10)
    utt, talking, quiet, t0 = [], False, 0.0, time.time()
    drain()
    while True:
        try:
            blk = audio_q.get(timeout=0.5)
        except queue.Empty:
            if timeout and not talking and time.time() - t0 > timeout:
                return None, None
            continue
        rms = float(np.sqrt(np.mean(blk ** 2))); peak = float(np.abs(blk).max()); now = time.time()
        if wake:
            base = float(np.median(hist)) if hist else rms
            if peak > CLAP_PEAK and rms > CLAP_RATIO * max(base, noise_floor):
                if not clap or now - clap[-1] > 0.12:
                    clap.append(now)
                clap = [c for c in clap if now - c < 0.9]
                if len(clap) >= 2:
                    return "clap", None
            hist.append(rms)
        if rms > speech_thr:
            if not talking:
                talking, utt = True, list(preroll)
            quiet = 0.0
        elif talking:
            quiet += BLOCK / SR
        if talking:
            utt.append(blk)
            dur = len(utt) * BLOCK / SR
            if quiet > 0.7 or dur > 10:
                audio = np.concatenate(utt)
                if dur - quiet > 0.4:
                    return "speech", audio
                utt, talking, quiet = [], False, 0.0
        else:
            preroll.append(blk)
        if timeout and not talking and now - t0 > timeout:
            return None, None

# ───────────────────────── WEB BRIDGE ─────────────────────────
# Local websocket (127.0.0.1:8765). The website's nelly-wake.js connects to it and
# wakes the on-page Nelly whenever this script hears a double clap or "Hey Nelly".
_clients, _loop = set(), None

async def _ws_handler(ws, path=None):
    _clients.add(ws)
    try:
        async for _ in ws:
            pass
    finally:
        _clients.discard(ws)

def _bridge_thread():
    global _loop
    import websockets
    u = urlparse(WEB_URL)
    origin = f"{u.scheme}://{u.netloc}"
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    async def run():
        async with websockets.serve(_ws_handler, "127.0.0.1", 8765, origins=[origin, None]):
            await asyncio.Future()
    _loop.run_until_complete(run())

def start_bridge():
    if not WEB_URL:
        return
    try:
        threading.Thread(target=_bridge_thread, daemon=True).start()
    except Exception as e:
        print("bridge failed:", e)

async def _broadcast(msg):
    for ws in list(_clients):
        try: await ws.send(msg)
        except Exception: _clients.discard(ws)

def wake_web():
    if not _clients:                      # site not open yet: open it, it wakes itself on load
        webbrowser.open(WEB_URL.rstrip("/") + "/?wake=1")
    elif _loop:
        asyncio.run_coroutine_threadsafe(_broadcast("wake"), _loop)

# ───────────────────────── MAIN ─────────────────────────
def main():
    global noise_floor, speech_thr
    print("Nelly is starting...")
    start_bridge()
    with sd.InputStream(samplerate=SR, channels=1, blocksize=BLOCK, dtype="float32", callback=_callback):
        time.sleep(0.3); drain(); time.sleep(1.0)
        levels = []
        while not audio_q.empty():
            levels.append(float(np.sqrt(np.mean(audio_q.get() ** 2))))
        noise_floor = max(float(np.median(levels)) if levels else 0.005, 0.003)
        speech_thr = max(noise_floor * 3.5, 0.015)
        print(f"Room noise {noise_floor:.4f}. Clap twice or say 'Hey Nelly'. Ctrl+C to quit.")
        while True:
            kind, audio = listen(wake=True)
            first_cmd = ""
            if kind == "speech":
                text = transcribe(audio)
                m = re.search(r"\bnell?(?:y|ie|i)\b(.*)", text)
                rest = m.group(1).strip(" ,.") if m else text
                if music_command(rest, allowed=bool(m) or "spotify" in text):
                    continue          # music commands never wake the site
                if not m:
                    continue
                first_cmd = rest
            if WEB_URL and WAKE_TARGET == "web":
                print("wake -> website Nelly")
                wake_web()
                time.sleep(3)
                continue
            if first_cmd:
                if not handle(first_cmd):
                    continue
            else:
                greet()
            while True:   # conversation
                kind, audio = listen(wake=False, timeout=8)
                if kind is None:
                    speak("I'll be here if you need me."); break
                text = transcribe(audio)
                if text and not handle(text):
                    break

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nNelly signing off.")
