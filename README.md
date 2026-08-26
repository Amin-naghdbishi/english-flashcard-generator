# Local AI English Flashcard Generator

A real, local-first vocabulary flashcard generator with **Ollama / Gemini / OpenRouter AI**, **Piper / Online TTS audio synthesis**, **Card Themes (Hero Pop, Duo Quest, Story Strip, Index Notebook, Arcade Retro, Minimal)**, and direct **AnkiConnect** synchronization.

```text
Word → AI Provider (Structured JSON) → Piper TTS (WAV) → Card Theme → AnkiConnect (Exact HTML/CSS Note)
```

---

## 📦 Linux AppImage (Standalone Executable)

You can run the application directly on Linux without installing Node.js:

1. Download **`FlashcardGenerator-x86_64.AppImage`** from the [GitHub Releases](https://github.com/Amin-naghdbishi/english-flashcard-generator/releases) page.
2. Make it executable and run:

```bash
chmod +x FlashcardGenerator-x86_64.AppImage
./FlashcardGenerator-x86_64.AppImage
```

The AppImage will launch the background server and open the web interface in your default browser at `http://localhost:3000`.

### ⚙️ Command-Line Options
```bash
./FlashcardGenerator-x86_64.AppImage --port 4000     # Run on a custom port
./FlashcardGenerator-x86_64.AppImage --no-browser   # Run headless without auto-opening browser
./FlashcardGenerator-x86_64.AppImage --help         # Show help and external connection URLs
```

> [!NOTE]
> **External Services**: External tools such as **Ollama** (`http://127.0.0.1:11434`), **Piper TTS** (`http://127.0.0.1:5000`), and **Anki / AnkiConnect** (`http://127.0.0.1:8765`) are **not bundled** inside the AppImage. The application connects to these external services when they are running on your computer or local network.

---

## 🚀 Quick Start & Setup Guide

### 1. Install & Run Ollama
Install and start Ollama on your machine:
```bash
# Linux / macOS
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama server
ollama serve

# Pull vocabulary model (e.g. Qwen 2.5/3, Gemma, or Llama)
ollama pull qwen3:4b
# or
ollama pull gemma3:4b
```
*Default URL:* `http://127.0.0.1:11434`

---

### 2. Install Anki & AnkiConnect Addon
1. Download and run **Anki** from [apps.ankiweb.net](https://apps.ankiweb.net/).
2. In Anki, go to **Tools → Add-ons → Get Add-ons...**
3. Enter Add-on Code: `2055492159` (**AnkiConnect**)
4. Restart Anki.
*Default AnkiConnect URL:* `http://127.0.0.1:8765`

---

### 3. Configure Kokoro Offline TTS
Kokoro (82M parameter lightweight open-weight model) generates verified 16-bit PCM WAV audio offline for the target word and example sentence.
```bash
# Optional Kokoro python runtime
pip install kokoro-onnx soundfile
```
*Default TTS Endpoint:* `http://127.0.0.1:8880`

---

### 4. Launch Flashcard Application
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🎨 Themes & Template Fidelity

Cards use a **Classic Comic Theme** (Dark & Light) featuring:
- Sharp 2px/3px ink borders
- Vibrant pop-art badges (`#facc15` Yellow, `#38bdf8` Sky, `#4ade80` Green, `#fb923c` Orange, `#c084fc` Purple)
- Persian meaning & RTL layout support
- Embedded pronunciation and sentence audio triggers
- 100% Template Fidelity: The live preview in the app renders the **exact same HTML template & CSS** installed into Anki.

---

## 📁 Architecture Overview

```text
Application
│
├── UI Layer (React + Tailwind CSS)
│   ├── NavigationStrip (Connected 3-Color Strip: CREATE | BATCH | SETTINGS)
│   ├── CreateCardView (Single word creation with live pipeline progress)
│   ├── BatchCardView (TXT upload, preflight checks, independent word processing)
│   ├── SettingsView (AI, Kokoro TTS, AnkiConnect, Appearance & Diagnostics)
│   └── CardPreview (Exact template and CSS preview with live audio)
│
├── Server Layer (Express + Node.js)
│   ├── OllamaProvider (Structured output, JSON schema enforcement, User Data Priority)
│   ├── KokoroTTSProvider (5-step diagnostics, WAV header verification, PCM audio)
│   ├── AnkiConnectProvider (Model creation, media uploads, note creation)
│   └── WavHelper (Validates RIFF PCM headers, sample rate, channels, duration)
│
└── Themes
    ├── Comic Dark (Deep ink panels, high contrast)
    └── Comic Light (Warm comic paper, crisp black ink outlines)
```

---

## 🧪 Real Verification Guarantee

- **No Mocks**: Every status is a real test against local endpoints.
- **WAV Validation**: Every audio file is checked for valid RIFF headers, valid sample rate, and duration > 0s before note creation.
- **User Data Priority**: If the user inputs a manual override (meaning, phonetic, example), AI **never** overwrites the user's data.
