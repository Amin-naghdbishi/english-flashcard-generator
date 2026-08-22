import time
import subprocess
import threading
from datetime import datetime
from dataclasses import dataclass
from typing import Callable, Optional, Tuple, List

try:
    from pynput import keyboard
    PYNPUT_AVAILABLE = True
except Exception:
    keyboard = None
    PYNPUT_AVAILABLE = False

@dataclass
class DiagnosticRecord:
    timestamp: str
    shortcut: str
    source: str
    text: str
    method: str
    window_opened: bool
    status_message: str

    def to_formatted_report(self) -> str:
        lines = [
            f"[{self.timestamp}] Trigger Source: {self.source}",
            f"Shortcut detected: {self.shortcut}",
        ]
        if self.text:
            lines.append(f"Selected text: \"{self.text}\" (via {self.method})")
            if self.window_opened:
                lines.append("✓ Floating window opened & AI analysis initiated.")
            else:
                lines.append("⚠ Text capture succeeded, but floating window failed to open.")
        else:
            lines.append("⚠ Shortcut detected, but no selected text was captured.")
            lines.append("  → Ensure text is highlighted with mouse, or install 'wl-clipboard' on Wayland.")

        return "\n".join(lines)

_LAST_DIAGNOSTIC: Optional[DiagnosticRecord] = None

def get_last_diagnostic() -> Optional[DiagnosticRecord]:
    global _LAST_DIAGNOSTIC
    return _LAST_DIAGNOSTIC

def set_last_diagnostic(record: DiagnosticRecord):
    global _LAST_DIAGNOSTIC
    _LAST_DIAGNOSTIC = record

