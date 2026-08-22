import { ThemeDefinition } from '../types';
import { sharedFrontHtml, sharedBackHtml } from './templates';

const css = `/* THEME 4: MINIMAL LINE COMIC DARK */
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

.comic-card-wrapper {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-sizing: border-box;
}

.comic-card {
  width: 100%;
  background-color: #1E293B;
  border: 2px solid #475569;
  box-shadow: 3px 3px 0px #000000;
  padding: 20px;
  box-sizing: border-box;
  text-align: left;
  border-radius: 0;
}

.comic-word-section {
  width: 100%;
  background-color: #0F172A;
  border: 2px solid #475569;
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
  color: #F8FAFC;
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
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 3px 8px;
  border: 1.5px solid #475569;
  line-height: 1.2;
}

.badge-pos {
  background-color: #FDE047;
  color: #000000;
}

.badge-ipa {
  background-color: #7DD3FC;
  color: #000000;
  font-family: "Lucida Sans Unicode", "DejaVu Sans", sans-serif;
  font-style: italic;
}

.comic-pronunciation-box {
  width: 100%;
  box-sizing: border-box;
  background-color: #0F172A;
  border: 2px solid #475569;
  padding: 10px 12px;
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.audio-region {
  box-sizing: border-box;
  padding: 6px 8px;
  border: 1.5px solid #334155;
  background-color: #1E293B;
}

.region-us {
  border-left: 5px solid #F43F5E;
}

.region-uk {
  border-left: 5px solid #38BDF8;
}

.audio-region-title {
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  color: #F8FAFC;
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
  color: #94A3B8;
}

.comic-hint-box {
  background-color: #0F172A;
  border: 1.5px solid #475569;
  border-left: 5px solid #FDE047;
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
  height: 2px;
  background-color: #475569;
  margin: 14px 0 16px 0;
}

.comic-meaning-box {
  background-color: #064E3B;
  border: 1.5px solid #059669;
  border-left: 5px solid #10B981;
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
.label-memory { color: #D8B4FE; }

.meaning-text {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: #F8FAFC;
  line-height: 1.4;
}

.comic-example-box {
  background-color: #1E3A8A;
  border: 1.5px solid #2563EB;
  border-left: 5px solid #3B82F6;
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
  color: #F1F5F9;
  font-weight: 700;
}

.example-fa {
  margin: 0;
  font-size: 13px;
  color: #CBD5E1;
  line-height: 1.4;
  font-weight: 600;
}

.comic-mnemonic-box {
  background-color: #581C87;
  border: 1.5px solid #7E22CE;
  border-left: 5px solid #A855F7;
  padding: 12px 14px;
  box-sizing: border-box;
}

.mnemonic-text {
  margin: 0;
  font-size: 13px;
  color: #F8FAFC;
  line-height: 1.4;
  font-weight: 700;
}

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
  border-radius: 0 !important;
}

.replay-button:hover, .play-button:hover, a.replay-button:hover, .comic-audio-btn:hover {
  background-color: #facc15 !important;
  transform: translate(-1px, -1px);
}

.replay-button svg, a.replay-button svg {
  width: 12px !important;
  height: 12px !important;
  fill: #000000 !important;
}
`;

export const comicMinimalDarkTheme: ThemeDefinition = {
  id: 'comic-minimal-dark',
  name: 'Minimal Line Dark',
  description: 'Matte dark slate comic panels with delicate ink outline boundaries.',
  frontHtml: sharedFrontHtml,
  backHtml: sharedBackHtml,
  css,
};
