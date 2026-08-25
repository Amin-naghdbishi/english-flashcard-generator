/**
 * Shared HTML templates for Anki Cards & Live Preview
 * Supports both Normal Flashcards and Interactive Spelling Cards
 */

export const spellingScript = `
<script>
function checkSpelling() {
  var input = document.getElementById('spelling-input');
  var result = document.getElementById('spelling-result');
  var targetEl = document.getElementById('spelling-target-word');
  var target = (targetEl ? (targetEl.innerText || targetEl.textContent) : '').trim().toLowerCase();
  
  if (!input || !result || !target) return;
  
  var typed = input.value.trim();
  if (!typed) {
    result.className = 'spelling-result is-empty';
    result.innerHTML = '<span class="spelling-empty-msg">⚠️ Please type the word first!</span>';
    return;
  }
  
  if (typed.toLowerCase() === target) {
    result.className = 'spelling-result is-correct';
    result.innerHTML = '<div class="spelling-success-badge">✓ EXCELLENT! PERFECT SPELLING!</div><div class="spelling-word-reveal">' + target + '</div>';
    input.classList.remove('has-error');
    input.classList.add('is-valid');
  } else {
    result.className = 'spelling-result is-incorrect';
    result.innerHTML = '<div class="spelling-error-badge">✕ INCORRECT SPELLING</div>' +
      '<div class="spelling-compare-box">' +
        '<div class="spelling-user-typed"><span class="spelling-label">You typed:</span> <del class="spelling-mistake">' + typed + '</del></div>' +
        '<div class="spelling-correct-ans"><span class="spelling-label">Correct spelling:</span> <strong class="spelling-exact">' + target + '</strong></div>' +
      '</div>';
    input.classList.add('has-error');
    input.classList.remove('is-valid');
  }
}

// Support pressing Enter key in the input
document.addEventListener('DOMContentLoaded', function() {
  var input = document.getElementById('spelling-input');
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkSpelling();
      }
    });
  }
});
</script>
`;

/**
 * 1. HERO POP TEMPLATES (Theme 1)
 */
export const heroPopFrontNormalHtml = `
<div class="comic-card-wrapper theme-pop">
  <div class="comic-card">
    <div class="card-hero-header">
      <span class="hero-badge">💥 VOCABULARY</span>
      <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <div class="comic-word-section">
      <div class="comic-title-row">
        <h1 class="comic-title">{{Word}}</h1>
      </div>
      <div class="comic-badges-row">
        <span class="comic-badge badge-ipa">{{Phonetic}}</span>
      </div>
    </div>

    <div class="comic-pronunciation-box">
      <div class="audio-region region-us">
        <div class="audio-region-title">🇺🇸 American English</div>
        <div class="audio-buttons-row">
          <div class="audio-item"><span class="speed-label">Normal:</span> {{WordAudioUsNormal}}</div>
          <div class="audio-item"><span class="speed-label">Slow:</span> {{WordAudioUsSlow}}</div>
        </div>
      </div>
      <div class="audio-region region-uk">
        <div class="audio-region-title">🇬🇧 British English</div>
        <div class="audio-buttons-row">
          <div class="audio-item"><span class="speed-label">Normal:</span> {{WordAudioUkNormal}}</div>
          <div class="audio-item"><span class="speed-label">Slow:</span> {{WordAudioUkSlow}}</div>
        </div>
      </div>
    </div>

    <div class="comic-hint-box">
      <span class="hint-label">💡 CONTEXT / EXAMPLE</span>
      <p class="comic-example-en">{{Example}}</p>
    </div>
  </div>
</div>
`;

