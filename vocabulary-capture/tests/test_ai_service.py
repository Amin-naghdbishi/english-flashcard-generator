from app.ai_service import AIService
from app.config import AIProviderConfig, AIPromptsConfig

def test_ai_service_prompt_construction():
    service = AIService()
    vocab_p = service.build_vocab_prompt("abandon", "Explain '{text}' in Persian.")
    assert vocab_p == "Explain 'abandon' in Persian."

    sent_p = service.build_sentence_prompt("He left.", "Translate: {text}")
    assert sent_p == "Translate: He left."

def test_ai_service_connection_error_handling():
    # Intentionally unreachable URL
    prov = AIProviderConfig(base_url="http://127.0.0.1:59999", model="test")
    service = AIService()
    success, res = service.analyze_selection("abandon", provider=prov)
    assert success is False
    assert "Cannot connect" in res or "error" in res.lower() or "timed out" in res.lower()

def test_ai_service_streaming_generator():
    service = AIService()
    prov = AIProviderConfig(base_url="http://127.0.0.1:59999", model="test")
    chunks = list(service.stream_generate("abandon", provider=prov))
    assert len(chunks) >= 1
    assert any("Cannot connect" in c or "error" in c.lower() for c in chunks)
