import { ThemeDefinition } from '../types';
import { botanicalFrontNormalHtml, botanicalBackHtml } from './templates';

const css = `/* THEME 5: BOTANICAL SAGE (LIGHT) */
.card {
  background-color: #C8D7BD !important;
  color: #445339 !important;
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
  background-color: #C8D7BD !important;
  color: #445339 !important;
}

.botanical-wrapper {
  width: 100% !important;
  max-width: 100% !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  margin: 0 !important;
  padding: 24px 16px !important;
  box-sizing: border-box !important;
  background-color: #C8D7BD !important;
}

.botanical-card {
  width: 100% !important;
  max-width: 480px !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 16px !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
  text-align: center;
}

/* Rounded Surface Boxes */
.botanical-box {
  background-color: #F4F5ED !important;
  border-radius: 22px !important;
  padding: 20px 24px !important;
  text-align: center !important;
  box-shadow: 0 2px 8px rgba(68, 83, 57, 0.06) !important;
  border: 1px solid rgba(180, 196, 169, 0.3) !important;
  box-sizing: border-box !important;
}

.botanical-word-box {
  padding: 22px 24px !important;
}

.botanical-word {
  margin: 0 !important;
  font-size: 38px !important;
  font-weight: 700 !important;
  color: #445339 !important;
  letter-spacing: -0.5px !important;
  line-height: 1.15 !important;
}

.botanical-pos {
  margin-top: 6px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  color: #6C7D5E !important;
}

/* Pronunciation & Audio Box */
.botanical-audio-box {
  padding: 24px 20px !important;
}

.botanical-ipa-pill {
  display: inline-block !important;
  background-color: #617352 !important;
  color: #FFFFFF !important;
  font-family: "Lucida Sans", "DejaVu Sans", "Segoe UI", sans-serif !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  padding: 8px 24px !important;
  border-radius: 8px !important;
  letter-spacing: 0.5px !important;
}

.botanical-audio-divider {
  width: 100% !important;
  border-top: 1px solid #D6DFC9 !important;
  margin: 20px 0 !important;
}

.botanical-play-wrapper {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 10px !important;
}

.botanical-audio-main {
  display: flex !important;
  justify-content: center !important;
}

.botanical-audio-options {
  display: flex !important;
  justify-content: center !important;
  gap: 8px !important;
  flex-wrap: wrap !important;
}

.botanical-audio-sub {
  font-size: 11px !important;
}

/* Audio Button Styling (Circle Play) */
.botanical-wrapper .preview-play-btn,
.botanical-wrapper .replay-button,
.botanical-wrapper a.replay-button,
.botanical-wrapper button[data-audio-target] {
  background-color: #6E8060 !important;
  color: #FFFFFF !important;
  border-radius: 50px !important;
  border: none !important;
  padding: 8px 16px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: transform 0.15s ease, background-color 0.15s ease !important;
  box-shadow: 0 3px 8px rgba(68, 83, 57, 0.2) !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.botanical-audio-main .preview-play-btn,
.botanical-audio-main .replay-button,
.botanical-audio-main a.replay-button {
  width: 52px !important;
  height: 52px !important;
  border-radius: 50% !important;
  padding: 0 !important;
  justify-content: center !important;
  font-size: 16px !important;
}

.botanical-wrapper .preview-play-btn:hover,
.botanical-wrapper .replay-button:hover,
.botanical-wrapper a.replay-button:hover {
  background-color: #5D6F4F !important;
  transform: scale(1.05) !important;
}

/* Persian Meaning Box */
.botanical-meaning-box {
  padding: 24px 20px !important;
}

.botanical-meaning-text {
  font-size: 34px !important;
  font-weight: 800 !important;
  color: #2B3522 !important;
  font-family: "Vazirmatn", "Tahoma", sans-serif !important;
  line-height: 1.35 !important;
  margin: 0 !important;
}

/* English Definition Section */
.botanical-definition-section {
  text-align: center !important;
  padding: 4px 12px !important;
}

.botanical-definition-text {
  font-size: 16px !important;
  color: #4A5A3F !important;
  line-height: 1.55 !important;
  margin: 0 0 12px 0 !important;
  font-weight: 500 !important;
}

.botanical-section-divider {
  width: 100% !important;
  border-top: 1px solid #B4C4A9 !important;
  margin: 8px 0 14px 0 !important;
}

/* Example & Translation Section */
.botanical-example-section {
  text-align: center !important;
  padding: 6px 12px !important;
}

.botanical-example-en {
  font-size: 18px !important;
  font-weight: 700 !important;
  color: #27321F !important;
  line-height: 1.45 !important;
  margin: 0 0 8px 0 !important;
}

.botanical-example-fa {
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #4A5A3F !important;
  line-height: 1.45 !important;
  margin: 0 0 10px 0 !important;
  font-family: "Vazirmatn", "Tahoma", sans-serif !important;
}

.botanical-example-audio-row {
  display: flex !important;
  justify-content: center !important;
  gap: 8px !important;
  margin-top: 4px !important;
}

/* Mnemonic Pill */
.botanical-mnemonic-container {
  display: flex !important;
  justify-content: center !important;
  margin-top: 4px !important;
  margin-bottom: 8px !important;
}

.botanical-mnemonic-box {
  display: inline-block !important;
  background-color: #D8E4CF !important;
  border: 1px solid #A2B395 !important;
  border-radius: 12px !important;
  padding: 10px 24px !important;
  color: #36442B !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  text-align: center !important;
  max-width: 90% !important;
  word-break: break-word !important;
}

/* Custom Blocks on Botanical Theme */
.botanical-card .custom-card-block {
  border-radius: 18px !important;
  padding: 14px 18px !important;
  margin-top: 8px !important;
  box-shadow: 0 2px 8px rgba(68, 83, 57, 0.08) !important;
}

/* Card Image */
.botanical-card .card-illustration {
  max-width: 100% !important;
  max-height: 220px !important;
  border-radius: 20px !important;
  object-fit: cover !important;
  margin: 0 auto !important;
  box-shadow: 0 4px 12px rgba(68, 83, 57, 0.15) !important;
  border: 1px solid rgba(180, 196, 169, 0.4) !important;
}

/* Spelling Card Elements */
.spelling-botanical .botanical-spelling-badge {
  display: inline-block !important;
  background-color: #617352 !important;
  color: #FFFFFF !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  padding: 6px 16px !important;
  border-radius: 12px !important;
  letter-spacing: 0.5px !important;
}

.botanical-input {
  width: 100% !important;
  max-width: 380px !important;
  background-color: #F4F5ED !important;
  color: #27321F !important;
  border: 2px solid #A2B395 !important;
  border-radius: 14px !important;
  padding: 12px 16px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  text-align: center !important;
  box-sizing: border-box !important;
}

.botanical-input:focus {
  outline: none !important;
  border-color: #617352 !important;
  box-shadow: 0 0 0 3px rgba(97, 115, 82, 0.25) !important;
}

.botanical-btn {
  background-color: #617352 !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 12px 24px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 3px 8px rgba(68, 83, 57, 0.25) !important;
  margin-top: 8px !important;
}

.botanical-btn:hover {
  background-color: #506143 !important;
}

.spelling-interactive-area {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 8px !important;
  margin: 12px 0 !important;
}

.spelling-result.is-correct {
  background-color: #D8E4CF !important;
  border: 1px solid #7E976E !important;
  color: #27321F !important;
  padding: 10px 16px !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
}

.spelling-result.is-incorrect {
  background-color: #FCE8E6 !important;
  border: 1px solid #EA4335 !important;
  color: #B3261E !important;
  padding: 10px 16px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
}
`;

export const botanicalLightTheme: ThemeDefinition = {
  id: 'botanical-light',
  name: 'Botanical Sage (Light)',
  description: 'Elegant Matcha and Sage palette with soft cream rounded surfaces and calm organic typography.',
  frontHtml: botanicalFrontNormalHtml,
  backHtml: botanicalBackHtml,
  css,
};
