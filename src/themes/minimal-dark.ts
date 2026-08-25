import { ThemeDefinition } from '../types';
import { minimalFrontNormalHtml, minimalBackHtml } from './templates';

const css = `/* THEME: MINIMAL DARK - Clean, Distraction-Free Practical Dark Theme */
.card {
  background-color: #18181B !important;
  color: #F4F4F5 !important;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
  margin: 0 !important;
  padding: 20px 24px !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  align-items: stretch !important;
  min-height: 100vh !important;
  box-sizing: border-box !important;
  text-align: left !important;
}

.nightMode .card, .nightMode.card {
  background-color: #18181B !important;
  color: #F4F4F5 !important;
}

.minimal-card-wrapper {
  width: 100% !important;
  max-width: 860px !important;
  margin: 0 auto !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
}

.minimal-card {
  width: 100% !important;
  background-color: #27272A !important;
  border: 1px solid #3F3F46 !important;
  border-radius: 8px !important;
  padding: 24px 28px !important;
  box-sizing: border-box !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

.minimal-header {
  margin-bottom: 16px !important;
}

.minimal-pos {
  display: inline-block !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.8px !important;
  color: #A1A1AA !important;
  background-color: #18181B !important;
  padding: 3px 8px !important;
  border-radius: 4px !important;
  border: 1px solid #3F3F46 !important;
}

.card-illustration, img.card-illustration {
  width: 100% !important;
  max-width: 100% !important;
  max-height: 220px !important;
  object-fit: cover !important;
  border-radius: 6px !important;
  border: 1px solid #3F3F46 !important;
  margin-bottom: 16px !important;
  display: block !important;
}

.minimal-word-block {
  margin-bottom: 16px !important;
}

.minimal-word {
  margin: 0 0 4px 0 !important;
  font-size: clamp(26px, 5vw, 36px) !important;
  font-weight: 800 !important;
  color: #FFFFFF !important;
  line-height: 1.2 !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

.minimal-phonetic {
  font-size: 14px !important;
  font-weight: 500 !important;
  color: #A1A1AA !important;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif !important;
}

.minimal-audio-row {
  display: flex !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  gap: 16px !important;
  margin-bottom: 18px !important;
  padding: 8px 12px !important;
  background-color: #18181B !important;
  border: 1px solid #3F3F46 !important;
  border-radius: 6px !important;
}

.minimal-audio-group {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  font-size: 12px !important;
  font-weight: 600 !important;
  color: #E4E4E7 !important;
}

.minimal-audio-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #A1A1AA !important;
  text-transform: uppercase !important;
}

.minimal-divider {
  border: 0 !important;
  height: 1px !important;
  background-color: #3F3F46 !important;
  margin: 16px 0 !important;
}

.minimal-meaning-block {
  margin-bottom: 18px !important;
}

.minimal-meaning-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #A1A1AA !important;
  margin-bottom: 4px !important;
  text-transform: uppercase !important;
}

.minimal-meaning-text {
  margin: 0 !important;
  font-size: 20px !important;
  font-weight: 700 !important;
  color: #F4F4F5 !important;
  line-height: 1.5 !important;
  direction: rtl !important;
  text-align: right !important;
  font-family: Tahoma, Vazirmatn, "Segoe UI", sans-serif !important;
}

.minimal-example-block {
  margin-bottom: 18px !important;
  padding: 14px 16px !important;
  background-color: #18181B !important;
  border-left: 3px solid #60A5FA !important;
  border-radius: 4px !important;
}

.minimal-example-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 6px !important;
}

.minimal-example-label {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #60A5FA !important;
  text-transform: uppercase !important;
}

.minimal-example {
  margin: 0 0 6px 0 !important;
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #E4E4E7 !important;
  line-height: 1.5 !important;
}

.minimal-translation {
  margin: 0 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #A1A1AA !important;
  direction: rtl !important;
  text-align: right !important;
  font-family: Tahoma, Vazirmatn, "Segoe UI", sans-serif !important;
  line-height: 1.5 !important;
}

.minimal-mnemonic-block {
  padding: 10px 14px !important;
  background-color: #18181B !important;
  border: 1px solid #3F3F46 !important;
  border-radius: 6px !important;
}

.minimal-mnemonic-label {
  font-size: 10px !important;
  font-weight: 700 !important;
  color: #A1A1AA !important;
  text-transform: uppercase !important;
  margin-bottom: 2px !important;
}

.minimal-mnemonic {
  margin: 0 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: #D4D4D8 !important;
  line-height: 1.4 !important;
}

/* SPELLING MINIMAL */
.minimal-spelling-prompt {
  background-color: #18181B !important;
  border: 1px solid #3F3F46 !important;
  border-radius: 6px !important;
  padding: 16px !important;
  margin-bottom: 16px !important;
  text-align: center !important;
}

.minimal-prompt-title {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: #A1A1AA !important;
  text-transform: uppercase !important;
  margin-bottom: 8px !important;
}

.minimal-spelling-sentence {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #F4F4F5 !important;
  line-height: 1.5 !important;
}

.spelling-interactive-area {
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  width: 100% !important;
  position: relative !important;
  z-index: 10 !important;
  touch-action: auto !important;
  pointer-events: auto !important;
}

.spelling-input, .minimal-input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 12px 14px !important;
  font-family: inherit !important;
  font-size: 16px !important;
  border: 1px solid #52525B !important;
  border-radius: 6px !important;
  background-color: #18181B !important;
  color: #F4F4F5 !important;
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

.spelling-input::placeholder, .minimal-input::placeholder {
  color: #71717A !important;
  opacity: 1 !important;
}

.spelling-input:focus, .minimal-input:focus {
  border-color: #60A5FA !important;
  box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.2) !important;
}

.spelling-check-btn, .minimal-btn {
  background-color: #3B82F6 !important;
  color: #FFFFFF !important;
  font-weight: 600 !important;
  font-size: 13px !important;
  padding: 10px 16px !important;
  border: none !important;
  border-radius: 6px !important;
  cursor: pointer !important;
  transition: opacity 0.15s !important;
}

.spelling-check-btn:hover, .minimal-btn:hover {
  opacity: 0.9 !important;
}

.spelling-result {
  margin-top: 10px !important;
  border-radius: 6px !important;
  padding: 12px 14px !important;
  font-size: 13px !important;
}

.spelling-result.is-correct {
  background-color: #064E3B !important;
  border: 1px solid #059669 !important;
  color: #A7F3D0 !important;
}

.spelling-result.is-incorrect {
  background-color: #7F1D1D !important;
  border: 1px solid #DC2626 !important;
  color: #FECACA !important;
}

.spelling-success-badge { font-weight: 700 !important; color: #34D399 !important; }
.spelling-word-reveal { font-size: 16px !important; font-weight: 700 !important; color: #34D399 !important; margin-top: 4px !important; }
.spelling-error-badge { font-weight: 700 !important; color: #F87171 !important; margin-bottom: 4px !important; }
.spelling-compare-box { font-weight: 500 !important; color: #F4F4F5 !important; }
.spelling-user-typed { color: #FCA5A5 !important; }
.spelling-mistake { text-decoration: line-through !important; font-weight: 600 !important; }
.spelling-correct-ans { color: #34D399 !important; margin-top: 2px !important; }
.spelling-exact { font-weight: 700 !important; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #27272A !important;
  border: 1px solid #3F3F46 !important;
  color: #E4E4E7 !important;
  font-weight: 600 !important;
  padding: 4px 10px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  text-decoration: none !important;
  border-radius: 4px !important;
  transition: all 0.15s !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #3F3F46 !important;
  color: #FFFFFF !important;
}

.replay-button svg, a.replay-button svg {
  width: 12px !important;
  height: 12px !important;
  fill: #E4E4E7 !important;
}

/* Suppress unwanted generic/uncontained Anki default audio replay buttons */
#qa > .replay-button:not(.comic-audio-btn):not([class*="audio"]),
#qa > a.replay-button:not(.comic-audio-btn):not([class*="audio"]),
.card > a.replay-button:first-child:not([class*="audio"]) {
  display: none !important;
}
`;

export const minimalDarkTheme: ThemeDefinition = {
  id: 'minimal-dark',
  name: 'Minimal (Dark)',
  description: 'Distraction-free dark mode Anki card with restrained colors and subtle borders.',
  frontHtml: minimalFrontNormalHtml,
  backHtml: minimalBackHtml,
  css,
};
