import { ThemeDefinition } from '../types';
import { duoQuestFrontNormalHtml, duoQuestBackHtml } from './templates';

const css = `/* THEME 3: DUO QUEST LIGHT */
.card {
  background-color: #FFFFFF !important;
  color: #0F172A !important;
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
  color: #0F172A !important;
}

.comic-card-wrapper.theme-quest {
  width: 100% !important;
  max-width: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
  background-color: #FFFFFF !important;
}

.quest-card {
  width: 100% !important;
  max-width: 100% !important;
  background-color: #FFFFFF !important;
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 16px 20px !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  text-align: left !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
}

.quest-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.quest-level-pill {
  font-size: 11px;
  font-weight: 900;
  background-color: #58CC02;
  color: #FFFFFF !important;
  padding: 5px 12px;
  border-radius: 20px;
  border: 2px solid #46A302;
  box-shadow: 0 2px 0 #46A302;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-level-pill.pill-spelling {
  background-color: #A855F7;
  border-color: #9333EA;
  box-shadow: 0 2px 0 #9333EA;
}

.quest-points {
  font-size: 12px;
  font-weight: 900;
  color: #A16207;
  background-color: #FEF9C3;
  padding: 4px 10px;
  border-radius: 12px;
  border: 2px solid #FDE047;
  box-shadow: 0 2px 0 #EAB308;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 14px;
  border: 2px solid #E2E8F0;
  box-shadow: 0 3px 0 #CBD5E1;
  margin-bottom: 14px;
  display: block;
}

.quest-hero {
  text-align: center;
  padding: 14px 16px;
  background-color: #F8FAFC;
  border: 2px solid #E2E8F0;
  border-radius: 16px;
  box-shadow: 0 3px 0 #CBD5E1;
  margin-bottom: 14px;
}

.quest-word {
  margin: 0 0 4px 0;
  font-size: clamp(24px, 7vw, 36px);
  font-weight: 900;
  color: #0F172A;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.quest-ipa {
  font-size: 14px;
  font-weight: 800;
  color: #2563EB;
  font-family: 'Charis SIL', 'Doulos SIL', 'DejaVu Sans', serif !important;
  font-style: normal !important;
}

.quest-sound-dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.sound-card {
  background-color: #FFFFFF;
  border: 2px solid #E2E8F0;
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 3px 0 #CBD5E1;
}

.sound-card.us-card { border-left: 6px solid #EF4444; }
.sound-card.uk-card { border-left: 6px solid #0EA5E9; }

.dock-flag {
  font-size: 10px;
  font-weight: 900;
  display: block;
  margin-bottom: 6px;
  text-transform: uppercase;
  color: #475569;
}

.dock-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quest-meaning-banner {
  background-color: #DCFCE7;
  border: 2px solid #86EFAC;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #4ADE80;
}

.meaning-quest-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #15803D;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-meaning-fa {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #0F172A;
  line-height: 1.5;
  font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif !important;
}

.quest-definition-card {
  background-color: #F0F9FF;
  border: 2px solid #BAE6FD;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #7DD3FC;
}

.quest-tag-blue {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #0284C7;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-definition-text {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.45;
}

.quest-example-card {
  background-color: #EFF6FF;
  border: 2px solid #BFDBFE;
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #93C5FD;
}

.example-quest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.quest-tag {
  font-size: 10px;
  font-weight: 900;
  color: #1D4ED8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-sentence {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 700;
  color: #0F172A;
  line-height: 1.4;
}

.quest-translation-fa {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  line-height: 1.5;
  font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif !important;
}

.quest-mnemonic-card {
  background-color: #FAF5FF;
  border: 2px solid #E9D5FF;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 3px 0 #D8B4FE;
}

.quest-tag-purple {
  font-size: 10px;
  font-weight: 900;
  color: #7E22CE;
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-mnemonic {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.5;
  font-family: 'Vazirmatn', Tahoma, 'Segoe UI', sans-serif !important;
}

/* SPELLING QUEST */
.quest-prompt-center {
  background-color: #FAF5FF;
  border: 2px solid #DDD6FE;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #C4B5FD;
}

.quest-instruction {
  font-size: 11px;
  font-weight: 900;
  color: #6D28D9;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.quest-fill-sentence {
  font-size: 16px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1.4;
}

.quest-sound-dock-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 800;
}

.quest-input {
  border-radius: 12px !important;
  font-size: 16px !important;
  font-weight: 900 !important;
}

.quest-btn {
  background-color: #58CC02 !important;
  color: #FFFFFF !important;
  border: 2px solid #46A302 !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 0 #3b8701 !important;
  font-size: 13px !important;
  padding: 12px 16px !important;
}

.quest-btn:active {
  transform: translateY(2px) !important;
  box-shadow: 0 2px 0 #3b8701 !important;
}

.spelling-interactive-area {
  touch-action: auto !important;
  pointer-events: auto !important;
}

.spelling-input, .quest-input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 12px 14px !important;
  font-family: inherit !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  border: 2px solid #CBD5E1 !important;
  border-radius: 12px !important;
  background-color: #FFFFFF !important;
  color: #0F172A !important;
  outline: none !important;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05) !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  user-select: text !important;
  -webkit-touch-callout: default !important;
  touch-action: manipulation !important;
  pointer-events: auto !important;
  cursor: text !important;
}

.spelling-input:focus, .quest-input:focus {
  border-color: #3B82F6 !important;
}

.spelling-input::placeholder, .quest-input::placeholder {
  color: #94A3B8 !important;
  opacity: 1 !important;
  font-weight: 600 !important;
}

.spelling-input.is-valid { background-color: #DCFCE7 !important; border-color: #16A34A !important; color: #0F172A !important; }
.spelling-input.has-error { background-color: #FEE2E2 !important; border-color: #DC2626 !important; color: #0F172A !important; }

.spelling-result {
  margin-top: 10px !important;
  border-radius: 12px !important;
  transition: all 0.2s !important;
}

.spelling-result.is-correct {
  background-color: #DCFCE7 !important;
  border: 2px solid #86EFAC !important;
  box-shadow: 0 3px 0 #4ADE80 !important;
  padding: 12px !important;
  color: #0F172A !important;
}

.spelling-result.is-incorrect {
  background-color: #FEE2E2 !important;
  border: 2px solid #FECACA !important;
  box-shadow: 0 3px 0 #F87171 !important;
  padding: 12px !important;
  color: #0F172A !important;
}

.spelling-success-badge { font-size: 13px !important; font-weight: 900 !important; color: #15803D !important; }
.spelling-word-reveal { font-size: 20px !important; font-weight: 900 !important; color: #0F172A !important; margin-top: 4px !important; }
.spelling-error-badge { font-size: 13px !important; font-weight: 900 !important; color: #DC2626 !important; margin-bottom: 4px !important; }
.spelling-compare-box { font-size: 13px !important; font-weight: 800 !important; color: #0F172A !important; }
.spelling-user-typed { color: #0F172A !important; margin-bottom: 2px !important; }
.spelling-label { color: #475569 !important; font-weight: 700 !important; }
.spelling-mistake { color: #DC2626 !important; text-decoration: line-through !important; font-weight: 900 !important; }
.spelling-correct-ans { color: #0F172A !important; margin-top: 4px !important; }
.spelling-exact { color: #15803D !important; font-size: 16px !important; font-weight: 900 !important; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #0EA5E9 !important;
  border: 2px solid #0284C7 !important;
  color: #FFFFFF !important;
  font-weight: 900 !important;
  padding: 4px 12px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 11px !important;
  text-decoration: none !important;
  box-shadow: 0 3px 0 #0284C7 !important;
  border-radius: 10px !important;
  text-transform: uppercase !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #38BDF8 !important;
}

.replay-button:active, .play-button:active, a.replay-button:active, .comic-audio-btn:active {
  transform: translateY(2px) !important;
  box-shadow: 0 1px 0 #0284C7 !important;
}

/* Suppress unwanted generic/uncontained Anki default audio replay buttons */
#qa > .replay-button:not(.comic-audio-btn):not([class*="audio"]),
#qa > a.replay-button:not(.comic-audio-btn):not([class*="audio"]),
.card > a.replay-button:first-child:not([class*="audio"]) {
  display: none !important;
}
`;

export const comicQuestLightTheme: ThemeDefinition = {
  id: 'comic-quest-light',
  name: 'Duo Quest (Light)',
  description: 'Duolingo-inspired cheerful learning interface with 3D action buttons and gamified XP badges.',
  frontHtml: duoQuestFrontNormalHtml,
  backHtml: duoQuestBackHtml,
  css,
};
