import tempfile
from pathlib import Path
from app.config import ConfigManager, AppConfig, AIProviderConfig, AIPromptsConfig, TTSConfig

def test_default_config():
    cfg = AppConfig()
    assert cfg.global_shortcut == "<ctrl>+<alt>+v"
    assert cfg.default_deck == "English::B1"
    assert cfg.theme == "anki-dark"
    assert cfg.show_tabs is True
    assert len(cfg.providers) >= 3
    assert cfg.prompts.vocab_prompt is not None
    assert "{text}" in cfg.prompts.vocab_prompt
    assert cfg.tts.piper_url == "http://127.0.0.1:5000"
    assert cfg.tts.length_scale == 1.0

def test_config_save_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_file = Path(tmpdir) / "config.json"
        mgr = ConfigManager(config_path=cfg_file)

        # Modify values
        mgr.config.global_shortcut = "<ctrl>+<shift>+x"
        mgr.config.default_deck = "German::A1"
        mgr.config.theme = "anki-light"
        mgr.config.show_tabs = False
        mgr.config.txt_directory = tmpdir
        mgr.config.prompts.vocab_prompt = "Custom vocab prompt for {text}"
        mgr.config.tts.length_scale = 1.20
        mgr.config.tts.voice = "custom-voice"

        # Add custom provider
        mgr.config.providers.append(AIProviderConfig(
            id="test_prov",
            name="Test Provider",
            type="openai_compatible",
            base_url="http://localhost:9000/v1",
            model="test-model"
        ))
        mgr.config.active_provider_id = "test_prov"

        mgr.save()
        assert cfg_file.exists()

        # Reload with fresh manager (settings persistence)
        mgr2 = ConfigManager(config_path=cfg_file)
        assert mgr2.config.global_shortcut == "<ctrl>+<shift>+x"
        assert mgr2.config.default_deck == "German::A1"
        assert mgr2.config.theme == "anki-light"
        assert mgr2.config.show_tabs is False
        assert mgr2.config.txt_directory == tmpdir
        assert mgr2.config.prompts.vocab_prompt == "Custom vocab prompt for {text}"
        assert mgr2.config.tts.length_scale == 1.20
        assert mgr2.config.tts.voice == "custom-voice"
        assert mgr2.config.active_provider_id == "test_prov"
        assert mgr2.config.get_active_provider().model == "test-model"
