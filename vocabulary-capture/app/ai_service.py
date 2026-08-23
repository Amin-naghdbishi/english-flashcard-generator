import json
import re
import requests
from typing import List, Dict, Tuple, Optional, Generator, Any

from PySide6.QtCore import QObject, Signal, QThread

from app.config import (
    AIProviderConfig,
    AIPromptsConfig,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_VOCAB_PROMPT,
    DEFAULT_SENTENCE_PROMPT,
)

class AIStreamWorker(QThread):
    """
    QThread worker for true token-by-token streaming AI generation.
    Emits chunk_received for every token/chunk, without blocking the Qt event loop.
    """
    chunk_received = Signal(str)
    finished = Signal(str)
    error = Signal(str)

    def __init__(
        self,
        service: "AIService",
        prompt: str,
        system_prompt: str = "",
        messages: Optional[List[Dict[str, str]]] = None,
        provider: Optional[AIProviderConfig] = None,
        parent=None,
    ):
        super().__init__(parent)
        self.service = service
        self.prompt = prompt
        self.system_prompt = system_prompt
        self.messages = messages
        self.provider = provider
        self._is_cancelled = False

    def cancel(self):
        self._is_cancelled = True

    def run(self):
        accumulated = []
        try:
            generator = self.service.stream_generate(
                prompt=self.prompt,
                system_prompt=self.system_prompt,
                messages=self.messages,
                provider=self.provider,
            )
            for chunk in generator:
                if self._is_cancelled:
                    break
                if chunk:
                    accumulated.append(chunk)
                    self.chunk_received.emit(chunk)

            if not self._is_cancelled:
                self.finished.emit("".join(accumulated))
        except Exception as e:
            if not self._is_cancelled:
                self.error.emit(str(e))


