import tempfile
from pathlib import Path
from app.config import ConfigManager, AppConfig

def test_default_config():
    cfg = AppConfig()
    assert cfg.global_shortcut == "<ctrl>+<alt>+v"
    assert cfg.default_deck == "English::B1"
    assert cfg.theme == "anki-dark"
    assert cfg.show_tabs is True

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
        mgr.save()

        assert cfg_file.exists()

        # Reload with fresh manager (point 24: settings persist)
        mgr2 = ConfigManager(config_path=cfg_file)
        assert mgr2.config.global_shortcut == "<ctrl>+<shift>+x"
        assert mgr2.config.default_deck == "German::A1"
        assert mgr2.config.theme == "anki-light"
        assert mgr2.config.show_tabs is False
        assert mgr2.config.txt_directory == tmpdir
