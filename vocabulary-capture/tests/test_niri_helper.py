import tempfile
from pathlib import Path
from app.niri_helper import (
    normalize_to_niri_shortcut,
    generate_niri_config_snippet,
    check_niri_status,
    apply_niri_config,
)

def test_normalize_to_niri_shortcut():
    assert normalize_to_niri_shortcut("<ctrl>+<alt>+v") == "Ctrl+Alt+V"
    assert normalize_to_niri_shortcut("ctrl+alt+v") == "Ctrl+Alt+V"
    assert normalize_to_niri_shortcut("<ctrl>+<shift>+v") == "Ctrl+Shift+V"
    assert normalize_to_niri_shortcut("super+v") == "Mod+V"
    assert normalize_to_niri_shortcut("mod+ctrl+v") == "Mod+Ctrl+V"

def test_generate_niri_snippet():
    snippet = generate_niri_config_snippet("<ctrl>+<alt>+v")
    assert "window-rule" in snippet
    assert 'match app-id="^vocabulary-capture.*"' in snippet
    assert "open-floating true" in snippet
    assert "Ctrl+Alt+V" in snippet
    assert "--capture" in snippet

def test_apply_niri_config(monkeypatch):
    with tempfile.TemporaryDirectory() as tmpdir:
        fake_niri_cfg = Path(tmpdir) / "config.kdl"
        fake_niri_cfg.write_text("// Existing Niri config\n", encoding="utf-8")

        monkeypatch.setattr("app.niri_helper.get_niri_config_path", lambda: fake_niri_cfg)

        success, msg = apply_niri_config("<ctrl>+<alt>+v")
        assert success is True
        assert fake_niri_cfg.exists()

        content = fake_niri_cfg.read_text(encoding="utf-8")
        assert "Vocabulary Capture Niri Configuration" in content
        assert "Ctrl+Alt+V" in content
        assert "open-floating true" in content
