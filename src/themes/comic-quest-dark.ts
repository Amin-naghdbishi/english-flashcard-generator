import { ThemeDefinition } from '../types';
import { duoQuestFrontNormalHtml, duoQuestBackHtml } from './templates';

const css = `/* THEME 3: DUO QUEST DARK */
.card {
  background-color: #0F172A;
  color: #F8FAFC;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 16px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.comic-card-wrapper.theme-quest {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-sizing: border-box;
}

.quest-card {
  width: 100%;
  background-color: #1E293B;
  border: 4px solid #000000;
  border-radius: 16px;
  box-shadow: 0 6px 0px #000000;
  padding: 20px;
  box-sizing: border-box;
  text-align: left;
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
  background-color: #22C55E;
  color: #000000;
  padding: 4px 10px;
  border-radius: 20px;
  border: 2px solid #000000;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.quest-level-pill.pill-spelling {
  background-color: #C084FC;
}

.quest-points {
  font-size: 12px;
  font-weight: 900;
  color: #FDE047;
  background-color: #713F12;
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
  background-color: #0F172A;
  border: 3px solid #000000;
  border-radius: 14px;
  margin-bottom: 14px;
}

.quest-word {
  margin: 0 0 4px 0;
  font-size: clamp(24px, 7vw, 36px);
  font-weight: 900;
  color: #F8FAFC;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
}

.quest-ipa {
  font-size: 14px;
  font-weight: 800;
  color: #38BDF8;
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
  background-color: #0F172A;
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
  color: #94A3B8;
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
  background-color: #064E3B;
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
  color: #34D399;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.quest-meaning-fa {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #F8FAFC;
  line-height: 1.4;
}

.quest-example-card {
  background-color: #1E3A8A;
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
  color: #93C5FD;
  text-transform: uppercase;
}

.quest-sentence {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 700;
  color: #F8FAFC;
  line-height: 1.4;
}

.quest-translation-fa {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #CBD5E1;
  line-height: 1.4;
}

.quest-mnemonic-card {
  background-color: #581C87;
  border: 3px solid #000000;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 3px 0 #000000;
}

.quest-tag-purple {
  font-size: 10px;
  font-weight: 900;
  color: #C084FC;
  display: block;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.quest-mnemonic {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #F8FAFC;
  line-height: 1.35;
}

/* SPELLING QUEST */
.quest-prompt-center {
  background-color: #3B0764;
  border: 3px solid #000000;
  border-radius: 14px;
  padding: 14px;
  text-align: center;
  margin-bottom: 12px;
}

.quest-instruction {
  font-size: 11px;
  font-weight: 900;
  color: #C084FC;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.quest-fill-sentence {
  font-size: 16px;
  font-weight: 800;
  color: #F8FAFC;
  line-height: 1.4;
}

.quest-sound-dock-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 11px;
  font-weight: 800;
  color: #CBD5E1;
}

.quest-input {
  border-radius: 12px !important;
  font-size: 16px !important;
  font-weight: 900 !important;
}

.quest-btn {
  background-color: #22C55E !important;
  color: #000000 !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 0 #15803d !important;
  font-size: 13px !important;
  padding: 12px 16px !important;
}

.quest-btn:active {
  transform: translateY(2px) !important;
  box-shadow: 0 2px 0 #15803d !important;
}

.spelling-interactive-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spelling-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-family: inherit;
  border: 3px solid #000000;
  background-color: #0F172A;
  color: #F8FAFC;
  outline: none;
}

.spelling-input.is-valid { background-color: #064E3B; border-color: #10B981; }
.spelling-input.has-error { background-color: #7F1D1D; border-color: #EF4444; }

.spelling-result {
  margin-top: 8px;
  border-radius: 12px;
  transition: all 0.2s;
}

.spelling-result.is-correct {
  background-color: #064E3B;
  border: 3px solid #000000;
  padding: 12px;
}

.spelling-result.is-incorrect {
  background-color: #7F1D1D;
  border: 3px solid #000000;
  padding: 12px;
}

.spelling-success-badge { font-size: 13px; font-weight: 900; color: #34D399; }
.spelling-word-reveal { font-size: 20px; font-weight: 900; color: #F8FAFC; text-transform: uppercase; }
.spelling-error-badge { font-size: 13px; font-weight: 900; color: #FCA5A5; margin-bottom: 4px; }
.spelling-compare-box { font-size: 13px; font-weight: 800; }
.spelling-mistake { color: #FCA5A5; text-decoration: line-through; }
.spelling-exact { color: #34D399; font-size: 16px; text-transform: uppercase; }

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

export const comicQuestDarkTheme: ThemeDefinition = {
  id: 'comic-quest-dark',
  name: 'Duo Quest (Dark)',
  description: 'Midnight gamified educational card with glowing XP accents and chunky tactile learning buttons.',
  frontHtml: duoQuestFrontNormalHtml,
  backHtml: duoQuestBackHtml,
  css,
};