class AIService(QObject):
    """
    Multi-Provider AI Service supporting Ollama, OpenAI-compatible / 9Router / Groq / vLLM,
    and Google Gemini with real model discovery, connection verification, and true token streaming.
    """
    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = ""):
        super().__init__()
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def test_connection(self, provider: Optional[AIProviderConfig] = None) -> Tuple[bool, str, List[str]]:
        """
        Performs a real API request to verify connectivity and discover available models.
        Returns: (is_connected, status_message, list_of_models)
        """
        p_type = provider.type if provider else "ollama"
        raw_url = provider.base_url.strip() if provider else self.base_url
        url = raw_url.rstrip("/")
        api_key = provider.api_key.strip() if provider else ""
        headers = dict(provider.custom_headers) if provider else {}

        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        # -------------------------------------------------------------
        # 1. OLLAMA CONNECTION TEST & MODEL DISCOVERY
        # -------------------------------------------------------------
        if p_type == "ollama":
            if not url:
                return False, "Ollama base URL is empty.", []
            try:
                resp = requests.get(f"{url}/api/tags", headers=headers, timeout=4.0)
                if resp.status_code == 200:
                    data = resp.json()
                    models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                    if models:
                        return True, f"Connected to Ollama (Found {len(models)} model(s))", models
                    else:
                        return True, "Connected to Ollama (No models installed; run 'ollama pull <model>')", []
                else:
                    return False, f"Ollama HTTP {resp.status_code}: {resp.text[:120]}", []
            except requests.exceptions.ConnectionError:
                return False, f"Connection refused at {url}. Ensure Ollama is running.", []
            except requests.exceptions.Timeout:
                return False, f"Connection timed out at {url} (after 4.0s).", []
            except Exception as e:
                return False, f"Ollama connection error: {e}", []

        # -------------------------------------------------------------
        # 2. OPENAI-COMPATIBLE / 9ROUTER / CUSTOM TEST & DISCOVERY
        # -------------------------------------------------------------
        elif p_type in ("openai_compatible", "custom"):
            if not url:
                return False, "Provider base URL is empty.", []
            
            # Normalize models endpoint
            if url.endswith("/chat/completions"):
                models_url = url.replace("/chat/completions", "/models")
            elif url.endswith("/v1"):
                models_url = f"{url}/models"
            else:
                models_url = f"{url}/models"

            try:
                resp = requests.get(models_url, headers=headers, timeout=5.0)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_list = data.get("data", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])
                    models = []
                    for item in raw_list:
                        if isinstance(item, dict) and item.get("id"):
                            models.append(item["id"])
                        elif isinstance(item, str):
                            models.append(item)
                    if models:
                        return True, f"Connected (Found {len(models)} model(s))", models
                    return True, "Connected (Model list is empty)", []
                elif resp.status_code in (401, 403):
                    return False, f"Authentication failed (HTTP {resp.status_code}): Invalid or missing API key.", []
                elif resp.status_code == 404:
                    return False, f"Endpoint not found (HTTP 404) at {models_url}. Check Base URL.", []
                else:
                    return False, f"Provider error (HTTP {resp.status_code}): {resp.text[:120]}", []
            except requests.exceptions.ConnectionError:
                return False, f"Connection refused at {url}. Check if the server is running.", []
            except requests.exceptions.Timeout:
                return False, f"Connection timed out at {models_url}.", []
            except Exception as e:
                return False, f"Connection error: {e}", []

        # -------------------------------------------------------------
        # 3. GEMINI CONNECTION TEST & DISCOVERY
        # -------------------------------------------------------------
        elif p_type == "gemini":
            if not api_key:
                return False, "Gemini API key is required. Please enter an API key.", []

            gemini_models_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            try:
                resp = requests.get(gemini_models_url, timeout=6.0)
                if resp.status_code == 200:
                    data = resp.json()
                    all_models = data.get("models", [])
                    # Filter generative models
                    models = [
                        m.get("name", "").replace("models/", "")
                        for m in all_models
                        if "gemini" in m.get("name", "").lower()
                    ]
                    if not models:
                        models = [m.get("name", "").replace("models/", "") for m in all_models if m.get("name")]
                    return True, f"Connected to Gemini (Found {len(models)} model(s))", models
                else:
                    err_msg = ""
                    try:
                        err_msg = resp.json().get("error", {}).get("message", "")
                    except Exception:
                        pass
                    if not err_msg:
                        err_msg = resp.text[:120]
                    return False, f"Gemini error (HTTP {resp.status_code}): {err_msg}", []
            except requests.exceptions.ConnectionError:
                return False, "Failed to connect to Google Gemini API (Network error).", []
            except requests.exceptions.Timeout:
                return False, "Gemini request timed out.", []
            except Exception as e:
                return False, f"Gemini error: {e}", []

        return False, f"Unknown provider type: {p_type}", []

    def get_models(self, provider: Optional[AIProviderConfig] = None) -> List[str]:
        """
        Fetches installed/available models for the given provider.
        """
        success, msg, models = self.test_connection(provider)
        return models

    def stream_generate(
        self,
        prompt: str,
        system_prompt: str = "",
        messages: Optional[List[Dict[str, str]]] = None,
        provider: Optional[AIProviderConfig] = None,
    ) -> Generator[str, None, None]:
        """
        Generator that yields text tokens/chunks in real time.
        Handles errors cleanly without swallowing exceptions.
        """
        p_type = provider.type if provider else "ollama"
        raw_url = provider.base_url.strip() if provider else self.base_url
        url = raw_url.rstrip("/")
        model = (provider.model.strip() if provider and provider.model else "") or self.default_model
        headers = dict(provider.custom_headers) if provider else {}
        api_key = provider.api_key.strip() if provider else ""

        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        # -------------------------------------------------------------
        # 1. OLLAMA STREAMING
        # -------------------------------------------------------------
        if p_type == "ollama":
            if not model:
                # Attempt to auto-discover installed model
                models = self.get_models(provider)
                if models:
                    model = models[0]
                else:
                    yield f"[Ollama Error: No model selected. Please select an installed model in Settings.]"
                    return

            api_url = f"{url}/api/chat" if messages else f"{url}/api/generate"
            if messages:
                chat_msgs = list(messages)
                if system_prompt and not any(m.get("role") == "system" for m in chat_msgs):
                    chat_msgs.insert(0, {"role": "system", "content": system_prompt})
                payload = {
                    "model": model,
                    "messages": chat_msgs,
                    "stream": True,
                    "options": {"temperature": 0.3}
                }
            else:
                payload = {
                    "model": model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {"temperature": 0.3}
                }
                if system_prompt:
                    payload["system"] = system_prompt

            try:
                resp = requests.post(api_url, json=payload, headers=headers, stream=True, timeout=30)
                if resp.status_code != 200:
                    err_text = ""
                    try:
                        err_text = resp.json().get("error", "")
                    except Exception:
                        pass
                    if not err_text:
                        err_text = resp.text[:150]
                    yield f"[Ollama Error (HTTP {resp.status_code}): {err_text}]"
                    return

                for line in resp.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode("utf-8"))
                            if "error" in data:
                                yield f"[Ollama Error: {data['error']}]"
                                return
                            chunk = data.get("message", {}).get("content", "") or data.get("response", "")
                            if chunk:
                                yield chunk
                            if data.get("done", False):
                                break
                        except Exception:
                            continue
            except requests.exceptions.ConnectionError:
                yield f"[Cannot connect to Ollama at {url}. Ensure Ollama is running.]"
            except requests.exceptions.Timeout:
                yield f"[Ollama streaming timed out at {url}.]"
            except Exception as e:
                yield f"[Ollama error: {e}]"

        # -------------------------------------------------------------
        # 2. OPENAI-COMPATIBLE (9Router / Groq / vLLM / Custom)
        # -------------------------------------------------------------
        elif p_type in ("openai_compatible", "custom"):
            if not model:
                model = "gpt-3.5-turbo"

            if url.endswith("/chat/completions"):
                api_url = url
            elif url.endswith("/v1"):
                api_url = f"{url}/chat/completions"
            else:
                api_url = f"{url}/chat/completions"

            chat_msgs = []
            if system_prompt:
                chat_msgs.append({"role": "system", "content": system_prompt})
            if messages:
                chat_msgs.extend(messages)
            else:
                chat_msgs.append({"role": "user", "content": prompt})

            payload = {
                "model": model,
                "messages": chat_msgs,
                "stream": True,
                "temperature": 0.3
            }

            try:
                resp = requests.post(api_url, json=payload, headers=headers, stream=True, timeout=30)
                if resp.status_code != 200:
                    err_msg = ""
                    try:
                        err_msg = resp.json().get("error", {}).get("message", "")
                    except Exception:
                        pass
                    if not err_msg:
                        err_msg = resp.text[:150]
                    yield f"[Provider Error (HTTP {resp.status_code}): {err_msg}]"
                    return

                for line in resp.iter_lines():
                    if line:
                        decoded = line.decode("utf-8").strip()
                        if decoded.startswith("data: "):
                            raw_json = decoded[6:].strip()
                            if raw_json == "[DONE]":
                                break
                            try:
                                data = json.loads(raw_json)
                                choices = data.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    chunk = delta.get("content", "")
                                    if chunk:
                                        yield chunk
                            except Exception:
                                continue
            except requests.exceptions.ConnectionError:
                yield f"[Cannot connect to AI provider at {url}.]"
            except requests.exceptions.Timeout:
                yield f"[AI provider request timed out at {url}.]"
            except Exception as e:
                yield f"[Provider error: {e}]"

        # -------------------------------------------------------------
        # 3. GEMINI STREAMING
        # -------------------------------------------------------------
        elif p_type == "gemini":
            if not api_key:
                yield "[Error: Gemini API key is missing. Please configure it in Settings.]"
                return

            gemini_model = model or "gemini-1.5-flash"
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:streamGenerateContent?key={api_key}&alt=sse"

            contents = []
            if system_prompt:
                contents.append({"role": "user", "parts": [{"text": f"System Instruction: {system_prompt}"}]})
                contents.append({"role": "model", "parts": [{"text": "Understood."}]})
            if messages:
                for m in messages:
                    role = "user" if m.get("role") != "assistant" else "model"
                    contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
            else:
                contents.append({"role": "user", "parts": [{"text": prompt}]})

            payload = {
                "contents": contents,
                "generationConfig": {"temperature": 0.3}
            }

            try:
                resp = requests.post(gemini_url, json=payload, headers={"Content-Type": "application/json"}, stream=True, timeout=30)
                if resp.status_code != 200:
                    err_msg = ""
                    try:
                        err_msg = resp.json().get("error", {}).get("message", "")
                    except Exception:
                        pass
                    if not err_msg:
                        err_msg = resp.text[:150]
                    yield f"[Gemini Error (HTTP {resp.status_code}): {err_msg}]"
                    return

                for line in resp.iter_lines():
                    if line:
                        decoded = line.decode("utf-8").strip()
                        if decoded.startswith("data: "):
                            raw_json = decoded[6:].strip()
                            try:
                                data = json.loads(raw_json)
                                candidates = data.get("candidates", [])
                                if candidates:
                                    parts = candidates[0].get("content", {}).get("parts", [])
                                    for part in parts:
                                        chunk = part.get("text", "")
                                        if chunk:
                                            yield chunk
                            except Exception:
                                continue
            except requests.exceptions.ConnectionError:
                yield "[Cannot connect to Google Gemini API (Network error).]"
            except requests.exceptions.Timeout:
                yield "[Gemini request timed out.]"
            except Exception as e:
                yield f"[Gemini error: {e}]"

    def build_vocab_prompt(self, text: str, template: str = "") -> str:
        t = template.strip() if template else DEFAULT_VOCAB_PROMPT
        if "{text}" in t:
            return t.replace("{text}", text)
        return f"{t}\n\nTerm: '{text}'"

    def build_sentence_prompt(self, text: str, template: str = "") -> str:
        t = template.strip() if template else DEFAULT_SENTENCE_PROMPT
        if "{text}" in t:
            return t.replace("{text}", text)
        return f"{t}\n\nText: \"{text}\""

    def generate_response(self, prompt: str, system_prompt: str = "", model: str = "", provider: Optional[AIProviderConfig] = None) -> Tuple[bool, str]:
        """
        Non-streaming generation helper (accumulates all chunks).
        """
        chunks = []
        for c in self.stream_generate(prompt=prompt, system_prompt=system_prompt, provider=provider):
            chunks.append(c)
        full = "".join(chunks).strip()
        if full.startswith(("[Cannot connect", "[No Ollama", "[Provider Error", "[Gemini Error", "[Ollama Error", "[Error:")):
            return False, full
        return True, full

    def analyze_selection(self, selected_text: str, model: str = "", provider: Optional[AIProviderConfig] = None, prompts: Optional[AIPromptsConfig] = None) -> Tuple[bool, str]:
        """
        Analyzes selected text non-streaming.
        """
        text = selected_text.strip()
        if not text:
            return False, "Empty selection."

        is_single_word = len(text.split()) <= 2 and len(text) < 30
        p_cfg = prompts or AIPromptsConfig()

        if is_single_word:
            prompt = self.build_vocab_prompt(text, p_cfg.vocab_prompt)
        else:
            prompt = self.build_sentence_prompt(text, p_cfg.sentence_prompt)

        sys_prompt = p_cfg.system_prompt
        if p_cfg.custom_instructions:
            sys_prompt += f"\n\n{p_cfg.custom_instructions}"

        return self.generate_response(prompt=prompt, system_prompt=sys_prompt, model=model, provider=provider)
