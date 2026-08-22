# Vocabulary Capture

**Vocabulary Capture** is a standalone, lightweight Linux desktop utility designed for rapid word/sentence capture, streaming AI vocabulary explanations, and local Piper Text-to-Speech (TTS) reading.

It runs continuously in the background with a system tray icon, integrates seamlessly with Wayland compositors (especially **Niri**, Hyprland, and Sway) as well as X11 desktop environments, and saves structured flashcards to TXT files.

---

## Key Features

- **Niri & Wayland Optimized**:
  - Compact, fixed-size floating overlay (`380×480px`) with Dialog window hints.
  - Native Niri window rules and keybindings support so the window floats cleanly over your active workspaces instead of tiling.
  - Wayland Primary Selection (`wl-paste -p`) captures mouse-highlighted words/sentences instantly across Firefox, Chrome, PDF readers, and terminals.
- **Instant Global Shortcut via IPC**:
  - Pressing your shortcut triggers `run.sh --capture`, which grabs the selection and communicates with the running background daemon over a local Unix domain socket.
- **True Streaming AI Assistant (Multi-Provider Router)**:
  - Token-by-token streaming output (no waiting for complete response).
  - Supports **Ollama** (local), **Google Gemini**, and **OpenAI-Compatible / 9Router / Groq / vLLM / Custom** endpoints.
  - Configurable prompts: Default System Prompt, Vocabulary Prompt (with `{text}`), Sentence Translation Prompt, and Custom Formatting.
- **Local Piper TTS Integration**:
  - Connects to your local Piper HTTP server (`http://127.0.0.1:5000`).
  - Read aloud (🔊) button in the floating window for instant pronunciation.
  - Configurable voice detection, connection testing, and numerical speech speed (`length_scale`).
- **Persistent Floating Window**:
  - Minimal Anki-inspired dark and light themes.
  - No bloated title bars or application titles — only a small close (`×`) button.
  - **Never auto-closes**: stays alive during tab switches, file creation, and word entry until explicitly closed.
- **TXT Vocabulary Capture**:
  - **Format A**: Simple word list (`english words (A).txt`).
  - **Format B**: Structured flashcard records (`english B1 (B).txt`) strictly omitting unused/empty fields.
  - Format determined exclusively from filename tag (`(A)` or `(B)`).

---

## Directory Layout

```
vocabulary-capture/
├── app/
│   ├── __init__.py
│   ├── ai_service.py         # Multi-provider streaming AI router (Ollama, Gemini, OpenAI)
│   ├── capture_service.py    # Wayland/X11 primary selection & clipboard capture
│   ├── config.py             # Configuration dataclasses & persistence
│   ├── ipc.py                # Unix domain socket server & client for Wayland triggers
│   ├── main.py               # Main application coordinator & background loop
│   ├── theme.py              # Anki-inspired Dark & Light QSS stylesheets
│   ├── tts_service.py        # Local Piper TTS HTTP client & audio player
│   ├── txt_manager.py        # Format A/B reader, writer, and validator
│   └── ui/
│       ├── __init__.py
│       ├── dashboard_window.py # Multi-tab settings (General, Providers, Prompts, TTS, Themes)
│       ├── floating_window.py  # Compact floating capture window with streaming & TTS
│       └── tray_icon.py        # System tray icon & context menu
├── config/
│   └── config.json           # Application settings
├── txt/                      # Configurable TXT vocabulary storage directory
│   ├── english words (A).txt
│   └── english B1 (B).txt
├── tests/                    # Independent unit & GUI test suite
│   ├── test_ai_service.py
│   ├── test_config.py
│   ├── test_gui.py
│   ├── test_ipc.py
│   ├── test_tts_service.py
│   └── test_txt_manager.py
├── main.py                   # Launcher entrypoint supporting IPC delegation
├── requirements.txt          # Python dependencies
├── run.sh                    # Linux executable runner script
└── README.md
```

---

## Niri Setup & Configuration

To make Vocabulary Capture float as a small overlay and bind a global shortcut in **Niri**, add the following blocks to `~/.config/niri/config.kdl`:

