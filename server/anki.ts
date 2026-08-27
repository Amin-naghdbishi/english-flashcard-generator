import { THEMES, getSpellingFrontHtml, renderCustomBlocksHtml, SHARED_CARD_CSS } from '../src/themes';
import { CardData, ThemeId, CardType } from '../src/types';
import { renderMarkdown } from '../src/utils/markdown';

export const ANKI_NOTE_TYPE_NAME = 'AI Vocabulary';
export const ANKI_MODEL_FIELDS = [
  'Word',
  'Phonetic',
  'PartOfSpeech',
  'Meaning',
  'Example',
  'Translation',
  'Mnemonic',
  'CardImage',
  'SpellingSentence',
  'CardType',
  'WordAudio',
  'ExampleAudio',
  'WordAudioUsNormal',
  'WordAudioUsSlow',
  'WordAudioUkNormal',
  'WordAudioUkSlow',
  'ExampleAudioUsNormal',
  'ExampleAudioUsSlow',
  'ExampleAudioUkNormal',
  'ExampleAudioUkSlow',
  'CustomSections',
];

export async function callAnkiConnect(
  baseUrl: string,
  action: string,
  params: Record<string, any> = {}
): Promise<{ success: boolean; result?: any; error?: string }> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        version: 6,
        params,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        error: `AnkiConnect returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    if (data.error) {
      return {
        success: false,
        error: data.error,
      };
    }

    return {
      success: true,
      result: data.result,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Cannot reach AnkiConnect. Is Anki open with the AnkiConnect addon installed?',
    };
  }
}

export async function checkAnkiConnection(baseUrl: string = 'http://127.0.0.1:8765'): Promise<{
  connected: boolean;
  version?: number;
  error?: string;
}> {
  const res = await callAnkiConnect(baseUrl, 'version');
  if (res.success) {
    return {
      connected: true,
      version: res.result,
    };
  }
  return {
    connected: false,
    error: res.error,
  };
}

export async function getAnkiDecks(baseUrl: string = 'http://127.0.0.1:8765'): Promise<{
  success: boolean;
  decks: string[];
  error?: string;
}> {
  const res = await callAnkiConnect(baseUrl, 'deckNames');
  if (res.success && Array.isArray(res.result)) {
    return {
      success: true,
      decks: res.result,
    };
  }
  return {
    success: false,
    decks: [],
    error: res.error,
  };
}

export function getThemedModelName(
  themeId: ThemeId = 'comic-pop-dark',
  cardType: CardType = 'normal'
): string {
  const theme = THEMES[themeId] || THEMES['comic-pop-dark'];
  const cleanName = theme?.name || themeId;
  const suffix = cardType === 'spelling' ? ' (Spelling)' : ' (Normal)';
  return `AI Vocabulary - ${cleanName}${suffix}`;
}

export async function ensureAnkiModel(
  baseUrl: string = 'http://127.0.0.1:8765',
  themeId: ThemeId = 'comic-pop-dark',
  cardType: CardType = 'normal',
  specificModelName?: string
): Promise<{
  success: boolean;
  modelCreatedOrUpdated: boolean;
  message: string;
  error?: string;
}> {
  const theme = THEMES[themeId] || THEMES['comic-pop-dark'];
  const frontHtml = cardType === 'spelling' ? getSpellingFrontHtml(themeId) : theme.frontHtml;
  const backHtml = theme.backHtml;

  // Embed full custom CSS directly into template HTML to guarantee exact visual theme rendering in Anki & AnkiDroid
  const fullFrontHtml = `<style>\n${theme.css}\n${SHARED_CARD_CSS}\n</style>\n${frontHtml}`;
  const fullBackHtml = `<style>\n${theme.css}\n${SHARED_CARD_CSS}\n</style>\n${backHtml}`;

  const targetModel = specificModelName || getThemedModelName(themeId, cardType);
  const cardTemplateName = cardType === 'spelling' ? 'Spelling Card' : 'Vocabulary Card';

  // Check existing models from Anki
  const modelsRes = await callAnkiConnect(baseUrl, 'modelNames');
  if (!modelsRes.success) {
    return {
      success: false,
      modelCreatedOrUpdated: false,
      message: 'Failed to query existing note types from Anki',
      error: modelsRes.error,
    };
  }

  const existingModels: string[] = modelsRes.result || [];
  const modelExists = existingModels.includes(targetModel);

  if (!modelExists) {
    // Create new model with full styling and EXACTLY ONE required template
    const createRes = await callAnkiConnect(baseUrl, 'createModel', {
      modelName: targetModel,
      inOrderFields: ANKI_MODEL_FIELDS,
      css: `${theme.css}\n${SHARED_CARD_CSS}`,
      cardTemplates: [
        {
          Name: cardTemplateName,
          Front: fullFrontHtml,
          Back: fullBackHtml,
        },
      ],
    });

    if (!createRes.success) {
      return {
        success: false,
        modelCreatedOrUpdated: false,
        message: `Could not create note type '${targetModel}' in Anki`,
        error: createRes.error,
      };
    }

    return {
      success: true,
      modelCreatedOrUpdated: true,
      message: `Created '${targetModel}' model in Anki with ${theme.name} templates and CSS.`,
    };
  } else {
    // 1. Ensure all required fields exist in Anki note type
    const fieldsRes = await callAnkiConnect(baseUrl, 'modelFieldNames', {
      modelName: targetModel,
    });
    if (fieldsRes.success && Array.isArray(fieldsRes.result)) {
      const currentFields: string[] = fieldsRes.result;
      for (const requiredField of ANKI_MODEL_FIELDS) {
        if (!currentFields.includes(requiredField)) {
          await callAnkiConnect(baseUrl, 'modelFieldAdd', {
            model: { name: targetModel },
            field: requiredField,
          });
        }
      }
    }

    // 2. Update model CSS styling
    await callAnkiConnect(baseUrl, 'updateModelStyling', {
      model: {
        name: targetModel,
        css: `${theme.css}\n${SHARED_CARD_CSS}`,
      },
    });

    // 3. Find template card names and update ONLY the primary template (avoiding duplicate identical templates)
    const templatesRes = await callAnkiConnect(baseUrl, 'modelTemplates', {
      modelName: targetModel,
    });

    if (templatesRes.success && typeof templatesRes.result === 'object' && templatesRes.result !== null) {
      const existingTemplateNames = Object.keys(templatesRes.result);
      if (existingTemplateNames.length > 0) {
        const primaryTemplateName = existingTemplateNames[0];
        const templateUpdates: Record<string, { Front: string; Back: string }> = {
          [primaryTemplateName]: {
            Front: fullFrontHtml,
            Back: fullBackHtml,
          },
        };

        await callAnkiConnect(baseUrl, 'updateModelTemplates', {
          model: {
            name: targetModel,
            templates: templateUpdates,
          },
        });
      }
    }

    return {
      success: true,
      modelCreatedOrUpdated: true,
      message: `Updated '${targetModel}' model in Anki with latest ${theme.name} CSS and templates.`,
    };
  }
}

export async function checkDuplicateInDeck(
  baseUrl: string,
  deckName: string,
  word: string
): Promise<{
  isDuplicate: boolean;
  existingNoteIds: number[];
  error?: string;
}> {
  const query = `deck:"${deckName}" "Word:${word.trim()}"`;
  const res = await callAnkiConnect(baseUrl, 'findNotes', { query });

  if (res.success && Array.isArray(res.result)) {
    return {
      isDuplicate: res.result.length > 0,
      existingNoteIds: res.result,
    };
  }

  return {
    isDuplicate: false,
    existingNoteIds: [],
    error: res.error,
  };
}

export async function verifyFullAnkiNoteAndCards(
  baseUrl: string,
  noteId: number,
  expectedDeck: string
): Promise<{
  success: boolean;
  isVerified: boolean;
  error?: string;
  verification?: any;
}> {
  try {
    const notesRes = await callAnkiConnect(baseUrl, 'notesInfo', { notes: [noteId] });
    if (!notesRes.success || !Array.isArray(notesRes.result) || notesRes.result.length === 0) {
      return {
        success: false,
        isVerified: false,
        error: `Could not fetch note #${noteId} info from Anki`,
      };
    }

    const noteInfo = notesRes.result[0];
    const cardIds: number[] = noteInfo.cards || [];

    if (cardIds.length === 0) {
      return {
        success: false,
        isVerified: false,
        error: `Note #${noteId} has 0 cards associated with it in Anki`,
      };
    }

    const cardsRes = await callAnkiConnect(baseUrl, 'cardsInfo', { cards: cardIds });
    if (!cardsRes.success || !Array.isArray(cardsRes.result) || cardsRes.result.length === 0) {
      return {
        success: false,
        isVerified: false,
        error: `Could not fetch cards info for note #${noteId} (Card IDs: [${cardIds.join(', ')}])`,
      };
    }

    const cardsInfo = cardsRes.result;
    const firstCard = cardsInfo[0];
    const actualDeck = firstCard.deckName || expectedDeck;
    const deckMatched = actualDeck.trim().toLowerCase() === expectedDeck.trim().toLowerCase();

    const verification = {
      noteId,
      cardIds,
      targetDeck: expectedDeck,
      actualDeck,
      modelName: noteInfo.modelName,
      tags: noteInfo.tags || [],
      fields: Object.fromEntries(
        Object.entries(noteInfo.fields || {}).map(([k, v]: [string, any]) => [k, v.value])
      ),
      cardsCount: cardsInfo.length,
      cardsInfo: cardsInfo.map((c: any) => ({
        cardId: c.cardId,
        deckName: c.deckName,
        noteId: c.note,
        ord: c.ord,
        queue: c.queue,
        queueLabel: c.queue === 0 ? 'New' : c.queue === 1 ? 'Learning' : c.queue === 2 ? 'Review' : 'Suspended',
        type: c.type,
        typeLabel: c.type === 0 ? 'New' : c.type === 1 ? 'Learn' : 'Review',
        due: c.due,
        suspended: c.queue === -1,
      })),
      deckMatched,
      isSuspended: cardsInfo.some((c: any) => c.queue === -1),
      isVerified: true,
      verificationMessage: `Verified Note #${noteId} with ${cardsInfo.length} active card(s) in deck "${actualDeck}"`,
    };

    return {
      success: true,
      isVerified: true,
      verification,
    };
  } catch (err: any) {
    return {
      success: false,
      isVerified: false,
      error: `Verification error: ${err?.message}`,
    };
  }
}

