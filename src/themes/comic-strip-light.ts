import { ThemeDefinition } from '../types';
import { storyStripFrontNormalHtml, storyStripBackHtml } from './templates';

const css = `/* THEME 2: STORY STRIP LIGHT */
.card {
  background-color: #FFFDF5 !important;
  color: #000000 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  margin: 0 !important;
  padding: 16px 20px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;
  min-height: 100vh !important;
  box-sizing: border-box !important;
}

.nightMode .card, .nightMode.card {
  background-color: #FFFDF5 !important;
  color: #000000 !important;
}

.comic-card-wrapper.theme-strip {
  width: 100%;
  max-width: 900px !important; flex: 1 !important; display: flex !important; flex-direction: column !important;
  margin: 0 auto;
  box-sizing: border-box;
}

.strip-container {
  width: 100%;
  background-color: #FFFFFF;
  border: 4px solid #000000;
  box-shadow: 5px 5px 0px #000000;
  padding: 0;
  box-sizing: border-box;
}

.strip-panel {
  padding: 14px 16px;
  border-bottom: 3px solid #000000;
  position: relative;
}

.strip-panel:last-child {
  border-bottom: none;
}

.panel-tag {
  display: inline-block;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
  background-color: #000000;
  color: #FFFFFF;
  padding: 2px 6px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.panel-tag.tag-spelling {
  background-color: #7C3AED;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border: 2px solid #000000;
  margin-bottom: 10px;
  display: block;
}

.strip-word-header {
  margin-bottom: 6px;
}

.strip-title {
  margin: 0;
  font-size: clamp(24px, 6.5vw, 34px);
  font-weight: 900;
  color: #000000;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  display: block;
  width: 100%;
}

.strip-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-top: 4px;
}

.strip-pos {
  font-size: 11px;
  font-weight: 900;
  background-color: #FED7AA;
  border: 1.5px solid #000000;
  padding: 2px 6px;
  text-transform: uppercase;
}

.strip-ipa {
  font-size: 13px;
  font-weight: 700;
  color: #2563EB;
  font-family: "Lucida Sans Unicode", sans-serif;
  font-style: italic;
}

.strip-audio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.strip-audio-box {
  background-color: #F1F5F9;
  border: 2px solid #000000;
  padding: 6px 8px;
}

.strip-audio-box.us-box {
  border-left: 5px solid #EF4444;
}

.strip-audio-box.uk-box {
  border-left: 5px solid #38BDF8;
}

.flag-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.btn-cluster {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.speech-bubble {
  background-color: #FEF08A;
  border: 3px solid #000000;
  padding: 12px 14px;
  position: relative;
  box-shadow: 3px 3px 0px #000000;
  margin-top: 4px;
}

.bubble-tail {
  position: absolute;
  top: -12px;
  left: 24px;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 12px solid #000000;
}

.bubble-en {
  margin: 0 0 6px 0;
  font-size: 15px;
  font-weight: 800;
  color: #000000;
  line-height: 1.4;
  font-style: italic;
}

.bubble-fa {
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
  font-weight: 700;
}

.dialogue-audio-bar {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 800;
}

.strip-meaning-callout {
  background-color: #BBF7D0;
  border: 2px solid #000000;
  border-left: 6px solid #16A34A;
  padding: 10px 12px;
  font-size: 20px;
  font-weight: 900;
  color: #000000;
  line-height: 1.4;
  margin-bottom: 8px;
}

.strip-mnemonic-footer {
  background-color: #F3E8FF;
  border: 1.5px solid #000000;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #000000;
  line-height: 1.35;
}

.mnem-star {
  color: #7C3AED;
  font-weight: 900;
}

/* SPELLING STRIP */
.spelling-prompt-banner {
  background-color: #EDE9FE;
  border: 2px solid #000000;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.strip-audio-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 800;
}

.spelling-interactive-area {
  display: flex;
  gap: 6px;
  touch-action: auto !important;
  pointer-events: auto !important;
}

.spelling-input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 10px 14px !important;
  font-family: inherit !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  border: 3px solid #000000 !important;
  background-color: #FFFFFF !important;
  color: #0F172A !important;
  outline: none !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  touch-action: manipulation !important;
  pointer-events: auto !important;
  cursor: text !important;
}

.spelling-input.is-valid {
  background-color: #DCFCE7;
  border-color: #16A34A;
}

.spelling-input.has-error {
  background-color: #FEE2E2;
  border-color: #DC2626;
}

.spelling-check-btn {
  background-color: #F59E0B !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 8px 14px !important;
  border: 2px solid #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
  font-size: 12px !important;
}

.spelling-result {
  margin-top: 8px;
  padding: 0;
  transition: all 0.2s;
}

.spelling-result.is-correct {
  background-color: #DCFCE7;
  border: 2px solid #000000;
  padding: 8px 10px;
}

.spelling-result.is-incorrect {
  background-color: #FEE2E2;
  border: 2px solid #000000;
  padding: 8px 10px;
}

.spelling-success-badge { font-size: 12px; font-weight: 900; color: #15803D; }
.spelling-word-reveal { font-size: 18px; font-weight: 900; text-transform: uppercase; }
.spelling-error-badge { font-size: 12px; font-weight: 900; color: #DC2626; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #DC2626; text-decoration: line-through; }
.spelling-exact { color: #15803D; text-transform: uppercase; font-size: 15px; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #F59E0B !important;
  border: 2px solid #000000 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 2px 8px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  text-decoration: none !important;
  box-shadow: 2px 2px 0px #000000 !important;
  text-transform: uppercase !important;
  border-radius: 0 !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #fbbf24 !important;
  transform: translate(-1px, -1px);
}
`;

export const comicStripLightTheme: ThemeDefinition = {
  id: 'comic-strip-light',
  name: 'Story Strip (Light)',
  description: 'Classic 3-panel newspaper comic strip layout with speech balloon dialogue panels.',
  frontHtml: storyStripFrontNormalHtml,
  backHtml: storyStripBackHtml,
  css,
};
