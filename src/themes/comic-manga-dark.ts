import { ThemeDefinition } from '../types';
import { sharedFrontHtml, sharedBackHtml } from './templates';

const css = `/* THEME 3: GRAPHIC NOVEL / MANGA DARK */
.card {
  background-color: #09090B;
  color: #FAFAFA;
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
  background-color: #18181B;
  border: 3px solid #3F3F46;
  padding: 20px;
  box-sizing: border-box;
  text-align: left;
  border-radius: 0;
}

.comic-word-section {
  width: 100%;
  background-color: #27272A;
  border: 2px solid #52525B;
  border-left: 8px solid #38BDF8;
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
  color: #FAFAFA;
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
  border: 2px solid #52525B;
  line-height: 1.2;
}

.badge-pos {
  background-color: #FAFAFA;
  color: #09090B;
}

.badge-ipa {
  background-color: #38BDF8;
  color: #09090B;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-pronunciation-box {
  width: 100%;
  box-sizing: border-box;
  background-color: #09090B;
  border: 2px solid #3F3F46;
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-region {
  box-sizing: border-box;
  padding: 6px 8px;
  border: 2px solid #27272A;
  background-color: #18181B;
}

.region-us {
  border-left: 6px solid #38BDF8;
}

.region-uk {
  border-left: 6px solid #34D399;
}

.audio-region-title {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  color: #FAFAFA;
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
  color: #A1A1AA;
}

.comic-hint-box {
  background-color: #27272A;
  border: 2px solid #3F3F46;
  border-left: 6px solid #FAFAFA;
  padding: 12px 14px;
  box-sizing: border-box;
}

.hint-label {
  display: block;
  font-size: 10px;
  font-weight: 900;
  color: #A1A1AA;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}

.comic-example-en {
  margin: 0;
  font-size: 15px;
  line-height: 1.45;
  color: #F4F4F5;
  font-weight: 700;
  font-style: italic;
}

.comic-divider {
  height: 2px;
  background-color: #3F3F46;
  margin: 14px 0 16px 0;
}

.comic-meaning-box {
  background-color: #064E3B;
  border: 2px solid #047857;
  border-left: 6px solid #10B981;
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

.label-meaning { color: #6EE7B7; }
.label-example { color: #93C5FD; }
.label-memory { color: #C4B5FD; }

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #FAFAFA;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #1E3A8A;
  border: 2px solid #1D4ED8;
  border-left: 6px solid #3B82F6;
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
  color: #BFDBFE;
}

.example-en {
  margin: 0 0 4px 0;
  font-size: 14px;
  line-height: 1.45;
  color: #F4F4F5;
  font-weight: 700;
}

.example-fa {
  margin: 0;
  font-size: 13px;
  color: #A1A1AA;
  line-height: 1.4;
  font-weight: 600;
}

.comic-mnemonic-box {
  background-color: #4C1D95;
  border: 2px solid #6D28D9;
  border-left: 6px solid #8B5CF6;
  padding: 12px 14px;
  box-sizing: border-box;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #FAFAFA;
  line-height: 1.4;
  font-weight: 700;
}

.replay-button, .play-button, a.replay-button, .comic-audio-btn {
  background-color: #FAFAFA !important;
  border: 2px solid #52525B !important;
  color: #09090B !important;
  font-weight: 900 !important;
  padding: 2px 8px !important;
  cursor: pointer !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 10px !important;
  text-decoration: none !important;
  text-transform: uppercase !important;
  border-radius: 0 !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #38BDF8 !important;
}

.replay-button svg, a.replay-button svg {
  width: 12px !important;
  height: 12px !important;
  fill: #09090B !important;
}
`;

export const comicMangaDarkTheme: ThemeDefinition = {
  id: 'comic-manga-dark',
  name: 'Graphic Novel Dark',
  description: 'Pitch black graphic novel aesthetic with crisp geometric paneling and neon cyan ink lines.',
  frontHtml: sharedFrontHtml,
  backHtml: sharedBackHtml,
  css,
};
