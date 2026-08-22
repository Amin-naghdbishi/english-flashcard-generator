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
from app.ai_service import AIService
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
        self.fmt_combo.addItems(["Format A (Simple List)", "Format B (Structured Blocks)"])
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
    - Minimal Anki-inspired design.
    - Top contains ONLY small tab buttons and the small '×' close button (NO 'Vocabulary Capture' title).
    - Never auto-closes on actions (user closes explicitly with ×).
    - Tab 1: AI Assistant.
    - Tab 2: Add to TXT (Format A & B).
    - Keyboard navigation: 1 / 2, Left / Right arrows.
    """
    closed = Signal()

    def __init__(self, config: AppConfig, ai_service: AIService, parent=None):
        super().__init__(parent)
        self.config = config
        self.ai_service = ai_service
        self.captured_text = ""
        self.selected_b_file: Optional[Path] = None
        self.current_format_filter = TXTFormat.A

        self._drag_pos = QPoint()
        self._is_dragging = False

        self._init_window_flags()
        self._init_ui()
        self.apply_theme()

    def _init_window_flags(self):
        flags = Qt.WindowType.FramelessWindowHint | Qt.WindowType.Tool
        if self.config.stay_on_top:
            flags |= Qt.WindowType.WindowStaysOnTopHint
        self.setWindowFlags(flags)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, False)
        self.resize(self.config.window_width, self.config.window_height)

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

        # 1. Minimal Header Bar (ONLY tabs & close '×' button - NO large title!)
        self.header_bar = QWidget(self)
        self.header_bar.setObjectName("HeaderBar")
        header_layout = QHBoxLayout(self.header_bar)
        header_layout.setContentsMargins(0, 0, 0, 4)
        header_layout.setSpacing(4)

        # Tab Toggle Buttons (1 AI, 2 TXT)
        self.tab_btn_ai = QPushButton("1 AI")
        self.tab_btn_ai.setProperty("class", "tab-btn active")
        self.tab_btn_ai.setCheckable(True)
        self.tab_btn_ai.setChecked(True)
        self.tab_btn_ai.clicked.connect(lambda: self.switch_tab(0))

        self.tab_btn_txt = QPushButton("2 TXT")
        self.tab_btn_txt.setProperty("class", "tab-btn")
        self.tab_btn_txt.setCheckable(True)
        self.tab_btn_txt.setChecked(False)
        self.tab_btn_txt.clicked.connect(lambda: self.switch_tab(1))

        header_layout.addWidget(self.tab_btn_ai)
        header_layout.addWidget(self.tab_btn_txt)
        header_layout.addStretch(1)

        # Top close button (Small ×)
        self.close_btn = QPushButton("×")
        self.close_btn.setObjectName("CloseButton")
        self.close_btn.setFixedSize(22, 22)
        self.close_btn.setToolTip("Close window")
        self.close_btn.clicked.connect(self.hide_window)
        header_layout.addWidget(self.close_btn)

        container_layout.addWidget(self.header_bar)

        # 2. Main Stack (Tab 1: AI, Tab 2: TXT)
        self.stack = QStackedWidget(self)

        self.page_ai = self._create_ai_tab()
        self.page_txt = self._create_txt_tab()

        self.stack.addWidget(self.page_ai)
        self.stack.addWidget(self.page_txt)

        container_layout.addWidget(self.stack, 1)
        outer_layout.addWidget(self.container)

        self.update_tab_visibility()

    def update_tab_visibility(self):
        self.tab_btn_ai.setVisible(self.config.show_tabs)
        self.tab_btn_txt.setVisible(self.config.show_tabs)

    # -------------------------------------------------------------
    # TAB 1: AI ASSISTANT
    # -------------------------------------------------------------
    def _create_ai_tab(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 2, 0, 0)
        layout.setSpacing(6)

        # Selected text header display
        self.ai_selection_box = QFrame()
        self.ai_selection_box.setStyleSheet("background-color: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 4px;")
        sel_layout = QVBoxLayout(self.ai_selection_box)
        sel_layout.setContentsMargins(6, 4, 6, 4)
        sel_layout.setSpacing(2)

        self.ai_selection_lbl = QLabel("No text captured yet.")
        self.ai_selection_lbl.setWordWrap(True)
        self.ai_selection_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        sel_layout.addWidget(self.ai_selection_lbl)
        layout.addWidget(self.ai_selection_box)

        # Action Buttons
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
        layout.addLayout(act_layout)

        # Chat / Response area
        self.ai_chat_output = QTextEdit()
        self.ai_chat_output.setReadOnly(True)
        self.ai_chat_output.setPlaceholderText("AI responses and explanations will appear here...")
        layout.addWidget(self.ai_chat_output, 1)

        # Follow-up question input
        chat_inp_layout = QHBoxLayout()
        chat_inp_layout.setSpacing(4)
        self.ai_input = QLineEdit()
        self.ai_input.setPlaceholderText("Ask follow-up question...")
        self.ai_input.returnPressed.connect(self._ai_send_followup)

        self.ai_send_btn = QPushButton("Ask")
        self.ai_send_btn.setProperty("class", "primary-btn")
        self.ai_send_btn.setStyleSheet("font-size: 11px; padding: 4px 8px;")
        self.ai_send_btn.clicked.connect(self._ai_send_followup)

        chat_inp_layout.addWidget(self.ai_input)
        chat_inp_layout.addWidget(self.ai_send_btn)
        layout.addLayout(chat_inp_layout)

        return page

    # -------------------------------------------------------------
    # TAB 2: ADD TO TXT (Format A & B)
    # -------------------------------------------------------------
    def _create_txt_tab(self) -> QWidget:
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 2, 0, 0)
        layout.setSpacing(6)

        # Stack inside TXT tab: (0: File List View, 1: Format B Editor)
        self.txt_stack = QStackedWidget()

        # --- View 0: File Selection List ---
        self.file_list_view = QWidget()
        fl_layout = QVBoxLayout(self.file_list_view)
        fl_layout.setContentsMargins(0, 0, 0, 0)
        fl_layout.setSpacing(6)

        # Format selector (A vs B) & Search / New File (+)
        top_txt_bar = QHBoxLayout()
        top_txt_bar.setSpacing(4)

        self.btn_fmt_a = QPushButton("A")
        self.btn_fmt_a.setProperty("class", "tab-btn active")
        self.btn_fmt_a.setFixedSize(30, 24)
        self.btn_fmt_a.clicked.connect(lambda: self.set_txt_format(TXTFormat.A))

        self.btn_fmt_b = QPushButton("B")
        self.btn_fmt_b.setProperty("class", "tab-btn")
        self.btn_fmt_b.setFixedSize(30, 24)
        self.btn_fmt_b.clicked.connect(lambda: self.set_txt_format(TXTFormat.B))

        top_txt_bar.addWidget(self.btn_fmt_a)
        top_txt_bar.addWidget(self.btn_fmt_b)

        # Search box
        self.txt_search_input = QLineEdit()
        self.txt_search_input.setPlaceholderText("🔍 Search files...")
        self.txt_search_input.textChanged.connect(self.refresh_file_list)
        top_txt_bar.addWidget(self.txt_search_input, 1)

        # New file (+) button
        self.btn_new_file = QPushButton("+")
        self.btn_new_file.setProperty("class", "primary-btn")
        self.btn_new_file.setFixedSize(24, 24)
        self.btn_new_file.setToolTip("Create new TXT file")
        self.btn_new_file.clicked.connect(self._open_new_file_dialog)
        top_txt_bar.addWidget(self.btn_new_file)

        fl_layout.addLayout(top_txt_bar)

        # Status / Feedback label
        self.txt_status_lbl = QLabel("")
        self.txt_status_lbl.setProperty("class", "success")
        self.txt_status_lbl.setVisible(False)
        fl_layout.addWidget(self.txt_status_lbl)

        # Files List Widget
        self.files_list_widget = QListWidget()
        self.files_list_widget.itemClicked.connect(self._on_file_item_clicked)
        fl_layout.addWidget(self.files_list_widget, 1)

        self.txt_stack.addWidget(self.file_list_view)

        # --- View 1: Format B Editor ---
        self.b_editor_view = self._create_b_editor()
        self.txt_stack.addWidget(self.b_editor_view)

        layout.addWidget(self.txt_stack, 1)
        return page

    def _create_b_editor(self) -> QWidget:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        # Top nav: Back button + Target file label
        b_header = QHBoxLayout()
        b_header.setSpacing(6)
        self.btn_b_back = QPushButton("← Back")
        self.btn_b_back.setStyleSheet("font-size: 11px; padding: 2px 6px;")
        self.btn_b_back.clicked.connect(lambda: self.txt_stack.setCurrentIndex(0))
        b_header.addWidget(self.btn_b_back)

        self.b_target_lbl = QLabel("Target: (B).txt")
        self.b_target_lbl.setStyleSheet("font-weight: 600; font-size: 11px;")
        b_header.addWidget(self.b_target_lbl, 1)
        layout.addLayout(b_header)

        # Scroll area for B fields
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)

        fields_container = QWidget()
        f_layout = QVBoxLayout(fields_container)
        f_layout.setContentsMargins(2, 2, 2, 2)
        f_layout.setSpacing(4)

        # Fields
        self.b_inp_word = self._make_field(f_layout, "Word (required)")
        self.b_inp_deck = self._make_field(f_layout, "Deck (required)", default_val=self.config.default_deck)
        self.b_inp_meaning = self._make_field(f_layout, "Persian Meaning (معنی فارسی)")
        self.b_inp_phonetic = self._make_field(f_layout, "Phonetic (/.../)")
        self.b_inp_pos = self._make_field(f_layout, "Part of Speech (noun, verb, etc.)")
        self.b_inp_example = self._make_field(f_layout, "Example Sentence")
        self.b_inp_translation = self._make_field(f_layout, "Example Translation (ترجمه مثال)")
        self.b_inp_mnemonic = self._make_field(f_layout, "Memory Aid (کدگذاری)")

        # Photo & Spelling toggles
        toggles_layout = QHBoxLayout()
        self.b_chk_photo = QCheckBox("Photo=true")
        self.b_chk_spelling = QCheckBox("Spelling=true")
        toggles_layout.addWidget(self.b_chk_photo)
        toggles_layout.addWidget(self.b_chk_spelling)
        f_layout.addLayout(toggles_layout)

        scroll.setWidget(fields_container)
        layout.addWidget(scroll, 1)

        # Save Button
        self.btn_b_save = QPushButton("Add to TXT File")
        self.btn_b_save.setProperty("class", "primary-btn")
        self.btn_b_save.clicked.connect(self._save_format_b_entry)
        layout.addWidget(self.btn_b_save)

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
    # ACTIONS & LOGIC
    # -------------------------------------------------------------
    def set_captured_text(self, text: str):
        """Called when text is captured via global shortcut."""
        self.captured_text = text.strip()
        self.ai_selection_lbl.setText(self.captured_text if self.captured_text else "No text captured.")
        self.b_inp_word.setText(self.captured_text)

        # Auto-trigger AI analysis if configured
        if self.config.auto_trigger_meaning and self.captured_text:
            self._ai_get_meaning()

        self.refresh_file_list()
        self.show_window()

    def switch_tab(self, index: int):
        self.stack.setCurrentIndex(index)
        if index == 0:
            self.tab_btn_ai.setChecked(True)
            self.tab_btn_txt.setChecked(False)
            self.tab_btn_ai.setProperty("class", "tab-btn active")
            self.tab_btn_txt.setProperty("class", "tab-btn")
        else:
            self.tab_btn_ai.setChecked(False)
            self.tab_btn_txt.setChecked(True)
            self.tab_btn_ai.setProperty("class", "tab-btn")
            self.tab_btn_txt.setProperty("class", "tab-btn active")
            self.refresh_file_list()

    def set_txt_format(self, fmt: str):
        self.current_format_filter = fmt
        if fmt == TXTFormat.A:
            self.btn_fmt_a.setProperty("class", "tab-btn active")
            self.btn_fmt_b.setProperty("class", "tab-btn")
        else:
            self.btn_fmt_a.setProperty("class", "tab-btn")
            self.btn_fmt_b.setProperty("class", "tab-btn active")
        self.txt_stack.setCurrentIndex(0)
        self.refresh_file_list()

    def refresh_file_list(self):
        """Lists files matching the current format (A or B) exclusively by filename."""
        self.files_list_widget.clear()
        txt_dir = self.get_txt_dir()
        query = self.txt_search_input.text().strip()

        files = list_txt_files(txt_dir, format_filter=self.current_format_filter, search_query=query)

        if not files:
            item = QListWidgetItem(f"No ({self.current_format_filter}) files found. Click '+' to create one.")
            item.setFlags(Qt.ItemFlag.NoItemFlags)
            self.files_list_widget.addItem(item)
            return

        for f in files:
            fmt = detect_format_from_filename(f)
            clean_name = f.stem
            # Clean display label with format tag
            display = f"{clean_name:<25} ({fmt})"
            item = QListWidgetItem(display)
            item.setData(Qt.ItemDataRole.UserRole, str(f))
            self.files_list_widget.addItem(item)

    def _on_file_item_clicked(self, item: QListWidgetItem):
        file_path_str = item.data(Qt.ItemDataRole.UserRole)
        if not file_path_str:
            return

        file_path = Path(file_path_str)
        fmt = detect_format_from_filename(file_path)

        if fmt == TXTFormat.A:
            # Format A: Directly append word
            word = self.captured_text or self.b_inp_word.text().strip()
            if not word:
                self._show_status("⚠ No word/text captured to add.", is_error=True)
                return

            success = append_to_format_a(file_path, word)
            if success:
                self._show_status(f"✓ Added '{word}' to {file_path.name}")
            else:
                self._show_status("Failed to append to file.", is_error=True)

        elif fmt == TXTFormat.B:
            # Format B: Transition to B Editor within the same window
            self.selected_b_file = file_path
            self.b_target_lbl.setText(f"Target: {file_path.name}")
            self.txt_stack.setCurrentIndex(1)

    def _save_format_b_entry(self):
        if not self.selected_b_file:
            return

        word = self.b_inp_word.text().strip()
        deck = self.b_inp_deck.text().strip() or self.config.default_deck

        if not word:
            self._show_status("Word field is required.", is_error=True)
            return

        # Build dictionary - Empty strings or None will be strictly omitted by append_to_format_b
        fields: Dict[str, Optional[Union[str, bool]]] = {
            "Word": word,
            "Deck": deck,
            "Phonetic": self.b_inp_phonetic.text().strip() or None,
            "Part of Speech": self.b_inp_pos.text().strip() or None,
            "Persian Meaning": self.b_inp_meaning.text().strip() or None,
            "Example Sentence": self.b_inp_example.text().strip() or None,
            "ExampleTranslation": self.b_inp_translation.text().strip() or None,
            "Memory Aid": self.b_inp_mnemonic.text().strip() or None,
            "Photo": True if self.b_chk_photo.isChecked() else None,
            "Spelling": True if self.b_chk_spelling.isChecked() else None,
        }

        success = append_to_format_b(self.selected_b_file, fields)
        if success:
            self.txt_stack.setCurrentIndex(0)
            self._show_status(f"✓ Saved '{word}' to {self.selected_b_file.name}")
        else:
            self._show_status("Failed to save entry.", is_error=True)

    def _open_new_file_dialog(self):
        dlg = NewFileDialog(self, default_format=self.current_format_filter)
        if dlg.exec() == QDialog.DialogCode.Accepted:
            name, fmt = dlg.get_result()
            if name:
                txt_dir = self.get_txt_dir()
                success, path, msg = create_new_txt_file(txt_dir, name, fmt)
                if success:
                    self.set_txt_format(fmt)
                    self._show_status(f"✓ Created {path.name}")
                else:
                    self._show_status(msg, is_error=True)

    def _show_status(self, msg: str, is_error: bool = False):
        self.txt_status_lbl.setText(msg)
        self.txt_status_lbl.setProperty("class", "error" if is_error else "success")
        self.txt_status_lbl.setVisible(True)

    # -------------------------------------------------------------
    # AI ASSISTANT ACTIONS
    # -------------------------------------------------------------
    def _ai_get_meaning(self):
        text = self.captured_text or self.b_inp_word.text().strip()
        if not text:
            return
        self.ai_chat_output.setText(f"Analyzing '{text}' with Ollama ({self.config.ollama_model or 'default'})...")
        QApplication.processEvents()

        success, response = self.ai_service.analyze_selection(text, model=self.config.ollama_model)
        self.ai_chat_output.setText(response)

    def _ai_translate(self):
        text = self.captured_text or self.b_inp_word.text().strip()
        if not text:
            return
        self.ai_chat_output.setText("Translating...")
        QApplication.processEvents()

        prompt = f"Translate the following English text to natural, accurate Persian (فارسی):\n\n\"{text}\""
        success, response = self.ai_service.generate_response(prompt, model=self.config.ollama_model)
        self.ai_chat_output.setText(response)

    def _ai_send_followup(self):
        q = self.ai_input.text().strip()
        if not q:
            return
        self.ai_input.clear()
        current_text = self.ai_chat_output.toPlainText()
        self.ai_chat_output.append(f"\nUser: {q}\nAI: Thinking...")
        QApplication.processEvents()

        prompt = f"Context text: '{self.captured_text}'\n\nQuestion: {q}"
        success, response = self.ai_service.generate_response(prompt, model=self.config.ollama_model)
        self.ai_chat_output.setText(f"{current_text}\n\nUser: {q}\nAI: {response}")

    # -------------------------------------------------------------
    # WINDOW MOVEMENT & KEYBOARD SHORTCUTS
    # -------------------------------------------------------------
    def keyPressEvent(self, event: QKeyEvent):
        key = event.key()
        # Key '1' -> Tab 1 (AI)
        if key == Qt.Key.Key_1 and not self._is_input_focused():
            self.switch_tab(0)
            event.accept()
            return
        # Key '2' -> Tab 2 (TXT)
        if key == Qt.Key.Key_2 and not self._is_input_focused():
            self.switch_tab(1)
            event.accept()
            return
        # Left Arrow / Right Arrow -> Switch tabs
        if not self._is_input_focused():
            if key == Qt.Key.Key_Left:
                self.switch_tab(0)
                event.accept()
                return
            elif key == Qt.Key.Key_Right:
                self.switch_tab(1)
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
        self.hide()
        self.closed.emit()
