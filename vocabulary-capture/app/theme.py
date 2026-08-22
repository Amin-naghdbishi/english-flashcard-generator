"""
Minimal Anki-inspired Light and Dark QSS stylesheets for PySide6.
Simple, clean, flat, functional, restrained, compact spacing.
"""

ANKI_DARK_QSS = """
/* Global Window & Typography */
QWidget {
    background-color: #1F1F23;
    color: #F4F4F5;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    selection-background-color: #3B82F6;
    selection-color: #FFFFFF;
}

/* Floating Window Container */
#FloatingContainer {
    background-color: #18181B;
    border: 1px solid #3F3F46;
    border-radius: 4px;
}

/* Header & Close Button */
#HeaderBar {
    background-color: transparent;
    border-bottom: 1px solid #27272A;
}

#CloseButton {
    background-color: transparent;
    color: #A1A1AA;
    border: none;
    border-radius: 2px;
    font-size: 14px;
    font-weight: bold;
    padding: 0px 4px;
}

#CloseButton:hover {
    background-color: #DC2626;
    color: #FFFFFF;
}

/* Tab Toggle Buttons */
QPushButton.tab-btn {
    background-color: #27272A;
    color: #A1A1AA;
    border: 1px solid #3F3F46;
    border-radius: 3px;
    padding: 3px 8px;
    font-weight: 600;
    font-size: 11px;
}

QPushButton.tab-btn:hover {
    background-color: #3F3F46;
    color: #F4F4F5;
}

QPushButton.tab-btn:checked, QPushButton.tab-btn.active {
    background-color: #3B82F6;
    color: #FFFFFF;
    border-color: #3B82F6;
}

/* Standard Buttons */
QPushButton {
    background-color: #27272A;
    color: #F4F4F5;
    border: 1px solid #3F3F46;
    border-radius: 3px;
    padding: 4px 10px;
    font-weight: 500;
}

QPushButton:hover {
    background-color: #3F3F46;
    border-color: #52525B;
}

QPushButton:pressed {
    background-color: #18181B;
}

QPushButton:disabled {
    background-color: #1F1F23;
    color: #52525B;
    border-color: #27272A;
}

QPushButton.primary-btn {
    background-color: #3B82F6;
    color: #FFFFFF;
    border: 1px solid #2563EB;
    font-weight: 600;
}

QPushButton.primary-btn:hover {
    background-color: #2563EB;
}

QPushButton.success-btn {
    background-color: #10B981;
    color: #FFFFFF;
    border: 1px solid #059669;
    font-weight: 600;
}

QPushButton.success-btn:hover {
    background-color: #059669;
}

/* Input Fields & Textareas */
QLineEdit, QTextEdit, QPlainTextEdit {
    background-color: #18181B;
    color: #F4F4F5;
    border: 1px solid #3F3F46;
    border-radius: 3px;
    padding: 4px 6px;
}

QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
    border: 1px solid #3B82F6;
}

/* Combobox */
QComboBox {
    background-color: #18181B;
    color: #F4F4F5;
    border: 1px solid #3F3F46;
    border-radius: 3px;
    padding: 3px 6px;
}

QComboBox:hover {
    border-color: #52525B;
}

QComboBox QAbstractItemView {
    background-color: #18181B;
    color: #F4F4F5;
    border: 1px solid #3F3F46;
    selection-background-color: #3B82F6;
}

/* Scrollbars */
QScrollBar:vertical {
    border: none;
    background: #18181B;
    width: 6px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background: #3F3F46;
    min-height: 20px;
    border-radius: 3px;
}

QScrollBar::handle:vertical:hover {
    background: #52525B;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

/* Lists */
QListWidget {
    background-color: #18181B;
    border: 1px solid #27272A;
    border-radius: 3px;
    padding: 2px;
}

QListWidget::item {
    padding: 5px 6px;
    border-radius: 2px;
    border-bottom: 1px solid #27272A;
}

QListWidget::item:hover {
    background-color: #27272A;
}

QListWidget::item:selected {
    background-color: #3B82F6;
    color: #FFFFFF;
}

/* Checkboxes */
QCheckBox {
    spacing: 6px;
    color: #E4E4E7;
}

QCheckBox::indicator {
    width: 14px;
    height: 14px;
    border: 1px solid #3F3F46;
    border-radius: 2px;
    background: #18181B;
}

QCheckBox::indicator:checked {
    background-color: #3B82F6;
    border-color: #3B82F6;
}

/* Labels */
QLabel.muted {
    color: #A1A1AA;
    font-size: 11px;
}

QLabel.success {
    color: #34D399;
    font-weight: 600;
}

QLabel.error {
    color: #F87171;
    font-weight: 500;
}
"""

