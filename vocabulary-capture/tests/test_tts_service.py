import pytest
import requests
from unittest.mock import MagicMock, patch

from app.config import TTSConfig
from app.tts_service import TTSService

# Minimal 44-byte valid WAV header
VALID_WAV_BYTES = (
    b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
    b"\x22\x56\x00\x00\x44\xAC\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
)

def test_tts_service_init():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000", voice="en_US-lessac-medium", length_scale=1.25)
    service = TTSService(cfg)
    assert service.base_url == "http://127.0.0.1:5000"
    assert service.config.voice == "en_US-lessac-medium"
    assert service.config.length_scale == 1.25

def test_piper_check_connection_success_dict_voices():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000")
    service = TTSService(cfg)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "en_US-lessac-high": {"quality": "high"},
        "en_US-lessac-medium": {"quality": "medium"},
        "en_GB-cori-high": {"quality": "high"}
    }

    with patch("requests.get", return_value=mock_resp) as mock_get:
        success, msg, voices = service.check_connection()
        assert success is True
        assert "Found 3 voice(s)" in msg
        assert voices == ["en_US-lessac-high", "en_US-lessac-medium", "en_GB-cori-high"]
        mock_get.assert_called_once_with("http://127.0.0.1:5000/voices", timeout=3.0)

def test_piper_check_connection_success_list_voices():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000")
    service = TTSService(cfg)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = ["en_US-lessac-medium", "fa_IR-amir-medium"]

    with patch("requests.get", return_value=mock_resp):
        success, msg, voices = service.check_connection()
        assert success is True
        assert "Found 2 voice(s)" in msg
        assert voices == ["en_US-lessac-medium", "fa_IR-amir-medium"]

def test_piper_check_connection_connection_refused():
    cfg = TTSConfig(piper_url="http://127.0.0.1:59998")
    service = TTSService(cfg)
    with patch("requests.get", side_effect=requests.exceptions.ConnectionError("Connection refused")):
        success, msg, voices = service.check_connection()
        assert success is False
        assert "Connection refused" in msg
        assert "Ensure Piper HTTP server is running" in msg
        assert voices == []

def test_piper_synthesize_success():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000", voice="en_US-lessac-medium", length_scale=1.0)
    service = TTSService(cfg)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = VALID_WAV_BYTES

    with patch("requests.post", return_value=mock_resp) as mock_post:
        success, wav_bytes, err = service.synthesize("The quick brown fox jumps over the lazy dog.")
        assert success is True
        assert wav_bytes == VALID_WAV_BYTES
        assert err == ""
        mock_post.assert_called_once_with(
            "http://127.0.0.1:5000/",
            data="The quick brown fox jumps over the lazy dog.".encode("utf-8"),
            params={"voice": "en_US-lessac-medium", "length_scale": "1.0"},
            headers={"Content-Type": "text/plain; charset=utf-8"},
            timeout=12.0
        )

def test_piper_synthesize_empty_text():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000")
    service = TTSService(cfg)
    success, wav_bytes, err = service.synthesize("   ")
    assert success is False
    assert "Empty text" in err
    assert wav_bytes == b""

def test_piper_synthesize_invalid_audio_response():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000")
    service = TTSService(cfg)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"Error: model crashed"

    with patch("requests.post", return_value=mock_resp):
        with patch("requests.get", return_value=mock_resp):
            success, wav_bytes, err = service.synthesize("abandon")
            assert success is False
            assert "did not return valid audio" in err or "not a valid WAV" in err