export const heroPopFrontSpellingHtml = `
<div class="comic-card-wrapper theme-pop">
  <div class="comic-card spelling-card">
    <div class="card-hero-header">
      <span class="hero-badge badge-spelling">🎯 SPELLING CHALLENGE</span>
      <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <!-- Hidden target for spelling comparison -->
    <div id="spelling-target-word" style="display: none;">{{Word}}</div>

    <div class="spelling-prompt-box">
      <div class="spelling-prompt-title">LISTEN & FILL IN THE MISSING WORD:</div>
      <div class="spelling-sentence">{{SpellingSentence}}</div>
    </div>

    <div class="comic-pronunciation-box">
      <div class="audio-region region-us">
        <div class="audio-region-title">🇺🇸 Audio Clues</div>
        <div class="audio-buttons-row">
          <div class="audio-item"><span class="speed-label">Word:</span> {{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
          <div class="audio-item"><span class="speed-label">Sentence:</span> {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}</div>
        </div>
      </div>
    </div>

    <div class="spelling-interactive-area">
      <input
        type="text"
        id="spelling-input"
        class="spelling-input"
        placeholder="Type the English spelling here..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" class="spelling-check-btn" onclick="checkSpelling()">
        CHECK SPELLING
      </button>
    </div>

    <div id="spelling-result" class="spelling-result"></div>
  </div>
</div>
${spellingScript}
`;

export const heroPopBackHtml = `
<div class="comic-card-wrapper theme-pop">
  <div class="comic-card">
    <div class="card-hero-header">
      <span class="hero-badge">💥 VOCABULARY</span>
      <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <div class="comic-word-section">
      <div class="comic-title-row">
        <h1 class="comic-title">{{Word}}</h1>
      </div>
      <div class="comic-badges-row">
        <span class="comic-badge badge-ipa">{{Phonetic}}</span>
      </div>
    </div>

    <div class="comic-pronunciation-box">
      <div class="audio-region region-us">
        <div class="audio-region-title">🇺🇸 American English</div>
        <div class="audio-buttons-row">
          <div class="audio-item"><span class="speed-label">Normal:</span> {{WordAudioUsNormal}}</div>
          <div class="audio-item"><span class="speed-label">Slow:</span> {{WordAudioUsSlow}}</div>
        </div>
      </div>
      <div class="audio-region region-uk">
        <div class="audio-region-title">🇬🇧 British English</div>
        <div class="audio-buttons-row">
          <div class="audio-item"><span class="speed-label">Normal:</span> {{WordAudioUkNormal}}</div>
          <div class="audio-item"><span class="speed-label">Slow:</span> {{WordAudioUkSlow}}</div>
        </div>
      </div>
    </div>

    <div class="comic-divider"></div>

    <div class="comic-meaning-box">
      <span class="box-label label-meaning">📖 PERSIAN MEANING</span>
      <p class="meaning-text" dir="rtl">{{Meaning}}</p>
    </div>

    <div class="comic-example-box">
      <div class="example-header">
        <span class="box-label label-example">💬 EXAMPLE SENTENCE</span>
        <div class="example-audio-group">
          <div class="example-audio-item"><span>🇺🇸</span> {{ExampleAudioUsNormal}}</div>
          <div class="example-audio-item"><span>🇬🇧</span> {{ExampleAudioUkNormal}}</div>
        </div>
      </div>
      <p class="example-en">{{Example}}</p>
      <p class="example-fa" dir="rtl">{{Translation}}</p>
    </div>

    <div class="comic-mnemonic-box">
      <span class="box-label label-memory">🧠 MEMORY AID / MNEMONIC</span>
      <p class="mnemonic-text">{{Mnemonic}}</p>
    </div>
  </div>
</div>
`;

/**
 * 2. STORY STRIP TEMPLATES (Theme 2)
 */
export const storyStripFrontNormalHtml = `
<div class="comic-card-wrapper theme-strip">
  <div class="strip-container">
    <div class="strip-panel panel-header">
      <div class="panel-tag">PANEL 1 • THE WORD</div>
      {{CardImage}}
      <div class="strip-word-header">
        <h1 class="strip-title">{{Word}}</h1>
        <div class="strip-meta">
          <span class="strip-pos">{{PartOfSpeech}}</span>
          <span class="strip-ipa">{{Phonetic}}</span>
        </div>
      </div>
    </div>

    <div class="strip-panel panel-audio">
      <div class="panel-tag">PANEL 2 • PRONUNCIATION</div>
      <div class="strip-audio-grid">
        <div class="strip-audio-box us-box">
          <span class="flag-label">🇺🇸 American:</span>
          <div class="btn-cluster">{{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
        </div>
        <div class="strip-audio-box uk-box">
          <span class="flag-label">🇬🇧 British:</span>
          <div class="btn-cluster">{{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
        </div>
      </div>
    </div>

    <div class="strip-panel panel-dialogue">
      <div class="panel-tag">PANEL 3 • CONTEXT DIALOGUE</div>
      <div class="speech-bubble">
        <div class="bubble-tail"></div>
        <p class="bubble-en">"{{Example}}"</p>
      </div>
    </div>
  </div>
</div>
`;

