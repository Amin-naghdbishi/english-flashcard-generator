#!/usr/bin/env bash
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_APP_NAME="Flashcard-Generator-v1.0.7"
APP_NAME="${APPIMAGE_NAME:-$DEFAULT_APP_NAME}"
TARGET_ARCH="${ARCH:-x86_64}"
HOST_ARCH="$(uname -m)"
NODE_VERSION="v20.18.0"

echo "=================================================="
echo "  Building Linux AppImage for Flashcard Generator"
echo "  Target AppImage:     ${APP_NAME}.AppImage"
echo "  Target Architecture: $TARGET_ARCH"
echo "  Host Architecture:   $HOST_ARCH"
echo "=================================================="

# 1. Ensure icons exist
if [ ! -f "$SCRIPT_DIR/flashcard-generator.png" ] || [ ! -f "$SCRIPT_DIR/flashcard-generator.svg" ]; then
  echo "Generating application icons..."
  node "$SCRIPT_DIR/generate-icon.cjs"
fi

# 2. Build the web app and server bundle
echo "Building production application bundle..."
cd "$ROOT_DIR"
npm run build

# 3. Clean and prepare AppDir structure
APPDIR="$SCRIPT_DIR/AppDir"
echo "Setting up AppDir at $APPDIR..."
rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/bin"
mkdir -p "$APPDIR/usr/share/applications"
mkdir -p "$APPDIR/usr/share/icons/hicolor/256x256/apps"
mkdir -p "$APPDIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$APPDIR/usr/share/flashcard-generator/dist"
mkdir -p "$APPDIR/usr/share/flashcard-generator/node_modules"

# 4. Copy Desktop file, AppRun, and Icons
cp "$SCRIPT_DIR/AppRun" "$APPDIR/AppRun"
chmod +x "$APPDIR/AppRun"

cp "$SCRIPT_DIR/flashcard-generator.desktop" "$APPDIR/flashcard-generator.desktop"
cp "$SCRIPT_DIR/flashcard-generator.desktop" "$APPDIR/usr/share/applications/flashcard-generator.desktop"

cp "$SCRIPT_DIR/flashcard-generator.png" "$APPDIR/flashcard-generator.png"
cp "$SCRIPT_DIR/flashcard-generator.png" "$APPDIR/.DirIcon"
cp "$SCRIPT_DIR/flashcard-generator.png" "$APPDIR/usr/share/icons/hicolor/256x256/apps/flashcard-generator.png"
cp "$SCRIPT_DIR/flashcard-generator.svg" "$APPDIR/usr/share/icons/hicolor/scalable/apps/flashcard-generator.svg"

# 5. Copy built application distribution
echo "Copying compiled dist files into AppDir..."
cp -r "$ROOT_DIR/dist" "$APPDIR/usr/share/flashcard-generator/"
cp "$ROOT_DIR/package.json" "$APPDIR/usr/share/flashcard-generator/"

# 7. Provide launcher in usr/bin
cat << 'LAUNCHER_EOF' > "$APPDIR/usr/bin/flashcard-generator"
#!/bin/sh
exec "$APPDIR/AppRun" "$@"
LAUNCHER_EOF
chmod +x "$APPDIR/usr/bin/flashcard-generator"

# 8. Bundle Standalone Node.js binary for target architecture
echo "Setting up Node.js runtime for $TARGET_ARCH..."
CACHE_DIR="$SCRIPT_DIR/cache"
mkdir -p "$CACHE_DIR"

