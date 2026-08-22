import { ThemeDefinition } from '../types';
import { heroPopFrontNormalHtml, heroPopBackHtml } from './templates';

const css = `/* THEME 1: HERO POP LIGHT */
.card {
  background-color: #FEF9C3 !important;
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
  background-color: #FEF9C3 !important;
  color: #000000 !important;
}

.comic-card-wrapper {
  width: 100%;
  max-width: 900px !important; flex: 1 !important; display: flex !important; flex-direction: column !important;
  margin: 0 auto;
  box-sizing: border-box;
}

.comic-card {
  width: 100%;
  background-color: #FFFFFF;
  border: 4px solid #000000;
  box-shadow: 6px 6px 0px #000000;
  padding: 20px;
  box-sizing: border-box;
  text-align: left;
  border-radius: 4px;
}

.card-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.hero-badge {
  font-size: 11px;
  font-weight: 900;
  background-color: #FF4B4B;
  color: #FFFFFF;
  padding: 3px 8px;
  border: 2px solid #000000;
  box-shadow: 2px 2px 0px #000000;
  letter-spacing: 0.5px;
}

.hero-badge.badge-spelling {
  background-color: #8B5CF6;
}

.card-illustration {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  margin-bottom: 14px;
  display: block;
  background-color: #F8FAFC;
}

.comic-word-section {
  width: 100%;
  background-color: #FFD93D;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-sizing: border-box;
}

.comic-title-row {
  width: 100%;
  margin-bottom: 8px;
}

.comic-title {
  margin: 0;
  font-size: clamp(22px, 6vw, 32px);
  font-weight: 900;
  color: #000000;
  letter-spacing: -0.5px;
  text-transform: uppercase;
  line-height: 1.15;
  white-space: normal;
  word-break: normal;
  overflow-wrap: break-word;
  max-width: 100%;
  display: block;
}

.comic-badges-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.comic-badge {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border: 2px solid #000000;
  line-height: 1.2;
}

.badge-pos {
  background-color: #4ADE80;
  color: #000000;
}

.badge-ipa {
  background-color: #FFFFFF;
  color: #000000;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-pronunciation-box {
  width: 100%;
  box-sizing: border-box;
  background-color: #F8FAFC;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-region {
  box-sizing: border-box;
  padding: 6px 8px;
  border: 2px solid #000000;
  background-color: #FFFFFF;
}

.region-us {
  border-left: 6px solid #FF4B4B;
}

.region-uk {
  border-left: 6px solid #38BDF8;
}

.audio-region-title {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  color: #000000;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.audio-buttons-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.audio-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.speed-label {
  font-size: 11px;
  font-weight: 800;
  color: #475569;
}

.comic-hint-box {
  background-color: #FFFBEB;
  border: 2px solid #000000;
  border-left: 6px solid #F59E0B;
  padding: 12px 14px;
  box-sizing: border-box;
}

.hint-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #B45309;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.comic-example-en {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: #000000;
  font-weight: 700;
  font-style: italic;
}

.comic-divider {
  height: 4px;
  background-color: #000000;
  margin: 14px 0 16px 0;
}

.comic-meaning-box {
  background-color: #DCFCE7;
  border: 2px solid #000000;
  border-left: 6px solid #16A34A;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-sizing: border-box;
}

.box-label {
  display: block;
  font-size: 11px;
  font-weight: 900;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.label-meaning { color: #15803D; }
.label-example { color: #C2410C; }
.label-memory { color: #6D28D9; }

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #000000;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #FFEDD5;
  border: 2px solid #000000;
  border-left: 6px solid #EA580C;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-sizing: border-box;
}

.example-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 4px;
}

.example-audio-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.example-audio-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 800;
}

.example-en {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.45;
  color: #000000;
  font-weight: 700;
}

.example-fa {
  margin: 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
  font-weight: 600;
}

.comic-mnemonic-box {
  background-color: #F3E8FF;
  border: 2px solid #000000;
  border-left: 6px solid #9333EA;
  padding: 12px 14px;
  box-sizing: border-box;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #000000;
  line-height: 1.4;
  font-weight: 700;
}

/* SPELLING STYLES */
.spelling-prompt-box {
  background-color: #F3E8FF;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 14px 16px;
  margin-bottom: 14px;
}

.spelling-prompt-title {
  font-size: 10px;
  font-weight: 900;
  color: #6D28D9;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.spelling-sentence {
  font-size: 16px;
  font-weight: 800;
  color: #000000;
  line-height: 1.4;
}

.spelling-interactive-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
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
}

.spelling-input.is-valid {
  border-color: #16A34A;
  background-color: #DCFCE7;
}

.spelling-input.has-error {
  border-color: #DC2626;
  background-color: #FEE2E2;
}

.spelling-check-btn {
  background-color: #FFD93D !important;
  color: #000000 !important;
  font-weight: 900 !important;
  font-size: 13px !important;
  padding: 10px 16px !important;
  border: 3px solid #000000 !important;
  box-shadow: 3px 3px 0px #000000 !important;
  cursor: pointer !important;
  text-transform: uppercase !important;
  transition: transform 0.1s;
}

.spelling-check-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #000000 !important;
}

.spelling-result {
  margin-top: 8px;
  border: 3px solid transparent;
  padding: 0;
  transition: all 0.2s ease;
}

.spelling-result.is-correct {
  background-color: #DCFCE7;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px;
}

.spelling-result.is-incorrect {
  background-color: #FEE2E2;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px;
}

.spelling-success-badge {
  font-size: 13px;
  font-weight: 900;
  color: #15803D;
}

.spelling-word-reveal {
  font-size: 20px;
  font-weight: 900;
  color: #000000;
  margin-top: 4px;
  text-transform: uppercase;
}

.spelling-error-badge {
  font-size: 13px;
  font-weight: 900;
  color: #DC2626;
  margin-bottom: 6px;
}

.spelling-compare-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  font-weight: 800;
}

.spelling-mistake {
  color: #DC2626;
  text-decoration: line-through;
  font-size: 16px;
}

.spelling-exact {
  color: #15803D;
  font-size: 18px;
  text-transform: uppercase;
}

/* AUDIO BUTTONS */
.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #FFD93D !important;
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
  background-color: #ffe066 !important;
  transform: translate(-1px, -1px);
}

.replay-button svg, a.replay-button svg {
  width: 12px !important;
  height: 12px !important;
  fill: #000000 !important;
}
`;

export const comicPopLightTheme: ThemeDefinition = {
  id: 'comic-pop-light',
  name: 'Hero Pop (Light)',
  description: 'Punchy comic hero cards with bold yellow title panels and vivid halftone badges.',
  frontHtml: heroPopFrontNormalHtml,
  backHtml: heroPopBackHtml,
  css,
};
