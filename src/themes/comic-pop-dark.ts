import { ThemeDefinition } from '../types';
import { sharedFrontHtml, sharedBackHtml } from './templates';

const css = `/* THEME 1: POP COMIC DARK */
.card {
  background-color: #12131A;
  color: #FFFFFF;
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
  background-color: #1E202B;
  border: 5px solid #000000;
  box-shadow: 6px 6px 0px #000000;
  padding: 20px;
  box-sizing: border-box;
  text-align: left;
  border-radius: 0;
}

.comic-word-section {
  width: 100%;
  background-color: #272A38;
  border: 4px solid #000000;
  padding: 14px 16px;
  margin-bottom: 14px;
  box-shadow: 4px 4px 0px #000000;
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
  color: #FFFFFF;
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
  box-shadow: 2px 2px 0px #000000;
  line-height: 1.2;
}

.badge-pos {
  background-color: #FFD93D;
  color: #000000;
}

.badge-ipa {
  background-color: #38BDF8;
  color: #000000;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-pronunciation-box {
  width: 100%;
  box-sizing: border-box;
  background-color: #181A24;
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
  background-color: #232635;
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
  color: #FFFFFF;
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
  color: #CBD5E1;
}

.comic-hint-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #FFD93D;
  padding: 12px 14px;
  box-sizing: border-box;
}

.hint-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #94A3B8;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.comic-example-en {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: #F1F5F9;
  font-weight: 700;
  font-style: italic;
}

.comic-divider {
  height: 4px;
  background-color: #000000;
  margin: 14px 0 16px 0;
}

.comic-meaning-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #4ADE80;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 3px 3px 0px #000000;
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

.label-meaning { color: #4ADE80; }
.label-example { color: #FB923C; }
.label-memory { color: #C084FC; }

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #FFFFFF;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #181A24;
  border: 3px solid #000000;
  border-left: 8px solid #FB923C;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 3px 3px 0px #000000;
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
  color: #CBD5E1;
}

.example-en {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.45;
  color: #F1F5F9;
  font-weight: 700;
}

.example-fa {
  margin: 0;
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.4;
  font-weight: 600;
}

.comic-mnemonic-box {
  background-color: #2D2447;
  border: 3px solid #000000;
  border-left: 8px solid #C084FC;
  padding: 12px 14px;
  box-shadow: 3px 3px 0px #000000;
  box-sizing: border-box;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #F1F5F9;
  line-height: 1.4;
  font-weight: 700;
}

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

export const comicPopDarkTheme: ThemeDefinition = {
  id: 'comic-pop-dark',
  name: 'Pop Comic Dark',
  description: 'Deep ink midnight canvas with vibrant pop-art panels and neon comic accents.',
  frontHtml: sharedFrontHtml,
  backHtml: sharedBackHtml,
  css,
};