if [ "$TARGET_ARCH" = "x86_64" ]; then
  NODE_TARBALL="node-${NODE_VERSION}-linux-x64.tar.xz"
  NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TARBALL}"
  
  if [ ! -f "$CACHE_DIR/$NODE_TARBALL" ]; then
    echo "Downloading Node.js x64 runtime from $NODE_URL..."
    curl -sSL "$NODE_URL" -o "$CACHE_DIR/$NODE_TARBALL"
  fi
  
  echo "Extracting x86_64 Node.js binary..."
  tar -xJf "$CACHE_DIR/$NODE_TARBALL" -C "$CACHE_DIR" --strip-components=2 "node-${NODE_VERSION}-linux-x64/bin/node"
  cp "$CACHE_DIR/node" "$APPDIR/usr/bin/node"
  chmod +x "$APPDIR/usr/bin/node"
elif [ "$TARGET_ARCH" = "aarch64" ] || [ "$TARGET_ARCH" = "arm64" ]; then
  if [ "$HOST_ARCH" = "aarch64" ] && command -v node >/dev/null 2>&1; then
    cp "$(command -v node)" "$APPDIR/usr/bin/node"
  else
    NODE_TARBALL="node-${NODE_VERSION}-linux-arm64.tar.xz"
    NODE_URL="https://nodejs.org/dist/${NODE_VERSION}/${NODE_TARBALL}"
    if [ ! -f "$CACHE_DIR/$NODE_TARBALL" ]; then
      echo "Downloading Node.js arm64 runtime..."
      curl -sSL "$NODE_URL" -o "$CACHE_DIR/$NODE_TARBALL"
    fi
    tar -xJf "$CACHE_DIR/$NODE_TARBALL" -C "$CACHE_DIR" --strip-components=2 "node-${NODE_VERSION}-linux-arm64/bin/node"
    cp "$CACHE_DIR/node" "$APPDIR/usr/bin/node"
  fi
  chmod +x "$APPDIR/usr/bin/node"
fi

# 9. Obtain appimagetool
TOOLS_DIR="$SCRIPT_DIR/tools"
mkdir -p "$TOOLS_DIR"

APPIMAGETOOL=""
if command -v appimagetool >/dev/null 2>&1; then
  APPIMAGETOOL="appimagetool"
elif [ -x "$TOOLS_DIR/appimagetool" ]; then
  APPIMAGETOOL="$TOOLS_DIR/appimagetool"
else
  echo "Downloading appimagetool for host ($HOST_ARCH)..."
  AI_URL="https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-${HOST_ARCH}.AppImage"
  curl -sSL "$AI_URL" -o "$TOOLS_DIR/appimagetool" || \
  curl -sSL "https://github.com/AppImageCommunity/appimagetool/releases/download/continuous/appimagetool-${HOST_ARCH}.AppImage" -o "$TOOLS_DIR/appimagetool"
  chmod +x "$TOOLS_DIR/appimagetool"
  APPIMAGETOOL="$TOOLS_DIR/appimagetool"
fi

# 10. Generate AppImage
OUTPUT_NAME="${APP_NAME}.AppImage"
OUTPUT_PATH="$ROOT_DIR/$OUTPUT_NAME"
rm -f "$OUTPUT_PATH"

echo "Building AppImage package: $OUTPUT_NAME..."
export ARCH="$TARGET_ARCH"

if [ -n "$APPIMAGE_EXTRACT_AND_RUN" ] || [ ! -e /dev/fuse ] || [ -f /.dockerenv ]; then
  "$APPIMAGETOOL" --appimage-extract-and-run "$APPDIR" "$OUTPUT_PATH"
else
  "$APPIMAGETOOL" --appimage-extract-and-run "$APPDIR" "$OUTPUT_PATH" || "$APPIMAGETOOL" "$APPDIR" "$OUTPUT_PATH"
fi

if [ -f "$OUTPUT_PATH" ]; then
  chmod +x "$OUTPUT_PATH"
  SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)
  echo ""
  echo "=================================================="
  echo "  AppImage successfully created!"
  echo "  File: $OUTPUT_NAME ($SIZE)"
  echo "  Location: $OUTPUT_PATH"
  echo "=================================================="
else
  echo "Error: Failed to produce $OUTPUT_PATH" >&2
  exit 1
fi