export const storyStripFrontSpellingHtml = `
<div class="comic-card-wrapper theme-strip">
  <div class="strip-container spelling-strip">
    <div class="strip-panel panel-header">
      <div class="panel-tag tag-spelling">SPELLING MISSION • PANEL 1</div>
      {{CardImage}}
      <div id="spelling-target-word" style="display: none;">{{Word}}</div>
      <div class="spelling-prompt-banner">
        <span class="prompt-icon">✍️</span>
        <span class="prompt-text">Can you spell this English word correctly?</span>
      </div>
    </div>

    <div class="strip-panel panel-dialogue">
      <div class="panel-tag">PANEL 2 • MISSING DIALOGUE</div>
      <div class="speech-bubble">
        <div class="bubble-tail"></div>
        <p class="bubble-en">{{SpellingSentence}}</p>
      </div>
      <div class="strip-audio-inline">
        <span class="audio-caption">Listen carefully:</span>
        {{WordAudioUsNormal}} {{WordAudioUsSlow}} {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}
      </div>
    </div>

    <div class="strip-panel panel-interactive">
      <div class="panel-tag">PANEL 3 • YOUR SPELLING</div>
      <div class="spelling-interactive-area">
        <input
          type="text"
          id="spelling-input"
          class="spelling-input"
          placeholder="Spell the missing word..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button type="button" class="spelling-check-btn" onclick="checkSpelling()">SUBMIT</button>
      </div>
      <div id="spelling-result" class="spelling-result"></div>
    </div>
  </div>
</div>
${spellingScript}
`;

export const storyStripBackHtml = `
<div class="comic-card-wrapper theme-strip">
  <div class="strip-container">
    <div class="strip-panel panel-header">
      <div class="panel-tag">PANEL 1 • WORD & SOUND</div>
      {{CardImage}}
      <div class="strip-word-header">
        <h1 class="strip-title">{{Word}}</h1>
        <div class="strip-meta">
          <span class="strip-pos">{{PartOfSpeech}}</span>
          <span class="strip-ipa">{{Phonetic}}</span>
        </div>
      </div>
      <div class="strip-audio-grid">
        <div class="strip-audio-box us-box"><span class="flag-label">🇺🇸 US:</span> {{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
        <div class="strip-audio-box uk-box"><span class="flag-label">🇬🇧 UK:</span> {{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
      </div>
    </div>

    <div class="strip-panel panel-dialogue">
      <div class="panel-tag">PANEL 2 • DIALOGUE & TRANSLATION</div>
      <div class="speech-bubble">
        <div class="bubble-tail"></div>
        <p class="bubble-en">"{{Example}}"</p>
        <p class="bubble-fa" dir="rtl">{{Translation}}</p>
      </div>
      <div class="dialogue-audio-bar">
        <span>Audio:</span> {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}} {{ExampleAudioUkNormal}} {{ExampleAudioUkSlow}}
      </div>
    </div>

    <div class="strip-panel panel-meaning">
      <div class="panel-tag">PANEL 3 • MEANING & MNEMONIC</div>
      <div class="strip-meaning-callout" dir="rtl">
        {{Meaning}}
      </div>
      <div class="strip-mnemonic-footer">
        <span class="mnem-star">★</span> {{Mnemonic}}
      </div>
    </div>
  </div>
</div>
`;

/**
 * 3. DUO QUEST TEMPLATES (Theme 3 - Playful Educational UX)
 */
