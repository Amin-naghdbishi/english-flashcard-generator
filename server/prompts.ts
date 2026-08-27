import { AIPromptsConfig, ManualOverrides } from '../src/types';

export const DEFAULT_AI_PROMPTS: AIPromptsConfig = {
  systemRole: `You are an expert English-Persian lexicographer and vocabulary flashcard teacher creating high-quality Anki flashcards for Persian-speaking English learners.`,

  meaningGeneration: `Generate a concise, accurate, and natural Persian meaning/translation (معنی فارسی) for the target English word. Provide the most common and clear Persian equivalent, avoiding unnecessarily verbose explanations or rare archaic meanings.`,

  exampleGeneration: `Generate exactly one short, clear, and natural English sentence demonstrating the target English word in proper grammatical and contextual usage. The sentence should clearly illustrate the meaning of the word without being excessively complex.`,

  exampleTranslation: `Provide a fluent, natural, and accurate Persian translation (ترجمه روان فارسی) of the English example sentence. The translation must sound natural in modern Persian while preserving the exact meaning and tone of the English sentence.`,

  memoryHook: `Create an effective Memory Hook (یادافزا / تکنیک یادسپاری) in Persian to help the learner remember the word by connecting it to parts, roots, or familiar words:

1. MORPHOLOGICAL DECOMPOSITION & ROOT RECOGNITION (Preferred when linguistically useful):
   - Identify meaningful parts, roots, prefixes, or suffixes of the word.
   - Split the word into recognizable components when this is linguistically useful.
   - Connect those components to familiar English words or concepts and explain each part in Persian:
     * Example: "readability → read (خواندن) + ability (توانایی) = قابلیت یا سهولت خوانده‌شدن (خوانایی)."
     * Example: "unpredictable → un- (پیشوند نفی/غیر) + predict (پیش‌بینی کردن) + -able (پذیر/شدنی) = غیرقابل پیش‌بینی."
   - Prefer real, genuine morphological and etymological relationships whenever possible instead of inventing random or forced associations.

2. INTELLIGENT ADAPTATION (DO NOT FORCE ARTIFICIAL SPLITS):
   - Do this intelligently. Not every word should be artificially split.
   - If a useful root, prefix, suffix, or recognizable component exists, use it.
   - If the word is a simple base word or does not have useful morphemes (e.g. "apple", "hesitate", "stone", "chair"), DO NOT force a meaningless or absurd decomposition. Instead, create a clever, memorable association, vivid mental image, rhyme, or familiar concept connection.

3. SENSE MATCHING & CONCISENESS:
   - The memory hook MUST strictly match the specific meaning and sense being taught.
   - Keep it concise, educational, and memorable (1 to 3 sentences maximum).`,

  missingFieldCompletion: `Strict missing-field completion and context consistency rules:
1. AUTHORITATIVE CONTEXT: Any field provided by the user (meaning, example, translation, part of speech, phonetic, mnemonic) is strictly authoritative ground truth. You must preserve it and NEVER alter, contradict, or overwrite it.
2. CRITICAL SENSE MATCHING: If the user provides a specific Persian meaning, all generated content (especially the English example sentence, part of speech, and memory hook) MUST strictly demonstrate and match THIS specific meaning/sense, NOT any alternate, secondary, or unrelated definitions of the word.
3. CRITICAL EXAMPLE & TRANSLATION LINK:
   - If the user provides an English example sentence, translationFa MUST be the direct, natural Persian translation of that exact sentence.
   - If the user provides a Persian translation sentence, example MUST be an English sentence containing the target word that translates to it.
4. COHESION & COMPLETION: Complete all missing fields so that the generated flashcard forms a unified, cohesive learning unit.`,

  phoneticAndPos: `- phonetic: Accurate International Phonetic Alphabet (IPA) pronunciation enclosed between slashes (e.g. /əˈbændən/).
- partOfSpeech: Most common grammatical part of speech for this sense (noun, verb, adjective, adverb, idiom, etc.).`,

  smartImageDecision: `Determine if the vocabulary word represents a concrete physical object, animal, person/profession, place, vehicle, food, tool, or visual entity that strongly benefits from an illustration on an Anki flashcard.
Abstract concepts (e.g. freedom, justice, happiness, diligence), verbs/actions (e.g. abandon, hesitate, evaluate), adjectives (e.g. ambiguous, crucial), and grammatical words must return false.`,
};

/**
 * Builds the comprehensive prompt sent to AI models (Ollama, Gemini, Custom AI)
 * using the centralized, user-customizable prompt configuration.
 */
