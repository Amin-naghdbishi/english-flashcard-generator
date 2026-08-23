import os
from pathlib import Path
from typing import Optional, Dict, List, Tuple, Union

from PySide6.QtCore import Qt, Signal, QPoint, QSize
from PySide6.QtGui import QKeyEvent, QMouseEvent, QIcon, QFont
from PySide6.QtWidgets import (
    QWidget,
    QVBoxLayout,
    QHBoxLayout,
    QPushButton,
    QLabel,
    QLineEdit,
    QTextEdit,
    QListWidget,
    QListWidgetItem,
    QStackedWidget,
    QScrollArea,
    QFrame,
    QCheckBox,
    QDialog,
    QComboBox,
    QApplication,
    QSizePolicy,
)

from app.config import AppConfig
from app.txt_manager import (
    TXTFormat,
    detect_format_from_filename,
    list_txt_files,
    append_to_format_a,
    append_to_format_b,
    create_new_txt_file,
    format_clean_filename,
)
from app.ai_service import AIService, AIStreamWorker
from app.tts_service import TTSService
from app.theme import get_theme_qss

class NewFileDialog(QDialog):
    """Compact dialog for creating a new A or B format file without OS file manager."""
    def __init__(self, parent=None, default_format=TXTFormat.A):
        super().__init__(parent)
        self.setWindowTitle("New TXT File")
        self.setFixedSize(280, 160)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowContextHelpButtonHint)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(10)

        title_lbl = QLabel("Create New Vocabulary File")
        title_lbl.setStyleSheet("font-weight: 600; font-size: 12px;")
        layout.addWidget(title_lbl)

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("e.g. english b1, daily words")
        layout.addWidget(self.name_input)

        fmt_layout = QHBoxLayout()
        fmt_lbl = QLabel("Format:")
        fmt_lbl.setStyleSheet("font-size: 11px;")
        self.fmt_combo = QComboBox()
        self.fmt_combo.addItems(["Format A (Word + Deck)", "Format B (Structured Blocks)"])
        if default_format == TXTFormat.B:
            self.fmt_combo.setCurrentIndex(1)
        fmt_layout.addWidget(fmt_lbl)
        fmt_layout.addWidget(self.fmt_combo)
        layout.addLayout(fmt_layout)

        btn_layout = QHBoxLayout()
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self.reject)
        self.create_btn = QPushButton("Create")
        self.create_btn.setProperty("class", "primary-btn")
        self.create_btn.clicked.connect(self.accept)
        btn_layout.addWidget(self.cancel_btn)
        btn_layout.addWidget(self.create_btn)
        layout.addLayout(btn_layout)

    def get_result(self) -> Tuple[str, str]:
        name = self.name_input.text().strip()
        fmt = TXTFormat.A if self.fmt_combo.currentIndex() == 0 else TXTFormat.B
        return name, fmt


