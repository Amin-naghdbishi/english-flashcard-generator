import os
from pathlib import Path
from typing import Callable, Optional

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QLineEdit,
    QComboBox,
    QCheckBox,
    QFileDialog,
    QFrame,
    QGroupBox,
    QApplication,
)

from app.config import AppConfig, ConfigManager
from app.ai_service import AIService
from app.txt_manager import list_txt_files, TXTFormat
from app.theme import get_theme_qss

class DashboardWindow(QWidget):
    """
    Main Settings and Management Dashboard for Vocabulary Capture.
    Follows the minimal Anki-style design language.
    Closing this window keeps the application running in the background/system tray.
    """
    settings_saved = Signal(AppConfig)
    open_floating_requested = Signal()

    def __init__(self, config_manager: ConfigManager, ai_service: AIService, parent=None):
        super().__init__(parent)
        self.config_manager = config_manager
        self.config = config_manager.config
        self.ai_service = ai_service

        self.setWindowTitle("Vocabulary Capture — Settings & Dashboard")
        self.resize(520, 560)
        self.setMinimumSize(480, 500)

        self._init_ui()
        self.apply_theme()
        self.load_settings_into_form()

    def apply_theme(self):
        qss = get_theme_qss(self.config.theme)
        self.setStyleSheet(qss)

    def _init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(18, 18, 18, 18)
        main_layout.setSpacing(14)

        # Header Title (Clean, minimal)
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        title_lbl = QLabel("Vocabulary Capture")
        title_lbl.setStyleSheet("font-size: 16px; font-weight: 700;")
        subtitle_lbl = QLabel("Linux background capture companion for Flashcard Generator")
        subtitle_lbl.setProperty("class", "muted")
        title_box.addWidget(title_lbl)
        title_box.addWidget(subtitle_lbl)
        header_layout.addLayout(title_box)
        header_layout.addStretch(1)

        self.btn_open_floating = QPushButton("Open Floating Window")
        self.btn_open_floating.setProperty("class", "primary-btn")
        self.btn_open_floating.clicked.connect(self.open_floating_requested.emit)
        header_layout.addWidget(self.btn_open_floating)
        main_layout.addLayout(header_layout)

        # 1. Global Shortcut Group
        sc_group = QGroupBox("Global Keyboard Shortcut")
        sc_group.setStyleSheet("font-weight: 600;")
        sc_layout = QVBoxLayout(sc_group)
        sc_layout.setSpacing(6)

        sc_row = QHBoxLayout()
        self.inp_shortcut = QLineEdit()
        self.inp_shortcut.setPlaceholderText("<ctrl>+<alt>+v")
        sc_row.addWidget(self.inp_shortcut, 1)
        sc_layout.addLayout(sc_row)

        sc_hint = QLabel("Format: <ctrl>+<alt>+v or <ctrl>+<shift>+v. Triggers text capture globally on Linux.")
        sc_hint.setProperty("class", "muted")
        sc_layout.addWidget(sc_hint)
        main_layout.addWidget(sc_group)

        # 2. Storage Directory Group
        dir_group = QGroupBox("TXT Storage Directory")
        dir_group.setStyleSheet("font-weight: 600;")
        dir_layout = QVBoxLayout(dir_group)
        dir_layout.setSpacing(6)

        dir_row = QHBoxLayout()
        self.inp_txt_dir = QLineEdit()
        self.inp_txt_dir.textChanged.connect(self._update_file_stats)
        self.btn_browse = QPushButton("Browse...")
        self.btn_browse.clicked.connect(self._browse_directory)
        dir_row.addWidget(self.inp_txt_dir, 1)
        dir_row.addWidget(self.btn_browse)
        dir_layout.addLayout(dir_row)

        self.lbl_dir_stats = QLabel("Checking directory...")
        self.lbl_dir_stats.setProperty("class", "muted")
        dir_layout.addWidget(self.lbl_dir_stats)
        main_layout.addWidget(dir_group)

        # 3. AI Provider Settings Group
        ai_group = QGroupBox("AI Assistant Provider (Ollama)")
        ai_group.setStyleSheet("font-weight: 600;")
        ai_layout = QVBoxLayout(ai_group)
        ai_layout.setSpacing(6)

        url_row = QHBoxLayout()
        url_lbl = QLabel("Ollama URL:")
        url_lbl.setProperty("class", "muted")
        url_lbl.setFixedWidth(80)
        self.inp_ollama_url = QLineEdit()
        url_row.addWidget(url_lbl)
        url_row.addWidget(self.inp_ollama_url)
        ai_layout.addLayout(url_row)

        model_row = QHBoxLayout()
        model_lbl = QLabel("Model:")
        model_lbl.setProperty("class", "muted")
        model_lbl.setFixedWidth(80)
        self.combo_models = QComboBox()
        self.combo_models.setEditable(True)
        self.btn_refresh_models = QPushButton("Refresh Models")
        self.btn_refresh_models.clicked.connect(self._refresh_ollama_models)
        model_row.addWidget(model_lbl)
        model_row.addWidget(self.combo_models, 1)
        model_row.addWidget(self.btn_refresh_models)
        ai_layout.addLayout(model_row)

        self.lbl_ai_status = QLabel("")
        self.lbl_ai_status.setProperty("class", "muted")
        ai_layout.addWidget(self.lbl_ai_status)
        main_layout.addWidget(ai_group)

        # 4. Appearance & Options Group
        opt_group = QGroupBox("Options & Appearance")
        opt_group.setStyleSheet("font-weight: 600;")
        opt_layout = QVBoxLayout(opt_group)
        opt_layout.setSpacing(6)

        deck_row = QHBoxLayout()
        deck_lbl = QLabel("Default Deck:")
        deck_lbl.setProperty("class", "muted")
        deck_lbl.setFixedWidth(80)
        self.inp_default_deck = QLineEdit()
        deck_row.addWidget(deck_lbl)
        deck_row.addWidget(self.inp_default_deck)
        opt_layout.addLayout(deck_row)

        theme_row = QHBoxLayout()
        theme_lbl = QLabel("App Theme:")
        theme_lbl.setProperty("class", "muted")
        theme_lbl.setFixedWidth(80)
        self.combo_theme = QComboBox()
        self.combo_theme.addItems(["Minimal Dark (anki-dark)", "Minimal Light (anki-light)"])
        self.combo_theme.currentIndexChanged.connect(self._on_theme_changed)
        theme_row.addWidget(theme_lbl)
        theme_row.addWidget(self.combo_theme, 1)
        opt_layout.addLayout(theme_row)

        self.chk_show_tabs = QCheckBox("Show Tab Buttons (1 AI / 2 TXT) in Floating Window")
        self.chk_stay_on_top = QCheckBox("Keep Floating Window Always on Top")
        opt_layout.addWidget(self.chk_show_tabs)
        opt_layout.addWidget(self.chk_stay_on_top)

        main_layout.addWidget(opt_group)
        main_layout.addStretch(1)

        # Footer Action Buttons & Status
        footer_layout = QHBoxLayout()
        self.lbl_save_status = QLabel("")
        self.lbl_save_status.setProperty("class", "success")
        footer_layout.addWidget(self.lbl_save_status)
        footer_layout.addStretch(1)

        self.btn_save = QPushButton("Save Settings")
        self.btn_save.setProperty("class", "success-btn")
        self.btn_save.clicked.connect(self.save_settings)
        footer_layout.addWidget(self.btn_save)
        main_layout.addLayout(footer_layout)

    def load_settings_into_form(self):
        self.inp_shortcut.setText(self.config.global_shortcut)
        self.inp_txt_dir.setText(self.config.txt_directory)
        self.inp_ollama_url.setText(self.config.ollama_url)
        self.inp_default_deck.setText(self.config.default_deck)
        self.chk_show_tabs.setChecked(self.config.show_tabs)
        self.chk_stay_on_top.setChecked(self.config.stay_on_top)

        if self.config.theme == "anki-light":
            self.combo_theme.setCurrentIndex(1)
        else:
            self.combo_theme.setCurrentIndex(0)

        self._refresh_ollama_models()
        self._update_file_stats()

    def _browse_directory(self):
        cur = self.inp_txt_dir.text().strip() or str(Path.home())
        chosen = QFileDialog.getExistingDirectory(self, "Select TXT Storage Directory", cur)
        if chosen:
            self.inp_txt_dir.setText(chosen)

    def _update_file_stats(self):
        p = Path(self.inp_txt_dir.text().strip()).expanduser()
        if p.exists() and p.is_dir():
            a_files = list_txt_files(p, format_filter=TXTFormat.A)
            b_files = list_txt_files(p, format_filter=TXTFormat.B)
            self.lbl_dir_stats.setText(f"Found {len(a_files)} Format A file(s) and {len(b_files)} Format B file(s).")
        else:
            self.lbl_dir_stats.setText("Directory does not exist yet (will be created on save).")

    def _refresh_ollama_models(self):
        url = self.inp_ollama_url.text().strip() or "http://localhost:11434"
        self.ai_service.base_url = url.rstrip("/")
        models = self.ai_service.get_models()

        self.combo_models.clear()
        if models:
            self.combo_models.addItems(models)
            if self.config.ollama_model in models:
                self.combo_models.setCurrentText(self.config.ollama_model)
            else:
                self.combo_models.setCurrentIndex(0)
            self.lbl_ai_status.setText(f"✓ Connected to Ollama. {len(models)} model(s) available.")
            self.lbl_ai_status.setProperty("class", "success")
        else:
            if self.config.ollama_model:
                self.combo_models.addItem(self.config.ollama_model)
            self.lbl_ai_status.setText(f"Could not connect to Ollama at {url}.")
            self.lbl_ai_status.setProperty("class", "error")

    def _on_theme_changed(self, idx: int):
        new_theme = "anki-light" if idx == 1 else "anki-dark"
        self.config.theme = new_theme
        self.apply_theme()

    def save_settings(self):
        new_theme = "anki-light" if self.combo_theme.currentIndex() == 1 else "anki-dark"
        self.config.global_shortcut = self.inp_shortcut.text().strip() or "<ctrl>+<alt>+v"
        self.config.txt_directory = self.inp_txt_dir.text().strip()
        self.config.ollama_url = self.inp_ollama_url.text().strip() or "http://localhost:11434"
        self.config.ollama_model = self.combo_models.currentText().strip()
        self.config.default_deck = self.inp_default_deck.text().strip() or "English::B1"
        self.config.show_tabs = self.chk_show_tabs.isChecked()
        self.config.stay_on_top = self.chk_stay_on_top.isChecked()
        self.config.theme = new_theme

        # Ensure directory exists
        self.config_manager.get_txt_dir()
        self.config_manager.save(self.config)
        self.settings_saved.emit(self.config)

        self.lbl_save_status.setText("✓ Settings saved successfully.")

    def closeEvent(self, event):
        """Hides dashboard window without quitting the application."""
        event.ignore()
        self.hide()
