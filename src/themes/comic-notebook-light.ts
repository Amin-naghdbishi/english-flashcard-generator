import { ThemeDefinition } from '../types';
import { indexNotebookFrontNormalHtml, indexNotebookBackHtml } from './templates';

const css = `/* THEME 4: INDEX NOTEBOOK LIGHT */
.card {
  background-color: #FFFFFF !important;
  color: #000000 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;
  min-height: 100vh !important;
  width: 100% !important;
  box-sizing: border-box !important;
}

.nightMode .card, .nightMode.card {
  background-color: #FFFFFF !important;
  color: #000000 !important;
}

.comic-card-wrapper.theme-notebook {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  background-color: #FFFFFF !important;
}

.notebook-sheet {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  background-color: #FFFFFF;
  border: none !important;
  box-shadow: none !important;
  padding: 20px 20px 20px 32px;
  margin: 0 !important;
  box-sizing: border-box;
  position: relative;
  background-image: repeating-linear-gradient(transparent, transparent 27px, #E2E8F0 28px);
  background-size: 100% 28px;
}

.notebook-holes {
  position: absolute;
  left: 8px;
  top: 20px;
  bottom: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.hole {
  width: 12px;
  height: 12px;
  background-color: #CBD5E1;
  border: 2px solid #000000;
  border-radius: 50%;
}

.notebook-tab-pos {
  position: absolute;
  top: -12px;
  right: 20px;
  background-color: #F43F5E;
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 900;
  padding: 3px 12px;
  border: 2px solid #000000;
  box-shadow: 2px 2px 0px #000000;
  text-transform: uppercase;
}

.notebook-tab-pos.tab-spelling {
  background-color: #8B5CF6;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border: 2px solid #000000;
  margin-bottom: 12px;
  display: block;
}

.notebook-header {
  margin-bottom: 12px;
}

.notebook-word {
  margin: 0;
  font-size: clamp(24px, 7vw, 36px);
  font-weight: 900;
  color: #0F172A;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.notebook-tape-ipa {
  display: inline-block;
  background-color: #FEF08A;
  border: 1px dashed #000000;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 700;
  color: #000000;
  font-family: "Lucida Sans Unicode", sans-serif;
  margin-top: 4px;
}

.notebook-margin-line {
  height: 2px;
  background-color: #EF4444;
  margin-bottom: 12px;
}

.notebook-audio-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.tape-clip {
  background-color: #F8FAFC;
  border: 1.5px solid #000000;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tape-clip.us-tape { border-left: 5px solid #EF4444; }
.tape-clip.uk-tape { border-left: 5px solid #38BDF8; }

.notebook-highlighter-meaning {
  background-color: #BBF7D0;
  padding: 8px 12px;
  border: 2px dashed #16A34A;
  margin-bottom: 14px;
  font-size: 20px;
  font-weight: 900;
  color: #000000;
  line-height: 1.4;
}

.highlighter-label {
  font-size: 11px;
  font-weight: 900;
  color: #166534;
  margin-left: 6px;
}

.notebook-sticky-example {
  background-color: #FEF9C3;
  border: 2px solid #000000;
  box-shadow: 3px 3px 0px rgba(0,0,0,0.15);
  padding: 10px 12px;
  margin-bottom: 12px;
}

.sticky-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sticky-title {
  font-size: 11px;
  font-weight: 900;
  color: #854D0E;
  text-transform: uppercase;
}

.sticky-text {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #000000;
  line-height: 1.4;
}

.sticky-translation {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  line-height: 1.4;
}

.notebook-washi-mnemonic {
  background-color: #EDE9FE;
  border-left: 5px solid #8B5CF6;
  border-top: 1px solid #000000;
  border-right: 1px solid #000000;
  border-bottom: 1px solid #000000;
  padding: 8px 10px;
}

.washi-title {
  font-size: 10px;
  font-weight: 900;
  color: #6D28D9;
  display: block;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.washi-text {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.35;
}

/* SPELLING NOTEBOOK */
.notebook-spelling-prompt {
  background-color: #FEF9C3;
  border: 2px solid #000000;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.notebook-prompt-label {
  font-size: 11px;
  font-weight: 900;
  color: #854D0E;
  margin-bottom: 4px;
}

.notebook-ruled-blank {
  font-size: 15px;
  font-weight: 800;
  color: #000000;
  line-height: 1.4;
}

.notebook-input {
  border: 2px solid #000000 !important;
  border-radius: 0 !important;
  font-size: 15px !important;
  font-weight: 900 !important;
}

.notebook-check {
  background-color: #F43F5E !important;
  color: #FFFFFF !important;
  border: 2px solid #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
  font-size: 12px !important;
  padding: 8px 14px !important;
}

.spelling-interactive-area {
  display: flex;
  flex-direction: column;
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

.spelling-input.is-valid { background-color: #DCFCE7; border-color: #16A34A; }
.spelling-input.has-error { background-color: #FEE2E2; border-color: #DC2626; }

.spelling-result {
  margin-top: 8px;
  transition: all 0.2s;
}

.spelling-result.is-correct {
  background-color: #DCFCE7;
  border: 2px solid #000000;
  padding: 10px;
}

.spelling-result.is-incorrect {
  background-color: #FEE2E2;
  border: 2px solid #000000;
  padding: 10px;
}

.spelling-success-badge { font-size: 12px; font-weight: 900; color: #15803D; }
.spelling-word-reveal { font-size: 18px; font-weight: 900; }
.spelling-error-badge { font-size: 12px; font-weight: 900; color: #DC2626; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #DC2626; text-decoration: line-through; }
.spelling-exact { color: #15803D; font-size: 15px; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #FEF08A !important;
  border: 1.5px solid #000000 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 2px 8px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  text-decoration: none !important;
  box-shadow: 1px 1px 0px #000000 !important;
  border-radius: 4px !important;
  text-transform: uppercase !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #fef9c3 !important;
}

/* Suppress unwanted generic/uncontained Anki default audio replay buttons */
#qa > .replay-button:not(.comic-audio-btn):not([class*="audio"]),
#qa > a.replay-button:not(.comic-audio-btn):not([class*="audio"]),
.card > a.replay-button:first-child:not([class*="audio"]) {
  display: none !important;
}
`;

export const comicNotebookLightTheme: ThemeDefinition = {
  id: 'comic-notebook-light',
  name: 'Index Notebook (Light)',
  description: 'Tangible student ruled notebook with colored sticky index tabs and sticky note example cards.',
  frontHtml: indexNotebookFrontNormalHtml,
  backHtml: indexNotebookBackHtml,
  css,
};
