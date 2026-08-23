import pytest
from unittest.mock import patch, MagicMock

from app.gnome_helper import (
    normalize_to_gnome_shortcut,
    is_gnome_environment,
    get_desktop_environment_name,
    get_display_session_type,
    check_gnome_status,
    apply_gnome_shortcut,
)

def test_normalize_to_gnome_shortcut():
    assert normalize_to_gnome_shortcut("<ctrl>+<alt>+v") == "<Control><Alt>v"
    assert normalize_to_gnome_shortcut("Ctrl+Alt+V") == "<Control><Alt>v"
    assert normalize_to_gnome_shortcut("<super>+v") == "<Super>v"
    assert normalize_to_gnome_shortcut("Ctrl+Shift+X") == "<Control><Shift>x"

def test_desktop_environment_detection():
    with patch.dict("os.environ", {"XDG_CURRENT_DESKTOP": "GNOME", "XDG_SESSION_TYPE": "wayland"}):
        assert is_gnome_environment() is True
        assert get_desktop_environment_name() == "GNOME"
        assert get_display_session_type() == "Wayland"

    with patch.dict("os.environ", {"XDG_CURRENT_DESKTOP": "niri", "XDG_SESSION_TYPE": "wayland"}, clear=True):
        assert is_gnome_environment() is False
        assert get_desktop_environment_name() == "Niri"
        assert get_display_session_type() == "Wayland"

def test_check_gnome_status():
    with patch("shutil.which", return_value="/usr/bin/gsettings"):
        with patch("app.gnome_helper.is_gnome_environment", return_value=True):
            status = check_gnome_status("<ctrl>+<alt>+v")
            assert status["is_gnome"] is True
            assert status["gsettings_available"] is True
            assert status["target_keybind"] == "<Control><Alt>v"

def test_apply_gnome_shortcut_no_gsettings():
    with patch("shutil.which", return_value=None):
        success, msg = apply_gnome_shortcut()
        assert success is False
        assert "gsettings" in msg
