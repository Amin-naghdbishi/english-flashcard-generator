import os
import sys
import json
import socket
import threading
import tempfile
import getpass
from pathlib import Path
from typing import Optional, Dict, Any

from PySide6.QtCore import QObject, Signal

def get_socket_path() -> Path:
    # Use runtime dir or user config dir
    xdg_runtime = os.environ.get("XDG_RUNTIME_DIR")
    if xdg_runtime and os.path.isdir(xdg_runtime):
        return Path(xdg_runtime) / "vocabulary-capture.sock"
    
    # Fallback to user config dir
    cfg_dir = Path.home() / ".config" / "vocabulary-capture"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    return cfg_dir / "app.sock"

def send_ipc_message(payload: Dict[str, Any], timeout: float = 1.0) -> bool:
    """
    Sends a message to the running instance via Unix domain socket.
    Returns True if successfully delivered, False otherwise.
    """
    sock_path = get_socket_path()
    if not sock_path.exists():
        return False

    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect(str(sock_path))
        data = json.dumps(payload).encode("utf-8") + b"\n"
        s.sendall(data)
        # Wait for ack
        ack = s.recv(128)
        s.close()
        return bool(ack)
    except Exception:
        return False

class IPCServer(QObject):
    """
    Listens on a Unix domain socket and emits signals to the Qt main thread.
    """
    capture_requested = Signal(str)
    show_floating_requested = Signal()
    show_dashboard_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.sock_path = get_socket_path()
        self.sock: Optional[socket.socket] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if self._running:
            return

        # Clean up stale socket if any
        if self.sock_path.exists():
            try:
                # Test if another instance is actively listening
                test_s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                test_s.settimeout(0.2)
                test_s.connect(str(self.sock_path))
                test_s.close()
                # Active instance exists
                print(f"[IPCServer] Another active instance is listening on {self.sock_path}")
                return
            except Exception:
                try:
                    self.sock_path.unlink()
                except Exception:
                    pass

        try:
            self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            self.sock.bind(str(self.sock_path))
            self.sock.listen(5)
            self._running = True

            self._thread = threading.Thread(target=self._server_loop, daemon=True)
            self._thread.start()
            print(f"[IPCServer] Listening on {self.sock_path}")
        except Exception as e:
            print(f"[IPCServer] Failed to bind socket {self.sock_path}: {e}")

    def _server_loop(self):
        while self._running and self.sock:
            try:
                conn, _ = self.sock.accept()
                threading.Thread(target=self._handle_client, args=(conn,), daemon=True).start()
            except Exception:
                break

    def _handle_client(self, conn: socket.socket):
        try:
            conn.settimeout(2.0)
            data = b""
            while b"\n" not in data:
                chunk = conn.recv(1024)
                if not chunk:
                    break
                data += chunk

            if data:
                line = data.decode("utf-8").strip()
                payload = json.loads(line)
                action = payload.get("action", "")
                text = payload.get("text", "")

                if action == "capture":
                    self.capture_requested.emit(text)
                elif action == "show_floating":
                    self.show_floating_requested.emit()
                elif action == "show_dashboard":
                    self.show_dashboard_requested.emit()

                conn.sendall(b'{"status":"ok"}\n')
        except Exception as e:
            pass
        finally:
            try:
                conn.close()
            except Exception:
                pass

    def stop(self):
        self._running = False
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None
        if self.sock_path.exists():
            try:
                self.sock_path.unlink()
            except Exception:
                pass
