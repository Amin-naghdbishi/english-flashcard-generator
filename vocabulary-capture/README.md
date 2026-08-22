# Vocabulary Capture

**Vocabulary Capture** is a standalone, lightweight Linux desktop utility designed for rapid word/sentence capture and AI-assisted vocabulary expansion. It runs continuously in the background with a system tray icon, listens for a global shortcut, captures selected text from any browser or desktop application, and lets you either query a local AI model (Ollama) or append structured vocabulary records to TXT files.

---

## Key Features

- **Background Daemon & System Tray**: Runs in the background without cluttering your taskbar. Closing the Dashboard keeps the app active in the system tray.
- **Global Text Capture**: Highlight text in Firefox, Chrome, PDF readers, or text editors, press the shortcut (`<ctrl>+<alt>+v` by default), and the floating window immediately pops up with the selection.
- **Persistent Anki-Inspired Floating Window**:
  - Extremely compact, minimal, and flat design.
  - Light and Dark modes (`anki-dark`, `anki-light`).
  - No bloated title bars or application titles — only a small close (`×`) button.
  - **Never auto-closes**: stays alive during tab switches, file creation, and word entry.
- **Tab 1: AI Assistant**:
  - Connects to local **Ollama** (`http://localhost:11434`).
  - Automatic English word analysis (phonetics, Persian meaning, definitions, example sentences) or sentence translation.
  - Compact multi-turn follow-up question chat.
- **Tab 2: Add to TXT**:
  - **Format A**: Simple word list (`english words (A).txt`).
  - **Format B**: Structured flashcard records (`english B1 (B).txt`).
  - **Format Detection**: Determined strictly by the filename tag (`(A)` or `(B)`).
  - **Empty Field Omission**: In Format B, unused/empty fields are strictly omitted from the file.
  - In-window TXT file search and instant new file creation (`+`) without opening the OS file manager.
- **Keyboard-Driven Workflow**:
  - Switch tabs with `1` / `2` or `Left Arrow` / `Right Arrow`.

---

## Directory Layout

```
vocabulary-capture/
├── app/
│   ├── __init__.py
│   ├── ai_service.py         # Ollama API client & prompt handlers
│   ├── capture_service.py    # Global hotkey & clipboard capture
│   ├── config.py             # Configuration management
│   ├── main.py               # Application coordinator & event loop
│   ├── theme.py              # Anki-inspired Dark and Light QSS themes
│   ├── txt_manager.py        # Format A/B reader, writer, and validator
│   └── ui/
│       ├── __init__.py
│       ├── dashboard_window.py # Settings & configuration window
│       ├── floating_window.py  # Minimal persistent floating capture window
│       └── tray_icon.py        # System tray icon & context menu
├── config/
│   └── config.json           # Application settings
├── txt/                      # Default vocabulary storage directory
│   ├── english words (A).txt
│   └── english B1 (B).txt
├── tests/                    # Independent test suite
│   ├── test_ai_service.py
│   ├── test_config.py
│   ├── test_gui.py
│   └── test_txt_manager.py
├── main.py                   # Main bootstrap entrypoint
├── requirements.txt          # Python dependencies
├── run.sh                    # Linux executable runner script
└── README.md
```

---

## Installation

### 1. Prerequisites
- Python 3.10+
- (Optional) Local [Ollama](https://ollama.ai/) running for local AI capabilities.
- Linux system with X11 or Wayland (`xclip` or `wl-clipboard` for clipboard capture).

### 2. Set Up Virtual Environment & Dependencies
Inside the `vocabulary-capture/` directory:

```bash
cd vocabulary-capture
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

---

## Running the Application

### Normal Mode (Opens Settings Dashboard)
```bash
./run.sh
# or
python3 main.py
```

### Background / Tray Mode
To start minimized directly in the system tray:
```bash
./run.sh --background
# or
python3 main.py --tray
```

### Floating Window Mode
To start and open the floating capture window immediately:
```bash
./run.sh --floating
```

---

## Usage Guide

### 1. Capturing Text
1. Highlight any word or sentence in your web browser or application.
2. Press the global shortcut: `Ctrl + Alt + V` (configurable in Settings).
3. The floating window appears instantly with your selected text.

### 2. Using Tab 1 — AI Assistant
- Click **Meaning** to analyze single words (IPA, Persian translation, English definition, examples).
- Click **Translate** to translate full sentences to Persian.
- Type any question into the input box below and click **Ask** (or press `Enter`) for follow-up answers.

### 3. Using Tab 2 — Add to TXT

#### Format A (Word List)
- Click **A** in the TXT toolbar.
- Only Format A files (`*(A).txt`) are listed.
- Click any file to immediately append the word.

#### Format B (Structured Records)
- Click **B** in the TXT toolbar.
- Only Format B files (`*(B).txt`) are listed.
- Click a file to open the record fields.
- Enter required fields (**Word**, **Deck**) and any optional fields (**Persian Meaning**, **Phonetic**, **Part of Speech**, **Example Sentence**, **Example Translation**, **Memory Aid**, **Photo**, **Spelling**).
- Click **Add to TXT File**.
- Empty fields are completely omitted from the resulting TXT file.

#### Creating New TXT Files
- Click the `+` button in the TXT tab.
- Enter a name (e.g. `medical terms`) and choose **Format A** or **Format B**.
- The file is created automatically as `medical terms (A).txt` or `medical terms (B).txt` in your configured TXT directory.

---

## File Format Specifications

### Format A
Plain text, one word or phrase per line:
```
apple
bank
photo
abandon
```

### Format B
Structured records separated by `--`. Empty fields are never written:
```
--
Word=abandon
Deck=English::B1
Persian Meaning=رها کردن
--
--
Word=remarkable
Deck=English::B2
Example Sentence=This is remarkable.
--
```

---

## Configuration

Settings are saved in `config/config.json`:

```json
{
  "global_shortcut": "<ctrl>+<alt>+v",
  "txt_directory": "txt",
  "ai_provider": "ollama",
  "ollama_url": "http://localhost:11434",
  "ollama_model": "llama3",
  "default_deck": "English::B1",
  "show_tabs": true,
  "theme": "anki-dark",
  "stay_on_top": true,
  "window_width": 380,
  "window_height": 480,
  "auto_trigger_meaning": false
}
```

---

## Autostart on Linux

### Method 1: Desktop Autostart Entry (Recommended)
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

Enable and start the service:
```bash
systemctl --user daemon-reload
systemctl --user enable --now vocabulary-capture.service
```

---

## Running Tests

Run the test suite independently using pytest:

```bash
cd vocabulary-capture
./run.sh -m pytest tests/ -v
# or
.venv/bin/pytest tests/ -v
```
