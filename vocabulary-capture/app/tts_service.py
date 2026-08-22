import os
import io
import time
import tempfile
import urllib.parse
import threading
import subprocess
import requests
from typing import List, Dict, Tuple, Optional, Callable

from app.config import TTSConfig

class TTSService:
    """
    Piper TTS HTTP client and audio player for Linux.
    Communicates with the user's local Piper server (default: http://127.0.0.1:5000).
    """
    def __init__(self, config: TTSConfig):
        self.config = config

    @property
    def base_url(self) -> str:
        return self.config.piper_url.rstrip("/")

    def check_connection(self) -> Tuple[bool, str, List[str]]:
        """
        Tests connection to Piper HTTP server and fetches installed voices if available.
        """
        url = self.base_url
        if not url:
            return False, "Piper URL is not configured.", []

        # 1. Try GET /voices
        try:
            resp = requests.get(f"{url}/voices", timeout=2.5)
            if resp.status_code == 200:
                data = resp.json()
                voices = []
                if isinstance(data, list):
                    voices = [v if isinstance(v, str) else v.get("key", v.get("name", "")) for v in data]
                elif isinstance(data, dict):
                    voices = list(data.keys())
                return True, f"Connected (found {len(voices)} voice(s))", [v for v in voices if v]
        except Exception:
            pass

        # 2. Try GET / or GET /api/voices
        try:
            resp = requests.get(url, timeout=2.0)
            if resp.status_code == 200:
                return True, "Connected to Piper server", []
        except requests.exceptions.ConnectionError:
            return False, f"Cannot connect to Piper at {url}. Ensure Piper HTTP server is running.", []
        except requests.exceptions.Timeout:
            return False, "Connection to Piper timed out.", []
        except Exception as e:
            return False, f"Connection error: {e}", []

        return False, f"Piper server at {url} returned HTTP {resp.status_code}", []

    def synthesize(self, text: str, voice: str = "", length_scale: Optional[float] = None) -> Tuple[bool, bytes, str]:
        """
        Synthesizes text to WAV bytes using Piper HTTP server.
        Uses Piper length_scale: 1.0=normal, 1.25=slower, 0.8=faster.
        """
        clean_text = text.strip()
        if not clean_text:
            return False, b"", "Empty text."

        url = self.base_url
        v = voice or self.config.voice
        ls = length_scale if length_scale is not None else self.config.length_scale

        params = {}
        if v:
            params["voice"] = v
        if ls:
            params["length_scale"] = str(ls)

        # 1. Try POST to / with raw text or params
        try:
            resp = requests.post(
                f"{url}/",
                data=clean_text.encode("utf-8"),
                params=params,
                headers={"Content-Type": "text/plain; charset=utf-8"},
                timeout=10.0
            )
            if resp.status_code == 200 and len(resp.content) > 100:
                return True, resp.content, ""
        except Exception:
            pass

        # 2. Try GET with query params
        try:
            get_params = dict(params)
            get_params["text"] = clean_text
            resp = requests.get(f"{url}/", params=get_params, timeout=10.0)
            if resp.status_code == 200 and len(resp.content) > 100:
                return True, resp.content, ""
        except Exception:
            pass

        # 3. Try POST JSON to /api/tts or /tts
        for endpoint in ("/api/tts", "/tts"):
            try:
                payload = {"text": clean_text}
                if v:
                    payload["voice"] = v
                if ls:
                    payload["length_scale"] = ls
                resp = requests.post(f"{url}{endpoint}", json=payload, timeout=10.0)
                if resp.status_code == 200 and len(resp.content) > 100:
                    return True, resp.content, ""
            except Exception:
                pass

        return False, b"", f"Failed to synthesize audio from Piper at {url}"

    def play_wav_bytes(self, wav_bytes: bytes) -> Tuple[bool, str]:
        """
        Plays WAV audio using standard Linux audio players.
        Tries: paplay -> pw-play -> aplay -> mpv -> ffplay -> play
        """
        if not wav_bytes:
            return False, "No audio data."

        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                tmp.write(wav_bytes)
                tmp_path = tmp.name

            def _play_and_cleanup(path: str):
                players = [
                    ["paplay", path],
                    ["pw-play", path],
                    ["aplay", "-q", path],
                    ["mpv", "--no-video", "--really-quiet", path],
                    ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", path],
                    ["play", "-q", path],
                ]
                played = False
                for cmd in players:
                    try:
                        p = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
                        if p.returncode == 0:
                            played = True
                            break
                    except Exception:
                        continue

                try:
                    os.unlink(path)
                except Exception:
                    pass

            # Play in background thread so caller does not block
            threading.Thread(target=_play_and_cleanup, args=(tmp_path,), daemon=True).start()
            return True, "Playing audio."
        except Exception as e:
            return False, f"Audio playback error: {e}"

    def speak_text_async(
        self,
        text: str,
        voice: str = "",
        length_scale: Optional[float] = None,
        on_success: Optional[Callable[[], None]] = None,
        on_error: Optional[Callable[[str], None]] = None,
    ):
        """
        Asynchronously fetches and plays Piper audio in a background thread.
        """
        def _worker():
            success, wav_bytes, err = self.synthesize(text, voice=voice, length_scale=length_scale)
            if success:
                self.play_wav_bytes(wav_bytes)
                if on_success:
                    on_success()
            else:
                if on_error:
                    on_error(err)

        threading.Thread(target=_worker, daemon=True).start()
