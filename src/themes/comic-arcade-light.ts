import { ThemeDefinition } from '../types';
import { sharedFrontHtml, sharedBackHtml } from './templates';

const css = `/* THEME 5: ARCADE CARTOON LIGHT */
.card {
  background-color: #FEF9C3;
  color: #000000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  padding: 16px 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
}

.comic-card-wrapper {
  width: 100%;
  max-width: 480px;
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

.comic-word-section {
  width: 100%;
  background-color: #BAE6FD;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  padding: 14px 16px;
  margin-bottom: 14px;
  border-radius: 4px;
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
  border-radius: 2px;
  line-height: 1.2;
}

.badge-pos {
  background-color: #F43F5E;
  color: #FFFFFF;
}

.badge-ipa {
  background-color: #FDE047;
  color: #000000;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-pronunciation-box {
  width: 100%;
  box-sizing: border-box;
  background-color: #FEF08A;
  border: 3px solid #000000;
  box-shadow: 3px 3px 0px #000000;
  border-radius: 4px;
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
  border-radius: 2px;
}

.region-us {
  border-left: 6px solid #F43F5E;
}

.region-uk {
  border-left: 6px solid #8B5CF6;
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
  color: #000000;
}

.comic-hint-box {
  background-color: #F1F5F9;
  border: 3px solid #000000;
  border-left: 6px solid #38BDF8;
  padding: 12px 14px;
  border-radius: 2px;
  box-sizing: border-box;
}

.hint-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #64748B;
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
  background-color: #BBF7D0;
  border: 3px solid #000000;
  border-left: 8px solid #22C55E;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: 4px;
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
.label-example { color: #BE185D; }
.label-memory { color: #6D28D9; }

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #000000;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #FECDD3;
  border: 3px solid #000000;
  border-left: 8px solid #F43F5E;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: 4px;
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
  background-color: #DDD6FE;
  border: 3px solid #000000;
  border-left: 8px solid #8B5CF6;
  box-shadow: 3px 3px 0px #000000;
  padding: 12px 14px;
  border-radius: 4px;
  box-sizing: border-box;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #000000;
  line-height: 1.4;
  font-weight: 700;
}

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
  border-radius: 2px !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #fb7185 !important;
  transform: translate(-1px, -1px);
}

.replay-button svg, a.replay-button svg {
  width: 12px !important;
  height: 12px !important;
  fill: #FFFFFF !important;
}
`;

export const comicArcadeLightTheme: ThemeDefinition = {
  id: 'comic-arcade-light',
  name: 'Arcade Cartoon Light',
  description: 'Playful cartoon arcade card with cheerful mint, candy red, and sunshine yellow panels.',
  frontHtml: sharedFrontHtml,
  backHtml: sharedBackHtml,
  css,
};
