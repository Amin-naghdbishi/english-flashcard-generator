import { ThemeDefinition } from '../types';
import { indexNotebookFrontNormalHtml, indexNotebookBackHtml } from './templates';

const css = `/* THEME 4: INDEX NOTEBOOK DARK */
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

.comic-card-wrapper.theme-notebook {
  width: 100%;
  max-width: 900px !important; flex: 1 !important; display: flex !important; flex-direction: column !important;
  margin: 0 auto;
  box-sizing: border-box;
}

.notebook-sheet {
  width: 100%;
  background-color: #1E293B;
  border: 3px solid #475569;
  box-shadow: 6px 6px 0px #000000;
  padding: 24px 20px 20px 32px;
  box-sizing: border-box;
  position: relative;
  background-image: repeating-linear-gradient(transparent, transparent 27px, #334155 28px);
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
  background-color: #0F172A;
  border: 2px solid #475569;
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
  background-color: #A855F7;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border: 2px solid #475569;
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
  color: #F8FAFC;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.notebook-tape-ipa {
  display: inline-block;
  background-color: #854D0E;
  color: #FEF08A;
  border: 1px dashed #FEF08A;
  padding: 2px 8px;
  font-size: 13px;
  font-weight: 700;
  font-family: "Lucida Sans Unicode", sans-serif;
  margin-top: 4px;
}

.notebook-margin-line {
  height: 2px;
  background-color: #F43F5E;
  margin-bottom: 12px;
}

.notebook-audio-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.tape-clip {
  background-color: #0F172A;
  border: 1.5px solid #475569;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tape-clip.us-tape { border-left: 5px solid #F43F5E; }
.tape-clip.uk-tape { border-left: 5px solid #38BDF8; }

.notebook-highlighter-meaning {
  background-color: #064E3B;
  padding: 8px 12px;
  border: 2px dashed #10B981;
  margin-bottom: 14px;
  font-size: 20px;
  font-weight: 900;
  color: #F8FAFC;
  line-height: 1.4;
}

.highlighter-label {
  font-size: 11px;
  font-weight: 900;
  color: #34D399;
  margin-left: 6px;
}

.notebook-sticky-example {
  background-color: #713F12;
  border: 2px solid #CA8A04;
  box-shadow: 3px 3px 0px rgba(0,0,0,0.5);
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
  color: #FEF08A;
  text-transform: uppercase;
}

.sticky-text {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #FEF9C3;
  line-height: 1.4;
}

.sticky-translation {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #FDE047;
  line-height: 1.4;
}

.notebook-washi-mnemonic {
  background-color: #581C87;
  border-left: 5px solid #A855F7;
  border-top: 1px solid #7E22CE;
  border-right: 1px solid #7E22CE;
  border-bottom: 1px solid #7E22CE;
  padding: 8px 10px;
}

.washi-title {
  font-size: 10px;
  font-weight: 900;
  color: #D8B4FE;
  display: block;
  margin-bottom: 2px;
  text-transform: uppercase;
}

.washi-text {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: #F8FAFC;
  line-height: 1.35;
}

/* SPELLING NOTEBOOK */
.notebook-spelling-prompt {
  background-color: #713F12;
  border: 2px solid #CA8A04;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.notebook-prompt-label {
  font-size: 11px;
  font-weight: 900;
  color: #FEF08A;
  margin-bottom: 4px;
}

.notebook-ruled-blank {
  font-size: 15px;
  font-weight: 800;
  color: #FEF9C3;
  line-height: 1.4;
}

.notebook-input {
  border: 2px solid #CA8A04 !important;
  border-radius: 0 !important;
  font-size: 15px !important;
  font-weight: 900 !important;
  background-color: #0F172A !important;
  color: #F8FAFC !important;
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
  gap: 8px;
  width: 100% !important;
  position: relative !important;
  z-index: 10 !important;
  touch-action: auto !important;
  pointer-events: auto !important;
}

input#typeans, #typeans, .typeans, .spelling-input {
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

input#typeans.is-valid, #typeans.is-valid, .typeans.is-valid, .spelling-input.is-valid { background-color: #064E3B !important; border-color: #10B981 !important; }
input#typeans.has-error, #typeans.has-error, .typeans.has-error, .spelling-input.has-error { background-color: #7F1D1D !important; border-color: #EF4444 !important; }

.spelling-result {
  margin-top: 8px;
  transition: all 0.2s;
}

.spelling-result.is-correct {
  background-color: #064E3B;
  border: 2px solid #10B981;
  padding: 10px;
}

.spelling-result.is-incorrect {
  background-color: #7F1D1D;
  border: 2px solid #EF4444;
  padding: 10px;
}

.spelling-success-badge { font-size: 12px; font-weight: 900; color: #34D399; }
.spelling-word-reveal { font-size: 18px; font-weight: 900; color: #F8FAFC; text-transform: uppercase; }
.spelling-error-badge { font-size: 12px; font-weight: 900; color: #FCA5A5; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #FCA5A5; text-decoration: line-through; }
.spelling-exact { color: #34D399; font-size: 15px; text-transform: uppercase; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #FDE047 !important;
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
  box-shadow: 1.5px 1.5px 0px #000000 !important;
  text-transform: uppercase !important;
  border-radius: 4px !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #facc15 !important;
}

/* Suppress unwanted generic/uncontained Anki default audio replay buttons */
#qa > .replay-button:not(.comic-audio-btn):not([class*="audio"]),
#qa > a.replay-button:not(.comic-audio-btn):not([class*="audio"]),
.card > a.replay-button:first-child:not([class*="audio"]) {
  display: none !important;
}
`;

export const comicNotebookDarkTheme: ThemeDefinition = {
  id: 'comic-notebook-dark',
  name: 'Index Notebook (Dark)',
  description: 'Deep chalkboard study notebook with neon highlighters and pinned sticky notes.',
  frontHtml: indexNotebookFrontNormalHtml,
  backHtml: indexNotebookBackHtml,
  css,
};