export const duoQuestFrontNormalHtml = `
<div class="comic-card-wrapper theme-quest">
  <div class="quest-card">
    <div class="quest-top-bar">
      <div class="quest-level-pill">LEVEL 1 • {{PartOfSpeech}}</div>
      <div class="quest-points">★ 10 XP</div>
    </div>

    {{CardImage}}

    <div class="quest-hero">
      <h1 class="quest-word">{{Word}}</h1>
      <span class="quest-ipa">{{Phonetic}}</span>
    </div>

    <div class="quest-sound-dock">
      <div class="sound-card us-card">
        <span class="dock-flag">🇺🇸 American</span>
        <div class="dock-actions">{{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      </div>
      <div class="sound-card uk-card">
        <span class="dock-flag">🇬🇧 British</span>
        <div class="dock-actions">{{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
      </div>
    </div>

    <div class="quest-example-card">
      <div class="example-quest-header">
        <span class="quest-tag">SENTENCE CHALLENGE</span>
      </div>
      <p class="quest-sentence">{{Example}}</p>
    </div>
  </div>
</div>
`;

export const duoQuestFrontSpellingHtml = `
<div class="comic-card-wrapper theme-quest">
  <div class="quest-card spelling-quest">
    <div class="quest-top-bar">
      <div class="quest-level-pill pill-spelling">SPELLING EXERCISE</div>
      <div class="quest-points">★ 20 XP</div>
    </div>

    {{CardImage}}

    <div id="spelling-target-word" style="display: none;">{{Word}}</div>

    <div class="quest-prompt-center">
      <div class="quest-instruction">Listen and type the missing word:</div>
      <div class="quest-fill-sentence">{{SpellingSentence}}</div>
    </div>

    <div class="quest-sound-dock-compact">
      <span class="sound-label">🔊 Pronunciation:</span>
      {{WordAudioUsNormal}} {{WordAudioUsSlow}} {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}
    </div>

    <div class="spelling-interactive-area">
      <input
        type="text"
        id="spelling-input"
        class="spelling-input quest-input"
        placeholder="Type answer here..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" class="spelling-check-btn quest-btn" onclick="checkSpelling()">CHECK ANSWER</button>
    </div>

    <div id="spelling-result" class="spelling-result"></div>
  </div>
</div>
${spellingScript}
`;

export const duoQuestBackHtml = `
<div class="comic-card-wrapper theme-quest">
  <div class="quest-card">
    <div class="quest-top-bar">
      <div class="quest-level-pill">LEVEL 1 • {{PartOfSpeech}}</div>
      <div class="quest-points">★ 10 XP</div>
    </div>

    {{CardImage}}

    <div class="quest-hero">
      <h1 class="quest-word">{{Word}}</h1>
      <span class="quest-ipa">{{Phonetic}}</span>
    </div>

    <div class="quest-sound-dock">
      <div class="sound-card us-card">
        <span class="dock-flag">🇺🇸 American</span>
        <div class="dock-actions">{{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      </div>
      <div class="sound-card uk-card">
        <span class="dock-flag">🇬🇧 British</span>
        <div class="dock-actions">{{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
      </div>
    </div>

    <div class="quest-meaning-banner">
      <span class="meaning-quest-label">PERSIAN MEANING</span>
      <p class="quest-meaning-fa" dir="rtl">{{Meaning}}</p>
    </div>

    <div class="quest-example-card">
      <div class="example-quest-header">
        <span class="quest-tag">EXAMPLE & TRANSLATION</span>
        <div class="dock-actions">{{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}} {{ExampleAudioUkNormal}} {{ExampleAudioUkSlow}}</div>
      </div>
      <p class="quest-sentence">{{Example}}</p>
      <p class="quest-translation-fa" dir="rtl">{{Translation}}</p>
    </div>

    <div class="quest-mnemonic-card">
      <span class="quest-tag-purple">💡 MEMORY HOOK</span>
      <p class="quest-mnemonic">{{Mnemonic}}</p>
    </div>
  </div>
</div>
`;

/**
 * 4. INDEX NOTEBOOK TEMPLATES (Theme 4 - Ruled Paper & Sticky Tabs)
 */
