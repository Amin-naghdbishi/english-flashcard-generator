#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Add local shared libraries to LD_LIBRARY_PATH if present
if [ -d "$DIR/libs" ]; then
    LIB_PATHS=$(find "$DIR/libs" -type d \( -name "lib" -o -name "*linux-gnu*" \) | tr '\n' ':')
    export LD_LIBRARY_PATH="$LIB_PATHS$LD_LIBRARY_PATH"
fi

# Add directory to PYTHONPATH
export PYTHONPATH="$DIR:$PYTHONPATH"

# Use virtual environment python if present
if [ -f "$DIR/.venv/bin/python3" ]; then
    PYTHON_EXEC="$DIR/.venv/bin/python3"
else
    PYTHON_EXEC="python3"
fi

exec "$PYTHON_EXEC" "$DIR/main.py" "$@"
