import os
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional, List

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QLineEdit,
    QTextEdit,
    QComboBox,
    QCheckBox,
    QDoubleSpinBox,
    QSpinBox,
    QFileDialog,
    QFrame,
    QGroupBox,
    QTabWidget,
    QApplication,
    QMessageBox,
)

from app.config import (
    AppConfig,
    ConfigManager,
    AIProviderConfig,
    AIPromptsConfig,
    TTSConfig,
    DEFAULT_SYSTEM_PROMPT,
    DEFAULT_VOCAB_PROMPT,
    DEFAULT_SENTENCE_PROMPT,
    DEFAULT_CUSTOM_INSTRUCTIONS,
)
from app.ai_service import AIService
from app.tts_service import TTSService
from app.txt_manager import list_txt_files, TXTFormat
from app.capture_service import (
    DiagnosticRecord,
    capture_selected_text_detailed,
    get_last_diagnostic,
    set_last_diagnostic,
)
from app.niri_helper import (
    is_niri_environment,
    check_niri_status,
    apply_niri_config,
    generate_niri_config_snippet,
)
from app.theme import get_theme_qss

class DashboardWindow(QWidget):
    """
    Settings & Management Dashboard for Vocabulary Capture.
    Follows the minimal Anki-style design language with organized tabs:
    - General (with Global Shortcut Diagnostics & Niri setup)
    - AI Providers
    - AI Prompts
    - TTS (Piper)
    - Themes
    Closing this window keeps the application running in the background/system tray.
    """
    settings_saved = Signal(AppConfig)
    open_floating_requested = Signal()

    def __init__(self, config_manager: ConfigManager, ai_service: AIService, tts_service: Optional[TTSService] = None, parent=None):
        super().__init__(parent)
        self.config_manager = config_manager
        self.config = config_manager.config
        self.ai_service = ai_service
        self.tts_service = tts_service or TTSService(self.config.tts)

        self.setWindowTitle("Vocabulary Capture — Settings & Dashboard")
        self.resize(580, 640)
        self.setMinimumSize(520, 560)

        self._init_ui()
        self.apply_theme()
        self.load_settings_into_form()

    def apply_theme(self):
        qss = get_theme_qss(self.config.theme)
        self.setStyleSheet(qss)

    def _init_ui(self):
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(16, 16, 16, 16)
        main_layout.setSpacing(12)

        # Header Title
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

        # Tab Widget for organized settings
        self.tabs = QTabWidget()
        self.tabs.addTab(self._create_general_tab(), "General")
        self.tabs.addTab(self._create_providers_tab(), "AI Providers")
        self.tabs.addTab(self._create_prompts_tab(), "AI Prompts")
        self.tabs.addTab(self._create_tts_tab(), "TTS (Piper)")
        self.tabs.addTab(self._create_themes_tab(), "Themes")

        main_layout.addWidget(self.tabs, 1)

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

    # -------------------------------------------------------------
    # 1. GENERAL TAB (With Global Shortcut Diagnostics & Niri Helper)
    # -------------------------------------------------------------
    def _create_general_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(10)

        # Shortcut Group
        sc_group = QGroupBox("Global Keyboard Shortcut & Niri Setup")
        sc_layout = QVBoxLayout(sc_group)
        sc_layout.setSpacing(6)

        sc_row = QHBoxLayout()
        sc_lbl = QLabel("Shortcut:")
        sc_lbl.setFixedWidth(65)
        self.inp_shortcut = QLineEdit()
        self.inp_shortcut.setPlaceholderText("<ctrl>+<alt>+v")
        sc_row.addWidget(sc_lbl)
        sc_row.addWidget(self.inp_shortcut, 1)
        sc_layout.addLayout(sc_row)

        # Diagnostic & Test Buttons Row
        diag_btn_row = QHBoxLayout()
        self.btn_test_shortcut = QPushButton("🔍 Test Global Shortcut")
        self.btn_test_shortcut.clicked.connect(self._run_shortcut_diagnostic)
        self.btn_apply_niri = QPushButton("⚙ Setup Niri config.kdl")
        self.btn_apply_niri.clicked.connect(self._apply_niri_keybind)
        diag_btn_row.addWidget(self.btn_test_shortcut)
        diag_btn_row.addWidget(self.btn_apply_niri)
        diag_btn_row.addStretch(1)
        sc_layout.addLayout(diag_btn_row)

        # Diagnostic Output Box
        self.txt_diag_output = QTextEdit()
        self.txt_diag_output.setReadOnly(True)
        self.txt_diag_output.setFixedHeight(85)
        self.txt_diag_output.setPlaceholderText("Click 'Test Global Shortcut' or press your shortcut in Firefox to see real-time diagnostics...")
        sc_layout.addWidget(self.txt_diag_output)

        layout.addWidget(sc_group)

        # Storage Directory Group
        dir_group = QGroupBox("TXT Storage Directory")
        dir_layout = QVBoxLayout(dir_group)
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
        layout.addWidget(dir_group)

        # Window Behavior Group
        win_group = QGroupBox("Floating Window Behavior")
        win_layout = QVBoxLayout(win_group)
        self.chk_stay_on_top = QCheckBox("Keep Floating Window Always on Top")
        self.chk_show_tabs = QCheckBox("Show Tab Buttons (1 AI / 2 TXT) in Floating Window")
        self.chk_auto_meaning = QCheckBox("Automatically Analyze Meaning when Text is Captured")
        win_layout.addWidget(self.chk_stay_on_top)
        win_layout.addWidget(self.chk_show_tabs)
        win_layout.addWidget(self.chk_auto_meaning)

        size_row = QHBoxLayout()
        size_lbl = QLabel("Window Dimensions:")
        size_lbl.setProperty("class", "muted")
        self.spin_width = QSpinBox()
        self.spin_width.setRange(300, 800)
        self.spin_width.setSuffix(" px W")
        self.spin_height = QSpinBox()
        self.spin_height.setRange(350, 1000)
        self.spin_height.setSuffix(" px H")
        size_row.addWidget(size_lbl)
        size_row.addWidget(self.spin_width)
        size_row.addWidget(self.spin_height)
        size_row.addStretch(1)
        win_layout.addLayout(size_row)

        layout.addWidget(win_group)
        layout.addStretch(1)
        return widget

    def update_diagnostic_display(self, record: DiagnosticRecord):
        """Updates the diagnostic text area when a shortcut/capture event occurs."""
        self.txt_diag_output.setPlainText(record.to_formatted_report())

    def _run_shortcut_diagnostic(self):
        """Executes a diagnostic test of selection capture and window open."""
        shortcut = self.inp_shortcut.text().strip() or self.config.global_shortcut
        text, method = capture_selected_text_detailed()
        t_now = datetime.now().strftime("%H:%M:%S")

        lines = [
            f"[{t_now}] Diagnostic Test Executed",
            f"Shortcut detected: {shortcut}",
        ]

        if text:
            lines.append(f"Selected text: \"{text}\" (captured via {method})")
            # Trigger floating window open
            self.open_floating_requested.emit()
            lines.append("✓ Text capture succeeded & floating window opened.")
        else:
            lines.append("⚠ Shortcut detected, but no selected text was captured.")
            lines.append("  → Highlight a word in Firefox or Chrome and click 'Test Global Shortcut' again.")
            lines.append("  → On Wayland, verify 'wl-clipboard' is installed (wl-paste).")

        niri_info = check_niri_status(shortcut)
        if niri_info["is_niri"]:
            lines.append(f"\n[Niri Status] Config: {niri_info['config_path']}")
            lines.append(f"  • Window Rule: {'✓ Found' if niri_info['has_window_rule'] else '⚠ Missing (Click Setup Niri)'}")
            lines.append(f"  • Keybind: {'✓ ' + niri_info['current_keybind'] if niri_info['has_keybind'] else '⚠ Missing (Click Setup Niri)'}")

        report = "\n".join(lines)
        self.txt_diag_output.setPlainText(report)

        rec = DiagnosticRecord(
            timestamp=t_now,
            shortcut=shortcut,
            source="Manual Test Button",
            text=text,
            method=method,
            window_opened=bool(text),
            status_message=report
        )
        set_last_diagnostic(rec)

    def _apply_niri_keybind(self):
        shortcut = self.inp_shortcut.text().strip() or self.config.global_shortcut
        success, msg = apply_niri_config(shortcut)
        if success:
            QMessageBox.information(self, "Niri Configuration", f"{msg}\n\nNiri will now execute 'run.sh --capture' whenever {shortcut} is pressed.")
            self._run_shortcut_diagnostic()
        else:
            QMessageBox.warning(self, "Niri Configuration Error", msg)

    # -------------------------------------------------------------
    # 2. AI PROVIDERS TAB
    # -------------------------------------------------------------
    def _create_providers_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(10)

        # Active Provider Selector
        top_row = QHBoxLayout()
        prov_lbl = QLabel("Active Provider:")
        prov_lbl.setStyleSheet("font-weight: 600;")
        self.combo_active_provider = QComboBox()
        self.combo_active_provider.currentIndexChanged.connect(self._on_active_provider_selected)
        top_row.addWidget(prov_lbl)
        top_row.addWidget(self.combo_active_provider, 1)

        self.btn_add_provider = QPushButton("+ Add")
        self.btn_add_provider.clicked.connect(self._add_custom_provider)
        self.btn_delete_provider = QPushButton("Delete")
        self.btn_delete_provider.clicked.connect(self._delete_custom_provider)
        top_row.addWidget(self.btn_add_provider)
        top_row.addWidget(self.btn_delete_provider)
        layout.addLayout(top_row)

        # Provider Config Group
        self.grp_prov_config = QGroupBox("Provider Configuration")
        form_layout = QVBoxLayout(self.grp_prov_config)
        form_layout.setSpacing(8)

        # Name & Type
        row1 = QHBoxLayout()
        lbl_pname = QLabel("Name:")
        lbl_pname.setFixedWidth(70)
        self.inp_pname = QLineEdit()
        lbl_ptype = QLabel("Type:")
        self.combo_ptype = QComboBox()
        self.combo_ptype.addItems(["ollama", "gemini", "openai_compatible"])
        row1.addWidget(lbl_pname)
        row1.addWidget(self.inp_pname, 1)
        row1.addWidget(lbl_ptype)
        row1.addWidget(self.combo_ptype)
        form_layout.addLayout(row1)

        # Base URL
        row2 = QHBoxLayout()
        lbl_purl = QLabel("Base URL:")
        lbl_purl.setFixedWidth(70)
        self.inp_purl = QLineEdit()
        row2.addWidget(lbl_purl)
        row2.addWidget(self.inp_purl, 1)
        form_layout.addLayout(row2)

        # API Key
        row3 = QHBoxLayout()
        lbl_pkey = QLabel("API Key:")
        lbl_pkey.setFixedWidth(70)
        self.inp_pkey = QLineEdit()
        self.inp_pkey.setEchoMode(QLineEdit.EchoMode.Password)
        self.inp_pkey.setPlaceholderText("Optional for local Ollama; required for Gemini/cloud")
        row3.addWidget(lbl_pkey)
        row3.addWidget(self.inp_pkey, 1)
        form_layout.addLayout(row3)

        # Model & Refresh
        row4 = QHBoxLayout()
        lbl_pmodel = QLabel("Model:")
        lbl_pmodel.setFixedWidth(70)
        self.combo_pmodel = QComboBox()
        self.combo_pmodel.setEditable(True)
        self.btn_refresh_models = QPushButton("Refresh Models")
        self.btn_refresh_models.clicked.connect(self._refresh_provider_models)
        row4.addWidget(lbl_pmodel)
        row4.addWidget(self.combo_pmodel, 1)
        row4.addWidget(self.btn_refresh_models)
        form_layout.addLayout(row4)

        self.lbl_prov_status = QLabel("")
        self.lbl_prov_status.setProperty("class", "muted")
        form_layout.addWidget(self.lbl_prov_status)

        layout.addWidget(self.grp_prov_config)
        layout.addStretch(1)
        return widget

    # -------------------------------------------------------------
    # 3. AI PROMPTS TAB
    # -------------------------------------------------------------
    def _create_prompts_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(8)

        # System Prompt
        sys_lbl = QLabel("Default System Prompt:")
        sys_lbl.setStyleSheet("font-weight: 600;")
        self.txt_sys_prompt = QTextEdit()
        self.txt_sys_prompt.setFixedHeight(55)
        layout.addWidget(sys_lbl)
        layout.addWidget(self.txt_sys_prompt)

        # Vocabulary Prompt
        vocab_lbl = QLabel("Vocabulary Prompt (single word / term):")
        vocab_lbl.setStyleSheet("font-weight: 600;")
        vocab_hint = QLabel("Use '{text}' as placeholder for the selected word.")
        vocab_hint.setProperty("class", "muted")
        self.txt_vocab_prompt = QTextEdit()
        self.txt_vocab_prompt.setFixedHeight(75)
        layout.addWidget(vocab_lbl)
        layout.addWidget(vocab_hint)
        layout.addWidget(self.txt_vocab_prompt)

        # Sentence Prompt
        sent_lbl = QLabel("Sentence Translation Prompt:")
        sent_lbl.setStyleSheet("font-weight: 600;")
        self.txt_sentence_prompt = QTextEdit()
        self.txt_sentence_prompt.setFixedHeight(65)
        layout.addWidget(sent_lbl)
        layout.addWidget(self.txt_sentence_prompt)

        # Custom Instructions
        inst_lbl = QLabel("Custom Instructions / Output Formatting:")
        inst_lbl.setStyleSheet("font-weight: 600;")
        self.inp_custom_instructions = QLineEdit()
        layout.addWidget(inst_lbl)
        layout.addWidget(self.inp_custom_instructions)

        # Reset button
        reset_row = QHBoxLayout()
        reset_row.addStretch(1)
        self.btn_reset_prompts = QPushButton("Reset to Defaults")
        self.btn_reset_prompts.clicked.connect(self._reset_prompts_to_defaults)
        reset_row.addWidget(self.btn_reset_prompts)
        layout.addLayout(reset_row)

        layout.addStretch(1)
        return widget

    # -------------------------------------------------------------
    # 4. TTS (PIPER) TAB
    # -------------------------------------------------------------
    def _create_tts_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(10)

        tts_group = QGroupBox("Piper Text-to-Speech Settings")
        t_layout = QVBoxLayout(tts_group)
        t_layout.setSpacing(8)

        # Piper URL
        url_row = QHBoxLayout()
        url_lbl = QLabel("Piper URL:")
        url_lbl.setFixedWidth(90)
        self.inp_piper_url = QLineEdit()
        self.inp_piper_url.setPlaceholderText("http://127.0.0.1:5000")
        url_row.addWidget(url_lbl)
        url_row.addWidget(self.inp_piper_url, 1)
        t_layout.addLayout(url_row)

        # Voice & Detection
        voice_row = QHBoxLayout()
        voice_lbl = QLabel("Voice Name:")
        voice_lbl.setFixedWidth(90)
        self.combo_piper_voice = QComboBox()
        self.combo_piper_voice.setEditable(True)
        self.btn_detect_voices = QPushButton("Detect Voices")
        self.btn_detect_voices.clicked.connect(self._detect_piper_voices)
        voice_row.addWidget(voice_lbl)
        voice_row.addWidget(self.combo_piper_voice, 1)
        voice_row.addWidget(self.btn_detect_voices)
        t_layout.addLayout(voice_row)

        # Speed / length_scale
        speed_row = QHBoxLayout()
        speed_lbl = QLabel("Speech Speed:")
        speed_lbl.setFixedWidth(90)
        self.spin_tts_speed = QDoubleSpinBox()
        self.spin_tts_speed.setRange(0.40, 2.50)
        self.spin_tts_speed.setSingleStep(0.05)
        self.spin_tts_speed.setValue(1.00)
        self.spin_tts_speed.setDecimals(2)
        speed_hint = QLabel("(1.00 = normal, 1.25 = slower, 0.80 = faster)")
        speed_hint.setProperty("class", "muted")
        speed_row.addWidget(speed_lbl)
        speed_row.addWidget(self.spin_tts_speed)
        speed_row.addWidget(speed_hint)
        speed_row.addStretch(1)
        t_layout.addLayout(speed_row)

        # Connection Status
        status_row = QHBoxLayout()
        stat_title = QLabel("Connection:")
        stat_title.setFixedWidth(90)
        self.lbl_piper_status = QLabel("Piper ● Disconnected")
        self.lbl_piper_status.setProperty("class", "disconnected")
        status_row.addWidget(stat_title)
        status_row.addWidget(self.lbl_piper_status, 1)
        t_layout.addLayout(status_row)

        # Test Buttons
        test_row = QHBoxLayout()
        self.btn_test_piper_conn = QPushButton("Test Connection")
        self.btn_test_piper_conn.clicked.connect(self._test_piper_connection)
        self.btn_test_piper_voice = QPushButton("🔊 Test Voice")
        self.btn_test_piper_voice.clicked.connect(self._test_piper_voice)
        test_row.addWidget(self.btn_test_piper_conn)
        test_row.addWidget(self.btn_test_piper_voice)
        test_row.addStretch(1)
        t_layout.addLayout(test_row)

        layout.addWidget(tts_group)
        layout.addStretch(1)
        return widget

    # -------------------------------------------------------------
    # 5. THEMES TAB
    # -------------------------------------------------------------
    def _create_themes_tab(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(10)

        thm_group = QGroupBox("Appearance & Vocabulary Deck")
        t_layout = QVBoxLayout(thm_group)
        t_layout.setSpacing(8)

        theme_row = QHBoxLayout()
        theme_lbl = QLabel("App Theme:")
        theme_lbl.setFixedWidth(90)
        self.combo_theme = QComboBox()
        self.combo_theme.addItems(["Minimal Dark (anki-dark)", "Minimal Light (anki-light)"])
        self.combo_theme.currentIndexChanged.connect(self._on_theme_changed)
        theme_row.addWidget(theme_lbl)
        theme_row.addWidget(self.combo_theme, 1)
        t_layout.addLayout(theme_row)

        deck_row = QHBoxLayout()
        deck_lbl = QLabel("Default Deck:")
        deck_lbl.setFixedWidth(90)
        self.inp_default_deck = QLineEdit()
        deck_row.addWidget(deck_lbl)
        deck_row.addWidget(self.inp_default_deck, 1)
        t_layout.addLayout(deck_row)

        layout.addWidget(thm_group)
        layout.addStretch(1)
        return widget

    # -------------------------------------------------------------
    # LOGIC & POPULATION
    # -------------------------------------------------------------
    def load_settings_into_form(self):
        # General
        self.inp_shortcut.setText(self.config.global_shortcut)
        self.inp_txt_dir.setText(self.config.txt_directory)
        self.chk_stay_on_top.setChecked(self.config.stay_on_top)
        self.chk_show_tabs.setChecked(self.config.show_tabs)
        self.chk_auto_meaning.setChecked(self.config.auto_trigger_meaning)
        self.spin_width.setValue(self.config.window_width)
        self.spin_height.setValue(self.config.window_height)

        # AI Providers
        self._populate_providers_combo()

        # Prompts
        self.txt_sys_prompt.setPlainText(self.config.prompts.system_prompt)
        self.txt_vocab_prompt.setPlainText(self.config.prompts.vocab_prompt)
        self.txt_sentence_prompt.setPlainText(self.config.prompts.sentence_prompt)
        self.inp_custom_instructions.setText(self.config.prompts.custom_instructions)

        # TTS
        self.inp_piper_url.setText(self.config.tts.piper_url)
        self.combo_piper_voice.setCurrentText(self.config.tts.voice)
        self.spin_tts_speed.setValue(self.config.tts.length_scale)

        # Themes
        if self.config.theme == "anki-light":
            self.combo_theme.setCurrentIndex(1)
        else:
            self.combo_theme.setCurrentIndex(0)
        self.inp_default_deck.setText(self.config.default_deck)

        self._update_file_stats()
        self._test_piper_connection(silent_if_fail=True)

        # Load last diagnostic if available
        last_rec = get_last_diagnostic()
        if last_rec:
            self.txt_diag_output.setPlainText(last_rec.to_formatted_report())

    def _populate_providers_combo(self):
        self.combo_active_provider.blockSignals(True)
        self.combo_active_provider.clear()
        for idx, p in enumerate(self.config.providers):
            self.combo_active_provider.addItem(f"{p.name} ({p.type})", p.id)
            if p.id == self.config.active_provider_id:
                self.combo_active_provider.setCurrentIndex(idx)
        self.combo_active_provider.blockSignals(False)
        self._load_selected_provider_fields()

    def _load_selected_provider_fields(self):
        prov = self.config.get_active_provider()
        self.inp_pname.setText(prov.name)
        idx = self.combo_ptype.findText(prov.type)
        if idx >= 0:
            self.combo_ptype.setCurrentIndex(idx)
        self.inp_purl.setText(prov.base_url)
        self.inp_pkey.setText(prov.api_key)
        self.combo_pmodel.setCurrentText(prov.model)
        self.lbl_prov_status.setText("")

    def _on_active_provider_selected(self, index: int):
        if index < 0:
            return
        prov_id = self.combo_active_provider.currentData()
        self.config.active_provider_id = prov_id
        self._load_selected_provider_fields()

    def _add_custom_provider(self):
        new_id = f"custom_{len(self.config.providers) + 1}"
        new_prov = AIProviderConfig(
            id=new_id,
            name=f"Custom Provider {len(self.config.providers) + 1}",
            type="openai_compatible",
            base_url="http://localhost:8080/v1",
            model="gpt-3.5-turbo"
        )
        self.config.providers.append(new_prov)
        self.config.active_provider_id = new_id
        self._populate_providers_combo()

    def _delete_custom_provider(self):
        if len(self.config.providers) <= 1:
            QMessageBox.warning(self, "Notice", "You cannot delete the only remaining provider.")
            return
        prov_id = self.combo_active_provider.currentData()
        self.config.providers = [p for p in self.config.providers if p.id != prov_id]
        self.config.active_provider_id = self.config.providers[0].id
        self._populate_providers_combo()

    def _refresh_provider_models(self):
        prov = self.config.get_active_provider()
        prov.name = self.inp_pname.text().strip()
        prov.type = self.combo_ptype.currentText()
        prov.base_url = self.inp_purl.text().strip()
        prov.api_key = self.inp_pkey.text().strip()

        models = self.ai_service.get_models(prov)
        self.combo_pmodel.clear()
        if models:
            self.combo_pmodel.addItems(models)
            if prov.model in models:
                self.combo_pmodel.setCurrentText(prov.model)
            else:
                self.combo_pmodel.setCurrentIndex(0)
            self.lbl_prov_status.setText(f"✓ Found {len(models)} model(s).")
            self.lbl_prov_status.setProperty("class", "success")
        else:
            if prov.model:
                self.combo_pmodel.addItem(prov.model)
            self.lbl_prov_status.setText(f"Could not connect to provider at {prov.base_url}")
            self.lbl_prov_status.setProperty("class", "error")

    def _reset_prompts_to_defaults(self):
        self.txt_sys_prompt.setPlainText(DEFAULT_SYSTEM_PROMPT)
        self.txt_vocab_prompt.setPlainText(DEFAULT_VOCAB_PROMPT)
        self.txt_sentence_prompt.setPlainText(DEFAULT_SENTENCE_PROMPT)
        self.inp_custom_instructions.setText(DEFAULT_CUSTOM_INSTRUCTIONS)

    def _detect_piper_voices(self):
        url = self.inp_piper_url.text().strip() or "http://127.0.0.1:5000"
        self.tts_service.config.piper_url = url
        success, msg, voices = self.tts_service.check_connection()
        if success:
            self.lbl_piper_status.setText("Piper ● Connected")
            self.lbl_piper_status.setProperty("class", "connected")
            self.lbl_piper_status.style().polish(self.lbl_piper_status)
            if voices:
                self.combo_piper_voice.clear()
                self.combo_piper_voice.addItems(voices)
        else:
            self.lbl_piper_status.setText("Piper ● Disconnected")
            self.lbl_piper_status.setProperty("class", "disconnected")
            self.lbl_piper_status.style().polish(self.lbl_piper_status)

    def _test_piper_connection(self, silent_if_fail: bool = False):
        url = self.inp_piper_url.text().strip() or "http://127.0.0.1:5000"
        self.tts_service.config.piper_url = url
        success, msg, voices = self.tts_service.check_connection()
        if success:
            self.lbl_piper_status.setText("Piper ● Connected")
            self.lbl_piper_status.setProperty("class", "connected")
            if voices:
                self.combo_piper_voice.clear()
                self.combo_piper_voice.addItems(voices)
        else:
            self.lbl_piper_status.setText("Piper ● Disconnected")
            self.lbl_piper_status.setProperty("class", "disconnected")
        self.lbl_piper_status.style().polish(self.lbl_piper_status)

    def _test_piper_voice(self):
        text = "The quick brown fox jumps over the lazy dog."
        url = self.inp_piper_url.text().strip() or "http://127.0.0.1:5000"
        voice = self.combo_piper_voice.currentText().strip()
        ls = self.spin_tts_speed.value()

        self.tts_service.config.piper_url = url
        self.tts_service.config.voice = voice
        self.tts_service.config.length_scale = ls
        self.tts_service.speak_text_async(
            text=text,
            voice=voice,
            length_scale=ls,
            on_error=lambda err: print(f"[TTS Test Error] {err}")
        )

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

    def _on_theme_changed(self, idx: int):
        new_theme = "anki-light" if idx == 1 else "anki-dark"
        self.config.theme = new_theme
        self.apply_theme()

    def save_settings(self):
        # General
        self.config.global_shortcut = self.inp_shortcut.text().strip() or "<ctrl>+<alt>+v"
        self.config.txt_directory = self.inp_txt_dir.text().strip()
        self.config.stay_on_top = self.chk_stay_on_top.isChecked()
        self.config.show_tabs = self.chk_show_tabs.isChecked()
        self.config.auto_trigger_meaning = self.chk_auto_meaning.isChecked()
        self.config.window_width = self.spin_width.value()
        self.config.window_height = self.spin_height.value()

        # Active Provider
        prov = self.config.get_active_provider()
        prov.name = self.inp_pname.text().strip() or prov.name
        prov.type = self.combo_ptype.currentText()
        prov.base_url = self.inp_purl.text().strip()
        prov.api_key = self.inp_pkey.text().strip()
        prov.model = self.combo_pmodel.currentText().strip()

        # Prompts
        self.config.prompts.system_prompt = self.txt_sys_prompt.toPlainText().strip()
        self.config.prompts.vocab_prompt = self.txt_vocab_prompt.toPlainText().strip()
        self.config.prompts.sentence_prompt = self.txt_sentence_prompt.toPlainText().strip()
        self.config.prompts.custom_instructions = self.inp_custom_instructions.text().strip()

        # TTS
        self.config.tts.piper_url = self.inp_piper_url.text().strip()
        self.config.tts.voice = self.combo_piper_voice.currentText().strip()
        self.config.tts.length_scale = self.spin_tts_speed.value()

        # Themes
        self.config.theme = "anki-light" if self.combo_theme.currentIndex() == 1 else "anki-dark"
        self.config.default_deck = self.inp_default_deck.text().strip() or "English::B1"

        # Ensure directory exists and save
        self.config_manager.get_txt_dir()
        self.config_manager.save(self.config)
        self.settings_saved.emit(self.config)

        self.lbl_save_status.setText("✓ Settings saved successfully.")

    def closeEvent(self, event):
        """Hides dashboard window without quitting the application."""
        event.ignore()
        self.hide()