export const indexNotebookFrontNormalHtml = `
<div class="comic-card-wrapper theme-notebook">
  <div class="notebook-sheet">
    <div class="notebook-holes">
      <span class="hole"></span><span class="hole"></span><span class="hole"></span>
    </div>
    <div class="notebook-tab-pos">{{PartOfSpeech}}</div>

    {{CardImage}}

    <div class="notebook-header">
      <h1 class="notebook-word">{{Word}}</h1>
      <span class="notebook-tape-ipa">{{Phonetic}}</span>
    </div>

    <div class="notebook-margin-line"></div>

    <div class="notebook-audio-strip">
      <div class="tape-clip us-tape">🇺🇸 US: {{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      <div class="tape-clip uk-tape">🇬🇧 UK: {{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
    </div>

    <div class="notebook-sticky-example">
      <span class="sticky-pin">📌</span>
      <span class="sticky-title">Usage Example:</span>
      <p class="sticky-text">{{Example}}</p>
    </div>
  </div>
</div>
`;

export const indexNotebookFrontSpellingHtml = `
<div class="comic-card-wrapper theme-notebook">
  <div class="notebook-sheet spelling-notebook">
    <div class="notebook-holes">
      <span class="hole"></span><span class="hole"></span><span class="hole"></span>
    </div>
    <div class="notebook-tab-pos tab-spelling">SPELL CHECK</div>

    {{CardImage}}

    <div id="spelling-target-word" style="display: none;">{{Word}}</div>

    <div class="notebook-spelling-prompt">
      <div class="notebook-prompt-label">📝 Exercise: Fill in the blank</div>
      <div class="notebook-ruled-blank">{{SpellingSentence}}</div>
    </div>

    <div class="notebook-audio-strip">
      <div class="tape-clip us-tape">🎧 Audio: {{WordAudioUsNormal}} {{WordAudioUsSlow}} {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}</div>
    </div>

    <div class="spelling-interactive-area">
      <input
        type="text"
        id="spelling-input"
        class="spelling-input notebook-input"
        placeholder="Write correct spelling..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" class="spelling-check-btn notebook-check" onclick="checkSpelling()">CHECK</button>
    </div>

    <div id="spelling-result" class="spelling-result"></div>
  </div>
</div>
${spellingScript}
`;

export const indexNotebookBackHtml = `
<div class="comic-card-wrapper theme-notebook">
  <div class="notebook-sheet">
    <div class="notebook-holes">
      <span class="hole"></span><span class="hole"></span><span class="hole"></span>
    </div>
    <div class="notebook-tab-pos">{{PartOfSpeech}}</div>

    {{CardImage}}

    <div class="notebook-header">
      <h1 class="notebook-word">{{Word}}</h1>
      <span class="notebook-tape-ipa">{{Phonetic}}</span>
    </div>

    <div class="notebook-audio-strip">
      <div class="tape-clip us-tape">🇺🇸 US: {{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      <div class="tape-clip uk-tape">🇬🇧 UK: {{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
    </div>

    <div class="notebook-highlighter-meaning" dir="rtl">
      <span class="highlighter-label">معنی:</span>
      <span class="highlighter-text">{{Meaning}}</span>
    </div>

    <div class="notebook-sticky-example">
      <div class="sticky-header-row">
        <span class="sticky-pin">📌</span>
        <span class="sticky-title">Example & Translation:</span>
        <div class="sticky-audio">{{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}} {{ExampleAudioUkNormal}} {{ExampleAudioUkSlow}}</div>
      </div>
      <p class="sticky-text">{{Example}}</p>
      <p class="sticky-translation" dir="rtl">{{Translation}}</p>
    </div>

    <div class="notebook-washi-mnemonic">
      <span class="washi-tape"></span>
      <span class="washi-title">Memory Hook:</span>
      <p class="washi-text">{{Mnemonic}}</p>
    </div>
  </div>
</div>
`;

/**
 * 5. ARCADE RETRO TEMPLATES (Theme 5 - 90s Pixel Arcade Game)
 */