export async function createAnkiNote(
  baseUrl: string,
  deckName: string,
  cardData: CardData,
  themeId: ThemeId = 'comic-pop-dark',
  cardType: CardType = 'normal'
): Promise<{
  success: boolean;
  noteId?: number;
  cardIds?: number[];
  verification?: any;
  error?: string;
}> {
  const targetDeck = deckName.trim();
  const effectiveCardType = cardData.cardType || cardType || 'normal';

  const targetModelName = getThemedModelName(themeId, effectiveCardType);

  // 1. Ensure Model exists in Anki with complete HTML/CSS templates
  const modelRes = await ensureAnkiModel(baseUrl, themeId, effectiveCardType, targetModelName);
  if (!modelRes.success) {
    return {
      success: false,
      error: `Model setup failed: ${modelRes.error || modelRes.message}`,
    };
  }

  // 2. Ensure Deck exists in Anki
  const deckRes = await callAnkiConnect(baseUrl, 'createDeck', { deck: targetDeck });
  if (!deckRes.success) {
    return {
      success: false,
      error: `Failed to ensure deck '${targetDeck}': ${deckRes.error}`,
    };
  }

  // 3. Store Audio files if present
  const audioUploads: Array<{ fileName?: string; base64?: string; label: string }> = [];

  if (cardData.wordAudioUsNormalFileName && cardData.wordAudioUsNormalBase64) {
    audioUploads.push({ fileName: cardData.wordAudioUsNormalFileName, base64: cardData.wordAudioUsNormalBase64, label: 'US Normal' });
  }
  if (cardData.wordAudioUsSlowFileName && cardData.wordAudioUsSlowBase64) {
    audioUploads.push({ fileName: cardData.wordAudioUsSlowFileName, base64: cardData.wordAudioUsSlowBase64, label: 'US Slow' });
  }
  if (cardData.wordAudioUkNormalFileName && cardData.wordAudioUkNormalBase64) {
    audioUploads.push({ fileName: cardData.wordAudioUkNormalFileName, base64: cardData.wordAudioUkNormalBase64, label: 'UK Normal' });
  }
  if (cardData.wordAudioUkSlowFileName && cardData.wordAudioUkSlowBase64) {
    audioUploads.push({ fileName: cardData.wordAudioUkSlowFileName, base64: cardData.wordAudioUkSlowBase64, label: 'UK Slow' });
  }
  if (cardData.exampleAudioUsNormalFileName && cardData.exampleAudioUsNormalBase64) {
    audioUploads.push({ fileName: cardData.exampleAudioUsNormalFileName, base64: cardData.exampleAudioUsNormalBase64, label: 'Example US Normal' });
  }
  if (cardData.exampleAudioUsSlowFileName && cardData.exampleAudioUsSlowBase64) {
    audioUploads.push({ fileName: cardData.exampleAudioUsSlowFileName, base64: cardData.exampleAudioUsSlowBase64, label: 'Example US Slow' });
  }
  if (cardData.exampleAudioUkNormalFileName && cardData.exampleAudioUkNormalBase64) {
    audioUploads.push({ fileName: cardData.exampleAudioUkNormalFileName, base64: cardData.exampleAudioUkNormalBase64, label: 'Example UK Normal' });
  }
  if (cardData.exampleAudioUkSlowFileName && cardData.exampleAudioUkSlowBase64) {
    audioUploads.push({ fileName: cardData.exampleAudioUkSlowFileName, base64: cardData.exampleAudioUkSlowBase64, label: 'Example UK Slow' });
  }
  if (cardData.audioFiles && Array.isArray(cardData.audioFiles)) {
    for (const f of cardData.audioFiles) {
      if (f.fileName && f.base64 && !audioUploads.some((u) => u.fileName === f.fileName)) {
        audioUploads.push({ fileName: f.fileName, base64: f.base64, label: f.label });
      }
    }
  }
  if (cardData.wordAudioFileName && cardData.wordAudioBase64 && !audioUploads.some((u) => u.fileName === cardData.wordAudioFileName)) {
    audioUploads.push({ fileName: cardData.wordAudioFileName, base64: cardData.wordAudioBase64, label: 'Word Audio' });
  }
  if (cardData.exampleAudioFileName && cardData.exampleAudioBase64 && !audioUploads.some((u) => u.fileName === cardData.exampleAudioFileName)) {
    audioUploads.push({ fileName: cardData.exampleAudioFileName, base64: cardData.exampleAudioBase64, label: 'Example Audio' });
  }

  // Upload each audio file to Anki media collection
  for (const upload of audioUploads) {
    if (upload.fileName && upload.base64) {
      const storeRes = await callAnkiConnect(baseUrl, 'storeMediaFile', {
        filename: upload.fileName,
        data: upload.base64,
      });
      if (!storeRes.success) {
        return {
          success: false,
          error: `Failed to save ${upload.label} (${upload.fileName}) to Anki media collection: ${storeRes.error}`,
        };
      }
    }
  }

  // 4. Store Smart Image if present
  let imageTag = '';
  if (cardData.imageBase64 && cardData.imageFileName) {
    const storeImgRes = await callAnkiConnect(baseUrl, 'storeMediaFile', {
      filename: cardData.imageFileName,
      data: cardData.imageBase64,
    });
    if (storeImgRes.success) {
      imageTag = `<img src="${cardData.imageFileName}" class="card-illustration" alt="${cardData.word}" />`;
    }
  }

  // Build combined WordAudio and ExampleAudio tags
  const wordAudioTags: string[] = [];
  if (cardData.wordAudioUsNormalFileName) wordAudioTags.push(`[sound:${cardData.wordAudioUsNormalFileName}]`);
  if (cardData.wordAudioUsSlowFileName) wordAudioTags.push(`[sound:${cardData.wordAudioUsSlowFileName}]`);
  if (cardData.wordAudioUkNormalFileName) wordAudioTags.push(`[sound:${cardData.wordAudioUkNormalFileName}]`);
  if (cardData.wordAudioUkSlowFileName) wordAudioTags.push(`[sound:${cardData.wordAudioUkSlowFileName}]`);
  if (wordAudioTags.length === 0 && cardData.wordAudioFileName) {
    wordAudioTags.push(`[sound:${cardData.wordAudioFileName}]`);
  }

  const exampleAudioTags: string[] = [];
  if (cardData.exampleAudioUsNormalFileName) exampleAudioTags.push(`[sound:${cardData.exampleAudioUsNormalFileName}]`);
  if (cardData.exampleAudioUsSlowFileName) exampleAudioTags.push(`[sound:${cardData.exampleAudioUsSlowFileName}]`);
  if (cardData.exampleAudioUkNormalFileName) exampleAudioTags.push(`[sound:${cardData.exampleAudioUkNormalFileName}]`);
  if (cardData.exampleAudioUkSlowFileName) exampleAudioTags.push(`[sound:${cardData.exampleAudioUkSlowFileName}]`);
  if (exampleAudioTags.length === 0 && cardData.exampleAudioFileName) {
    exampleAudioTags.push(`[sound:${cardData.exampleAudioFileName}]`);
  }

  // 5. Construct Note Fields
  const fields: Record<string, string> = {
    Word: (cardData.word || '').trim(),
    Phonetic: (cardData.phonetic || '').trim(),
    PartOfSpeech: (cardData.partOfSpeech || '').trim(),
    Meaning: renderMarkdown((cardData.meaningFa || '').trim()),
    Example: renderMarkdown((cardData.example || '').trim()),
    Translation: renderMarkdown((cardData.translationFa || '').trim()),
    Mnemonic: renderMarkdown((cardData.mnemonic || '').trim()),
    CardImage: imageTag,
    SpellingSentence: (cardData.spellingSentence || '').trim(),
    CardType: effectiveCardType,
    WordAudio: wordAudioTags.join(' '),
    ExampleAudio: exampleAudioTags.join(' '),
    WordAudioUsNormal: cardData.wordAudioUsNormalFileName ? `[sound:${cardData.wordAudioUsNormalFileName}]` : '',
    WordAudioUsSlow: cardData.wordAudioUsSlowFileName ? `[sound:${cardData.wordAudioUsSlowFileName}]` : '',
    WordAudioUkNormal: cardData.wordAudioUkNormalFileName ? `[sound:${cardData.wordAudioUkNormalFileName}]` : '',
    WordAudioUkSlow: cardData.wordAudioUkSlowFileName ? `[sound:${cardData.wordAudioUkSlowFileName}]` : '',
    ExampleAudioUsNormal: cardData.exampleAudioUsNormalFileName ? `[sound:${cardData.exampleAudioUsNormalFileName}]` : '',
    ExampleAudioUsSlow: cardData.exampleAudioUsSlowFileName ? `[sound:${cardData.exampleAudioUsSlowFileName}]` : '',
    ExampleAudioUkNormal: cardData.exampleAudioUkNormalFileName ? `[sound:${cardData.exampleAudioUkNormalFileName}]` : '',
    ExampleAudioUkSlow: cardData.exampleAudioUkSlowFileName ? `[sound:${cardData.exampleAudioUkSlowFileName}]` : '',
    CustomSections: renderCustomBlocksHtml(cardData.customBlocks, themeId),
  };

  // 6. Add Note (IMPORTANT: allowDuplicate: true so user can create multiple cards for the same word with different meanings)
  const addRes = await callAnkiConnect(baseUrl, 'addNote', {
    note: {
      deckName: targetDeck,
      modelName: targetModelName,
      fields: fields,
      options: {
        allowDuplicate: true,
        duplicateScope: 'deck',
      },
      tags: ['flashcard-generator', effectiveCardType === 'spelling' ? 'spelling-exercise' : 'vocab-card'],
    },
  });

  if (!addRes.success || !addRes.result) {
    return {
      success: false,
      error: `Failed to create Anki note: ${addRes.error || 'addNote returned null'}`,
    };
  }

  const rawNoteId = addRes.result;
  const noteId = typeof rawNoteId === 'number' ? rawNoteId : Number(rawNoteId);

  if (!noteId || isNaN(noteId)) {
    return {
      success: false,
      error: `Anki returned an invalid Note ID: ${JSON.stringify(rawNoteId)}`,
    };
  }

  // 7. Strict Multi-Point Verification via AnkiConnect
  const verificationResult = await verifyFullAnkiNoteAndCards(baseUrl, noteId, targetDeck);
  if (!verificationResult.success || !verificationResult.verification) {
    return {
      success: false,
      noteId,
      error: verificationResult.error || 'Strict Anki verification failed after note creation.',
    };
  }

  const v = verificationResult.verification;

  return {
    success: true,
    noteId,
    cardIds: v.cardIds,
    verification: v,
  };
}

