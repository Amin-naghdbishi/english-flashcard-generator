from app.ai_service import AIService

def test_ai_service_initialization():
    service = AIService(base_url="http://localhost:11434", default_model="llama3")
    assert service.base_url == "http://localhost:11434"
    assert service.default_model == "llama3"

def test_ai_service_connection_error_handling():
    # Intentionally unreachable URL
    service = AIService(base_url="http://127.0.0.1:59999", default_model="test")
    success, res = service.analyze_selection("abandon")
    assert success is False
    assert "Cannot connect" in res or "error" in res.lower() or "timed out" in res.lower()
