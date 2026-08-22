import { ThemeDefinition } from '../types';
import { duoQuestFrontNormalHtml, duoQuestBackHtml } from './templates';

const css = `/* THEME 3: DUO QUEST LIGHT */
.card {
  background-color: #F0FDF4 !important;
  color: #1E293B !important;
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
  background-color: #F0FDF4 !important;
  color: #1E293B !important;
}

.comic-card-wrapper.theme-quest {
  width: 100% !important;
  max-width: 900px !important;
  margin: 0 auto !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
}

.quest-card {
  width: 100% !important;
  background-color: #FFFFFF !important;
  border: 4px solid #000000 !important;
  border-radius: 16px !important;
  box-shadow: 0 6px 0px #000000 !important;
  padding: 20px !important;
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
  color: #FFFFFF;
  padding: 4px 10px;
  border-radius: 20px;
  border: 2px solid #000000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-level-pill.pill-spelling {
  background-color: #A855F7;
}

.quest-points {
  font-size: 12px;
  font-weight: 900;
  color: #EAB308;
  background-color: #FEF9C3;
  padding: 3px 8px;
  border-radius: 12px;
  border: 2px solid #000000;
}

.card-illustration {
  width: 100%;
  max-height: 180px;
  object-fit: cover;
  border-radius: 12px;
  border: 3px solid #000000;
  box-shadow: 0 3px 0 #000000;
  margin-bottom: 14px;
  display: block;
}

.quest-hero {
  text-align: center;
  padding: 12px 14px;
  background-color: #F8FAFC;
  border: 3px solid #000000;
  border-radius: 14px;
  margin-bottom: 14px;
}

.quest-word {
  margin: 0 0 4px 0;
  font-size: clamp(24px, 7vw, 36px);
  font-weight: 900;
  color: #0F172A;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.quest-ipa {
  font-size: 14px;
  font-weight: 800;
  color: #2563EB;
  font-family: "Lucida Sans Unicode", sans-serif;
  font-style: italic;
}

.quest-sound-dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.sound-card {
  background-color: #FFFFFF;
  border: 3px solid #000000;
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 3px 0 #000000;
}

.sound-card.us-card { border-left: 8px solid #EF4444; }
.sound-card.uk-card { border-left: 8px solid #38BDF8; }

.dock-flag {
  font-size: 10px;
  font-weight: 900;
  display: block;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.dock-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.quest-meaning-banner {
  background-color: #DCFCE7;
  border: 3px solid #000000;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #000000;
}

.meaning-quest-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #15803D;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.quest-meaning-fa {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #0F172A;
  line-height: 1.4;
}

.quest-example-card {
  background-color: #EFF6FF;
  border: 3px solid #000000;
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 0 3px 0 #000000;
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
  line-height: 1.4;
}

.quest-mnemonic-card {
  background-color: #FAF5FF;
  border: 3px solid #000000;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 3px 0 #000000;
}

.quest-tag-purple {
  font-size: 10px;
  font-weight: 900;
  color: #7E22CE;
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.quest-mnemonic {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1E293B;
  line-height: 1.35;
}

/* SPELLING QUEST */
.quest-prompt-center {
  background-color: #FAF5FF;
  border: 3px solid #000000;
  border-radius: 14px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
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
  border-radius: 12px !important;
  box-shadow: 0 4px 0 #3b8701 !important;
  font-size: 13px !important;
  padding: 12px 16px !important;
}

.quest-btn:active {
  transform: translateY(2px) !important;
  box-shadow: 0 2px 0 #3b8701 !important;
}

.spelling-input, .quest-input {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 12px 14px !important;
  font-family: inherit !important;
  font-size: 16px !important;
  font-weight: 800 !important;
  border: 3px solid #000000 !important;
  border-radius: 12px !important;
  background-color: #FFFFFF !important;
  color: #0F172A !important;
  outline: none !important;
}

.spelling-input::placeholder, .quest-input::placeholder {
  color: #64748B !important;
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
  border: 3px solid #000000 !important;
  padding: 12px !important;
  color: #0F172A !important;
}

.spelling-result.is-incorrect {
  background-color: #FEE2E2 !important;
  border: 3px solid #000000 !important;
  padding: 12px !important;
  color: #0F172A !important;
}

.spelling-success-badge { font-size: 13px !important; font-weight: 900 !important; color: #15803D !important; }
.spelling-word-reveal { font-size: 20px !important; font-weight: 900 !important; text-transform: uppercase !important; color: #0F172A !important; margin-top: 4px !important; }
.spelling-error-badge { font-size: 13px !important; font-weight: 900 !important; color: #DC2626 !important; margin-bottom: 4px !important; }
.spelling-compare-box { font-size: 13px !important; font-weight: 800 !important; color: #0F172A !important; }
.spelling-user-typed { color: #0F172A !important; margin-bottom: 2px !important; }
.spelling-label { color: #475569 !important; font-weight: 700 !important; }
.spelling-mistake { color: #DC2626 !important; text-decoration: line-through !important; font-weight: 900 !important; }
.spelling-correct-ans { color: #0F172A !important; margin-top: 4px !important; }
.spelling-exact { color: #15803D !important; font-size: 16px !important; font-weight: 900 !important; text-transform: uppercase !important; }

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #38BDF8 !important;
  border: 2px solid #000000 !important;
  color: #000000 !important;
  font-weight: 900 !important;
  padding: 3px 10px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  text-decoration: none !important;
  box-shadow: 0 2px 0 #0284c7 !important;
  border-radius: 8px !important;
  text-transform: uppercase !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #7dd3fc !important;
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
