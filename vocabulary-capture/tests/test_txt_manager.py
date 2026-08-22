import tempfile
from pathlib import Path
from app.txt_manager import (
    TXTFormat,
    detect_format_from_filename,
    format_clean_filename,
    list_txt_files,
    append_to_format_a,
    build_format_b_block,
    append_to_format_b,
    create_new_txt_file,
)

def test_filename_format_detection():
    # Point 15: Format A correctly identified from filename
    assert detect_format_from_filename("english words (A).txt") == TXTFormat.A
    assert detect_format_from_filename("daily vocabulary (A).txt") == TXTFormat.A
    assert detect_format_from_filename("my words [A].txt") == TXTFormat.A
    assert detect_format_from_filename("/path/to/vocab (a).txt") == TXTFormat.A

    # Point 16: Format B correctly identified from filename
    assert detect_format_from_filename("english B1 (B).txt") == TXTFormat.B
    assert detect_format_from_filename("books (B).txt") == TXTFormat.B
    assert detect_format_from_filename("ielts [b].txt") == TXTFormat.B
    assert detect_format_from_filename("/some/dir/flashcards (B).txt") == TXTFormat.B

    # Unknown
    assert detect_format_from_filename("random.txt") == TXTFormat.UNKNOWN
    assert detect_format_from_filename("notes.md") == TXTFormat.UNKNOWN

def test_format_clean_filename():
    assert format_clean_filename("vocabulary", "A") == "vocabulary (A).txt"
    assert format_clean_filename("english b1", "B") == "english b1 (B).txt"
    assert format_clean_filename("daily words (A).txt", "A") == "daily words (A).txt"
    assert format_clean_filename("books (B).txt", "B") == "books (B).txt"
    # Never duplicate tags
    assert format_clean_filename("test (A)", "A") == "test (A).txt"
    assert format_clean_filename("test (A)", "B") == "test (B).txt"

def test_append_format_a():
    # Point 17: A entries appended correctly
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = Path(tmpdir) / "daily (A).txt"

        append_to_format_a(file_path, "apple")
        append_to_format_a(file_path, "bank")
        append_to_format_a(file_path, "photo")
        append_to_format_a(file_path, "abandon")

        content = file_path.read_text(encoding="utf-8")
        lines = [l.strip() for l in content.splitlines() if l.strip()]
        assert lines == ["apple", "bank", "photo", "abandon"]

def test_format_b_block_omits_empty_fields():
    # Point 19: Empty B fields are omitted completely
    # Only Word and Deck filled
    fields1 = {
        "Word": "abandon",
        "Deck": "English::B1",
        "Phonetic": "",
        "Part of Speech": None,
        "Persian Meaning": "",
        "Example Sentence": "",
    }
    block1 = build_format_b_block(fields1)
    expected1 = "--\nWord=abandon\nDeck=English::B1\n--"
    assert block1 == expected1
    assert "Phonetic=" not in block1
    assert "Persian Meaning=" not in block1
    assert "Part of Speech=" not in block1

    # Word, Deck, Persian Meaning, and Spelling filled
    fields2 = {
        "Word": "abandon",
        "Deck": "English::B1",
        "Persian Meaning": "رها کردن",
        "Example Sentence": "",
        "Photo": None,
        "Spelling": True,
    }
    block2 = build_format_b_block(fields2)
    expected2 = "--\nWord=abandon\nDeck=English::B1\nPersian Meaning=رها کردن\nSpelling=true\n--"
    assert block2 == expected2
    assert "Example Sentence=" not in block2
    assert "Photo=" not in block2

def test_append_format_b():
    # Point 18: B records are written correctly
    with tempfile.TemporaryDirectory() as tmpdir:
        file_path = Path(tmpdir) / "english B1 (B).txt"

        # Entry 1
        append_to_format_b(file_path, {
            "Word": "abandon",
            "Deck": "English::B1",
            "Persian Meaning": "رها کردن",
        })

        # Entry 2
        append_to_format_b(file_path, {
            "Word": "remarkable",
            "Deck": "English::B2",
            "Example Sentence": "This is remarkable.",
        })

        content = file_path.read_text(encoding="utf-8")
        assert "--\nWord=abandon\nDeck=English::B1\nPersian Meaning=رها کردن\n--" in content
        assert "--\nWord=remarkable\nDeck=English::B2\nExample Sentence=This is remarkable.\n--" in content
        assert "Phonetic=" not in content

def test_list_and_create_files():
    # Point 20: Search works, Point 21: New A file, Point 22: New B file
    with tempfile.TemporaryDirectory() as tmpdir:
        p = Path(tmpdir)

        succ_a, path_a, _ = create_new_txt_file(p, "words", "A")
        assert succ_a
        assert path_a.name == "words (A).txt"

        succ_b1, path_b1, _ = create_new_txt_file(p, "b1_vocab", "B")
        assert succ_b1
        assert path_b1.name == "b1_vocab (B).txt"

        succ_b2, path_b2, _ = create_new_txt_file(p, "b2_vocab", "B")
        assert succ_b2
        assert path_b2.name == "b2_vocab (B).txt"

        # Filter A
        a_files = list_txt_files(p, format_filter=TXTFormat.A)
        assert len(a_files) == 1
        assert a_files[0].name == "words (A).txt"

        # Filter B
        b_files = list_txt_files(p, format_filter=TXTFormat.B)
        assert len(b_files) == 2
        b_names = {f.name for f in b_files}
        assert b_names == {"b1_vocab (B).txt", "b2_vocab (B).txt"}

        # Search filter
        search_res = list_txt_files(p, format_filter=TXTFormat.B, search_query="b2")
        assert len(search_res) == 1
        assert search_res[0].name == "b2_vocab (B).txt"
