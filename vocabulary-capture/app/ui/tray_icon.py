from typing import Callable, Optional
from PySide6.QtCore import Qt, QObject, Signal
from PySide6.QtGui import QIcon, QPixmap, QColor, QPainter, QFont, QAction
from PySide6.QtWidgets import QSystemTrayIcon, QMenu, QApplication

class SystemTrayManager(QObject):
    """
    Manages the Linux system tray icon and context menu.
    Allows the app to run continuously in the background.
    """
    open_dashboard_requested = Signal()
    open_floating_requested = Signal()
    exit_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.tray_icon = QSystemTrayIcon(parent)
        self.tray_icon.setIcon(self._create_default_icon())
        self.tray_icon.setToolTip("Vocabulary Capture (Running in Background)")

        self._init_menu()
        self.tray_icon.activated.connect(self._on_tray_activated)

    def _create_default_icon(self) -> QIcon:
        """Generates a clean minimal 32x32 icon with 'VC'."""
        pixmap = QPixmap(32, 32)
        pixmap.fill(Qt.GlobalColor.transparent)

        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        # Rounded background
        painter.setBrush(QColor("#3B82F6"))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawRoundedRect(2, 2, 28, 28, 6, 6)

        # 'VC' text
        painter.setPen(QColor("#FFFFFF"))
        font = QFont("-apple-system, BlinkMacSystemFont, Segoe UI", 12, QFont.Weight.Bold)
        painter.setFont(font)
        painter.drawText(pixmap.rect(), Qt.AlignmentFlag.AlignCenter, "VC")
        painter.end()

        return QIcon(pixmap)

    def _init_menu(self):
        self.menu = QMenu()

        self.action_dashboard = QAction("Open Dashboard", self.menu)
        self.action_dashboard.triggered.connect(self.open_dashboard_requested.emit)
        self.menu.addAction(self.action_dashboard)

        self.action_floating = QAction("Show Floating Window", self.menu)
        self.action_floating.triggered.connect(self.open_floating_requested.emit)
        self.menu.addAction(self.action_floating)

        self.menu.addSeparator()

        self.action_exit = QAction("Exit Application", self.menu)
        self.action_exit.triggered.connect(self.exit_requested.emit)
        self.menu.addAction(self.action_exit)

        self.tray_icon.setContextMenu(self.menu)

    def _on_tray_activated(self, reason: QSystemTrayIcon.ActivationReason):
        if reason == QSystemTrayIcon.ActivationReason.Trigger:
            self.open_floating_requested.emit()
        elif reason == QSystemTrayIcon.ActivationReason.DoubleClick:
            self.open_dashboard_requested.emit()

    def show(self):
        self.tray_icon.show()

    def hide(self):
        self.tray_icon.hide()