class FloatingWindow(QWidget):
    """
    Compact, persistent floating window for Vocabulary Capture.
    - Tailored for Wayland / Niri / GNOME (Fixed compact size, dialog hint, stays above).
    - Top contains ONLY small tabs & close button (NO bloated app title).
    - Never auto-closes on actions (user closes explicitly with ×).
    - Tab 1: AI Assistant with TRUE streaming response & Piper TTS audio button.
    - Tab 2: Quick Add (Fastest capture using configured default type & default TXT file).
    - Tab 3: Manual Add (Manual A/B format selection, file search/creation, and full editors).
    - Keyboard navigation: 1 / 2 / 3, Left / Right arrows.
    """
    closed = Signal()

    def __init__(self, config: AppConfig, ai_service: AIService, tts_service: Optional[TTSService] = None, parent=None):
        super().__init__(parent)
        self.config = config
        self.ai_service = ai_service
        self.tts_service = tts_service or TTSService(config.tts)
        self.captured_text = ""
        self.manual_selected_a_file: Optional[Path] = None
        self.manual_selected_b_file: Optional[Path] = None
        self.current_manual_format_filter = TXTFormat.A
        self.active_stream_worker: Optional[AIStreamWorker] = None
        self.chat_history: List[Dict[str, str]] = []

        self._drag_pos = QPoint()
        self._is_dragging = False

        self._init_window_flags()
        self._init_ui()
        self.apply_theme()

    def _init_window_flags(self):
        self.setWindowTitle("Vocabulary Capture Floating")
        self.setObjectName("VocabularyCaptureFloating")

        # Linux Wayland / Niri / GNOME floating-friendly flags
        flags = Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint
        if self.config.stay_on_top:
            flags |= Qt.WindowType.WindowStaysOnTopHint

        self.setWindowFlags(flags)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)

        # Enforce fixed size constraints so compositors float it properly
        w = max(340, self.config.window_width)
        h = max(420, self.config.window_height)
        self.setFixedSize(w, h)
        self.setSizePolicy(QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed)

    def apply_theme(self):
        qss = get_theme_qss(self.config.theme)
        self.setStyleSheet(qss)

    def get_txt_dir(self) -> Path:
        raw = Path(self.config.txt_directory).expanduser()
        if not raw.is_absolute():
            subproject_root = Path(__file__).resolve().parent.parent.parent
            raw = (subproject_root / raw).resolve()
        else:
            raw = raw.resolve()
        raw.mkdir(parents=True, exist_ok=True)
        return raw

    def _init_ui(self):
        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(0, 0, 0, 0)
        outer_layout.setSpacing(0)

        self.container = QFrame(self)
        self.container.setObjectName("FloatingContainer")
        container_layout = QVBoxLayout(self.container)
        container_layout.setContentsMargins(8, 6, 8, 8)
        container_layout.setSpacing(6)

        # 1. Minimal Header Bar (Tabs: 1 AI, 2 Quick, 3 Manual, and close '×' button)
        self.header_bar = QWidget(self)
        self.header_bar.setObjectName("HeaderBar")
        header_layout = QHBoxLayout(self.header_bar)
        header_layout.setContentsMargins(0, 0, 0, 4)
        header_layout.setSpacing(4)

        # Tab Toggle Buttons
        self.tab_btn_ai = QPushButton("1 AI")
        self.tab_btn_ai.setProperty("class", "tab-btn active")
        self.tab_btn_ai.setCheckable(True)
        self.tab_btn_ai.setChecked(True)
        self.tab_btn_ai.clicked.connect(lambda: self.switch_tab(0))

        self.tab_btn_quick = QPushButton("2 Quick")
        self.tab_btn_quick.setProperty("class", "tab-btn")
        self.tab_btn_quick.setCheckable(True)
        self.tab_btn_quick.setChecked(False)
        self.tab_btn_quick.clicked.connect(lambda: self.switch_tab(1))

        self.tab_btn_manual = QPushButton("3 Manual")
        self.tab_btn_manual.setProperty("class", "tab-btn")
        self.tab_btn_manual.setCheckable(True)
        self.tab_btn_manual.setChecked(False)
        self.tab_btn_manual.clicked.connect(lambda: self.switch_tab(2))

        header_layout.addWidget(self.tab_btn_ai)
        header_layout.addWidget(self.tab_btn_quick)
        header_layout.addWidget(self.tab_btn_manual)
        header_layout.addStretch(1)

        # Top close button (Small ×)
        self.close_btn = QPushButton("×")
        self.close_btn.setObjectName("CloseButton")
        self.close_btn.setFixedSize(22, 22)
        self.close_btn.setToolTip("Close window")
        self.close_btn.clicked.connect(self.hide_window)
        header_layout.addWidget(self.close_btn)

        container_layout.addWidget(self.header_bar)

        # 2. Main Stack (Tab 1: AI, Tab 2: Quick Add, Tab 3: Manual Add)
        self.stack = QStackedWidget(self)

        self.page_ai = self._create_ai_tab()
        self.page_quick = self._create_quick_tab()
        self.page_manual = self._create_manual_tab()

        self.stack.addWidget(self.page_ai)       # Index 0
        self.stack.addWidget(self.page_quick)    # Index 1
        self.stack.addWidget(self.page_manual)   # Index 2

        container_layout.addWidget(self.stack, 1)
        outer_layout.addWidget(self.container)

        self.update_tab_visibility()

    def update_tab_visibility(self):
        self.tab_btn_ai.setVisible(self.config.show_tabs)
        self.tab_btn_quick.setVisible(self.config.show_tabs)
        self.tab_btn_manual.setVisible(self.config.show_tabs)

    # -------------------------------------------------------------
    # TAB 1: AI ASSISTANT & STREAMING & PIPER TTS
    # -------------------------------------------------------------
    def _create_ai_tab(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 2, 0, 0)
        layout.setSpacing(6)

        # Selected text container with Audio Button
        self.ai_selection_box = QFrame()
        self.ai_selection_box.setStyleSheet("background-color: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px;")
        sel_outer = QHBoxLayout(self.ai_selection_box)
        sel_outer.setContentsMargins(6, 4, 6, 4)
        sel_outer.setSpacing(6)

        self.ai_selection_lbl = QLabel("No text captured yet.")
        self.ai_selection_lbl.setWordWrap(True)
        self.ai_selection_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        sel_outer.addWidget(self.ai_selection_lbl, 1)

        self.btn_tts_selection = QPushButton("🔊")
        self.btn_tts_selection.setProperty("class", "icon-btn")
        self.btn_tts_selection.setFixedSize(26, 22)
        self.btn_tts_selection.setToolTip("Read selected text aloud with Piper TTS")
        self.btn_tts_selection.clicked.connect(self._play_selection_tts)
        sel_outer.addWidget(self.btn_tts_selection)

        layout.addWidget(self.ai_selection_box)

        # Action Buttons Row
        act_layout = QHBoxLayout()
        act_layout.setSpacing(4)
        self.btn_define = QPushButton("Meaning")
        self.btn_define.setStyleSheet("font-size: 11px; padding: 3px 6px;")
        self.btn_define.clicked.connect(self._ai_get_meaning)

        self.btn_translate = QPushButton("Translate")
        self.btn_translate.setStyleSheet("font-size: 11px; padding: 3px 6px;")
        self.btn_translate.clicked.connect(self._ai_translate)

        act_layout.addWidget(self.btn_define)
        act_layout.addWidget(self.btn_translate)
        act_layout.addStretch(1)
        layout.addLayout(act_layout)

        # Streaming Chat / Response Area
        self.ai_chat_output = QTextEdit()
        self.ai_chat_output.setReadOnly(True)
        self.ai_chat_output.setPlaceholderText("AI responses and explanations will stream here...")
        layout.addWidget(self.ai_chat_output, 1)

        # Follow-up question input row
        chat_inp_layout = QHBoxLayout()
        chat_inp_layout.setSpacing(4)
        self.ai_input = QLineEdit()
        self.ai_input.setPlaceholderText("Ask follow-up question...")
        self.ai_input.returnPressed.connect(self._ai_send_followup)

        self.ai_send_btn = QPushButton("Ask")
        self.ai_send_btn.setProperty("class", "primary-btn")
        self.ai_send_btn.setStyleSheet("font-size: 11px; padding: 4px 8px;")
        self.ai_send_btn.clicked.connect(self._ai_send_followup)

        self.btn_tts_response = QPushButton("🔊")
        self.btn_tts_response.setProperty("class", "icon-btn")
        self.btn_tts_response.setFixedSize(26, 26)
        self.btn_tts_response.setToolTip("Read response aloud with Piper TTS")
        self.btn_tts_response.clicked.connect(self._play_response_tts)

        chat_inp_layout.addWidget(self.ai_input, 1)
        chat_inp_layout.addWidget(self.ai_send_btn)
        chat_inp_layout.addWidget(self.btn_tts_response)
        layout.addLayout(chat_inp_layout)

        return page

    # -------------------------------------------------------------
    # TAB 2: QUICK CAPTURE (Uses Settings-defined Defaults)
    # -------------------------------------------------------------
    def _create_quick_tab(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 2, 0, 0)
        layout.setSpacing(6)

        # Target file header
        self.quick_target_lbl = QLabel("Target: Default TXT")
        self.quick_target_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        layout.addWidget(self.quick_target_lbl)

        # Status / Feedback label
        self.quick_status_lbl = QLabel("")
        self.quick_status_lbl.setProperty("class", "success")
        self.quick_status_lbl.setVisible(False)
        layout.addWidget(self.quick_status_lbl)

        # Quick Stack (View 0: Quick Format A, View 1: Quick Format B)
        self.quick_stack = QStackedWidget()

        # --- View 0: Quick Format A (Word + Deck) ---
        self.quick_view_a = QWidget()
        qa_layout = QVBoxLayout(self.quick_view_a)
        qa_layout.setContentsMargins(2, 2, 2, 2)
        qa_layout.setSpacing(8)

        self.quick_a_inp_word = self._make_field(qa_layout, "Word (required)")
        self.quick_a_inp_deck = self._make_field(qa_layout, "Deck (required)", default_val=self.config.default_deck)
        qa_layout.addStretch(1)

        self.btn_quick_a_save = QPushButton("Add")
        self.btn_quick_a_save.setProperty("class", "primary-btn")
        self.btn_quick_a_save.clicked.connect(self._save_quick_entry)
        qa_layout.addWidget(self.btn_quick_a_save)

        self.quick_stack.addWidget(self.quick_view_a)

        # --- View 1: Quick Format B (Structured Blocks) ---
        self.quick_view_b = QWidget()
        qb_layout = QVBoxLayout(self.quick_view_b)
        qb_layout.setContentsMargins(0, 0, 0, 0)
        qb_layout.setSpacing(4)

        scroll_b = QScrollArea()
        scroll_b.setWidgetResizable(True)
        scroll_b.setFrameShape(QFrame.Shape.NoFrame)

        fields_b = QWidget()
        fb_layout = QVBoxLayout(fields_b)
        fb_layout.setContentsMargins(2, 2, 2, 2)
        fb_layout.setSpacing(4)

        self.quick_b_inp_word = self._make_field(fb_layout, "Word (required)")
        self.quick_b_inp_deck = self._make_field(fb_layout, "Deck (required)", default_val=self.config.default_deck)
        self.quick_b_inp_meaning = self._make_field(fb_layout, "Persian Meaning (معنی فارسی)")
        self.quick_b_inp_phonetic = self._make_field(fb_layout, "Phonetic (/.../)")
        self.quick_b_inp_pos = self._make_field(fb_layout, "Part of Speech (noun, verb, etc.)")
        self.quick_b_inp_example = self._make_field(fb_layout, "Example Sentence")
        self.quick_b_inp_translation = self._make_field(fb_layout, "Example Translation (ترجمه مثال)")
        self.quick_b_inp_mnemonic = self._make_field(fb_layout, "Memory Aid (کدگذاری)")

        toggles_b = QHBoxLayout()
        self.quick_b_chk_photo = QCheckBox("Photo=true")
        self.quick_b_chk_spelling = QCheckBox("Spelling=true")
        toggles_b.addWidget(self.quick_b_chk_photo)
        toggles_b.addWidget(self.quick_b_chk_spelling)
        fb_layout.addLayout(toggles_b)

        scroll_b.setWidget(fields_b)
        qb_layout.addWidget(scroll_b, 1)

        self.btn_quick_b_save = QPushButton("Add")
        self.btn_quick_b_save.setProperty("class", "primary-btn")
        self.btn_quick_b_save.clicked.connect(self._save_quick_entry)
        qb_layout.addWidget(self.btn_quick_b_save)

        self.quick_stack.addWidget(self.quick_view_b)

        layout.addWidget(self.quick_stack, 1)
        return page

    def _resolve_quick_target_file(self) -> Tuple[str, Path]:
        """Resolves the default capture format and target TXT file from Settings."""
        txt_dir = self.get_txt_dir()
        fmt = self.config.default_capture_type.upper() if self.config.default_capture_type in ("A", "B") else TXTFormat.A

        target_name = self.config.default_txt_file_a if fmt == TXTFormat.A else self.config.default_txt_file_b
        target_path: Optional[Path] = None

        if target_name:
            cand = txt_dir / target_name
            if cand.exists():
                target_path = cand

        if not target_path:
            # Fallback to first existing file of that format
            existing = list_txt_files(txt_dir, format_filter=fmt)
            if existing:
                target_path = existing[0]
            else:
                # Auto-create default file
                default_name = f"vocabulary-{fmt.lower()}"
                _, target_path, _ = create_new_txt_file(txt_dir, default_name, fmt)

        return fmt, target_path

    def _refresh_quick_tab_state(self):
        fmt, target_path = self._resolve_quick_target_file()
        self.quick_target_lbl.setText(f"Target: {target_path.name} ({fmt})")

        word = self.captured_text or self.quick_a_inp_word.text().strip()
        deck = self.config.default_deck

        if fmt == TXTFormat.A:
            self.quick_stack.setCurrentIndex(0)
            self.quick_a_inp_word.setText(word)
            if not self.quick_a_inp_deck.text().strip():
                self.quick_a_inp_deck.setText(deck)
        else:
            self.quick_stack.setCurrentIndex(1)
            self.quick_b_inp_word.setText(word)
            if not self.quick_b_inp_deck.text().strip():
                self.quick_b_inp_deck.setText(deck)

    def _save_quick_entry(self):
        fmt, target_path = self._resolve_quick_target_file()

        if fmt == TXTFormat.A:
            word = self.quick_a_inp_word.text().strip()
            deck = self.quick_a_inp_deck.text().strip() or self.config.default_deck

            if not word:
                self._show_quick_status("Word field is required.", is_error=True)
                return
            if not deck:
                self._show_quick_status("Deck field is required.", is_error=True)
                return

            success = append_to_format_a(target_path, word, deck)
            if success:
                self._show_quick_status(f"✓ Saved '{word}' to {target_path.name}")
            else:
                self._show_quick_status("Failed to save entry.", is_error=True)

        else:
            word = self.quick_b_inp_word.text().strip()
            deck = self.quick_b_inp_deck.text().strip() or self.config.default_deck

            if not word:
                self._show_quick_status("Word field is required.", is_error=True)
                return

            fields: Dict[str, Optional[Union[str, bool]]] = {
                "Word": word,
                "Deck": deck,
                "Phonetic": self.quick_b_inp_phonetic.text().strip() or None,
                "Part of Speech": self.quick_b_inp_pos.text().strip() or None,
                "Persian Meaning": self.quick_b_inp_meaning.text().strip() or None,
                "Example Sentence": self.quick_b_inp_example.text().strip() or None,
                "ExampleTranslation": self.quick_b_inp_translation.text().strip() or None,
                "Memory Aid": self.quick_b_inp_mnemonic.text().strip() or None,
                "Photo": True if self.quick_b_chk_photo.isChecked() else None,
                "Spelling": True if self.quick_b_chk_spelling.isChecked() else None,
            }

            success = append_to_format_b(target_path, fields)
            if success:
                self._show_quick_status(f"✓ Saved '{word}' to {target_path.name}")
            else:
                self._show_quick_status("Failed to save entry.", is_error=True)

    def _show_quick_status(self, msg: str, is_error: bool = False):
        self.quick_status_lbl.setText(msg)
        self.quick_status_lbl.setProperty("class", "error" if is_error else "success")
        self.quick_status_lbl.setVisible(True)

    # -------------------------------------------------------------
    # TAB 3: MANUAL ADD (Preserves full file picker & format selection)
    # -------------------------------------------------------------
    def _create_manual_tab(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 2, 0, 0)
        layout.setSpacing(6)

        # Stack inside Manual tab: (0: File List View, 1: Format A Editor, 2: Format B Editor)
        self.manual_txt_stack = QStackedWidget()

        # --- View 0: File Selection List ---
        self.manual_file_list_view = QWidget()
        fl_layout = QVBoxLayout(self.manual_file_list_view)
        fl_layout.setContentsMargins(0, 0, 0, 0)
        fl_layout.setSpacing(6)

        # Format selector (A vs B) & Search / New File (+)
        top_txt_bar = QHBoxLayout()
        top_txt_bar.setSpacing(4)

        self.btn_fmt_a = QPushButton("A")
        self.btn_fmt_a.setProperty("class", "tab-btn active")
        self.btn_fmt_a.setFixedSize(30, 24)
        self.btn_fmt_a.clicked.connect(lambda: self.set_manual_txt_format(TXTFormat.A))

        self.btn_fmt_b = QPushButton("B")
        self.btn_fmt_b.setProperty("class", "tab-btn")
        self.btn_fmt_b.setFixedSize(30, 24)
        self.btn_fmt_b.clicked.connect(lambda: self.set_manual_txt_format(TXTFormat.B))

        top_txt_bar.addWidget(self.btn_fmt_a)
        top_txt_bar.addWidget(self.btn_fmt_b)

        # Search box
        self.txt_search_input = QLineEdit()
        self.txt_search_input.setPlaceholderText("🔍 Search files...")
        self.txt_search_input.textChanged.connect(self.refresh_manual_file_list)
        top_txt_bar.addWidget(self.txt_search_input, 1)

        # New file (+) button
        self.btn_new_file = QPushButton("+")
        self.btn_new_file.setProperty("class", "primary-btn")
        self.btn_new_file.setFixedSize(24, 24)
        self.btn_new_file.setToolTip("Create new TXT file")
        self.btn_new_file.clicked.connect(self._open_manual_new_file_dialog)
        top_txt_bar.addWidget(self.btn_new_file)

        fl_layout.addLayout(top_txt_bar)

        # Status / Feedback label
        self.manual_txt_status_lbl = QLabel("")
        self.manual_txt_status_lbl.setProperty("class", "success")
        self.manual_txt_status_lbl.setVisible(False)
        fl_layout.addWidget(self.manual_txt_status_lbl)

        # Files List Widget
        self.manual_files_list_widget = QListWidget()
        self.manual_files_list_widget.itemClicked.connect(self._on_manual_file_item_clicked)
        fl_layout.addWidget(self.manual_files_list_widget, 1)

        self.manual_txt_stack.addWidget(self.manual_file_list_view)

        # --- View 1: Format A Editor ---
        self.manual_a_editor_view = self._create_manual_a_editor()
        self.manual_txt_stack.addWidget(self.manual_a_editor_view)

        # --- View 2: Format B Editor ---
        self.manual_b_editor_view = self._create_manual_b_editor()
        self.manual_txt_stack.addWidget(self.manual_b_editor_view)

        layout.addWidget(self.manual_txt_stack, 1)
        return page

    def _create_manual_a_editor(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        # Header: Back button + Target label
        a_header = QHBoxLayout()
        a_header.setSpacing(6)
        self.btn_manual_a_back = QPushButton("← Back")
        self.btn_manual_a_back.setStyleSheet("font-size: 11px; padding: 2px 6px;")
        self.btn_manual_a_back.clicked.connect(lambda: self.manual_txt_stack.setCurrentIndex(0))
        a_header.addWidget(self.btn_manual_a_back)

        self.manual_a_target_lbl = QLabel("Target: (A).txt")
        self.manual_a_target_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        a_header.addWidget(self.manual_a_target_lbl, 1)
        layout.addLayout(a_header)

        # Form container
        form_container = QWidget()
        f_layout = QVBoxLayout(form_container)
        f_layout.setContentsMargins(4, 4, 4, 4)
        f_layout.setSpacing(8)

        self.manual_a_inp_word = self._make_field(f_layout, "Word (required)")
        self.manual_a_inp_deck = self._make_field(f_layout, "Deck (required)", default_val=self.config.default_deck)

        layout.addWidget(form_container)
        layout.addStretch(1)

        self.btn_manual_a_save = QPushButton("Add to TXT File")
        self.btn_manual_a_save.setProperty("class", "primary-btn")
        self.btn_manual_a_save.clicked.connect(self._save_manual_format_a_entry)
        layout.addWidget(self.btn_manual_a_save)

        return widget

    def _create_manual_b_editor(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        b_header = QHBoxLayout()
        b_header.setSpacing(6)
        self.btn_manual_b_back = QPushButton("← Back")
        self.btn_manual_b_back.setStyleSheet("font-size: 11px; padding: 2px 6px;")
        self.btn_manual_b_back.clicked.connect(lambda: self.manual_txt_stack.setCurrentIndex(0))
        b_header.addWidget(self.btn_manual_b_back)

        self.manual_b_target_lbl = QLabel("Target: (B).txt")
        self.manual_b_target_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        b_header.addWidget(self.manual_b_target_lbl, 1)
        layout.addLayout(b_header)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)

        fields_container = QWidget()
        f_layout = QVBoxLayout(fields_container)
        f_layout.setContentsMargins(2, 2, 2, 2)
        f_layout.setSpacing(4)

        self.manual_b_inp_word = self._make_field(f_layout, "Word (required)")
        self.manual_b_inp_deck = self._make_field(f_layout, "Deck (required)", default_val=self.config.default_deck)
        self.manual_b_inp_meaning = self._make_field(f_layout, "Persian Meaning (معنی فارسی)")
        self.manual_b_inp_phonetic = self._make_field(f_layout, "Phonetic (/.../)")
        self.manual_b_inp_pos = self._make_field(f_layout, "Part of Speech (noun, verb, etc.)")
        self.manual_b_inp_example = self._make_field(f_layout, "Example Sentence")
        self.manual_b_inp_translation = self._make_field(f_layout, "Example Translation (ترجمه مثال)")
        self.manual_b_inp_mnemonic = self._make_field(f_layout, "Memory Aid (کدگذاری)")

        toggles_layout = QHBoxLayout()
        self.manual_b_chk_photo = QCheckBox("Photo=true")
        self.manual_b_chk_spelling = QCheckBox("Spelling=true")
        toggles_layout.addWidget(self.manual_b_chk_photo)
        toggles_layout.addWidget(self.manual_b_chk_spelling)
        f_layout.addLayout(toggles_layout)

        scroll.setWidget(fields_container)
        layout.addWidget(scroll, 1)

        self.btn_manual_b_save = QPushButton("Add to TXT File")
        self.btn_manual_b_save.setProperty("class", "primary-btn")
        self.btn_manual_b_save.clicked.connect(self._save_manual_format_b_entry)
        layout.addWidget(self.btn_manual_b_save)

        return widget

    def _make_field(self, layout: QVBoxLayout, label_text: str, default_val: str = "") -> QLineEdit:
        lbl = QLabel(label_text)
        lbl.setProperty("class", "muted")
        layout.addWidget(lbl)
        inp = QLineEdit()
        if default_val:
            inp.setText(default_val)
        layout.addWidget(inp)
        return inp

    # -------------------------------------------------------------
    # ACTIONS & CAPTURE LOGIC
    # -------------------------------------------------------------
    def set_captured_text(self, text: str):
        """Called when text is captured via global shortcut or IPC."""
        self.captured_text = text.strip()
        self.ai_selection_lbl.setText(self.captured_text if self.captured_text else "No text captured.")

        # Prefill Quick tab fields
        self.quick_a_inp_word.setText(self.captured_text)
        self.quick_b_inp_word.setText(self.captured_text)

        # Prefill Manual tab fields
        self.manual_a_inp_word.setText(self.captured_text)
        self.manual_b_inp_word.setText(self.captured_text)

        # Auto-trigger AI analysis if configured
        if self.config.auto_trigger_meaning and self.captured_text:
            self._ai_auto_analyze()

        self._refresh_quick_tab_state()
        self.refresh_manual_file_list()
        self.show_window()

    def switch_tab(self, index: int):
        self.stack.setCurrentIndex(index)
        buttons = [self.tab_btn_ai, self.tab_btn_quick, self.tab_btn_manual]
        for i, btn in enumerate(buttons):
            if i == index:
                btn.setChecked(True)
                btn.setProperty("class", "tab-btn active")
            else:
                btn.setChecked(False)
                btn.setProperty("class", "tab-btn")
            btn.style().polish(btn)

        if index == 1:
            self._refresh_quick_tab_state()
        elif index == 2:
            self.refresh_manual_file_list()

    def set_manual_txt_format(self, fmt: str):
        self.current_manual_format_filter = fmt
        if fmt == TXTFormat.A:
            self.btn_fmt_a.setProperty("class", "tab-btn active")
            self.btn_fmt_b.setProperty("class", "tab-btn")
        else:
            self.btn_fmt_a.setProperty("class", "tab-btn")
            self.btn_fmt_b.setProperty("class", "tab-btn active")
        self.btn_fmt_a.style().polish(self.btn_fmt_a)
        self.btn_fmt_b.style().polish(self.btn_fmt_b)
        self.manual_txt_stack.setCurrentIndex(0)
        self.refresh_manual_file_list()

    def refresh_manual_file_list(self):
        """Lists files matching current format in Manual Add tab."""
        self.manual_files_list_widget.clear()
        txt_dir = self.get_txt_dir()
        query = self.txt_search_input.text().strip()

        files = list_txt_files(txt_dir, format_filter=self.current_manual_format_filter, search_query=query)

        if not files:
            item = QListWidgetItem(f"No ({self.current_manual_format_filter}) files found. Click '+' to create one.")
            item.setFlags(Qt.ItemFlag.NoItemFlags)
            self.manual_files_list_widget.addItem(item)
            return

        for f in files:
            fmt = detect_format_from_filename(f)
            clean_name = f.stem
            display = f"{clean_name:<25} ({fmt})"
            item = QListWidgetItem(display)
            item.setData(Qt.ItemDataRole.UserRole, str(f))
            self.manual_files_list_widget.addItem(item)

    def _on_manual_file_item_clicked(self, item: QListWidgetItem):
        file_path_str = item.data(Qt.ItemDataRole.UserRole)
        if not file_path_str:
            return

        file_path = Path(file_path_str)
        fmt = detect_format_from_filename(file_path)

        if fmt == TXTFormat.A:
            self.manual_selected_a_file = file_path
            self.manual_a_target_lbl.setText(f"Target: {file_path.name}")
            word = self.captured_text or self.manual_a_inp_word.text().strip()
            self.manual_a_inp_word.setText(word)
            if not self.manual_a_inp_deck.text().strip():
                self.manual_a_inp_deck.setText(self.config.default_deck)
            self.manual_txt_stack.setCurrentIndex(1)

        elif fmt == TXTFormat.B:
            self.manual_selected_b_file = file_path
            self.manual_b_target_lbl.setText(f"Target: {file_path.name}")
            word = self.captured_text or self.manual_b_inp_word.text().strip()
            self.manual_b_inp_word.setText(word)
            if not self.manual_b_inp_deck.text().strip():
                self.manual_b_inp_deck.setText(self.config.default_deck)
            self.manual_txt_stack.setCurrentIndex(2)

    def _save_manual_format_a_entry(self):
        if not self.manual_selected_a_file:
            return

        word = self.manual_a_inp_word.text().strip()
        deck = self.manual_a_inp_deck.text().strip() or self.config.default_deck

        if not word:
            self._show_manual_status("Word field is required.", is_error=True)
            return

        if not deck:
            self._show_manual_status("Deck field is required.", is_error=True)
            return

        success = append_to_format_a(self.manual_selected_a_file, word, deck)
        if success:
            self.manual_txt_stack.setCurrentIndex(0)
            self._show_manual_status(f"✓ Saved '{word}' to {self.manual_selected_a_file.name}")
        else:
            self._show_manual_status("Failed to save entry.", is_error=True)

    def _save_manual_format_b_entry(self):
        if not self.manual_selected_b_file:
            return

        word = self.manual_b_inp_word.text().strip()
        deck = self.manual_b_inp_deck.text().strip() or self.config.default_deck

        if not word:
            self._show_manual_status("Word field is required.", is_error=True)
            return

        fields: Dict[str, Optional[Union[str, bool]]] = {
            "Word": word,
            "Deck": deck,
            "Phonetic": self.manual_b_inp_phonetic.text().strip() or None,
            "Part of Speech": self.manual_b_inp_pos.text().strip() or None,
            "Persian Meaning": self.manual_b_inp_meaning.text().strip() or None,
            "Example Sentence": self.manual_b_inp_example.text().strip() or None,
            "ExampleTranslation": self.manual_b_inp_translation.text().strip() or None,
            "Memory Aid": self.manual_b_inp_mnemonic.text().strip() or None,
            "Photo": True if self.manual_b_chk_photo.isChecked() else None,
            "Spelling": True if self.manual_b_chk_spelling.isChecked() else None,
        }

        success = append_to_format_b(self.manual_selected_b_file, fields)
        if success:
            self.manual_txt_stack.setCurrentIndex(0)
            self._show_manual_status(f"✓ Saved '{word}' to {self.manual_selected_b_file.name}")
        else:
            self._show_manual_status("Failed to save entry.", is_error=True)

    def _open_manual_new_file_dialog(self):
        dlg = NewFileDialog(self, default_format=self.current_manual_format_filter)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            name, fmt = dlg.get_result()
            if name:
                txt_dir = self.get_txt_dir()
                success, path, msg = create_new_txt_file(txt_dir, name, fmt)
                if success:
                    self.set_manual_txt_format(fmt)
                    self._show_manual_status(f"✓ Created {path.name}")
                    if fmt == TXTFormat.A:
                        self.manual_selected_a_file = path
                        self.manual_a_target_lbl.setText(f"Target: {path.name}")
                        word = self.captured_text or self.manual_a_inp_word.text().strip()
                        self.manual_a_inp_word.setText(word)
                        if not self.manual_a_inp_deck.text().strip():
                            self.manual_a_inp_deck.setText(self.config.default_deck)
                        self.manual_txt_stack.setCurrentIndex(1)
                    elif fmt == TXTFormat.B:
                        self.manual_selected_b_file = path
                        self.manual_b_target_lbl.setText(f"Target: {path.name}")
                        word = self.captured_text or self.manual_b_inp_word.text().strip()
                        self.manual_b_inp_word.setText(word)
                        if not self.manual_b_inp_deck.text().strip():
                            self.manual_b_inp_deck.setText(self.config.default_deck)
                        self.manual_txt_stack.setCurrentIndex(2)
                else:
                    self._show_manual_status(msg, is_error=True)

    def _show_manual_status(self, msg: str, is_error: bool = False):
        self.manual_txt_status_lbl.setText(msg)
        self.manual_txt_status_lbl.setProperty("class", "error" if is_error else "success")
        self.manual_txt_status_lbl.setVisible(True)

    # -------------------------------------------------------------
    # AI ASSISTANT STREAMING ACTIONS
    # -------------------------------------------------------------
    def _start_streaming_ai(self, prompt: str, system_prompt: str = ""):
        if self.active_stream_worker and self.active_stream_worker.isRunning():
            self.active_stream_worker.cancel()
            self.active_stream_worker.wait(100)

        self.ai_chat_output.clear()
        provider = self.config.get_active_provider()

        self.active_stream_worker = AIStreamWorker(
            service=self.ai_service,
            prompt=prompt,
            system_prompt=system_prompt,
            provider=provider,
            parent=self,
        )

        def _on_chunk(chunk: str):
            self.ai_chat_output.insertPlainText(chunk)
            sb = self.ai_chat_output.verticalScrollBar()
            sb.setValue(sb.maximum())

        def _on_finished(full_text: str):
            self.chat_history.append({"role": "user", "content": prompt})
            self.chat_history.append({"role": "assistant", "content": full_text})

        def _on_error(err_msg: str):
            self.ai_chat_output.append(f"\n[Error: {err_msg}]")

        self.active_stream_worker.chunk_received.connect(_on_chunk)
        self.active_stream_worker.finished.connect(_on_finished)
        self.active_stream_worker.error.connect(_on_error)
        self.active_stream_worker.start()

    def _ai_auto_analyze(self):
        text = self.captured_text or self.quick_a_inp_word.text().strip()
        if not text:
            return
        is_single_word = len(text.split()) <= 2 and len(text) < 30
        if is_single_word:
            self._ai_get_meaning()
        else:
            self._ai_translate()

    def _ai_get_meaning(self):
        text = self.captured_text or self.quick_a_inp_word.text().strip()
        if not text:
            return
        prompt = self.ai_service.build_vocab_prompt(text, self.config.prompts.vocab_prompt)
        sys_prompt = self.config.prompts.system_prompt
        if self.config.prompts.custom_instructions:
            sys_prompt += f"\n\n{self.config.prompts.custom_instructions}"
        self._start_streaming_ai(prompt=prompt, system_prompt=sys_prompt)

    def _ai_translate(self):
        text = self.captured_text or self.quick_a_inp_word.text().strip()
        if not text:
            return
        prompt = self.ai_service.build_sentence_prompt(text, self.config.prompts.sentence_prompt)
        sys_prompt = self.config.prompts.system_prompt
        if self.config.prompts.custom_instructions:
            sys_prompt += f"\n\n{self.config.prompts.custom_instructions}"
        self._start_streaming_ai(prompt=prompt, system_prompt=sys_prompt)

    def _ai_send_followup(self):
        q = self.ai_input.text().strip()
        if not q:
            return
        self.ai_input.clear()
        self.ai_chat_output.append(f"\n\nUser: {q}\nAI: ")

        prompt = f"Context: '{self.captured_text}'\n\nQuestion: {q}"
        sys_prompt = self.config.prompts.system_prompt
        self._start_streaming_ai(prompt=prompt, system_prompt=sys_prompt)

    # -------------------------------------------------------------
    # PIPER TTS AUDIO ACTIONS
    # -------------------------------------------------------------
    def _play_selection_tts(self):
        text = self.captured_text or self.quick_a_inp_word.text().strip()
        if not text:
            return
        self.tts_service.config = self.config.tts
        def _on_error(err_msg: str):
            self.ai_chat_output.append(f"\n[TTS Error: {err_msg}]")
        self.tts_service.speak_text_async(text, on_error=_on_error)

    def _play_response_tts(self):
        text = self.ai_chat_output.toPlainText().strip()
        if not text:
            return
        cleaned_lines = [l for l in text.splitlines() if not l.startswith(("[Error:", "[Ollama Error", "[Provider Error", "[Gemini Error", "[TTS Error:"))]
        speak_text = "\n".join(cleaned_lines).strip()
        if not speak_text:
            return
        self.tts_service.config = self.config.tts
        def _on_error(err_msg: str):
            self.ai_chat_output.append(f"\n[TTS Error: {err_msg}]")
        self.tts_service.speak_text_async(speak_text, on_error=_on_error)

    # -------------------------------------------------------------
    # WINDOW MOVEMENT & KEYBOARD SHORTCUTS
    # -------------------------------------------------------------
    def keyPressEvent(self, event: QKeyEvent):
        key = event.key()
        if not self._is_input_focused():
            if key == Qt.Key.Key_1:
                self.switch_tab(0)
                event.accept()
                return
            elif key == Qt.Key.Key_2:
                self.switch_tab(1)
                event.accept()
                return
            elif key == Qt.Key.Key_3:
                self.switch_tab(2)
                event.accept()
                return
            elif key == Qt.Key.Key_Left:
                cur = self.stack.currentIndex()
                if cur > 0:
                    self.switch_tab(cur - 1)
                event.accept()
                return
            elif key == Qt.Key.Key_Right:
                cur = self.stack.currentIndex()
                if cur < 2:
                    self.switch_tab(cur + 1)
                event.accept()
                return

        super().keyPressEvent(event)

    def _is_input_focused(self) -> bool:
        w = QApplication.focusWidget()
        return isinstance(w, (QLineEdit, QTextEdit))

    def mousePressEvent(self, event: QMouseEvent):
        if event.button() == Qt.MouseButton.LeftButton:
            self._is_dragging = True
            self._drag_pos = event.globalPosition().toPoint() - self.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event: QMouseEvent):
        if self._is_dragging and event.buttons() == Qt.MouseButton.LeftButton:
            self.move(event.globalPosition().toPoint() - self._drag_pos)
            event.accept()

    def mouseReleaseEvent(self, event: QMouseEvent):
        self._is_dragging = False

    def show_window(self):
        self.show()
        self.raise_()
        self.activateWindow()

    def hide_window(self):
        """User explicitly closes with ×."""
        if self.active_stream_worker and self.active_stream_worker.isRunning():
            self.active_stream_worker.cancel()
        self.hide()
        self.closed.emit()