export function buildFlashcardPrompt(
  word: string,
  manualOverrides: ManualOverrides = {},
  promptsConfig?: Partial<AIPromptsConfig>
): string {
  const prompts: AIPromptsConfig = {
    ...DEFAULT_AI_PROMPTS,
    ...(promptsConfig || {}),
  };

  const cleanWord = word.trim();
  const providedContext: string[] = [];

  if (manualOverrides.meaningFa?.trim()) {
    providedContext.push(`- User-Specified Persian Meaning: "${manualOverrides.meaningFa.trim()}"`);
  }
  if (manualOverrides.example?.trim()) {
    providedContext.push(`- User-Specified English Example: "${manualOverrides.example.trim()}"`);
  }
  if (manualOverrides.translationFa?.trim()) {
    providedContext.push(`- User-Specified Example Translation (Persian): "${manualOverrides.translationFa.trim()}"`);
  }
  if (manualOverrides.partOfSpeech?.trim()) {
    providedContext.push(`- User-Specified Part of Speech: "${manualOverrides.partOfSpeech.trim()}"`);
  }
  if (manualOverrides.phonetic?.trim()) {
    providedContext.push(`- User-Specified Phonetic IPA: "${manualOverrides.phonetic.trim()}"`);
  }
  if (manualOverrides.mnemonic?.trim()) {
    providedContext.push(`- User-Specified Mnemonic / Memory Hook: "${manualOverrides.mnemonic.trim()}"`);
  }

  const contextBlock =
    providedContext.length > 0
      ? `\n### AUTHORITATIVE USER CONTEXT (Do NOT alter or contradict any of these):\n${providedContext.join('\n')}\n`
      : '';

  const relationshipRules: string[] = [];

  if (manualOverrides.meaningFa?.trim()) {
    relationshipRules.push(
      `* CRITICAL SENSE MATCHING: The user specified the exact meaning "${manualOverrides.meaningFa.trim()}". All generated content (especially the English example sentence, part of speech, and mnemonic/memory hook) MUST strictly match and demonstrate THIS specific meaning/sense, NOT any alternate or unrelated definitions of "${cleanWord}". (For example, if the word is "extension" and the meaning is "پسوند فایل", the example sentence MUST be about a computer file extension like .txt, NOT a browser extension, hair extension, or deadline extension).`
    );
  }

  if (manualOverrides.example?.trim()) {
    relationshipRules.push(
      `* CRITICAL EXAMPLE & TRANSLATION RELATIONSHIP: The user has provided the exact English example sentence: "${manualOverrides.example.trim()}". You MUST preserve this sentence in the "example" field. The "translationFa" field MUST be the direct, natural Persian translation of THIS specific example sentence.`
    );
  } else if (manualOverrides.translationFa?.trim()) {
    relationshipRules.push(
      `* CRITICAL TRANSLATION TO EXAMPLE: The user provided the Persian sentence translation: "${manualOverrides.translationFa.trim()}". Generate an English example sentence that precisely translates to this and contains the word "${cleanWord}".`
    );
  }

  if (manualOverrides.partOfSpeech?.trim()) {
    relationshipRules.push(
      `* PART OF SPEECH: Use "${cleanWord}" strictly as a "${manualOverrides.partOfSpeech.trim()}" in the example sentence.`
    );
  }

  const rulesBlock =
    relationshipRules.length > 0
      ? `\n### ACTIVE RELATIONSHIP RULES:\n${relationshipRules.join('\n')}\n`
      : '';

  return `${prompts.systemRole}

Complete the vocabulary flashcard information for this English word:
"${cleanWord}"
${contextBlock}${rulesBlock}
### FIELD GENERATION INSTRUCTIONS:
1. Meaning Generation (meaningFa):
${prompts.meaningGeneration}

2. English Example Sentence (example):
${prompts.exampleGeneration}

3. Example Sentence Translation (translationFa):
${prompts.exampleTranslation}

4. Memory Hook / Mnemonic (mnemonic):
${prompts.memoryHook}

5. Phonetics & Part of Speech:
${prompts.phoneticAndPos}

### COMPLETION & VALIDATION RULES:
${prompts.missingFieldCompletion}

Return a structured JSON object with these exact keys:
- word: The target English word (preserve "${cleanWord}").
- phonetic: Accurate IPA pronunciation between slashes (e.g. /.../).
- partOfSpeech: Most common grammatical part of speech (noun, verb, adjective, etc.).
- meaningFa: Concise, natural, and accurate Persian meaning.
- example: Exactly one short, clear, natural English sentence illustrating the target word "${cleanWord}".
- translationFa: Fluent and natural Persian translation of the example sentence.
- mnemonic: The memory hook adhering to the guidelines above.

Return strictly valid JSON matching the schema without markdown formatting, code fences, or additional conversational text.`;
}

/**
 * Builds the prompt used for smart image evaluation using centralized prompt config.
 */
export function buildSmartImagePrompt(
  word: string,
  partOfSpeech: string = '',
  meaningFa: string = '',
  promptsConfig?: Partial<AIPromptsConfig>
): string {
  const prompts: AIPromptsConfig = {
    ...DEFAULT_AI_PROMPTS,
    ...(promptsConfig || {}),
  };

  return `${prompts.smartImageDecision}

Target Word: "${word}"
Part of Speech: "${partOfSpeech}"
Persian Meaning: "${meaningFa}"

Output ONLY JSON in this format:
{"needsImage": boolean, "searchTerm": "${word}", "reason": "brief explanation"}`;
}
