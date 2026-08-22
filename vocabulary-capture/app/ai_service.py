import json
import requests
from typing import List, Dict, Optional, Tuple

class AIService:
    def __init__(self, base_url: str = "http://localhost:11434", default_model: str = ""):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    def get_models(self) -> List[str]:
        """
        Queries Ollama /api/tags to list all locally installed models.
        """
        try:
            url = f"{self.base_url}/api/tags"
            resp = requests.get(url, timeout=2)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("name") for m in data.get("models", []) if m.get("name")]
                return models
        except Exception as e:
            print(f"[AIService] Could not fetch Ollama models from {self.base_url}: {e}")
        return []

    def generate_response(self, prompt: str, system_prompt: str = "", model: str = "") -> Tuple[bool, str]:
        """
        Sends a single generation prompt to Ollama /api/generate.
        """
        target_model = model or self.default_model
        if not target_model:
            models = self.get_models()
            if models:
                target_model = models[0]
            else:
                return False, "No Ollama models found. Please make sure Ollama is running and has at least one model installed (e.g. 'ollama run llama3')."

        try:
            url = f"{self.base_url}/api/generate"
            payload = {
                "model": target_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                }
            }
            if system_prompt:
                payload["system"] = system_prompt

            resp = requests.post(url, json=payload, timeout=20)
            if resp.status_code == 200:
                result = resp.json()
                return True, result.get("response", "").strip()
            else:
                return False, f"Ollama HTTP {resp.status_code}: {resp.text[:150]}"
        except requests.exceptions.ConnectionError:
            return False, f"Cannot connect to Ollama at {self.base_url}. Is Ollama running?"
        except requests.exceptions.Timeout:
            return False, "Ollama request timed out after 20 seconds."
        except Exception as e:
            return False, f"AI generation error: {e}"

    def chat_completion(self, messages: List[Dict[str, str]], model: str = "") -> Tuple[bool, str]:
        """
        Multi-turn chat completion using Ollama /api/chat.
        """
        target_model = model or self.default_model
        if not target_model:
            models = self.get_models()
            if models:
                target_model = models[0]
            else:
                return False, "No Ollama models available."

        try:
            url = f"{self.base_url}/api/chat"
            payload = {
                "model": target_model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.4,
                }
            }
            resp = requests.post(url, json=payload, timeout=25)
            if resp.status_code == 200:
                result = resp.json()
                msg = result.get("message", {}).get("content", "").strip()
                return True, msg
            else:
                return False, f"Ollama HTTP {resp.status_code}: {resp.text[:150]}"
        except requests.exceptions.ConnectionError:
            return False, f"Cannot connect to Ollama at {self.base_url}."
        except Exception as e:
            return False, f"Chat error: {e}"

    def analyze_selection(self, selected_text: str, model: str = "") -> Tuple[bool, str]:
        """
        Automatically analyzes selected text:
        - If single word: gives meaning, phonetic guide, Persian meaning, and example.
        - If sentence/phrase: provides accurate Persian translation and concise breakdown.
        """
        text = selected_text.strip()
        if not text:
            return False, "Empty selection."

        is_single_word = len(text.split()) <= 2 and len(text) < 30

        if is_single_word:
            prompt = (
                f"Analyze the English word/phrase '{text}'.\n"
                "Provide:\n"
                "1. Part of speech & IPA pronunciation\n"
                "2. Persian meaning (معنی دقیق و روان فارسی)\n"
                "3. Clear English definition\n"
                "4. A practical example sentence with its Persian translation.\n"
                "Keep it very concise and clean."
            )
            system = "You are a concise, helpful English-Persian vocabulary and language learning assistant."
        else:
            prompt = (
                f"Translate and analyze this text:\n\"{text}\"\n\n"
                "Provide:\n"
                "1. Accurate, natural Persian translation (ترجمه روان و دقیق فارسی)\n"
                "2. Key vocabulary or idioms in the text if any.\n"
                "Keep it concise and clear."
            )
            system = "You are an expert English-to-Persian translator and language assistant."

        return self.generate_response(prompt=prompt, system_prompt=system, model=model)
