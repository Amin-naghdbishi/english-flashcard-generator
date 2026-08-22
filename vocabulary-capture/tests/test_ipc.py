import os
import time
import pytest
from pathlib import Path
from PySide6.QtWidgets import QApplication
from app.ipc import IPCServer, send_ipc_message, get_socket_path

@pytest.fixture(scope="session")
def qapp():
    os.environ["QT_QPA_PLATFORM"] = "offscreen"
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    return app

def test_ipc_communication(qapp):
    server = IPCServer()
    received_msgs = []

    server.capture_requested.connect(lambda t: received_msgs.append(("capture", t)))
    server.show_floating_requested.connect(lambda: received_msgs.append(("show_floating", "")))
    server.start()

    time.sleep(0.08)

    # Test sending capture
    sent1 = send_ipc_message({"action": "capture", "text": "abandon"})
    assert sent1 is True

    time.sleep(0.08)
    qapp.processEvents()
    assert len(received_msgs) == 1
    assert received_msgs[0] == ("capture", "abandon")

    # Test sending show_floating
    sent2 = send_ipc_message({"action": "show_floating"})
    assert sent2 is True

    time.sleep(0.08)
    qapp.processEvents()
    assert len(received_msgs) == 2
    assert received_msgs[1] == ("show_floating", "")

    server.stop()
