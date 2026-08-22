import { ThemeDefinition } from '../types';
import { arcadeRetroFrontNormalHtml, arcadeRetroBackHtml } from './templates';

const css = `/* THEME 5: ARCADE RETRO DARK */
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

.comic-card-wrapper.theme-arcade {
  width: 100%;
  max-width: 900px !important; flex: 1 !important; display: flex !important; flex-direction: column !important;
  margin: 0 auto;
  box-sizing: border-box;
}

.arcade-cabinet {
  width: 100%;
  background-color: #2E1065;
  border: 4px solid #000000;
  box-shadow: 6px 6px 0px #000000;
  padding: 18px;
  box-sizing: border-box;
}

.arcade-hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #000000;
  color: #FDE047;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 12px;
  border: 2px solid #000000;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border: 3px solid #000000;
  margin-bottom: 12px;
  display: block;
}

.arcade-title-box {
  background-color: #3B0764;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px 14px;
  margin-bottom: 12px;
  text-align: center;
}

.arcade-word {
  margin: 0 0 4px 0;
  font-size: clamp(24px, 7vw, 36px);
  font-weight: 900;
  color: #FDE047;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.arcade-ipa-chip {
  display: inline-block;
  background-color: #000000;
  color: #38BDF8;
  font-size: 13px;
  font-weight: 900;
  padding: 2px 8px;
  font-family: "Lucida Sans Unicode", monospace;
}

.arcade-sound-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.arcade-btn-deck {
  background-color: #1E1B4B;
  border: 2px solid #000000;
  padding: 6px 8px;
}

.arcade-btn-deck.us-deck { border-left: 6px solid #F43F5E; }
.arcade-btn-deck.uk-deck { border-left: 6px solid #38BDF8; }

.deck-title {
  display: block;
  font-size: 9px;
  font-weight: 900;
  color: #DDD6FE;
  margin-bottom: 4px;
}

.deck-btns {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.quest-terminal-header {
  font-size: 10px;
  font-weight: 900;
  background-color: #000000;
  color: #FFFFFF;
  padding: 3px 6px;
  margin-bottom: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arcade-terminal-meaning {
  background-color: #064E3B;
  border: 2px solid #000000;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.arcade-meaning-fa {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #FFFFFF;
  line-height: 1.4;
}

.arcade-quest-box {
  background-color: #881337;
  border: 2px solid #000000;
  padding: 10px 12px;
  margin-bottom: 12px;
}

.quest-log-en {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 800;
  color: #F1F5F9;
  line-height: 1.4;
}

.quest-log-fa {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #DDD6FE;
  line-height: 1.4;
}

.arcade-powerup-box {
  background-color: #4C1D95;
  border: 2px solid #000000;
  padding: 10px 12px;
}

.powerup-text {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.35;
}

/* SPELLING ARCADE */
.arcade-spelling-prompt {
  background-color: #581C87;
}

.arcade-blank-screen {
  font-size: 16px;
  font-weight: 900;
  color: #FDE047;
  line-height: 1.4;
}

.arcade-single-sound {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arcade-interactive, .spelling-interactive-area {
  display: flex;
  gap: 6px;
  touch-action: auto !important;
  pointer-events: auto !important;
}

.arcade-input, .spelling-input {
  flex: 1;
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 10px 14px;
  font-size: 16px !important;
  font-weight: 900;
  font-family: inherit;
  border: 3px solid #000000;
  background-color: #0F172A;
  color: #FFFFFF;
  outline: none;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  touch-action: manipulation !important;
  pointer-events: auto !important;
  cursor: text !important;
}

.arcade-input.is-valid, .spelling-input.is-valid { background-color: #064E3B; border-color: #10B981; }
.arcade-input.has-error, .spelling-input.has-error { background-color: #7F1D1D; border-color: #EF4444; }

.arcade-check {
  background-color: #F43F5E !important;
  color: #FFFFFF !important;
  font-weight: 900 !important;
  padding: 8px 14px !important;
  border: 3px solid #000000 !important;
  box-shadow: 2px 2px 0px #000000 !important;
  cursor: pointer !important;
  font-size: 12px !important;
}

.arcade-result-screen {
  margin-top: 8px;
  transition: all 0.2s;
}

.arcade-result-screen.is-correct {
  background-color: #064E3B;
  border: 2px solid #000000;
  padding: 10px;
}

.arcade-result-screen.is-incorrect {
  background-color: #7F1D1D;
  border: 2px solid #000000;
  padding: 10px;
}

.spelling-success-badge { font-size: 12px; font-weight: 900; color: #34D399; }
.spelling-word-reveal { font-size: 18px; font-weight: 900; color: #FFFFFF; text-transform: uppercase; }
.spelling-error-badge { font-size: 12px; font-weight: 900; color: #FCA5A5; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #FCA5A5; text-decoration: line-through; }
.spelling-exact { color: #34D399; font-size: 15px; text-transform: uppercase; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #F43F5E !important;
  border: 2px solid #000000 !important;
  color: #FFFFFF !important;
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
  background-color: #fb7185 !important;
}
`;

export const comicArcadeDarkTheme: ThemeDefinition = {
  id: 'comic-arcade-dark',
  name: 'Arcade Retro (Dark)',
  description: 'Vibrant neon 90s arcade cyberpunk interface with glowing terminals and pixel coin controls.',
  frontHtml: arcadeRetroFrontNormalHtml,
  backHtml: arcadeRetroBackHtml,
  css,
};
