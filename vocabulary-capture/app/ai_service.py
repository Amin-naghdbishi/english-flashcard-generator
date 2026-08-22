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
    QThread worker for true streaming AI generation.
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
    Multi-Provider AI Client supporting Ollama, OpenAI-compatible (9Router/Groq/vLLM),
    and Gemini with full token streaming.
    """
    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = ""):
        super().__init__()
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def get_models(self, provider: Optional[AIProviderConfig] = None) -> List[str]:
        """
        Fetches installed/available models for the given provider.
        """
        p_type = provider.type if provider else "ollama"
        url = provider.base_url.rstrip("/") if provider else self.base_url
        headers = dict(provider.custom_headers) if provider else {}
        if provider and provider.api_key:
            headers["Authorization"] = f"Bearer {provider.api_key}"

        if p_type == "ollama":
            try:
                resp = requests.get(f"{url}/api/tags", headers=headers, timeout=2.5)
                if resp.status_code == 200:
                    data = resp.json()
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
            except Exception:
                pass
        elif p_type in ("openai_compatible", "custom"):
            try:
                resp = requests.get(f"{url}/models", headers=headers, timeout=2.5)
                if resp.status_code == 200:
                    data = resp.json()
                    models = data.get("data", [])
                    return [m.get("id") for m in models if m.get("id")]
            except Exception:
                pass

        return []

    def stream_generate(
        self,
        prompt: str,
        system_prompt: str = "",
        messages: Optional[List[Dict[str, str]]] = None,
        provider: Optional[AIProviderConfig] = None,
    ) -> Generator[str, None, None]:
        """
        Generator that yields text tokens/chunks in real time.
        """
        p_type = provider.type if provider else "ollama"
        url = provider.base_url.rstrip("/") if provider else self.base_url
        model = provider.model if (provider and provider.model) else self.default_model
        headers = dict(provider.custom_headers) if provider else {}
        if provider and provider.api_key:
            headers["Authorization"] = f"Bearer {provider.api_key}"

        if not model and p_type == "ollama":
            models = self.get_models(provider)
            if models:
                model = models[0]
            else:
                yield "No Ollama models found. Please ensure Ollama is running and has a model installed (e.g. 'ollama run llama3')."
                return

        # -------------------------------------------------------------
        # 1. OLLAMA STREAMING
        # -------------------------------------------------------------
        if p_type == "ollama":
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
                resp = requests.post(api_url, json=payload, headers=headers, stream=True, timeout=25)
                if resp.status_code != 200:
                    yield f"Ollama Error (HTTP {resp.status_code}): {resp.text[:150]}"
                    return

                for line in resp.iter_lines():
                    if line:
                        try:
                            data = json.loads(line.decode("utf-8"))
                            chunk = data.get("message", {}).get("content", "") or data.get("response", "")
                            if chunk:
                                yield chunk
                            if data.get("done", False):
                                break
                        except Exception:
                            continue
            except requests.exceptions.ConnectionError:
                yield f"Cannot connect to Ollama at {url}. Is Ollama running?"
            except requests.exceptions.Timeout:
                yield f"Ollama streaming timed out after 25s."
            except Exception as e:
                yield f"AI error: {e}"

        # -------------------------------------------------------------
        # 2. OPENAI-COMPATIBLE (9Router / Groq / vLLM / Custom)
        # -------------------------------------------------------------
        elif p_type in ("openai_compatible", "custom"):
            api_url = f"{url}/chat/completions" if not url.endswith("/chat/completions") else url
            chat_msgs = []
            if system_prompt:
                chat_msgs.append({"role": "system", "content": system_prompt})
            if messages:
                chat_msgs.extend(messages)
            else:
                chat_msgs.append({"role": "user", "content": prompt})

            payload = {
                "model": model or "gpt-3.5-turbo",
                "messages": chat_msgs,
                "stream": True,
                "temperature": 0.3
            }

            try:
                resp = requests.post(api_url, json=payload, headers=headers, stream=True, timeout=30)
                if resp.status_code != 200:
                    yield f"Provider Error (HTTP {resp.status_code}): {resp.text[:150]}"
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
                yield f"Cannot connect to AI provider at {url}."
            except Exception as e:
                yield f"Provider error: {e}"

        # -------------------------------------------------------------
        # 3. GEMINI STREAMING
        # -------------------------------------------------------------
        elif p_type == "gemini":
            api_key = provider.api_key if provider else ""
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
                    yield f"Gemini Error (HTTP {resp.status_code}): {resp.text[:150]}"
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
            except Exception as e:
                yield f"Gemini error: {e}"

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
        if full.startswith(("Cannot connect", "No Ollama models", "Provider Error", "Gemini Error", "Ollama Error")):
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
