import { ThemeDefinition } from '../types';

const frontHtml = `<div class="comic-card-wrapper">
  <div class="comic-card comic-front">
    <div class="comic-header">
      <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
      <span class="comic-badge badge-ipa">{{Phonetic}}</span>
    </div>

    <div class="comic-word-box">
      <h1 class="comic-title">{{Word}}</h1>
      <div class="comic-audio-wrapper">
        {{WordAudio}}
      </div>
    </div>

    <div class="comic-hint-box">
      <span class="hint-label">HINT / CONTEXT:</span>
      <p class="comic-example-en">"{{Example}}"</p>
    </div>
  </div>
</div>`;

const backHtml = `<div class="comic-card-wrapper">
  <div class="comic-card comic-back">
    <div class="comic-header">
      <span class="comic-badge badge-pos">{{PartOfSpeech}}</span>
      <span class="comic-badge badge-ipa">{{Phonetic}}</span>
    </div>

    <div class="comic-word-box">
      <h1 class="comic-title">{{Word}}</h1>
      <div class="comic-audio-wrapper">
        {{WordAudio}}
      </div>
    </div>

    <div class="comic-divider"></div>

    <div class="comic-meaning-box">
      <span class="box-label label-meaning">معنی فارسی:</span>
      <p class="meaning-text" dir="rtl">{{Meaning}}</p>
    </div>

    <div class="comic-example-box">
      <div class="example-header">
        <span class="box-label label-example">EXAMPLE & AUDIO:</span>
        <div class="comic-audio-wrapper">
          {{ExampleAudio}}
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

const css = `/* COMIC DARK BENTO THEME FOR ANKI & PREVIEW */
.card {
  background-color: #1E202B;
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
}

.comic-card-wrapper {
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #1E202B;
}

.comic-card {
  width: 100%;
  max-width: 100%;
  background-color: #1E202B;
  border: none;
  box-shadow: none;
  padding: 16px 20px;
  margin: 0;
  box-sizing: border-box;
  text-align: left;
  border-radius: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.comic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.comic-badge {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 10px;
  border: 2px solid #000000;
  box-shadow: 2px 2px 0px #000000;
  line-height: 1.2;
}

.badge-pos {
  background-color: #FFD93D;
  color: #000000;
}

.badge-ipa {
  background-color: #38BDF8;
  color: #000000;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-word-box {
  background-color: #272A38;
  border: 4px solid #000000;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  box-shadow: 4px 4px 0px #000000;
}

.comic-title {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  color: #FFFFFF;
  letter-spacing: -0.5px;
  word-break: break-word;
  line-height: 1.1;
}

.comic-audio-wrapper {
  display: inline-flex;
  align-items: center;
}

.comic-hint-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #FFD93D;
  padding: 14px;
}

.hint-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #94A3B8;
  margin-bottom: 4px;
  letter-spacing: 1px;
}

.comic-example-en {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: #F1F5F9;
  font-weight: 700;
  font-style: italic;
}

.comic-divider {
  height: 4px;
  background-color: #000000;
  margin: 12px 0 16px 0;
}

.comic-meaning-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #4ADE80;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 2px 2px 0px #000000;
}

.box-label {
  display: block;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.label-meaning {
  color: #4ADE80;
}

.label-example {
  color: #FB923C;
}

.label-memory {
  color: #C084FC;
}

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #FFFFFF;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #FB923C;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 2px 2px 0px #000000;
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.example-en {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.4;
  color: #F1F5F9;
  font-weight: 700;
}

.example-fa {
  margin: 0;
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.4;
  font-weight: 600;
}

.comic-mnemonic-box {
  background-color: #2D2447;
  border: 3px solid #000000;
  border-left: 8px solid #C084FC;
  padding: 12px 14px;
  box-shadow: 3px 3px 0px #000000;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #F1F5F9;
  line-height: 1.4;
  font-weight: 700;
}

/* Audio button styling for Anki and in-app preview */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #FFD93D !important;
  border: 2px solid #000000 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 4px 10px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  font-size: 11px !important;
  text-decoration: none !important;
  box-shadow: 2px 2px 0px #000000 !important;
  text-transform: uppercase !important;
  border-radius: 0 !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #ffe066 !important;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0px #000000 !important;
}

.replay-button:active, .play-button:active, a.replay-button:active, .comic-audio-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0px #000000 !important;
}

.replay-button svg, a.replay-button svg {
  width: 14px !important;
  height: 14px !important;
  fill: #000000 !important;
}
`;

export const comicDarkTheme: ThemeDefinition = {
  id: 'comic-dark',
  name: 'Dark Comic',
  description: 'Classic dark ink panels with vibrant pop-art accents (Yellow, Blue, Green, Orange).',
  frontHtml,
  backHtml,
  css,
};
