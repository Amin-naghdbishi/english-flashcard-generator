import os
import tempfile
from pathlib import Path
import pytest

from PySide6.QtCore import Qt, QPoint
from PySide6.QtGui import QKeyEvent, QCloseEvent
from PySide6.QtWidgets import QApplication

from app.config import AppConfig, ConfigManager, AIProviderConfig, AIPromptsConfig, TTSConfig
from app.ai_service import AIService
from app.tts_service import TTSService
from app.txt_manager import create_new_txt_file, TXTFormat
from app.capture_service import CaptureService
from app.ui.floating_window import FloatingWindow
from app.ui.dashboard_window import DashboardWindow
from app.ui.tray_icon import SystemTrayManager
from app.main import VocabularyCaptureApp

@pytest.fixture(scope="session")
def qapp():
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app

def test_floating_window_lifecycle_and_streaming(qapp):
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg = AppConfig(txt_directory=tmpdir, theme="anki-dark", auto_trigger_meaning=False)
        ai = AIService(base_url="http://127.0.0.1:59999")
        tts = TTSService(cfg.tts)

        create_new_txt_file(Path(tmpdir), "daily words", "A")
        create_new_txt_file(Path(tmpdir), "english B1", "B")

        win = FloatingWindow(cfg, ai, tts)
        win.show_window()
        assert win.isVisible()

        # Niri / Wayland fixed size constraint check
        assert win.width() == cfg.window_width
        assert win.height() == cfg.window_height

        # Set captured text
        win.set_captured_text("abandon")
        assert win.captured_text == "abandon"
        assert win.b_inp_word.text() == "abandon"
        assert win.isVisible()

        # Tab 1 (AI)
        assert win.stack.currentIndex() == 0
        assert win.ai_selection_lbl.text() == "abandon"

        # Tab 2 (TXT)
        win.switch_tab(1)
        assert win.stack.currentIndex() == 1
        assert win.isVisible()

        # Keyboard 1/2 navigation
        event_key1 = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_1, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_key1)
        assert win.stack.currentIndex() == 0

        event_key2 = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_2, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_key2)
        assert win.stack.currentIndex() == 1

        # Arrow-key navigation
        event_left = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_Left, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_left)
        assert win.stack.currentIndex() == 0

        event_right = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_Right, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_right)
        assert win.stack.currentIndex() == 1

        # Format A selection and appending
        win.set_txt_format(TXTFormat.A)
        assert win.current_format_filter == TXTFormat.A
        assert win.files_list_widget.count() == 1
        assert "daily words" in win.files_list_widget.item(0).text()

        # Click Format A file -> appends word
        item_a = win.files_list_widget.item(0)
        win._on_file_item_clicked(item_a)
        assert win.isVisible()
        a_content = (Path(tmpdir) / "daily words (A).txt").read_text(encoding="utf-8")
        assert "abandon" in a_content

        # Format B selection and editing
        win.set_txt_format(TXTFormat.B)
        assert win.current_format_filter == TXTFormat.B
        assert win.files_list_widget.count() == 1
        assert "english B1" in win.files_list_widget.item(0).text()

        # Click Format B file -> opens B field editor in same window
        item_b = win.files_list_widget.item(0)
        win._on_file_item_clicked(item_b)
        assert win.txt_stack.currentIndex() == 1
        assert win.selected_b_file.name == "english B1 (B).txt"
        assert win.isVisible()

        # Fill B fields and save
        win.b_inp_meaning.setText("رها کردن")
        win._save_format_b_entry()

        # Verify returned to file list in same window
        assert win.txt_stack.currentIndex() == 0
        assert win.isVisible()
        b_content = (Path(tmpdir) / "english B1 (B).txt").read_text(encoding="utf-8")
        assert "--\nWord=abandon\nDeck=English::B1\nPersian Meaning=رها کردن\n--" in b_content
        assert "Phonetic=" not in b_content

        # Test audio button click (does not raise)
        win._play_selection_tts()

        # Explicit close with hide_window
        win.hide_window()
        assert not win.isVisible()

def test_dashboard_window_multi_tab_settings(qapp):
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_file = Path(tmpdir) / "config.json"
        mgr = ConfigManager(config_path=cfg_file)
        ai = AIService(base_url="http://127.0.0.1:59999")
        tts = TTSService(mgr.config.tts)

        dash = DashboardWindow(mgr, ai, tts)
        dash.show()
        assert dash.isVisible()
        assert dash.tabs.count() == 5

        # Modify general settings
        dash.inp_shortcut.setText("<ctrl>+<alt>+y")
        dash.spin_width.setValue(400)
        dash.spin_height.setValue(500)

        # Modify prompts
        dash.txt_vocab_prompt.setPlainText("Custom vocabulary prompt {text}")
        dash.txt_sentence_prompt.setPlainText("Custom translation prompt {text}")

        # Modify TTS
        dash.inp_piper_url.setText("http://127.0.0.1:5005")
        dash.spin_tts_speed.setValue(1.15)

        # Save settings
        dash.save_settings()

        assert mgr.config.global_shortcut == "<ctrl>+<alt>+y"
        assert mgr.config.window_width == 400
        assert mgr.config.window_height == 500
        assert mgr.config.prompts.vocab_prompt == "Custom vocabulary prompt {text}"
        assert mgr.config.tts.piper_url == "http://127.0.0.1:5005"
        assert mgr.config.tts.length_scale == 1.15

        # Test hide on closeEvent
        event = QCloseEvent()
        dash.closeEvent(event)
        assert not dash.isVisible()

def test_tray_manager_and_actions(qapp):
    tray = SystemTrayManager()
    assert tray.tray_icon is not None
    assert tray.menu is not None

    actions = {a.text(): a for a in tray.menu.actions()}
    assert "Open Dashboard" in actions
    assert "Show Floating Window" in actions
    assert "Exit Application" in actions

def test_full_app_initialization(qapp):
    app_instance = VocabularyCaptureApp()
    assert app_instance.app is not None
    assert app_instance.floating_window is not None
    assert app_instance.dashboard_window is not None
    assert app_instance.tray_manager is not None
    assert app_instance.capture_service is not None
    assert app_instance.ipc_server is not None
    app_instance.capture_service.stop()
    app_instance.ipc_server.stop()
