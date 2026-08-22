import os
import shutil
import re
from pathlib import Path
from typing import Dict, Any, Tuple, Optional

def get_niri_config_path() -> Path:
    xdg_config = os.environ.get("XDG_CONFIG_HOME")
    if xdg_config:
        return Path(xdg_config) / "niri" / "config.kdl"
    return Path.home() / ".config" / "niri" / "config.kdl"

def is_niri_environment() -> bool:
    if os.environ.get("NIRI_SOCKET"):
        return True
    if os.environ.get("XDG_CURRENT_DESKTOP", "").lower() == "niri":
        return True
    if os.environ.get("DESKTOP_SESSION", "").lower() == "niri":
        return True
    return get_niri_config_path().exists()

def normalize_to_niri_shortcut(shortcut_str: str) -> str:
    """
    Converts shortcut formats like '<ctrl>+<alt>+v' or 'ctrl+alt+v' to Niri 'Ctrl+Alt+V' format.
    """
    s = shortcut_str.strip().lower()
    s = s.replace("<", "").replace(">", "")
    parts = [p.strip() for p in s.split("+") if p.strip()]
    
    niri_parts = []
    for p in parts:
        if p in ("ctrl", "control"):
            niri_parts.append("Ctrl")
        elif p in ("alt", "mod1"):
            niri_parts.append("Alt")
        elif p in ("shift",):
            niri_parts.append("Shift")
        elif p in ("super", "mod", "mod4", "win", "meta"):
            niri_parts.append("Mod")
        else:
            niri_parts.append(p.upper() if len(p) == 1 else p.capitalize())
            
    return "+".join(niri_parts) if niri_parts else "Ctrl+Alt+V"

def get_run_script_path() -> Path:
    return Path(__file__).resolve().parent.parent / "run.sh"

def generate_niri_config_snippet(shortcut_str: str = "<ctrl>+<alt>+v") -> str:
    niri_key = normalize_to_niri_shortcut(shortcut_str)
    run_script = get_run_script_path()
    
    return f"""// --- Vocabulary Capture Niri Configuration ---
// 1. Floating window rule for Vocabulary Capture
window-rule {{
    match app-id="^vocabulary-capture.*"
    open-floating true
    default-column-width {{ fixed 380; }}
    default-window-height {{ fixed 480; }}
}}

// 2. Global shortcut to capture selected text anywhere
binds {{
    {niri_key} {{ spawn "{run_script}" "--capture"; }}
}}
// --- End Vocabulary Capture ---"""

def check_niri_status(shortcut_str: str = "<ctrl>+<alt>+v") -> Dict[str, Any]:
    cfg_path = get_niri_config_path()
    cfg_exists = cfg_path.exists()
    has_window_rule = False
    has_keybind = False
    current_keybind = None
    
    if cfg_exists:
        try:
            content = cfg_path.read_text(encoding="utf-8")
            if "vocabulary-capture" in content and "open-floating" in content:
                has_window_rule = True
            
            # Check for spawn run.sh --capture or main.py --capture
            match = re.search(r'([A-Za-z0-9\+\-_]+)\s*\{\s*spawn\s*["\'][^"\']*(?:vocabulary-capture|run\.sh|main\.py)[^"\']*--capture["\'];\s*\}', content)
            if match:
                has_keybind = True
                current_keybind = match.group(1).strip()
        except Exception:
            pass

    return {
        "is_niri": is_niri_environment(),
        "config_path": str(cfg_path),
        "config_exists": cfg_exists,
        "has_window_rule": has_window_rule,
        "has_keybind": has_keybind,
        "current_keybind": current_keybind,
        "target_keybind": normalize_to_niri_shortcut(shortcut_str),
        "run_script": str(get_run_script_path()),
    }

def apply_niri_config(shortcut_str: str = "<ctrl>+<alt>+v") -> Tuple[bool, str]:
    cfg_path = get_niri_config_path()
    snippet = generate_niri_config_snippet(shortcut_str)
    
    try:
        cfg_path.parent.mkdir(parents=True, exist_ok=True)
        if cfg_path.exists():
            # Backup
            bak_path = cfg_path.with_suffix(".kdl.bak")
            shutil.copy2(cfg_path, bak_path)
            content = cfg_path.read_text(encoding="utf-8")
            
            # If our section already exists, replace it
            pattern = r'// --- Vocabulary Capture Niri Configuration ---.*?// --- End Vocabulary Capture ---'
            if re.search(pattern, content, re.DOTALL):
                new_content = re.sub(pattern, snippet, content, flags=re.DOTALL)
            else:
                new_content = content.rstrip() + "\n\n" + snippet + "\n"
                
            cfg_path.write_text(new_content, encoding="utf-8")
        else:
            cfg_path.write_text(snippet + "\n", encoding="utf-8")
            
        return True, f"Successfully applied Niri configuration to {cfg_path}"
    except Exception as e:
        return False, f"Failed to write Niri config: {e}"
