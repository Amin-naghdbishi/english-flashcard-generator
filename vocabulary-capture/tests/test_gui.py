import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from PySide6.QtCore import Qt, QPoint
from PySide6.QtGui import QKeyEvent, QCloseEvent
from PySide6.QtWidgets import QApplication

from app.config import AppConfig, ConfigManager, AIProviderConfig, AIPromptsConfig, TTSConfig
from app.ai_service import AIService
from app.tts_service import TTSService
from app.txt_manager import create_new_txt_file, TXTFormat
from app.capture_service import CaptureService, DiagnosticRecord
from app.ui.floating_window import FloatingWindow
from app.ui.dashboard_window import DashboardWindow
from app.ui.tray_icon import SystemTrayManager
from app.main import VocabularyCaptureApp

VALID_WAV_BYTES = (
    b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00"
    b"\x22\x56\x00\x00\x44\xAC\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
)

@pytest.fixture(scope="session")
def qapp():
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app

def test_floating_window_3_tabs_and_quick_add_workflow(qapp):
    with tempfile.TemporaryDirectory() as tmpdir:
        # Create test TXT files
        create_new_txt_file(Path(tmpdir), "daily vocabulary", "A")
        create_new_txt_file(Path(tmpdir), "advanced english", "B")

        cfg = AppConfig(
            txt_directory=tmpdir,
            theme="anki-dark",
            auto_trigger_meaning=False,
            default_deck="English::B1",
            default_capture_type="A",
            default_txt_file_a="daily vocabulary (A).txt",
            default_txt_file_b="advanced english (B).txt"
        )
        ai = AIService(base_url="http://127.0.0.1:59999")
        tts = TTSService(cfg.tts)

        win = FloatingWindow(cfg, ai, tts)
        win.show_window()
        assert win.isVisible()

        # Check 3 tabs exist in main stack
        assert win.stack.count() == 3

        # Set captured text
        win.set_captured_text("abandon")
        assert win.captured_text == "abandon"
        assert win.ai_selection_lbl.text() == "abandon"
        assert win.quick_a_inp_word.text() == "abandon"

        # Tab 1: AI (Index 0)
        assert win.stack.currentIndex() == 0

        # Switch to Tab 2: Quick Add (Index 1)
        win.switch_tab(1)
        assert win.stack.currentIndex() == 1
        assert win.quick_stack.currentIndex() == 0  # Format A view
        assert "daily vocabulary (A).txt" in win.quick_target_lbl.text()
        assert win.quick_a_inp_word.text() == "abandon"
        assert win.quick_a_inp_deck.text() == "English::B1"

        # Save quick Format A entry
        win._save_quick_entry()
        a_content = (Path(tmpdir) / "daily vocabulary (A).txt").read_text(encoding="utf-8")
        assert "Word=abandon\nDeck=English::B1" in a_content
        assert "✓ Saved 'abandon'" in win.quick_status_lbl.text()
        assert win.isVisible()

        # Change default to Format B and verify Quick Add adapts
        win.config.default_capture_type = "B"
        win._refresh_quick_tab_state()
        assert win.quick_stack.currentIndex() == 1  # Format B view
        assert "advanced english (B).txt" in win.quick_target_lbl.text()
        assert win.quick_b_inp_word.text() == "abandon"

        win.quick_b_inp_meaning.setText("رها کردن")
        win._save_quick_entry()
        b_content = (Path(tmpdir) / "advanced english (B).txt").read_text(encoding="utf-8")
        assert "--\nWord=abandon\nDeck=English::B1\nPersian Meaning=رها کردن\n--" in b_content
        assert "✓ Saved 'abandon'" in win.quick_status_lbl.text()

        # =========================================================
        # TAB 3: MANUAL ADD WORKFLOW TEST
        # =========================================================
        win.switch_tab(2)
        assert win.stack.currentIndex() == 2
        assert win.manual_txt_stack.currentIndex() == 0  # File list view
        assert win.manual_files_list_widget.count() >= 1

        # Click file item in Manual list -> opens Format A editor
        item_a = win.manual_files_list_widget.item(0)
        win._on_manual_file_item_clicked(item_a)
        assert win.manual_txt_stack.currentIndex() == 1
        assert win.manual_a_inp_word.text() == "abandon"

        win.manual_a_inp_deck.setText("English::ManualDeck")
        win._save_manual_format_a_entry()
        assert "Word=abandon\nDeck=English::ManualDeck" in (Path(tmpdir) / "daily vocabulary (A).txt").read_text(encoding="utf-8")
        assert win.manual_txt_stack.currentIndex() == 0  # Returned to list

        # Test keyboard 1/2/3 navigation
        win.keyPressEvent(QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_1, Qt.KeyboardModifier.NoModifier))
        assert win.stack.currentIndex() == 0
        win.keyPressEvent(QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_2, Qt.KeyboardModifier.NoModifier))
        assert win.stack.currentIndex() == 1
        win.keyPressEvent(QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_3, Qt.KeyboardModifier.NoModifier))
        assert win.stack.currentIndex() == 2

        win.hide_window()
        assert not win.isVisible()

def test_dashboard_window_txt_files_management(qapp):
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_file = Path(tmpdir) / "config.json"
        mgr = ConfigManager(config_path=cfg_file)
        mgr.config.txt_directory = tmpdir
        ai = AIService(base_url="http://127.0.0.1:59999")
        tts = TTSService(mgr.config.tts)

        # Create files
        create_new_txt_file(Path(tmpdir), "vocab A", "A")
        create_new_txt_file(Path(tmpdir), "vocab B", "B")

        dash = DashboardWindow(mgr, ai, tts)
        dash.show()
        assert dash.isVisible()
        assert dash.tabs.count() == 6  # 6 tabs

        # Switch to Tab 1 (TXT Files)
        dash.tabs.setCurrentIndex(1)
        dash._refresh_txt_files_management()

        assert dash.mgmt_txt_list.count() == 2
        assert dash.combo_default_file_a.count() >= 1
        assert dash.combo_default_file_b.count() >= 1

        # Append sample entry to vocab A
        (Path(tmpdir) / "vocab A (A).txt").write_text("Word=abandon\nDeck=English::B1\n", encoding="utf-8")

        # Test selecting file and reading contents in in-app viewer
        item_0 = dash.mgmt_txt_list.item(0)
        dash._on_mgmt_file_clicked(item_0)
        assert len(dash.txt_content_viewer.toPlainText()) > 0
        assert "Viewing: " in dash.lbl_viewing_file.text()

        # Set default files & capture type
        dash.rad_type_b.setChecked(True)
        dash.combo_default_file_b.setCurrentText("vocab B (B).txt")
        dash.combo_default_file_a.setCurrentText("vocab A (A).txt")

        # Save settings
        dash.save_settings()

        assert mgr.config.default_capture_type == "B"
        assert mgr.config.default_txt_file_b == "vocab B (B).txt"
        assert mgr.config.default_txt_file_a == "vocab A (A).txt"

        event = QCloseEvent()
        dash.closeEvent(event)
        assert not dash.isVisible()

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
