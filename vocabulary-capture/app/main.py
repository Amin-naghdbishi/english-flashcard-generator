import sys
import os
import signal
from pathlib import Path

from PySide6.QtCore import Qt, QObject, Signal
from PySide6.QtWidgets import QApplication

from app.config import ConfigManager, AppConfig
from app.ai_service import AIService
from app.capture_service import CaptureService
from app.ui.floating_window import FloatingWindow
from app.ui.dashboard_window import DashboardWindow
from app.ui.tray_icon import SystemTrayManager

class BridgeSignaler(QObject):
    text_captured = Signal(str)

class VocabularyCaptureApp:
    def __init__(self):
        # 1. Initialize Qt Application
        self.app = QApplication.instance() or QApplication(sys.argv)
        self.app.setApplicationName("Vocabulary Capture")
        self.app.setApplicationDisplayName("Vocabulary Capture")
        
        # CRITICAL: Keep running in background when windows are closed
        self.app.setQuitOnLastWindowClosed(False)

        # 2. Initialize Core Services
        self.config_manager = ConfigManager()
        self.config = self.config_manager.config
        self.ai_service = AIService(
            base_url=self.config.ollama_url,
            default_model=self.config.ollama_model
        )

        # 3. Initialize UI Windows
        self.floating_window = FloatingWindow(self.config, self.ai_service)
        self.dashboard_window = DashboardWindow(self.config_manager, self.ai_service)
        self.tray_manager = SystemTrayManager()

        # 4. Thread-Safe Signal Bridge for Global Hotkey
        self.bridge = BridgeSignaler()
        self.bridge.text_captured.connect(self._on_captured_in_main_thread)

        # 5. Initialize Background Global Hotkey Listener
        self.capture_service = CaptureService(
            shortcut=self.config.global_shortcut,
            on_captured_callback=self._on_hotkey_triggered
        )

        # 6. Wire Signals
        self._connect_signals()

    def _connect_signals(self):
        # Tray signals
        self.tray_manager.open_dashboard_requested.connect(self.show_dashboard)
        self.tray_manager.open_floating_requested.connect(self.show_floating)
        self.tray_manager.exit_requested.connect(self.exit_application)

        # Dashboard signals
        self.dashboard_window.open_floating_requested.connect(self.show_floating)
        self.dashboard_window.settings_saved.connect(self._on_settings_saved)

    def _on_hotkey_triggered(self, text: str):
        # Cross-thread safe emission to Qt event loop
        self.bridge.text_captured.emit(text)

    def _on_captured_in_main_thread(self, text: str):
        self.floating_window.set_captured_text(text)

    def _on_settings_saved(self, new_config: AppConfig):
        self.config = new_config
        self.ai_service.base_url = new_config.ollama_url
        self.ai_service.default_model = new_config.ollama_model

        self.floating_window.config = new_config
        self.floating_window.apply_theme()
        self.floating_window.update_tab_visibility()

        self.dashboard_window.apply_theme()

        # Restart hotkey listener with updated shortcut
        self.capture_service.set_shortcut(new_config.global_shortcut)

    def show_dashboard(self):
        self.dashboard_window.show()
        self.dashboard_window.raise_()
        self.dashboard_window.activateWindow()

    def show_floating(self):
        self.floating_window.show_window()

    def exit_application(self):
        """Completely terminates the application and background listener."""
        print("[Vocabulary Capture] Exiting application...")
        self.capture_service.stop()
        self.tray_manager.hide()
        self.floating_window.close()
        self.dashboard_window.close()
        self.app.quit()

    def run(self) -> int:
        # Start background shortcut listener
        self.capture_service.start()

        # Show System Tray icon
        self.tray_manager.show()

        # Check launch arguments
        args = sys.argv[1:]
        if "--minimized" in args or "--tray" in args or "--background" in args:
            pass  # Start silently in system tray
        elif "--floating" in args:
            self.show_floating()
        else:
            # Default: Show Dashboard on startup
            self.show_dashboard()

        # Allow Ctrl+C from terminal to terminate cleanly
        signal.signal(signal.SIGINT, lambda *_: self.exit_application())

        return self.app.exec()

def main():
    app = VocabularyCaptureApp()
    sys.exit(app.run())

if __name__ == "__main__":
    main()
