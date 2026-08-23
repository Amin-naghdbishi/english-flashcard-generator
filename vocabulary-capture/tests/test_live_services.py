import json
import time
import socket
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import pytest

from app.config import AIProviderConfig, TTSConfig
from app.ai_service import AIService
from app.tts_service import TTSService

VALID_WAV_BYTES = (
    b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
    b"\x22\x56\x00\x00\x44\xAC\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
)

class MockOllamaHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/api/tags":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "models": [
                    {"name": "llama3:latest"},
                    {"name": "qwen2.5:7b"}
                ]
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path in ("/api/generate", "/api/chat"):
            self.send_response(200)
            self.send_header("Content-Type", "application/x-ndjson")
            self.end_headers()
            # Send real ndjson streaming lines
            chunk1 = json.dumps({"response": "معنی ", "done": False}) + "\n"
            chunk2 = json.dumps({"response": "کلمه ", "done": False}) + "\n"
            chunk3 = json.dumps({"response": "abandon: رها کردن", "done": True}) + "\n"
            self.wfile.write(chunk1.encode("utf-8"))
            self.wfile.write(chunk2.encode("utf-8"))
            self.wfile.write(chunk3.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

class MockPiperHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path == "/voices":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            payload = {
                "en_US-lessac-high": {"quality": "high"},
                "en_US-lessac-medium": {"quality": "medium"},
                "en_GB-cori-high": {"quality": "high"}
            }
            self.wfile.write(json.dumps(payload).encode("utf-8"))
        elif self.path.startswith("/?text=") or self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.end_headers()
            self.wfile.write(VALID_WAV_BYTES)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.end_headers()
        self.wfile.write(VALID_WAV_BYTES)

def get_free_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("", 0))
    port = s.getsockname()[1]
    s.close()
    return port

def test_live_ollama_and_piper_workflow():
    ollama_port = get_free_port()
    piper_port = get_free_port()

    ollama_server = HTTPServer(("127.0.0.1", ollama_port), MockOllamaHandler)
    piper_server = HTTPServer(("127.0.0.1", piper_port), MockPiperHandler)

    t_ollama = threading.Thread(target=ollama_server.serve_forever, daemon=True)
    t_piper = threading.Thread(target=piper_server.serve_forever, daemon=True)

    t_ollama.start()
    t_piper.start()
    time.sleep(0.05)

    try:
        # 1. Test AI Service real HTTP queries
        ai_service = AIService()
        prov = AIProviderConfig(
            type="ollama",
            base_url=f"http://127.0.0.1:{ollama_port}",
            model="llama3:latest"
        )

        # Real connection test & model discovery
        ok, msg, models = ai_service.test_connection(prov)
        assert ok is True
        assert "Found 2 model(s)" in msg
        assert models == ["llama3:latest", "qwen2.5:7b"]

        # Real streaming generation
        chunks = list(ai_service.stream_generate("abandon", provider=prov))
        assert len(chunks) == 3
        full_text = "".join(chunks)
        assert full_text == "معنی کلمه abandon: رها کردن"

        # 2. Test Piper TTS real HTTP queries
        tts_cfg = TTSConfig(
            piper_url=f"http://127.0.0.1:{piper_port}",
            voice="en_US-lessac-medium",
            length_scale=1.1
        )
        tts_service = TTSService(tts_cfg)

        # Real voice discovery
        p_ok, p_msg, voices = tts_service.check_connection()
        assert p_ok is True
        assert "Found 3 voice(s)" in p_msg
        assert voices == ["en_US-lessac-high", "en_US-lessac-medium", "en_GB-cori-high"]

        # Real synthesis
        s_ok, wav_bytes, s_err = tts_service.synthesize("The quick brown fox jumps over the lazy dog.")
        assert s_ok is True
        assert wav_bytes == VALID_WAV_BYTES
        assert s_err == ""

    finally:
        ollama_server.shutdown()
        piper_server.shutdown()
