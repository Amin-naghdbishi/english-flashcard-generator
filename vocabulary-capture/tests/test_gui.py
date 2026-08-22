import os
import tempfile
from pathlib import Path
import pytest

from PySide6.QtCore import Qt, QPoint
from PySide6.QtGui import QKeyEvent, QCloseEvent
from PySide6.QtWidgets import QApplication

from app.config import AppConfig, ConfigManager
from app.ai_service import AIService
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

def test_floating_window_lifecycle_and_persistence(qapp):
    # Point 9, 10, 11, 12, 13, 14, 23
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg = AppConfig(txt_directory=tmpdir, theme="anki-dark", auto_trigger_meaning=False)
        ai = AIService(base_url="http://127.0.0.1:59999")

        create_new_txt_file(Path(tmpdir), "daily words", "A")
        create_new_txt_file(Path(tmpdir), "english B1", "B")

        win = FloatingWindow(cfg, ai)
        win.show_window()
        # Point 9: Floating window opens
        assert win.isVisible()

        # Point 8: Selected text is captured and put into floating window
        win.set_captured_text("abandon")
        assert win.captured_text == "abandon"
        assert win.b_inp_word.text() == "abandon"
        # Point 10: Floating window does not automatically close
        assert win.isVisible()

        # Point 11: Tab 1 (AI) works
        assert win.stack.currentIndex() == 0  # AI tab
        assert win.ai_selection_lbl.text() == "abandon"

        # Point 12: Tab 2 (TXT) works
        win.switch_tab(1)
        assert win.stack.currentIndex() == 1  # TXT tab
        assert win.isVisible()

        # Point 13: Keyboard 1/2 navigation works
        event_key1 = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_1, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_key1)
        assert win.stack.currentIndex() == 0

        event_key2 = QKeyEvent(QKeyEvent.Type.KeyPress, Qt.Key.Key_2, Qt.KeyboardModifier.NoModifier)
        win.keyPressEvent(event_key2)
        assert win.stack.currentIndex() == 1

        # Point 14: Arrow-key navigation works
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
        # Point 23: Floating window remains open after adding an entry
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
        # Point 23: Floating window remains open after adding an entry
        assert win.isVisible()
        b_content = (Path(tmpdir) / "english B1 (B).txt").read_text(encoding="utf-8")
        assert "--\nWord=abandon\nDeck=English::B1\nPersian Meaning=رها کردن\n--" in b_content
        assert "Phonetic=" not in b_content

        # Point 10: Explicit close with hide_window / × button
        win.hide_window()
        assert not win.isVisible()

def test_dashboard_window_and_settings(qapp):
    # Point 2, 3, 24
    with tempfile.TemporaryDirectory() as tmpdir:
        cfg_file = Path(tmpdir) / "config.json"
        mgr = ConfigManager(config_path=cfg_file)
        ai = AIService(base_url="http://127.0.0.1:59999")

        dash = DashboardWindow(mgr, ai)
        # Point 2: Dashboard opens
        dash.show()
        assert dash.isVisible()

        # Point 3: Closing dashboard hides it without terminating application
        event = QCloseEvent()
        dash.closeEvent(event)
        assert not dash.isVisible()

        # Reopen dashboard
        dash.show()
        assert dash.isVisible()

        # Update settings
        dash.inp_shortcut.setText("<ctrl>+<alt>+z")
        dash.inp_default_deck.setText("English::B2")
        dash.combo_theme.setCurrentIndex(1)  # Minimal Light
        dash.save_settings()

        # Point 24: Settings persist
        assert mgr.config.global_shortcut == "<ctrl>+<alt>+z"
        assert mgr.config.default_deck == "English::B2"
        assert mgr.config.theme == "anki-light"

def test_tray_manager_and_actions(qapp):
    # Point 4, 5, 6
    tray = SystemTrayManager()
    # Point 4: System tray icon appears
    assert tray.tray_icon is not None
    assert tray.menu is not None

    actions = {a.text(): a for a in tray.menu.actions()}
    # Point 5: Tray can reopen Dashboard and show floating window
    assert "Open Dashboard" in actions
    assert "Show Floating Window" in actions
    # Point 6: Tray can exit the application
    assert "Exit Application" in actions

def test_capture_service_hotkey():
    # Point 7: Global shortcut listener initializes
    cap = CaptureService(shortcut="<ctrl>+<alt>+v")
    assert cap.shortcut == "<ctrl>+<alt>+v"
    cap.set_shortcut("<ctrl>+<shift>+v")
    assert cap.shortcut == "<ctrl>+<shift>+v"

def test_full_app_initialization(qapp):
    # Point 1: Application starts
    app_instance = VocabularyCaptureApp()
    assert app_instance.app is not None
    assert app_instance.floating_window is not None
    assert app_instance.dashboard_window is not None
    assert app_instance.tray_manager is not None
    assert app_instance.capture_service is not None
    # Test cleanup
    app_instance.capture_service.stop()