### 1. Niri Floating Window Rule
```kdl
window-rule {
    match app-id="^vocabulary-capture.*"
    open-floating true
    default-column-width { fixed 380; }
    default-window-height { fixed 480; }
}
```

### 2. Niri Global Shortcut Keybind
```kdl
binds {
    // Press Mod+Ctrl+V (or your preferred shortcut) anywhere to capture selection
    Mod+Ctrl+V { spawn "/home/daEstitch/project/flashcard-generator/english-flashcard-generator/vocabulary-capture/run.sh" "--capture"; }
}
```

---

## Installation & Requirements

### 1. Prerequisites
- Python 3.10+
- (Recommended) `wl-clipboard` (`wl-paste`, `wl-copy`) on Wayland or `xclip`/`xsel` on X11.
- (Optional) Local [Ollama](https://ollama.ai/) for local AI models.
- (Optional) Local [Piper TTS](https://github.com/rhasspy/piper) HTTP server running on `http://127.0.0.1:5000`.

### 2. Set Up Virtual Environment
Inside `vocabulary-capture/`:

```bash
cd vocabulary-capture
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Running the Application

### Normal Mode (Opens Dashboard)
```bash
./run.sh
# or
python3 main.py
```

### Background / Tray Mode (Daemon)
```bash
./run.sh --background
# or
python3 main.py --tray
```

### Trigger Capture from CLI / Keybinding
```bash
./run.sh --capture
```

---

## AI Providers Configuration

Vocabulary Capture supports multiple AI backends configurable from the **AI Providers** tab in Settings:

1. **Ollama (Local)**:
   - Base URL: `http://localhost:11434`
   - Model: Select from your installed models using `[Refresh Models]` (e.g. `llama3`, `qwen2.5`, `mistral`).
2. **Google Gemini**:
   - Type: `gemini`
   - API Key: Your Gemini API Key.
   - Model: `gemini-1.5-flash` or `gemini-1.5-pro`.
3. **OpenAI / 9Router / Custom**:
   - Type: `openai_compatible`
   - Base URL: `http://localhost:8080/v1` (or your proxy / 9Router endpoint).
   - API Key: Optional / Bearer token.
   - Model: `gpt-3.5-turbo`, `llama-3.3-70b`, etc.

---

## Piper TTS Integration

1. Start your local Piper server on port 5000:
   ```bash
   python3 -m piper.http_server --model en_US-lessac-medium.onnx --port 5000
   ```
2. Open Settings -> **TTS (Piper)** tab.
3. Click `[Test Connection]` to verify the status indicator changes to **Piper ● Connected**.
4. Adjust speech speed via the **Speech Speed** spinbox (`1.00` = normal, `1.25` = 25% slower, `0.80` = faster).
5. Click `[Test Voice]` to hear the test sentence.
6. In the floating AI capture window, click the `🔊` button beside any captured word or AI response to hear it spoken.

---

## Autostart on Linux

### Method 1: Desktop Autostart Entry
Create `~/.config/autostart/vocabulary-capture.desktop`:

```ini
[Desktop Entry]
Type=Application
Name=Vocabulary Capture
Comment=Background Vocabulary Capture Utility
Exec=/home/daEstitch/project/flashcard-generator/english-flashcard-generator/vocabulary-capture/run.sh --background
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Terminal=false
```

### Method 2: Systemd User Service
Create `~/.config/systemd/user/vocabulary-capture.service`:

```ini
[Unit]
Description=Vocabulary Capture Background Service
After=graphical-session.target

[Service]
Type=simple
WorkingDirectory=/home/daEstitch/project/flashcard-generator/english-flashcard-generator/vocabulary-capture
ExecStart=/home/daEstitch/project/flashcard-generator/english-flashcard-generator/vocabulary-capture/run.sh --background
Restart=on-failure

[Install]
WantedBy=default.target
```

Enable and start:
```bash
systemctl --user daemon-reload
systemctl --user enable --now vocabulary-capture.service
```

---

## Running Tests

Run the full test suite independently:

```bash
cd vocabulary-capture
./run.sh -m pytest tests/ -v
# or
.venv/bin/pytest tests/ -v
```
