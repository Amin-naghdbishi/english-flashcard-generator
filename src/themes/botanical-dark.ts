import { ThemeDefinition } from '../types';
import { botanicalFrontNormalHtml, botanicalBackHtml } from './templates';

const css = `/* THEME 6: BOTANICAL SAGE (DARK) */
.card {
  background-color: #151813 !important;
  color: #D8E8D0 !important;
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
  background-color: #151813 !important;
  color: #D8E8D0 !important;
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
  background-color: #151813 !important;
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
  background-color: #1F241C !important;
  border-radius: 22px !important;
  padding: 20px 24px !important;
  text-align: center !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45) !important;
  border: 1px solid #2B3426 !important;
  box-sizing: border-box !important;
}

.botanical-word-box {
  padding: 22px 24px !important;
}

.botanical-word {
  margin: 0 !important;
  font-size: 38px !important;
  font-weight: 700 !important;
  color: #D8E8D0 !important;
  letter-spacing: -0.5px !important;
  line-height: 1.15 !important;
}

.botanical-pos {
  margin-top: 6px !important;
  font-size: 16px !important;
  font-weight: 500 !important;
  color: #7D8E75 !important;
}

/* Pronunciation & Audio Box */
.botanical-audio-box {
  padding: 24px 20px !important;
}

.botanical-ipa-pill {
  display: inline-block !important;
  background-color: #2D3828 !important;
  color: #FFFFFF !important;
  font-family: "Lucida Sans", "DejaVu Sans", "Segoe UI", sans-serif !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  padding: 8px 24px !important;
  border-radius: 8px !important;
  letter-spacing: 0.5px !important;
  border: 1px solid #3E4D38 !important;
}

.botanical-audio-divider {
  width: 100% !important;
  border-top: 1px solid #283223 !important;
  margin: 20px 0 !important;
}

.botanical-play-row,
.botanical-play-wrapper {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 14px !important;
  flex-wrap: wrap !important;
  margin: 0 auto !important;
}

/* Audio Button Styling (Pure Circle Play, No border/frame) */
.botanical-wrapper .preview-play-btn,
.botanical-wrapper .botanical-play-btn,
.botanical-wrapper .replay-button,
.botanical-wrapper a.replay-button,
.botanical-wrapper button[data-audio-target] {
  background-color: #3F5236 !important;
  color: #FFFFFF !important;
  width: 48px !important;
  height: 48px !important;
  min-width: 48px !important;
  min-height: 48px !important;
  max-width: 48px !important;
  max-height: 48px !important;
  border-radius: 50% !important;
  border: 0 !important;
  border-style: none !important;
  outline: none !important;
  box-shadow: none !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0 !important;
  margin: 0 !important;
  cursor: pointer !important;
  transition: transform 0.15s ease, background-color 0.15s ease !important;
}

.botanical-wrapper .preview-play-btn:hover,
.botanical-wrapper .botanical-play-btn:hover,
.botanical-wrapper .replay-button:hover,
.botanical-wrapper a.replay-button:hover {
  background-color: #4C6341 !important;
  transform: scale(1.06) !important;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
}

/* Completely remove green/gray circular outline from Anki default sound button */
.botanical-wrapper .replay-button svg,
.botanical-wrapper a.replay-button svg {
  width: 22px !important;
  height: 22px !important;
  border: none !important;
  outline: none !important;
}

.botanical-wrapper .replay-button svg circle,
.botanical-wrapper a.replay-button svg circle,
.botanical-wrapper .replay-button svg ellipse,
.botanical-wrapper a.replay-button svg ellipse {
  display: none !important;
  fill: none !important;
  stroke: none !important;
  border: none !important;
}

.botanical-wrapper .replay-button svg path,
.botanical-wrapper a.replay-button svg path,
.botanical-wrapper .replay-button svg polygon,
.botanical-wrapper a.replay-button svg polygon {
  fill: #FFFFFF !important;
  stroke: none !important;
}

/* Persian Meaning Box */
.botanical-meaning-box {
  padding: 24px 20px !important;
}

.botanical-meaning-text {
  font-size: 34px !important;
  font-weight: 800 !important;
  color: #F2F7EF !important;
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
  color: #A9BCA0 !important;
  line-height: 1.55 !important;
  margin: 0 0 12px 0 !important;
  font-weight: 500 !important;
}

.botanical-section-divider {
  width: 100% !important;
  border-top: 1px solid #283223 !important;
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
  color: #E6F2E3 !important;
  line-height: 1.45 !important;
  margin: 0 0 8px 0 !important;
}

.botanical-example-fa {
  font-size: 15px !important;
  font-weight: 500 !important;
  color: #97A98E !important;
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
  background-color: #181E15 !important;
  border: 1px solid #2D3927 !important;
  border-radius: 12px !important;
  padding: 10px 24px !important;
  color: #A8BCA0 !important;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

/* Card Image */
.botanical-card .card-illustration {
  max-width: 100% !important;
  max-height: 220px !important;
  border-radius: 20px !important;
  object-fit: cover !important;
  margin: 0 auto !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5) !important;
  border: 1px solid #2B3426 !important;
}

/* Spelling Card Elements */
.spelling-botanical .botanical-spelling-badge {
  display: inline-block !important;
  background-color: #2D3828 !important;
  color: #D8E8D0 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  padding: 6px 16px !important;
  border-radius: 12px !important;
  letter-spacing: 0.5px !important;
  border: 1px solid #3E4D38 !important;
}

.botanical-input {
  width: 100% !important;
  max-width: 380px !important;
  background-color: #1F241C !important;
  color: #E6F2E3 !important;
  border: 2px solid #3E4D38 !important;
  border-radius: 14px !important;
  padding: 12px 16px !important;
  font-size: 16px !important;
  font-weight: 700 !important;
  text-align: center !important;
  box-sizing: border-box !important;
}

.botanical-input:focus {
  outline: none !important;
  border-color: #6C825E !important;
  box-shadow: 0 0 0 3px rgba(108, 130, 94, 0.3) !important;
}

.botanical-btn {
  background-color: #3E4D38 !important;
  color: #FFFFFF !important;
  border: none !important;
  border-radius: 14px !important;
  padding: 12px 24px !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4) !important;
  margin-top: 8px !important;
}

.botanical-btn:hover {
  background-color: #4D6045 !important;
}

.spelling-interactive-area {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  gap: 8px !important;
  margin: 12px 0 !important;
}

.spelling-result {
  margin-top: 14px !important;
  text-align: center !important;
  display: block !important;
  box-sizing: border-box !important;
}

.spelling-result.is-correct {
  background-color: #1A2E16 !important;
  border: 2px solid #4ADE80 !important;
  color: #86EFAC !important;
  padding: 12px 20px !important;
  border-radius: 14px !important;
  font-size: 20px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
}

.spelling-result.is-incorrect {
  background-color: #381616 !important;
  border: 2px solid #EF4444 !important;
  color: #FCA5A5 !important;
  padding: 12px 20px !important;
  border-radius: 14px !important;
  font-size: 20px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
}

.spelling-word-reveal {
  font-size: 20px !important;
  font-weight: 800 !important;
  letter-spacing: 0.5px !important;
  display: inline-block !important;
}
`;

export const botanicalDarkTheme: ThemeDefinition = {
  id: 'botanical-dark',
  name: 'Botanical Sage (Dark)',
  description: 'Charcoal-olive night mode with dark sage surfaces, pale matcha accents, and subtle borders.',
  frontHtml: botanicalFrontNormalHtml,
  backHtml: botanicalBackHtml,
  css,
};