def capture_selected_text_detailed() -> Tuple[str, str]:
    """
    Multi-engine selection reader for Linux (Wayland/Niri and X11).
    Returns (captured_text, capture_method).
    """
    # 1. Try Wayland primary selection (mouse highlight) - wl-paste -p
    try:
        p = subprocess.run(["wl-paste", "-p"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "wl-paste (Wayland primary selection)"
    except Exception:
        pass

    # 2. Try X11 primary selection - xclip
    try:
        p = subprocess.run(["xclip", "-o", "-selection", "primary"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "xclip (X11 primary selection)"
    except Exception:
        pass

    # 3. Try xsel primary selection
    try:
        p = subprocess.run(["xsel", "-o", "-p"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "xsel (X11 primary selection)"
    except Exception:
        pass

    # 4. Try Wayland standard clipboard - wl-paste
    try:
        p = subprocess.run(["wl-paste"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "wl-paste (Wayland clipboard)"
    except Exception:
        pass

    # 5. Try X11 standard clipboard - xclip
    try:
        p = subprocess.run(["xclip", "-o", "-selection", "clipboard"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "xclip (X11 clipboard)"
    except Exception:
        pass

    # 6. Try xsel standard clipboard
    try:
        p = subprocess.run(["xsel", "-o", "-b"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
        if p.returncode == 0 and p.stdout.strip():
            return p.stdout.strip(), "xsel (X11 clipboard)"
    except Exception:
        pass

    # 7. Try Qt QClipboard if app is instantiated
    try:
        from PySide6.QtGui import QGuiApplication, QClipboard
        app = QGuiApplication.instance()
        if app:
            cb = app.clipboard()
            if cb:
                t_sel = cb.text(QClipboard.Mode.Selection).strip()
                if t_sel:
                    return t_sel, "QClipboard (Selection)"
                t_clip = cb.text(QClipboard.Mode.Clipboard).strip()
                if t_clip:
                    return t_clip, "QClipboard (Clipboard)"
    except Exception:
        pass

    # 8. Active fallback: simulated copy with clipboard restore
    backup_clipboard = ""
    try:
        p = subprocess.run(["wl-paste"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.2)
        if p.returncode == 0:
            backup_clipboard = p.stdout
        else:
            p = subprocess.run(["xclip", "-o", "-selection", "clipboard"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.2)
            if p.returncode == 0:
                backup_clipboard = p.stdout
    except Exception:
        pass

    try:
        try:
            subprocess.run(["wtype", "-M", "ctrl", "-k", "c", "-m", "ctrl"], timeout=0.2)
            time.sleep(0.08)
        except Exception:
            if PYNPUT_AVAILABLE and keyboard is not None:
                controller = keyboard.Controller()
                time.sleep(0.04)
                with controller.pressed(keyboard.Key.ctrl):
                    controller.tap('c')
                time.sleep(0.08)

        # Re-read
        for cmd, name in [
            (["wl-paste"], "Simulated copy (wl-paste)"),
            (["xclip", "-o", "-selection", "clipboard"], "Simulated copy (xclip)"),
            (["xsel", "-o", "-b"], "Simulated copy (xsel)"),
        ]:
            try:
                p = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.2)
                if p.returncode == 0 and p.stdout.strip():
                    captured = p.stdout.strip()
                    # Restore previous clipboard if different
                    if backup_clipboard and backup_clipboard != captured:
                        try:
                            p2 = subprocess.Popen(["wl-copy"], stdin=subprocess.PIPE)
                            p2.communicate(input=backup_clipboard.encode("utf-8"), timeout=0.2)
                        except Exception:
                            try:
                                p2 = subprocess.Popen(["xclip", "-i", "-selection", "clipboard"], stdin=subprocess.PIPE)
                                p2.communicate(input=backup_clipboard.encode("utf-8"), timeout=0.2)
                            except Exception:
                                pass
                    return captured, name
            except Exception:
                pass
    except Exception:
        pass

    return "", "None"

def capture_selected_text_fast() -> str:
    """Returns captured text string directly."""
    return capture_selected_text_detailed()[0]

class CaptureService:
    def __init__(self, shortcut: str = "<ctrl>+<alt>+v", on_captured_callback: Optional[Callable[[str], None]] = None):
        self.shortcut = shortcut
        self.callback = on_captured_callback
        self.hotkey_listener = None
        self.keyboard_controller = keyboard.Controller() if (PYNPUT_AVAILABLE and keyboard is not None) else None
        self._running = False
        self.thread: Optional[threading.Thread] = None

    def set_callback(self, cb: Callable[[str], None]):
        self.callback = cb

    def set_shortcut(self, new_shortcut: str):
        self.shortcut = new_shortcut
        if self._running:
            self.restart()

    def get_selection_text(self) -> str:
        return capture_selected_text_fast()

    def _on_hotkey_triggered(self):
        text, method = capture_selected_text_detailed()
        rec = DiagnosticRecord(
            timestamp=datetime.now().strftime("%H:%M:%S"),
            shortcut=self.shortcut,
            source="pynput GlobalHotKeys",
            text=text,
            method=method,
            window_opened=True,
            status_message="Triggered via pynput"
        )
        set_last_diagnostic(rec)
        if self.callback:
            self.callback(text)

    def start(self):
        if self._running or not PYNPUT_AVAILABLE or keyboard is None:
            return

        def hotkey_runner():
            try:
                hotkeys_map = {self.shortcut: self._on_hotkey_triggered}
                self.hotkey_listener = keyboard.GlobalHotKeys(hotkeys_map)
                self._running = True
                self.hotkey_listener.start()
                self.hotkey_listener.join()
            except Exception as e:
                print(f"[CaptureService] Hotkey listener notice for '{self.shortcut}': {e}")
                self._running = False

        self.thread = threading.Thread(target=hotkey_runner, daemon=True)
        self.thread.start()

    def stop(self):
        self._running = False
        if self.hotkey_listener:
            try:
                self.hotkey_listener.stop()
            except Exception:
                pass
            self.hotkey_listener = None

    def restart(self):
        self.stop()
        time.sleep(0.1)
        self.start()