export async function openInAnkiBrowser(baseUrl: string, query: string) {
  return callAnkiConnect(baseUrl, 'guiBrowse', { query });
}

export async function changeCardsDeck(baseUrl: string, cardIds: number[], deck: string) {
  return callAnkiConnect(baseUrl, 'changeDeck', { cards: cardIds, deck });
}

export async function runAnkiPipelineDiagnostic(
  baseUrl: string = 'http://127.0.0.1:8765',
  targetDeck: string = 'English::B1',
  themeId: ThemeId = 'comic-pop-dark'
) {
  const steps: Array<{ step: string; status: 'ok' | 'error'; message: string; details?: any }> = [];

  // Step 1: Connect
  const conn = await checkAnkiConnection(baseUrl);
  if (!conn.connected) {
    steps.push({ step: '1. Connect', status: 'error', message: `Cannot connect to AnkiConnect at ${baseUrl}` });
    return { success: false, steps };
  }
  steps.push({ step: '1. Connect', status: 'ok', message: `Connected to AnkiConnect v${conn.version}` });

  // Step 2: Ensure Deck
  const deckRes = await callAnkiConnect(baseUrl, 'createDeck', { deck: targetDeck });
  if (!deckRes.success) {
    steps.push({ step: '2. Ensure Deck', status: 'error', message: `Failed to create/ensure deck "${targetDeck}"` });
    return { success: false, steps };
  }
  steps.push({ step: '2. Ensure Deck', status: 'ok', message: `Ensured deck "${targetDeck}" in Anki` });

  // Step 3: Ensure Model
  const modelRes = await ensureAnkiModel(baseUrl, themeId);
  if (!modelRes.success) {
    steps.push({ step: '3. Note Type', status: 'error', message: modelRes.error || modelRes.message });
    return { success: false, steps };
  }
  steps.push({ step: '3. Note Type', status: 'ok', message: modelRes.message });

  // Step 4: Create Diagnostic Note
  const testCardData: CardData = {
    word: 'diagnostic_test_' + Date.now().toString().slice(-4),
    phonetic: '/daɪ.əɡˈnɒs.tɪk/',
    partOfSpeech: 'noun',
    meaningFa: 'تست تشخیصی سیستم',
    example: 'This is an automated system pipeline diagnostic card.',
    translationFa: 'این یک کارت تستی عیب‌یابی خودکار سیستم است.',
    mnemonic: 'DIAGNOSTIC: Diagnose the flashcard pipeline easily.',
    cardType: 'normal',
  };

  const noteRes = await createAnkiNote(baseUrl, targetDeck, testCardData, themeId);
  if (!noteRes.success || !noteRes.noteId) {
    steps.push({ step: '4. Note Creation', status: 'error', message: noteRes.error || 'Failed to create test note' });
    return { success: false, steps };
  }
  steps.push({ step: '4. Note Creation', status: 'ok', message: `Created Note #${noteRes.noteId} in deck "${targetDeck}"` });

  return {
    success: true,
    steps,
    testNoteId: noteRes.noteId,
    testCardIds: noteRes.cardIds,
    verification: noteRes.verification,
  };
}