ANKI_LIGHT_QSS = """
/* Global Window & Typography */
QWidget {
    background-color: #F4F4F5;
    color: #0F172A;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    selection-background-color: #2563EB;
    selection-color: #FFFFFF;
}

/* Floating Window Container */
#FloatingContainer {
    background-color: #FFFFFF;
    border: 1px solid #CBD5E1;
    border-radius: 4px;
}

/* Header & Close Button */
#HeaderBar {
    background-color: transparent;
    border-bottom: 1px solid #E2E8F0;
}

#CloseButton {
    background-color: transparent;
    color: #64748B;
    border: none;
    border-radius: 2px;
    font-size: 14px;
    font-weight: bold;
    padding: 0px 4px;
}

#CloseButton:hover {
    background-color: #EF4444;
    color: #FFFFFF;
}

/* Tab Toggle Buttons */
QPushButton.tab-btn {
    background-color: #F1F5F9;
    color: #475569;
    border: 1px solid #CBD5E1;
    border-radius: 3px;
    padding: 3px 8px;
    font-weight: 600;
    font-size: 11px;
}

QPushButton.tab-btn:hover {
    background-color: #E2E8F0;
    color: #0F172A;
}

QPushButton.tab-btn:checked, QPushButton.tab-btn.active {
    background-color: #2563EB;
    color: #FFFFFF;
    border-color: #2563EB;
}

/* Standard Buttons */
QPushButton {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    border-radius: 3px;
    padding: 4px 10px;
    font-weight: 500;
}

QPushButton:hover {
    background-color: #F8FAFC;
    border-color: #94A3B8;
}

QPushButton:pressed {
    background-color: #E2E8F0;
}

QPushButton:disabled {
    background-color: #F1F5F9;
    color: #94A3B8;
    border-color: #E2E8F0;
}

QPushButton.primary-btn {
    background-color: #2563EB;
    color: #FFFFFF;
    border: 1px solid #1D4ED8;
    font-weight: 600;
}

QPushButton.primary-btn:hover {
    background-color: #1D4ED8;
}

QPushButton.success-btn {
    background-color: #10B981;
    color: #FFFFFF;
    border: 1px solid #059669;
    font-weight: 600;
}

QPushButton.success-btn:hover {
    background-color: #059669;
}

/* Input Fields & Textareas */
QLineEdit, QTextEdit, QPlainTextEdit {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    border-radius: 3px;
    padding: 4px 6px;
}

QLineEdit:focus, QTextEdit:focus, QPlainTextEdit:focus {
    border: 1px solid #2563EB;
}

/* Combobox */
QComboBox {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    border-radius: 3px;
    padding: 3px 6px;
}

QComboBox:hover {
    border-color: #94A3B8;
}

QComboBox QAbstractItemView {
    background-color: #FFFFFF;
    color: #0F172A;
    border: 1px solid #CBD5E1;
    selection-background-color: #2563EB;
}

/* Scrollbars */
QScrollBar:vertical {
    border: none;
    background: #F1F5F9;
    width: 6px;
    margin: 0px;
}

QScrollBar::handle:vertical {
    background: #CBD5E1;
    min-height: 20px;
    border-radius: 3px;
}

QScrollBar::handle:vertical:hover {
    background: #94A3B8;
}

QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

/* Lists */
QListWidget {
    background-color: #FFFFFF;
    border: 1px solid #E2E8F0;
    border-radius: 3px;
    padding: 2px;
}

QListWidget::item {
    padding: 5px 6px;
    border-radius: 2px;
    border-bottom: 1px solid #F1F5F9;
}

QListWidget::item:hover {
    background-color: #F8FAFC;
}

QListWidget::item:selected {
    background-color: #2563EB;
    color: #FFFFFF;
}

/* Checkboxes */
QCheckBox {
    spacing: 6px;
    color: #1E293B;
}

QCheckBox::indicator {
    width: 14px;
    height: 14px;
    border: 1px solid #CBD5E1;
    border-radius: 2px;
    background: #FFFFFF;
}

QCheckBox::indicator:checked {
    background-color: #2563EB;
    border-color: #2563EB;
}

/* Labels */
QLabel.muted {
    color: #64748B;
    font-size: 11px;
}

QLabel.success {
    color: #059669;
    font-weight: 600;
}

QLabel.error {
    color: #DC2626;
    font-weight: 500;
}
"""

def get_theme_qss(theme_name: str) -> str:
    if theme_name == "anki-light":
        return ANKI_LIGHT_QSS
    return ANKI_DARK_QSS
