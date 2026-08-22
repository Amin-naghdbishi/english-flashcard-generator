from app.config import TTSConfig
from app.tts_service import TTSService

def test_tts_service_init():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000", voice="en_US-lessac-medium", length_scale=1.25)
    service = TTSService(cfg)
    assert service.base_url == "http://127.0.0.1:5000"
    assert service.config.voice == "en_US-lessac-medium"
    assert service.config.length_scale == 1.25

def test_tts_service_connection_unreachable():
    # Intentionally unreachable port
    cfg = TTSConfig(piper_url="http://127.0.0.1:59998")
    service = TTSService(cfg)
    success, msg, voices = service.check_connection()
    assert success is False
    assert "Cannot connect" in msg or "error" in msg.lower() or "timed out" in msg.lower()

def test_tts_service_synthesize_empty():
    cfg = TTSConfig(piper_url="http://127.0.0.1:5000")
    service = TTSService(cfg)
    success, wav_bytes, err = service.synthesize("")
    assert success is False
    assert "Empty text" in err