export async function getAnkiTags(
  baseUrl: string = 'http://127.0.0.1:8765'
): Promise<{ success: boolean; tags: string[]; error?: string }> {
  const res = await callAnkiConnect(baseUrl, 'getTags');
  if (res.success && Array.isArray(res.result)) {
    return { success: true, tags: res.result };
  }
  return { success: false, tags: [], error: res.error };
}

export async function findNotesByTag(
  baseUrl: string = 'http://127.0.0.1:8765',
  tag: string
): Promise<{ success: boolean; noteIds: number[]; error?: string }> {
  const cleanTag = (tag || '').trim();
  if (!cleanTag) {
    return { success: true, noteIds: [] };
  }
  const query = `tag:"${cleanTag}"`;
  const res = await callAnkiConnect(baseUrl, 'findNotes', { query });
  if (res.success && Array.isArray(res.result)) {
    return { success: true, noteIds: res.result };
  }
  return { success: false, noteIds: [], error: res.error };
}

export async function getNotesInfo(
  baseUrl: string = 'http://127.0.0.1:8765',
  noteIds: number[]
): Promise<{ success: boolean; notes: any[]; error?: string }> {
  if (!noteIds.length) {
    return { success: true, notes: [] };
  }
  const res = await callAnkiConnect(baseUrl, 'notesInfo', { notes: noteIds });
  if (res.success && Array.isArray(res.result)) {
    return { success: true, notes: res.result };
  }
  return { success: false, notes: [], error: res.error };
}

