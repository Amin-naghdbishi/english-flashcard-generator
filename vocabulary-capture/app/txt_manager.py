import re
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union

class TXTFormat:
    A = "A"
    B = "B"
    UNKNOWN = "UNKNOWN"

def detect_format_from_filename(filename_or_path: Union[str, Path]) -> str:
    """
    Format detection MUST NOT inspect the file contents.
    Format is determined exclusively by the filename.
    Files ending with '(A).txt' or similar -> Format A
    Files ending with '(B).txt' or similar -> Format B
    """
    name = Path(filename_or_path).name.strip()
    
    # Check for (A).txt or [A].txt
    if re.search(r'\(\s*A\s*\)\.txt$', name, re.IGNORECASE) or re.search(r'\[\s*A\s*\]\.txt$', name, re.IGNORECASE):
        return TXTFormat.A
    
    # Check for (B).txt or [B].txt
    if re.search(r'\(\s*B\s*\)\.txt$', name, re.IGNORECASE) or re.search(r'\[\s*B\s*\]\.txt$', name, re.IGNORECASE):
        return TXTFormat.B
    
    return TXTFormat.UNKNOWN

def format_clean_filename(base_name: str, format_type: str) -> str:
    """
    Ensures a clean filename formatted with the appropriate format tag.
    Examples:
      "english words", "A" -> "english words (A).txt"
      "english words (A).txt", "A" -> "english words (A).txt"
      "books (B)", "B" -> "books (B).txt"
    Never duplicates format tags like "(A) (A).txt".
    """
    clean = base_name.strip()
    
    # Remove any existing .txt extension
    if clean.lower().endswith(".txt"):
        clean = clean[:-4].strip()
        
    # Remove any existing (A) or (B) tags to prevent duplication
    clean = re.sub(r'[\(\[]\s*[AB]\s*[\)\]]', '', clean, flags=re.IGNORECASE).strip()
    
    if not clean:
        clean = "untitled"
        
    fmt = format_type.upper().strip()
    if fmt not in (TXTFormat.A, TXTFormat.B):
        fmt = TXTFormat.A
        
    return f"{clean} ({fmt}).txt"

def list_txt_files(directory: Path, format_filter: Optional[str] = None, search_query: str = "") -> List[Path]:
    """
    Lists all TXT files in the directory filtered by format (A or B) and search query.
    Format is determined strictly by filename.
    """
    if not directory.exists() or not directory.is_dir():
        return []
        
    query = search_query.strip().lower()
    results: List[Path] = []
    
    for item in sorted(directory.glob("*.txt")):
        if not item.is_file():
            continue
            
        fmt = detect_format_from_filename(item)
        if format_filter is not None:
            if fmt != format_filter.upper():
                continue
                
        if query and query not in item.stem.lower():
            continue
            
        results.append(item)
        
    return results

def build_format_a_block(word: str, deck: str) -> str:
    """
    Builds a Format A entry containing Word and Deck.
    
    Example:
    Word=abandon
    Deck=English::B1
    """
    w = word.strip()
    d = deck.strip()
    return f"Word={w}\nDeck={d}"

def append_to_format_a(file_path: Path, word: str, deck: str) -> bool:
    """
    Appends a Format A entry (Word and Deck) to a Format A TXT file.
    Format A always requires both Word and Deck.
    """
    w = word.strip()
    d = deck.strip()
    if not w or not d:
        return False
        
    block = build_format_a_block(w, d)
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Check if file exists and ends with newline
        needs_leading_newline = False
        if file_path.exists() and file_path.stat().st_size > 0:
            with open(file_path, "rb") as f:
                f.seek(-1, 2)
                last_char = f.read(1)
                if last_char not in (b'\n', b'\r'):
                    needs_leading_newline = True
                    
        with open(file_path, "a", encoding="utf-8") as f:
            if needs_leading_newline:
                f.write("\n")
            f.write(f"{block}\n")
            
        return True
    except Exception as e:
        print(f"[txt_manager] Error appending to Format A file {file_path}: {e}")
        return False

def build_format_b_block(fields: Dict[str, Optional[Union[str, bool]]]) -> str:
    """
    Builds a single Format B block.
    CRITICAL: Empty fields MUST NOT be written to the file.
    
    Example:
    --
    Word=abandon
    Deck=English::B1
    Persian Meaning=رها کردن
    --
    """
    # Canonical field order
    ORDERED_KEYS: List[Tuple[str, str]] = [
        ("Word", "word"),
        ("Deck", "deck"),
        ("Phonetic", "phonetic"),
        ("Part of Speech", "part_of_speech"),
        ("Persian Meaning", "meaning_fa"),
        ("Example Sentence", "example"),
        ("ExampleTranslation", "translation_fa"),
        ("Memory Aid", "mnemonic"),
        ("Photo", "photo"),
        ("Spelling", "spelling"),
    ]
    
    lines: List[str] = ["--"]
    
    for label, key in ORDERED_KEYS:
        # Check both direct label and normalized key
        val = fields.get(key)
        if val is None:
            val = fields.get(label)
        if val is None:
            # Check lowercase without spaces
            val = fields.get(label.lower().replace(" ", ""))
            
        if val is None:
            continue
            
        # Format boolean or string
        if isinstance(val, bool):
            lines.append(f"{label}={'true' if val else 'false'}")
        else:
            val_str = str(val).strip()
            # ONLY write non-empty strings
            if val_str:
                lines.append(f"{label}={val_str}")
                
    lines.append("--")
    return "\n".join(lines)

def append_to_format_b(file_path: Path, fields: Dict[str, Optional[Union[str, bool]]]) -> bool:
    """
    Appends a formatted block to a Format B TXT file.
    Empty fields are strictly omitted.
    """
    block = build_format_b_block(fields)
    if block == "--\n--":  # completely empty block
        return False
        
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        needs_leading_newline = False
        if file_path.exists() and file_path.stat().st_size > 0:
            with open(file_path, "rb") as f:
                f.seek(-1, 2)
                last_char = f.read(1)
                if last_char not in (b'\n', b'\r'):
                    needs_leading_newline = True
                    
        with open(file_path, "a", encoding="utf-8") as f:
            if needs_leading_newline:
                f.write("\n")
            f.write(f"{block}\n")
            
        return True
    except Exception as e:
        print(f"[txt_manager] Error appending to Format B file {file_path}: {e}")
        return False

def create_new_txt_file(directory: Path, base_name: str, format_type: str) -> Tuple[bool, Path, str]:
    """
    Creates a new TXT file with proper format in its filename.
    Returns (success, path, error_or_message).
    """
    try:
        directory.mkdir(parents=True, exist_ok=True)
        filename = format_clean_filename(base_name, format_type)
        file_path = directory / filename
        
        if file_path.exists():
            return True, file_path, f"File already exists: {filename}"
            
        file_path.touch()
        return True, file_path, f"Created {filename}"
    except Exception as e:
        return False, directory / base_name, str(e)
