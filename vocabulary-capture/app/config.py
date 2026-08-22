import json
import os
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional

SUBPROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG_DIR = SUBPROJECT_ROOT / "config"
DEFAULT_CONFIG_FILE = DEFAULT_CONFIG_DIR / "config.json"
DEFAULT_TXT_DIR = SUBPROJECT_ROOT / "txt"

@dataclass
class AppConfig:
    global_shortcut: str = "<ctrl>+<alt>+v"
    txt_directory: str = str(DEFAULT_TXT_DIR)
    ai_provider: str = "ollama"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = ""
    default_deck: str = "English::B1"
    show_tabs: bool = True
    theme: str = "anki-dark"  # "anki-dark" or "anki-light"
    stay_on_top: bool = True
    window_width: int = 380
    window_height: int = 480
    auto_trigger_meaning: bool = False

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AppConfig":
        valid_keys = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in valid_keys}
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
                    # Normalize txt_directory if default relative
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
