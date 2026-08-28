#!/usr/bin/env python3
import sys
import os
from pathlib import Path

# Ensure local libs directory is in LD_LIBRARY_PATH if present
current_dir = Path(__file__).resolve().parent
local_libs = current_dir / "libs"

if local_libs.exists():
    found_libs = []
    for p in local_libs.rglob("*"):
        if p.is_dir() and (p.name == "lib" or "linux-gnu" in p.name):
            found_libs.append(str(p))
    if found_libs:
        joined_libs = ":".join(found_libs)
        existing_ld = os.environ.get("LD_LIBRARY_PATH", "")
        if joined_libs not in existing_ld:
            os.environ["LD_LIBRARY_PATH"] = joined_libs + (":" + existing_ld if existing_ld else "")
            if not os.environ.get("_VC_RELOADED"):
                os.environ["_VC_RELOADED"] = "1"
                try:
                    os.execv(sys.executable, [sys.executable] + sys.argv)
                except Exception:
                    pass

# Add vocabulary-capture directory to sys.path
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

# Check for CLI IPC delegation
args = sys.argv[1:]
if "--capture" in args or "--trigger" in args:
    from app.capture_service import capture_selected_text_fast
    from app.ipc import send_ipc_message
    text = capture_selected_text_fast()
    # Try sending to running background instance
    if send_ipc_message({"action": "capture", "text": text}):
        sys.exit(0)

elif "--floating" in args:
    from app.ipc import send_ipc_message
    if send_ipc_message({"action": "show_floating"}):
        sys.exit(0)

elif "--dashboard" in args:
    from app.ipc import send_ipc_message
    if send_ipc_message({"action": "show_dashboard"}):
        sys.exit(0)

from app.main import main

if __name__ == "__main__":
    main()
