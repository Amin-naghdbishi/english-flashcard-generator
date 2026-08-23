import json
import os
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import Dict, List, Any, Optional

SUBPROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_DIR = SUBPROJECT_ROOT / "config"
DEFAULT_CONFIG_FILE = DEFAULT_CONFIG_DIR / "config.json"
DEFAULT_TXT_DIR = SUBPROJECT_ROOT / "txt"

DEFAULT_SYSTEM_PROMPT = (
    "You are an expert English-to-Persian vocabulary and language learning assistant. "
    "Your job is to provide clear, direct, and accurate Persian meanings, definitions, and translations for English learners."
)

DEFAULT_VOCAB_PROMPT = (
    "Explain the Persian meaning of the English word/term '{text}' clearly and concisely for an English learner. "
    "Provide the primary Persian translation(s), part of speech, IPA phonetic pronunciation, "
    "and a brief natural example sentence with Persian translation."
)

DEFAULT_SENTENCE_PROMPT = (
    "Translate the following English sentence/text into natural, fluent Persian (فارسی) for a language learner, "
    "followed by a brief explanation of any key idioms or vocabulary if relevant:\n\n\"{text}\""
)

DEFAULT_CUSTOM_INSTRUCTIONS = "Keep responses clean, concise, and formatted for a compact screen."

@dataclass
class AIProviderConfig:
    id: str = "ollama"
    name: str = "Ollama (Local)"
    type: str = "ollama"  # "ollama", "gemini", "openai_compatible"
    base_url: str = "http://localhost:11434"
    api_key: str = ""
    model: str = ""
    custom_headers: Dict[str, str] = field(default_factory=dict)
    streaming: bool = True

@dataclass
class AIPromptsConfig:
    system_prompt: str = DEFAULT_SYSTEM_PROMPT
    vocab_prompt: str = DEFAULT_VOCAB_PROMPT
    sentence_prompt: str = DEFAULT_SENTENCE_PROMPT
    custom_instructions: str = DEFAULT_CUSTOM_INSTRUCTIONS

@dataclass
class TTSConfig:
    piper_url: str = "http://127.0.0.1:5000"
    voice: str = ""
    length_scale: float = 1.0  # Speed in Piper length_scale: 1.0=normal, 1.25=slower, 0.8=faster
    auto_play: bool = False