export const arcadeRetroFrontNormalHtml = `
<div class="comic-card-wrapper theme-arcade">
  <div class="arcade-cabinet">
    <div class="arcade-hud">
      <span class="hud-item hud-stage">STAGE 1</span>
      <span class="hud-item hud-type">CLASS: {{PartOfSpeech}}</span>
      <span class="hud-item hud-hp">HP: ■■■■■</span>
    </div>

    {{CardImage}}

    <div class="arcade-title-box">
      <h1 class="arcade-word">{{Word}}</h1>
      <div class="arcade-ipa-chip">{{Phonetic}}</div>
    </div>

    <div class="arcade-sound-controls">
      <div class="arcade-btn-deck us-deck">
        <span class="deck-title">US VOICE:</span>
        <div class="deck-btns">{{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      </div>
      <div class="arcade-btn-deck uk-deck">
        <span class="deck-title">UK VOICE:</span>
        <div class="deck-btns">{{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
      </div>
    </div>

    <div class="arcade-quest-box">
      <div class="quest-terminal-header">► MISSION BRIEF</div>
      <p class="quest-log-en">{{Example}}</p>
    </div>
  </div>
</div>
`;

export const arcadeRetroFrontSpellingHtml = `
<div class="comic-card-wrapper theme-arcade">
  <div class="arcade-cabinet spelling-arcade">
    <div class="arcade-hud">
      <span class="hud-item hud-stage">SPELLING BOSS</span>
      <span class="hud-item hud-type">{{PartOfSpeech}}</span>
      <span class="hud-item hud-score">100 PTS</span>
    </div>

    {{CardImage}}

    <div id="spelling-target-word" style="display: none;">{{Word}}</div>

    <div class="arcade-quest-box arcade-spelling-prompt">
      <div class="quest-terminal-header">► DECODE THE HIDDEN WORD:</div>
      <div class="arcade-blank-screen">{{SpellingSentence}}</div>
    </div>

    <div class="arcade-sound-controls arcade-single-sound">
      <span class="deck-title">AUDIO RADAR:</span>
      {{WordAudioUsNormal}} {{WordAudioUsSlow}} {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}
    </div>

    <div class="spelling-interactive-area arcade-interactive">
      <input
        type="text"
        id="spelling-input"
        class="spelling-input arcade-input"
        placeholder="ENTER SPELLING..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" class="spelling-check-btn arcade-check" onclick="checkSpelling()">EXECUTE</button>
    </div>

    <div id="spelling-result" class="spelling-result arcade-result-screen"></div>
  </div>
</div>
${spellingScript}
`;

export const arcadeRetroBackHtml = `
<div class="comic-card-wrapper theme-arcade">
  <div class="arcade-cabinet">
    <div class="arcade-hud">
      <span class="hud-item hud-stage">STAGE 1</span>
      <span class="hud-item hud-type">CLASS: {{PartOfSpeech}}</span>
      <span class="hud-item hud-hp">HP: ■■■■■</span>
    </div>

    {{CardImage}}

    <div class="arcade-title-box">
      <h1 class="arcade-word">{{Word}}</h1>
      <div class="arcade-ipa-chip">{{Phonetic}}</div>
    </div>

    <div class="arcade-sound-controls">
      <div class="arcade-btn-deck us-deck">
        <span class="deck-title">US VOICE:</span>
        <div class="deck-btns">{{WordAudioUsNormal}} {{WordAudioUsSlow}}</div>
      </div>
      <div class="arcade-btn-deck uk-deck">
        <span class="deck-title">UK VOICE:</span>
        <div class="deck-btns">{{WordAudioUkNormal}} {{WordAudioUkSlow}}</div>
      </div>
    </div>

    <div class="arcade-terminal-meaning">
      <div class="quest-terminal-header">► PERSIAN TRANSLATION</div>
      <p class="arcade-meaning-fa" dir="rtl">{{Meaning}}</p>
    </div>

    <div class="arcade-quest-box">
      <div class="quest-terminal-header">
        <span>► MISSION LOG & AUDIO</span>
        <div class="arcade-example-audio">{{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}} {{ExampleAudioUkNormal}} {{ExampleAudioUkSlow}}</div>
      </div>
      <p class="quest-log-en">{{Example}}</p>
      <p class="quest-log-fa" dir="rtl">{{Translation}}</p>
    </div>

    <div class="arcade-powerup-box">
      <div class="quest-terminal-header">★ MEMORY POWERUP</div>
      <p class="powerup-text">{{Mnemonic}}</p>
    </div>
  </div>
</div>
`;

