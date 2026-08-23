import os
import shutil
import subprocess
import re
from pathlib import Path
from typing import Dict, Any, Tuple, Optional, List

def is_gnome_environment() -> bool:
    """
    Detects if running under GNOME desktop environment.
    """
    desktop = os.environ.get("XDG_CURRENT_DESKTOP", "").lower()
    session = os.environ.get("DESKTOP_SESSION", "").lower()
    if "gnome" in desktop or "gnome" in session or os.environ.get("GNOME_DESKTOP_SESSION_ID"):
        return True
    return False

def get_display_session_type() -> str:
    """
    Returns 'Wayland', 'X11', or 'Unknown'.
    """
    session_type = os.environ.get("XDG_SESSION_TYPE", "").lower()
    if "wayland" in session_type or os.environ.get("WAYLAND_DISPLAY"):
        return "Wayland"
    if "x11" in session_type or os.environ.get("DISPLAY"):
        return "X11"
    return "Unknown"

def get_desktop_environment_name() -> str:
    """
    Returns 'GNOME', 'Niri', 'Hyprland', 'Sway', 'KDE', or 'Other/Unknown'.
    """
    desktop = os.environ.get("XDG_CURRENT_DESKTOP", "").lower()
    session = os.environ.get("DESKTOP_SESSION", "").lower()
    if os.environ.get("NIRI_SOCKET") or "niri" in desktop or "niri" in session:
        return "Niri"
    if "gnome" in desktop or "gnome" in session or os.environ.get("GNOME_DESKTOP_SESSION_ID"):
        return "GNOME"
    if "hyprland" in desktop:
        return "Hyprland"
    if "sway" in desktop:
        return "Sway"
    if "kde" in desktop or "plasma" in desktop:
        return "KDE"
    return desktop.upper() if desktop else "Unknown"

def normalize_to_gnome_shortcut(shortcut_str: str) -> str:
    """
    Converts shortcut formats like '<ctrl>+<alt>+v' or 'ctrl+alt+v' to GNOME format '<Control><Alt>v'.
    """
    s = shortcut_str.strip()
    s = s.replace("<", "").replace(">", "")
    parts = [p.strip() for p in s.split("+") if p.strip()]
    
    gnome_parts = []
    key = ""
    for p in parts:
        p_low = p.lower()
        if p_low in ("ctrl", "control"):
            gnome_parts.append("<Control>")
        elif p_low in ("alt", "mod1"):
            gnome_parts.append("<Alt>")
        elif p_low in ("shift",):
            gnome_parts.append("<Shift>")
        elif p_low in ("super", "mod", "mod4", "win", "meta"):
            gnome_parts.append("<Super>")
        else:
            key = p.lower() if len(p) == 1 else p
            
    return "".join(gnome_parts) + (key or "v")

def get_run_script_path() -> Path:
    return Path(__file__).resolve().parent.parent / "run.sh"

def check_gnome_status(shortcut_str: str = "<ctrl>+<alt>+v") -> Dict[str, Any]:
    """
    Checks if GNOME custom keybinding exists via gsettings.
    """
    gsettings_available = shutil.which("gsettings") is not None
    is_gnome = is_gnome_environment()
    has_keybind = False
    current_keybind = None
    binding_path = ""

    if gsettings_available and is_gnome:
        try:
            cmd = ["gsettings", "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=2.0)
            if res.returncode == 0:
                raw_bindings = res.stdout.strip()
                # Parse paths like ['/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom0/']
                paths = re.findall(r"['\"]([^'\"]+)['\"]", raw_bindings)
                for p in paths:
                    c_cmd = subprocess.run(
                        ["gsettings", "get", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{p}", "command"],
                        capture_output=True, text=True, timeout=1.0
                    )
                    if c_cmd.returncode == 0 and "vocabulary-capture" in c_cmd.stdout:
                        has_keybind = True
                        binding_path = p
                        b_cmd = subprocess.run(
                            ["gsettings", "get", f"org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{p}", "binding"],
                            capture_output=True, text=True, timeout=1.0
                        )
                        if b_cmd.returncode == 0:
                            current_keybind = b_cmd.stdout.strip().strip("'\"")
                        break
        except Exception:
            pass

    return {
        "is_gnome": is_gnome,
        "gsettings_available": gsettings_available,
        "has_keybind": has_keybind,
        "current_keybind": current_keybind,
        "target_keybind": normalize_to_gnome_shortcut(shortcut_str),
        "binding_path": binding_path,
        "run_script": str(get_run_script_path()),
    }

def apply_gnome_shortcut(shortcut_str: str = "<ctrl>+<alt>+v") -> Tuple[bool, str]:
    """
    Creates or updates a custom keybinding in GNOME settings using gsettings.
    """
    if not shutil.which("gsettings"):
        return False, "'gsettings' command is not available on this system."

    gnome_key = normalize_to_gnome_shortcut(shortcut_str)
    run_script = get_run_script_path()
    cmd_str = f'"{run_script}" --capture'
    base_schema = "org.gnome.settings-daemon.plugins.media-keys"
    custom_schema = "org.gnome.settings-daemon.plugins.media-keys.custom-keybinding"

    try:
        # 1. Get existing custom-keybindings list
        res = subprocess.run(["gsettings", "get", base_schema, "custom-keybindings"], capture_output=True, text=True, timeout=2.0)
        raw_list = res.stdout.strip()
        paths = re.findall(r"['\"]([^'\"]+)['\"]", raw_list)

        target_path = None
        # Check if vocabulary-capture binding already exists
        for p in paths:
            c_res = subprocess.run(["gsettings", "get", f"{custom_schema}:{p}", "name"], capture_output=True, text=True, timeout=1.0)
            if c_res.returncode == 0 and "Vocabulary Capture" in c_res.stdout:
                target_path = p
                break

        if not target_path:
            # Create a unique custom path
            custom_id = 0
            while True:
                candidate = f"/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/custom_vc{custom_id}/"
                if candidate not in paths:
                    target_path = candidate
                    break
                custom_id += 1

            paths.append(target_path)
            # Update keybinding list in gsettings
            formatted_paths = "[" + ", ".join([f"'{p}'" for p in paths]) + "]"
            subprocess.run(["gsettings", "set", base_schema, "custom-keybindings", formatted_paths], check=True, timeout=2.0)

        # 2. Set name, command, and binding on the custom schema
        subprocess.run(["gsettings", "set", f"{custom_schema}:{target_path}", "name", "'Vocabulary Capture'"], check=True, timeout=2.0)
        subprocess.run(["gsettings", "set", f"{custom_schema}:{target_path}", "command", f"'{cmd_str}'"], check=True, timeout=2.0)
        subprocess.run(["gsettings", "set", f"{custom_schema}:{target_path}", "binding", f"'{gnome_key}'"], check=True, timeout=2.0)

        return True, f"Successfully registered GNOME shortcut '{gnome_key}' to execute {cmd_str}"
    except Exception as e:
        return False, f"Failed to configure GNOME shortcut via gsettings: {e}"
