export const sharedFrontHtml = `<div class="comic-card-wrapper">
  <div class="comic-card comic-front">
    <div class="comic-word-section">
      <div class="comic-title-row">
        <h1 class="comic-title">{{Word}}</h1>
      </div>
      <div class="comic-badges-row">
        <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
        <span class="comic-badge badge-ipa">{{Phonetic}}</span>
      </div>
    </div>

    <div class="comic-pronunciation-box">
      <div class="audio-region region-us">
        <div class="audio-region-title">🇺🇸 American English</div>
        <div class="audio-buttons-row">
          <div class="audio-item">
            <span class="speed-label">▶ Normal</span>
            {{WordAudioUsNormal}}
          </div>
          <div class="audio-item">
            <span class="speed-label">▶ Slow</span>
            {{WordAudioUsSlow}}
          </div>
        </div>
      </div>
      <div class="audio-region region-uk">
        <div class="audio-region-title">🇬🇧 British English</div>
        <div class="audio-buttons-row">
          <div class="audio-item">
            <span class="speed-label">▶ Normal</span>
            {{WordAudioUkNormal}}
          </div>
          <div class="audio-item">
            <span class="speed-label">▶ Slow</span>
            {{WordAudioUkSlow}}
          </div>
        </div>
      </div>
    </div>

    <div class="comic-hint-box">
      <span class="hint-label">HINT / CONTEXT:</span>
      <p class="comic-example-en">"{{Example}}"</p>
    </div>
  </div>
</div>`;

export const sharedBackHtml = `<div class="comic-card-wrapper">
  <div class="comic-card comic-back">
    <div class="comic-word-section">
      <div class="comic-title-row">
        <h1 class="comic-title">{{Word}}</h1>
      </div>
      <div class="comic-badges-row">
        <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
        <span class="comic-badge badge-ipa">{{Phonetic}}</span>
      </div>
    </div>

    <div class="comic-pronunciation-box">
      <div class="audio-region region-us">
        <div class="audio-region-title">🇺🇸 American English</div>
        <div class="audio-buttons-row">
          <div class="audio-item">
            <span class="speed-label">▶ Normal</span>
            {{WordAudioUsNormal}}
          </div>
          <div class="audio-item">
            <span class="speed-label">▶ Slow</span>
            {{WordAudioUsSlow}}
          </div>
        </div>
      </div>
      <div class="audio-region region-uk">
        <div class="audio-region-title">🇬🇧 British English</div>
        <div class="audio-buttons-row">
          <div class="audio-item">
            <span class="speed-label">▶ Normal</span>
            {{WordAudioUkNormal}}
          </div>
          <div class="audio-item">
            <span class="speed-label">▶ Slow</span>
            {{WordAudioUkSlow}}
          </div>
        </div>
      </div>
    </div>

    <div class="comic-divider"></div>

    <div class="comic-meaning-box">
      <span class="box-label label-meaning">معنی فارسی:</span>
      <p class="meaning-text" dir="rtl">{{Meaning}}</p>
    </div>

    <div class="comic-example-box">
      <div class="example-header">
        <span class="box-label label-example">EXAMPLE SENTENCE:</span>
        <div class="example-audio-group">
          <span class="example-audio-item"><span class="example-lang-tag">🇺🇸</span> {{ExampleAudioUsNormal}}</span>
          <span class="example-audio-item"><span class="example-lang-tag">🇬🇧</span> {{ExampleAudioUkNormal}}</span>
        </div>
      </div>
      <p class="example-en">{{Example}}</p>
      <p class="example-fa" dir="rtl">{{Translation}}</p>
    </div>

    <div class="comic-mnemonic-box">
      <span class="box-label label-memory">MEMORY AID (یادافزا):</span>
      <p class="mnemonic-text">{{Mnemonic}}</p>
    </div>
  </div>
</div>`;
