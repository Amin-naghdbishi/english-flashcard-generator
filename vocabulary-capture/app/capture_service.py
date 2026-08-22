import time
import subprocess
import threading
from typing import Callable, Optional

try:
    from pynput import keyboard
    PYNPUT_AVAILABLE = True
except Exception as e:
    keyboard = None
    PYNPUT_AVAILABLE = False
    print(f"[CaptureService] Note: pynput keyboard not available in current display environment: {e}")

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
        """
        Attempts to read selected text using multiple Linux methods:
        1. Primary selection (wl-paste -p / xclip -o / xsel -o)
        2. Simulated Ctrl+C with clipboard backup and restore
        """
        # 1. Try Wayland primary selection
        try:
            p = subprocess.run(["wl-paste", "-p"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
            if p.returncode == 0 and p.stdout.strip():
                return p.stdout.strip()
        except Exception:
            pass

        # 2. Try X11 primary selection (xclip)
        try:
            p = subprocess.run(["xclip", "-o", "-selection", "primary"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
            if p.returncode == 0 and p.stdout.strip():
                return p.stdout.strip()
        except Exception:
            pass

        # 3. Try xsel primary selection
        try:
            p = subprocess.run(["xsel", "-o", "-p"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
            if p.returncode == 0 and p.stdout.strip():
                return p.stdout.strip()
        except Exception:
            pass

        # 4. Fallback: Temporarily simulate Ctrl+C, read clipboard, and restore
        backup_clipboard = ""
        try:
            # Read backup
            p = subprocess.run(["xclip", "-o", "-selection", "clipboard"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.2)
            if p.returncode == 0:
                backup_clipboard = p.stdout
        except Exception:
            pass

        # Simulate Ctrl+C if keyboard controller is available
        if self.keyboard_controller:
            try:
                time.sleep(0.05)
                with self.keyboard_controller.pressed(keyboard.Key.ctrl):
                    self.keyboard_controller.tap('c')
                time.sleep(0.08)

                # Read captured text from clipboard
                captured = ""
                try:
                    p = subprocess.run(["xclip", "-o", "-selection", "clipboard"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=0.3)
                    if p.returncode == 0 and p.stdout.strip():
                        captured = p.stdout.strip()
                except Exception:
                    pass

                # Restore original clipboard if needed
                if backup_clipboard and backup_clipboard != captured:
                    try:
                        p = subprocess.Popen(["xclip", "-i", "-selection", "clipboard"], stdin=subprocess.PIPE)
                        p.communicate(input=backup_clipboard.encode("utf-8"), timeout=0.3)
                    except Exception:
                        pass

                if captured:
                    return captured
            except Exception as e:
                print(f"[CaptureService] Simulated copy error: {e}")

        return ""

    def _on_hotkey_triggered(self):
        text = self.get_selection_text()
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
                print(f"[CaptureService] Hotkey listener failed for '{self.shortcut}': {e}")
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