@dataclass
class AppConfig:
    global_shortcut: str = "<ctrl>+<alt>+v"
    txt_directory: str = str(DEFAULT_TXT_DIR)
    default_deck: str = "English::B1"
    default_capture_type: str = "A"  # "A" or "B"
    default_txt_file_a: str = ""      # e.g. "english words (A).txt"
    default_txt_file_b: str = ""      # e.g. "english B1 (B).txt"
    show_tabs: bool = True
    theme: str = "anki-dark"  # "anki-dark" or "anki-light"
    stay_on_top: bool = True
    window_width: int = 380
    window_height: int = 480
    auto_trigger_meaning: bool = True
    active_provider_id: str = "ollama"
    providers: List[AIProviderConfig] = field(default_factory=lambda: [
        AIProviderConfig(id="ollama", name="Ollama (Local)", type="ollama", base_url="http://localhost:11434", model=""),
        AIProviderConfig(id="gemini", name="Google Gemini", type="gemini", base_url="https://generativelanguage.googleapis.com", model="gemini-1.5-flash"),
        AIProviderConfig(id="custom", name="Custom / OpenAI / 9Router", type="openai_compatible", base_url="http://localhost:8080/v1", model="gpt-3.5-turbo"),
    ])
    prompts: AIPromptsConfig = field(default_factory=AIPromptsConfig)
    tts: TTSConfig = field(default_factory=TTSConfig)

    # Legacy fields for backward compatibility
    @property
    def ollama_url(self) -> str:
        prov = self.get_active_provider()
        return prov.base_url if prov.type == "ollama" else "http://localhost:11434"

    @property
    def ollama_model(self) -> str:
        prov = self.get_active_provider()
        return prov.model

    @ollama_model.setter
    def ollama_model(self, value: str):
        prov = self.get_active_provider()
        if prov:
            prov.model = value

    def get_active_provider(self) -> AIProviderConfig:
        for p in self.providers:
            if p.id == self.active_provider_id:
                return p
        if self.providers:
            return self.providers[0]
        default_prov = AIProviderConfig()
        self.providers.append(default_prov)
        return default_prov

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppConfig":
        # Handle nested providers
        raw_providers = data.get("providers", [])
        parsed_providers = []
        if isinstance(raw_providers, list) and raw_providers:
            for p in raw_providers:
                if isinstance(p, dict):
                    valid_keys = {f.name for f in AIProviderConfig.__dataclass_fields__.values()}
                    filt = {k: v for k, v in p.items() if k in valid_keys}
                    parsed_providers.append(AIProviderConfig(**filt))
                elif isinstance(p, AIProviderConfig):
                    parsed_providers.append(p)
        else:
            # Fallback / migrate legacy ollama settings if present
            ollama_url = data.get("ollama_url", "http://localhost:11434")
            ollama_model = data.get("ollama_model", "")
            parsed_providers = [
                AIProviderConfig(id="ollama", name="Ollama (Local)", type="ollama", base_url=ollama_url, model=ollama_model),
                AIProviderConfig(id="gemini", name="Google Gemini", type="gemini", base_url="https://generativelanguage.googleapis.com", model="gemini-1.5-flash"),
                AIProviderConfig(id="custom", name="Custom / OpenAI / 9Router", type="openai_compatible", base_url="http://localhost:8080/v1", model="gpt-3.5-turbo"),
            ]

        # Handle nested prompts
        raw_prompts = data.get("prompts", {})
        if isinstance(raw_prompts, dict) and raw_prompts:
            valid_p_keys = {f.name for f in AIPromptsConfig.__dataclass_fields__.values()}
            filt_p = {k: v for k, v in raw_prompts.items() if k in valid_p_keys}
            parsed_prompts = AIPromptsConfig(**filt_p)
        else:
            parsed_prompts = AIPromptsConfig()

        # Handle nested TTS
        raw_tts = data.get("tts", {})
        if isinstance(raw_tts, dict) and raw_tts:
            valid_t_keys = {f.name for f in TTSConfig.__dataclass_fields__.values()}
            filt_t = {k: v for k, v in raw_tts.items() if k in valid_t_keys}
            parsed_tts = TTSConfig(**filt_t)
        else:
            parsed_tts = TTSConfig()

        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in valid_keys and k not in ("providers", "prompts", "tts")}
        filtered["providers"] = parsed_providers
        filtered["prompts"] = parsed_prompts
        filtered["tts"] = parsed_tts

        return cls(**filtered)

class ConfigManager:
    def __init__(self, config_path: Optional[Path] = None):
        if config_path is None:
            self.config_dir = DEFAULT_CONFIG_DIR
            self.config_path = DEFAULT_CONFIG_FILE
        else:
            self.config_path = Path(config_path)
            self.config_dir = self.config_path.parent

        self.config: AppConfig = self.load()

    def load(self) -> AppConfig:
        try:
            if self.config_path.exists():
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cfg = AppConfig.from_dict(data)
                    if cfg.txt_directory == "txt":
                        cfg.txt_directory = str(DEFAULT_TXT_DIR)
                    return cfg
        except Exception as e:
            print(f"[ConfigManager] Error loading config from {self.config_path}: {e}")

        # Fallback default
        default_cfg = AppConfig()
        try:
            self.save(default_cfg)
        except Exception:
            pass
        return default_cfg

    def save(self, config: Optional[AppConfig] = None) -> bool:
        if config is not None:
            self.config = config

        try:
            self.config_dir.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(asdict(self.config), f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[ConfigManager] Error saving config to {self.config_path}: {e}")
            return False

    def get_txt_dir(self) -> Path:
        raw = Path(self.config.txt_directory).expanduser()
        if not raw.is_absolute():
            raw = (SUBPROJECT_ROOT / raw).resolve()
        else:
            raw = raw.resolve()
        raw.mkdir(parents=True, exist_ok=True)
        return raw