/**
 * 6. MINIMAL TEMPLATES (Theme 6 - Clean, Distraction-Free Anki Style)
 */
export const minimalFrontNormalHtml = `
<div class="minimal-card-wrapper theme-minimal">
  <div class="minimal-card">
    <div class="minimal-header">
      <span class="minimal-pos">{{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <div class="minimal-word-block">
      <h1 class="minimal-word">{{Word}}</h1>
      <div class="minimal-phonetic">{{Phonetic}}</div>
    </div>

    <div class="minimal-audio-row">
      <div class="minimal-audio-group">
        <span class="minimal-audio-label">US:</span> {{WordAudioUsNormal}} {{WordAudioUsSlow}}
      </div>
      <div class="minimal-audio-group">
        <span class="minimal-audio-label">UK:</span> {{WordAudioUkNormal}} {{WordAudioUkSlow}}
      </div>
    </div>

    <div class="minimal-example-block">
      <p class="minimal-example">{{Example}}</p>
    </div>
  </div>
</div>
`;

export const minimalFrontSpellingHtml = `
<div class="minimal-card-wrapper theme-minimal">
  <div class="minimal-card spelling-minimal">
    <div class="minimal-header">
      <span class="minimal-pos">Spelling Challenge • {{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <div id="spelling-target-word" style="display: none;">{{Word}}</div>

    <div class="minimal-spelling-prompt">
      <div class="minimal-prompt-title">Spell the missing word:</div>
      <div class="minimal-spelling-sentence">{{SpellingSentence}}</div>
    </div>

    <div class="minimal-audio-row">
      <span class="minimal-audio-label">Audio:</span> {{WordAudioUsNormal}} {{WordAudioUsSlow}} {{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}}
    </div>

    <div class="spelling-interactive-area">
      <input
        type="text"
        id="spelling-input"
        class="spelling-input minimal-input"
        placeholder="Type the spelling here..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      />
      <button type="button" class="spelling-check-btn minimal-btn" onclick="checkSpelling()">
        Check Spelling
      </button>
    </div>

    <div id="spelling-result" class="spelling-result minimal-result"></div>
  </div>
</div>
${spellingScript}
`;

export const minimalBackHtml = `
<div class="minimal-card-wrapper theme-minimal">
  <div class="minimal-card">
    <div class="minimal-header">
      <span class="minimal-pos">{{PartOfSpeech}}</span>
    </div>

    {{CardImage}}

    <div class="minimal-word-block">
      <h1 class="minimal-word">{{Word}}</h1>
      <div class="minimal-phonetic">{{Phonetic}}</div>
    </div>

    <div class="minimal-audio-row">
      <div class="minimal-audio-group">
        <span class="minimal-audio-label">US:</span> {{WordAudioUsNormal}} {{WordAudioUsSlow}}
      </div>
      <div class="minimal-audio-group">
        <span class="minimal-audio-label">UK:</span> {{WordAudioUkNormal}} {{WordAudioUkSlow}}
      </div>
    </div>

    <hr class="minimal-divider" />

    <div class="minimal-meaning-block" dir="rtl">
      <div class="minimal-meaning-label">معنی</div>
      <p class="minimal-meaning-text">{{Meaning}}</p>
    </div>

    <div class="minimal-example-block">
      <div class="minimal-example-header">
        <span class="minimal-example-label">Example & Translation</span>
        <div class="minimal-example-audio">{{ExampleAudioUsNormal}} {{ExampleAudioUsSlow}} {{ExampleAudioUkNormal}} {{ExampleAudioUkSlow}}</div>
      </div>
      <p class="minimal-example">{{Example}}</p>
      <p class="minimal-translation" dir="rtl">{{Translation}}</p>
    </div>

    <div class="minimal-mnemonic-block">
      <div class="minimal-mnemonic-label">Memory Aid</div>
      <p class="minimal-mnemonic">{{Mnemonic}}</p>
    </div>
  </div>
</div>
`;