export async function updateAnkiNoteFields(
  baseUrl: string = 'http://127.0.0.1:8765',
  noteId: number,
  fields: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  const res = await callAnkiConnect(baseUrl, 'updateNoteFields', {
    note: {
      id: noteId,
      fields,
    },
  });
  if (res.success) {
    return { success: true };
  }
  return { success: false, error: res.error };
}

export async function removeAnkiNoteTag(
  baseUrl: string = 'http://127.0.0.1:8765',
  noteIds: number[],
  tag: string
): Promise<{ success: boolean; error?: string }> {
  const cleanTag = (tag || '').trim();
  if (!cleanTag || !noteIds.length) {
    return { success: true };
  }
  const res = await callAnkiConnect(baseUrl, 'removeTags', {
    notes: noteIds,
    tags: cleanTag,
  });
  if (res.success) {
    return { success: true };
  }
  return { success: false, error: res.error };
}

export async function storeAnkiMediaFile(
  baseUrl: string = 'http://127.0.0.1:8765',
  filename: string,
  dataBase64: string
): Promise<{ success: boolean; error?: string }> {
  const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, '');
  const res = await callAnkiConnect(baseUrl, 'storeMediaFile', {
    filename,
    data: cleanBase64,
  });
  if (res.success) {
    return { success: true };
  }
  return { success: false, error: res.error };
}

