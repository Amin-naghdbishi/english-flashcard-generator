import os
import io
import time
import tempfile
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
        return self.config.piper_url.strip().rstrip("/")

    def check_connection(self) -> Tuple[bool, str, List[str]]:
        """
        Tests connection to Piper HTTP server and fetches installed voices if available.
        Returns: (is_connected, status_message, list_of_voices)
        """
        url = self.base_url
        if not url:
            return False, "Piper server URL is empty.", []

        # 1. Try GET /voices
        try:
            resp = requests.get(f"{url}/voices", timeout=3.0)
            if resp.status_code == 200:
                data = resp.json()
                voices = []
                if isinstance(data, list):
                    for v in data:
                        if isinstance(v, str) and v.strip():
                            voices.append(v.strip())
                        elif isinstance(v, dict):
                            v_name = v.get("key") or v.get("name") or v.get("id")
                            if v_name:
                                voices.append(str(v_name).strip())
                elif isinstance(data, dict):
                    # Piper dictionary format: {"en_US-lessac-medium": {...}, ...}
                    if "voices" in data and isinstance(data["voices"], (list, dict)):
                        v_sub = data["voices"]
                        if isinstance(v_sub, list):
                            voices = [v if isinstance(v, str) else v.get("key", v.get("name", "")) for v in v_sub]
                        else:
                            voices = list(v_sub.keys())
                    else:
                        voices = list(data.keys())

                clean_voices = [str(v).strip() for v in voices if str(v).strip()]
                if clean_voices:
                    return True, f"Connected to Piper (Found {len(clean_voices)} voice(s))", clean_voices
                return True, "Connected to Piper server (Default voice active)", []
        except requests.exceptions.ConnectionError:
            return False, f"Connection refused at {url}. Ensure Piper HTTP server is running.", []
        except requests.exceptions.Timeout:
            return False, f"Connection timed out at {url} (after 3.0s).", []
        except Exception:
            pass

        # 2. Fallback: Try GET / or GET /api/voices
        for endpoint in ("/", "/api/voices"):
            try:
                resp = requests.get(f"{url}{endpoint}", timeout=2.5)
                if resp.status_code == 200:
                    return True, "Connected to Piper server", []
            except requests.exceptions.ConnectionError:
                return False, f"Connection refused at {url}. Ensure Piper HTTP server is running.", []
            except requests.exceptions.Timeout:
                return False, f"Connection timed out at {url}.", []
            except Exception as e:
                return False, f"Piper connection error: {e}", []

        return False, f"Piper server at {url} returned HTTP {resp.status_code}", []

    def synthesize(self, text: str, voice: str = "", length_scale: Optional[float] = None) -> Tuple[bool, bytes, str]:
        """
        Synthesizes text to WAV bytes using Piper HTTP server.
        Uses Piper length_scale: 1.0=normal, 1.25=slower, 0.8=faster.
        Validates the WAV header of the response.
        """
        clean_text = text.strip()
        if not clean_text:
            return False, b"", "Empty text cannot be synthesized."

        url = self.base_url
        if not url:
            return False, b"", "Piper URL is empty."

        v = voice.strip() or self.config.voice.strip()
        ls = length_scale if length_scale is not None else self.config.length_scale

        params = {}
        if v:
            params["voice"] = v
        if ls:
            params["length_scale"] = str(ls)

        def _is_valid_wav(data: bytes) -> bool:
            return len(data) >= 44 and data.startswith(b"RIFF") and b"WAVE" in data[:16]

        last_error = ""

        # Method 1: POST to / with raw text in body and params
        try:
            resp = requests.post(
                f"{url}/",
                data=clean_text.encode("utf-8"),
                params=params,
                headers={"Content-Type": "text/plain; charset=utf-8"},
                timeout=12.0
            )
            if resp.status_code == 200:
                if _is_valid_wav(resp.content):
                    return True, resp.content, ""
                else:
                    last_error = f"Piper returned 200 but content is not a valid WAV file (received {len(resp.content)} bytes)."
            else:
                last_error = f"Piper returned HTTP {resp.status_code}: {resp.text[:120]}"
        except requests.exceptions.ConnectionError:
            return False, b"", f"Connection refused at {url}. Is Piper HTTP server running?"
        except requests.exceptions.Timeout:
            return False, b"", f"Piper synthesis timed out at {url} (after 12s)."
        except Exception as e:
            last_error = str(e)

        # Method 2: GET / with query params
        try:
            get_params = dict(params)
            get_params["text"] = clean_text
            resp = requests.get(f"{url}/", params=get_params, timeout=12.0)
            if resp.status_code == 200 and _is_valid_wav(resp.content):
                return True, resp.content, ""
        except Exception as e:
            last_error = str(e)

        # Method 3: POST /api/tts JSON
        for endpoint in ("/api/tts", "/tts"):
            try:
                payload = {"text": clean_text}
                if v:
                    payload["voice"] = v
                if ls:
                    payload["length_scale"] = ls
                resp = requests.post(f"{url}{endpoint}", json=payload, timeout=12.0)
                if resp.status_code == 200 and _is_valid_wav(resp.content):
                    return True, resp.content, ""
            except Exception as e:
                last_error = str(e)

        return False, b"", f"Piper synthesis failed at {url}: {last_error or 'Unknown error'}"

    def play_wav_bytes(self, wav_bytes: bytes) -> Tuple[bool, str]:
        """
        Plays WAV audio using standard Linux audio players.
        Tries: paplay -> pw-play -> aplay -> mpv -> ffplay -> play
        """
        if not wav_bytes or len(wav_bytes) < 44 or not wav_bytes.startswith(b"RIFF"):
            return False, "Invalid or empty WAV audio data."

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

            threading.Thread(target=_play_and_cleanup, args=(tmp_path,), daemon=True).start()
            return True, "Audio playback started."
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
        Notifies caller of success or actual error reason.
        """
        def _worker():
            success, wav_bytes, err = self.synthesize(text, voice=voice, length_scale=length_scale)
            if success:
                play_ok, play_err = self.play_wav_bytes(wav_bytes)
                if play_ok:
                    if on_success:
                        on_success()
                else:
                    if on_error:
                        on_error(play_err)
            else:
                if on_error:
                    on_error(err)

        threading.Thread(target=_worker, daemon=True).start()
