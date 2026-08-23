import json
import pytest
import requests
from unittest.mock import MagicMock, patch

from app.ai_service import AIService, AIStreamWorker
from app.config import AIProviderConfig, AIPromptsConfig

def test_ai_service_prompt_construction():
    service = AIService()
    vocab_p = service.build_vocab_prompt("abandon", "Explain '{text}' in Persian.")
    assert vocab_p == "Explain 'abandon' in Persian."

    sent_p = service.build_sentence_prompt("I abandoned my car.", "Translate: {text}")
    assert sent_p == "Translate: I abandoned my car."

def test_ollama_test_connection_success():
    service = AIService()
    prov = AIProviderConfig(type="ollama", base_url="http://127.0.0.1:11434")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "models": [
            {"name": "llama3:latest", "size": 4661224676},
            {"name": "qwen2.5:7b", "size": 4434224676},
        ]
    }

    with patch("requests.get", return_value=mock_resp) as mock_get:
        success, msg, models = service.test_connection(prov)
        assert success is True
        assert "Found 2 model(s)" in msg
        assert models == ["llama3:latest", "qwen2.5:7b"]
        mock_get.assert_called_once_with("http://127.0.0.1:11434/api/tags", headers={}, timeout=4.0)

def test_ollama_test_connection_connection_refused():
    service = AIService()
    prov = AIProviderConfig(type="ollama", base_url="http://127.0.0.1:11434")

    with patch("requests.get", side_effect=requests.exceptions.ConnectionError("Connection refused")):
        success, msg, models = service.test_connection(prov)
        assert success is False
        assert "Connection refused" in msg
        assert "Ensure Ollama is running" in msg
        assert models == []

def test_openai_compatible_test_connection_success():
    service = AIService()
    prov = AIProviderConfig(
        type="openai_compatible",
        base_url="http://localhost:8080/v1",
        api_key="sk-testkey123",
        model="gpt-3.5-turbo"
    )

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "data": [
            {"id": "gpt-3.5-turbo", "object": "model"},
            {"id": "gpt-4o", "object": "model"}
        ]
    }

    with patch("requests.get", return_value=mock_resp) as mock_get:
        success, msg, models = service.test_connection(prov)
        assert success is True
        assert "Found 2 model(s)" in msg
        assert models == ["gpt-3.5-turbo", "gpt-4o"]
        mock_get.assert_called_once_with(
            "http://localhost:8080/v1/models",
            headers={"Authorization": "Bearer sk-testkey123"},
            timeout=5.0
        )

def test_openai_compatible_test_connection_auth_failure():
    service = AIService()
    prov = AIProviderConfig(type="openai_compatible", base_url="http://localhost:8080/v1", api_key="invalid")

    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Unauthorized"

    with patch("requests.get", return_value=mock_resp):
        success, msg, models = service.test_connection(prov)
        assert success is False
        assert "Authentication failed (HTTP 401)" in msg
        assert models == []

def test_gemini_test_connection_missing_key():
    service = AIService()
    prov = AIProviderConfig(type="gemini", api_key="")
    success, msg, models = service.test_connection(prov)
    assert success is False
    assert "Gemini API key is required" in msg

def test_gemini_test_connection_success():
    service = AIService()
    prov = AIProviderConfig(type="gemini", api_key="AIzaSyTestKey")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "models": [
            {"name": "models/gemini-1.5-flash", "displayName": "Gemini 1.5 Flash"},
            {"name": "models/gemini-1.5-pro", "displayName": "Gemini 1.5 Pro"},
            {"name": "models/embedding-001", "displayName": "Embedding 001"},
        ]
    }

    with patch("requests.get", return_value=mock_resp):
        success, msg, models = service.test_connection(prov)
        assert success is True
        assert "Found 2 model(s)" in msg
        assert models == ["gemini-1.5-flash", "gemini-1.5-pro"]

def test_ollama_streaming_real_chunks():
    service = AIService()
    prov = AIProviderConfig(type="ollama", base_url="http://127.0.0.1:11434", model="llama3:latest")

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.iter_lines.return_value = [
        json.dumps({"message": {"content": "رها"}, "done": False}).encode("utf-8"),
        json.dumps({"message": {"content": " کردن"}, "done": True}).encode("utf-8"),
    ]

    with patch("requests.post", return_value=mock_resp):
        chunks = list(service.stream_generate("abandon", provider=prov))
        assert chunks == ["رها", " کردن"]
        full_res = "".join(chunks)
        assert full_res == "رها کردن"

def test_streaming_connection_error_reporting():
    service = AIService()
    prov = AIProviderConfig(type="ollama", base_url="http://127.0.0.1:59999", model="test")
    chunks = list(service.stream_generate("abandon", provider=prov))
    assert len(chunks) == 1
    assert "Cannot connect to Ollama" in chunks[0]
