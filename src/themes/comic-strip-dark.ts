import { ThemeDefinition } from '../types';
import { storyStripFrontNormalHtml, storyStripBackHtml } from './templates';

const css = `/* THEME 2: STORY STRIP DARK */
.card {
  background-color: #0F172A !important;
  color: #F8FAFC !important;
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
  background-color: #0F172A !important;
  color: #F8FAFC !important;
}

.comic-card-wrapper.theme-strip {
  width: 100%;
  max-width: 900px !important; flex: 1 !important; display: flex !important; flex-direction: column !important;
  margin: 0 auto;
  box-sizing: border-box;
}

.strip-container {
  width: 100%;
  background-color: #1E293B;
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
  background-color: #38BDF8;
  color: #000000;
  padding: 2px 6px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.panel-tag.tag-spelling {
  background-color: #C084FC;
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
  color: #F8FAFC;
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
  background-color: #F59E0B;
  color: #000000;
  border: 1.5px solid #000000;
  padding: 2px 6px;
  text-transform: uppercase;
}

.strip-ipa {
  font-size: 13px;
  font-weight: 700;
  color: #38BDF8;
  font-family: "Lucida Sans Unicode", sans-serif;
  font-style: italic;
}

.strip-audio-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.strip-audio-box {
  background-color: #0F172A;
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
  color: #CBD5E1;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.btn-cluster {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.speech-bubble {
  background-color: #334155;
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
  color: #F8FAFC;
  line-height: 1.4;
  font-style: italic;
}

.bubble-fa {
  margin: 0;
  font-size: 13px;
  color: #94A3B8;
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
  color: #CBD5E1;
}

.strip-meaning-callout {
  background-color: #064E3B;
  border: 2px solid #000000;
  border-left: 6px solid #10B981;
  padding: 10px 12px;
  font-size: 20px;
  font-weight: 900;
  color: #F8FAFC;
  line-height: 1.4;
  margin-bottom: 8px;
}

.strip-mnemonic-footer {
  background-color: #581C87;
  border: 1.5px solid #000000;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  color: #F8FAFC;
  line-height: 1.35;
}

.mnem-star {
  color: #C084FC;
  font-weight: 900;
}

/* SPELLING STRIP */
.spelling-prompt-banner {
  background-color: #3B0764;
  border: 2px solid #000000;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #F8FAFC;
}

.strip-audio-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 11px;
  font-weight: 800;
  color: #CBD5E1;
}

.spelling-interactive-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100% !important;
  position: relative !important;
  z-index: 10 !important;
  touch-action: auto !important;
  pointer-events: auto !important;
}

.spelling-input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 12px 14px !important;
  font-family: inherit !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  border: 3px solid #000000 !important;
  background-color: #0F172A !important;
  color: #F8FAFC !important;
  outline: none !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  touch-action: auto !important;
  pointer-events: auto !important;
  cursor: text !important;
  position: relative !important;
  z-index: 11 !important;
}

.spelling-input.is-valid {
  background-color: #064E3B;
  border-color: #10B981;
}

.spelling-input.has-error {
  background-color: #7F1D1D;
  border-color: #EF4444;
}

.spelling-check-btn {
  background-color: #F59E0B !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 10px 16px !important;
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
  background-color: #064E3B;
  border: 2px solid #000000;
  padding: 8px 10px;
}

.spelling-result.is-incorrect {
  background-color: #7F1D1D;
  border: 2px solid #000000;
  padding: 8px 10px;
}

.spelling-success-badge { font-size: 12px; font-weight: 900; color: #34D399; }
.spelling-word-reveal { font-size: 18px; font-weight: 900; color: #F8FAFC; text-transform: uppercase; }
.spelling-error-badge { font-size: 12px; font-weight: 900; color: #FCA5A5; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #FCA5A5; text-decoration: line-through; }
.spelling-exact { color: #34D399; text-transform: uppercase; font-size: 15px; }

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

/* Suppress unwanted generic/uncontained Anki default audio replay buttons */
#qa > .replay-button:not(.comic-audio-btn):not([class*="audio"]),
#qa > a.replay-button:not(.comic-audio-btn):not([class*="audio"]),
.card > a.replay-button:first-child:not([class*="audio"]) {
  display: none !important;
}
`;

export const comicStripDarkTheme: ThemeDefinition = {
  id: 'comic-strip-dark',
  name: 'Story Strip (Dark)',
  description: 'Deep navy charcoal comic strip panels with speech bubbles and dialogue frames.',
  frontHtml: storyStripFrontNormalHtml,
  backHtml: storyStripBackHtml,
  css,
};
