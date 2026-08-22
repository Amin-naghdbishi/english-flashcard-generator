import { THEMES } from '../src/themes';
import { CardData, ThemeId } from '../src/types';

export const ANKI_NOTE_TYPE_NAME = 'AI Vocabulary';
export const ANKI_MODEL_FIELDS = [
  'Word',
  'Phonetic',
  'PartOfSpeech',
  'Meaning',
  'Example',
  'Translation',
  'Mnemonic',
  'WordAudio',
  'ExampleAudio',
  'WordAudioUsNormal',
  'WordAudioUsSlow',
  'WordAudioUkNormal',
  'WordAudioUkSlow',
  'ExampleAudioUs',
  'ExampleAudioUk',
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

export async function ensureAnkiModel(
  baseUrl: string = 'http://127.0.0.1:8765',
  themeId: ThemeId = 'comic-pop-dark'
): Promise<{
  success: boolean;
  modelCreatedOrUpdated: boolean;
  message: string;
  error?: string;
}> {
  const theme = THEMES[themeId] || THEMES['comic-dark'];

  // Check if model exists
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
  const modelExists = existingModels.includes(ANKI_NOTE_TYPE_NAME);

  if (!modelExists) {
    // Create new model
    const createRes = await callAnkiConnect(baseUrl, 'createModel', {
      modelName: ANKI_NOTE_TYPE_NAME,
      inOrderFields: ANKI_MODEL_FIELDS,
      css: theme.css,
      cardTemplates: [
        {
          Name: 'Comic Vocabulary Card',
          Front: theme.frontHtml,
          Back: theme.backHtml,
        },
      ],
    });

    if (!createRes.success) {
      return {
        success: false,
        modelCreatedOrUpdated: false,
        message: 'Could not create AI Vocabulary note type in Anki',
        error: createRes.error,
      };
    }

    return {
      success: true,
      modelCreatedOrUpdated: true,
      message: `Created '${ANKI_NOTE_TYPE_NAME}' model in Anki with ${theme.name} templates and CSS.`,
    };
  } else {
    // 1. Ensure all required fields exist in Anki note type
    const fieldsRes = await callAnkiConnect(baseUrl, 'modelFieldNames', {
      modelName: ANKI_NOTE_TYPE_NAME,
    });
    if (fieldsRes.success && Array.isArray(fieldsRes.result)) {
      const currentFields: string[] = fieldsRes.result;
      for (const requiredField of ANKI_MODEL_FIELDS) {
        if (!currentFields.includes(requiredField)) {
          await callAnkiConnect(baseUrl, 'modelFieldAdd', {
            model: { name: ANKI_NOTE_TYPE_NAME },
            field: requiredField,
          });
        }
      }
    }

    // 2. Update model CSS styling
    await callAnkiConnect(baseUrl, 'updateModelStyling', {
      model: {
        name: ANKI_NOTE_TYPE_NAME,
        css: theme.css,
      },
    });

    // 3. Find template card name (e.g. 'Comic Vocabulary Card' or 'Card 1')
    const templatesRes = await callAnkiConnect(baseUrl, 'modelTemplates', {
      modelName: ANKI_NOTE_TYPE_NAME,
    });

    const templateUpdates: Record<string, { Front: string; Back: string }> = {};
    if (templatesRes.success && typeof templatesRes.result === 'object' && templatesRes.result !== null) {
      const existingTemplateNames = Object.keys(templatesRes.result);
      if (existingTemplateNames.length > 0) {
        for (const tName of existingTemplateNames) {
          templateUpdates[tName] = {
            Front: theme.frontHtml,
            Back: theme.backHtml,
          };
        }
      } else {
        templateUpdates['Comic Vocabulary Card'] = {
          Front: theme.frontHtml,
          Back: theme.backHtml,
        };
      }
    } else {
      templateUpdates['Comic Vocabulary Card'] = {
        Front: theme.frontHtml,
        Back: theme.backHtml,
      };
      templateUpdates['Card 1'] = {
        Front: theme.frontHtml,
        Back: theme.backHtml,
      };
    }

    await callAnkiConnect(baseUrl, 'updateModelTemplates', {
      model: {
        name: ANKI_NOTE_TYPE_NAME,
        templates: templateUpdates,
      },
    });

    return {
      success: true,
      modelCreatedOrUpdated: true,
      message: `Updated '${ANKI_NOTE_TYPE_NAME}' model in Anki with latest ${theme.name} CSS and templates.`,
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

export async function openInAnkiBrowser(
  baseUrl: string = 'http://127.0.0.1:8765',
  query: string
): Promise<{ success: boolean; error?: string }> {
  return await callAnkiConnect(baseUrl, 'guiBrowse', { query });
}

export async function changeCardsDeck(
  baseUrl: string = 'http://127.0.0.1:8765',
  cardIds: number[],
  deck: string
): Promise<{ success: boolean; error?: string }> {
  return await callAnkiConnect(baseUrl, 'changeDeck', { cards: cardIds, deck });
}

const QUEUE_LABELS: Record<number, string> = {
  [-1]: 'Suspended (معلق)',
  0: 'New (جدید)',
  1: 'Learning (در حال یادگیری)',
  2: 'Review (مرور)',
  3: 'Day Relearn (مرور روزانه)',
  4: 'Preview / Buried (مدفون/پیش‌نمایش)',
};

const TYPE_LABELS: Record<number, string> = {
  0: 'New (جدید)',
  1: 'Learning (یادگیری)',
  2: 'Review (مرور)',
  3: 'Relearning (یادگیری مجدد)',
};

export async function verifyFullAnkiNoteAndCards(
  baseUrl: string,
  noteId: number,
  expectedDeck: string
): Promise<{
  success: boolean;
  isVerified: boolean;
  error?: string;
  verification?: {
    noteId: number;
    cardIds: number[];
    targetDeck: string;
    actualDeck: string;
    modelName: string;
    tags: string[];
    fields: Record<string, string>;
    cardsCount: number;
    cardsInfo: Array<{
      cardId: number;
      deckName: string;
      noteId: number;
      ord: number;
      queue: number;
      queueLabel: string;
      type: number;
      typeLabel: string;
      due: number;
      suspended: boolean;
    }>;
    deckMatched: boolean;
    isSuspended: boolean;
    isVerified: boolean;
    verificationMessage: string;
  };
}> {
  // Step 1: Read Note from Anki
  const noteRes = await callAnkiConnect(baseUrl, 'notesInfo', { notes: [noteId] });
  if (!noteRes.success || !Array.isArray(noteRes.result) || noteRes.result.length === 0) {
    return {
      success: false,
      isVerified: false,
      error: `Note ID ${noteId} does not exist in Anki: ${noteRes.error || 'Empty response'}`,
    };
  }

  const rawNote = noteRes.result[0];
  if (!rawNote || !rawNote.noteId) {
    return {
      success: false,
      isVerified: false,
      error: `Note ID ${noteId} returned invalid structure from Anki.`,
    };
  }

  const cardIds: number[] = Array.isArray(rawNote.cards) ? rawNote.cards : [];
  if (cardIds.length === 0) {
    return {
      success: false,
      isVerified: false,
      error: `Note #${noteId} exists in Anki, but generated 0 Cards! Check Note Type template.`,
    };
  }

  // Step 2: Read Cards from Anki
  const cardsRes = await callAnkiConnect(baseUrl, 'cardsInfo', { cards: cardIds });
  if (!cardsRes.success || !Array.isArray(cardsRes.result) || cardsRes.result.length === 0) {
    return {
      success: false,
      isVerified: false,
      error: `Failed to fetch cards info for Card IDs [${cardIds.join(', ')}]: ${cardsRes.error}`,
    };
  }

  const rawCards = cardsRes.result;
  let actualDeck = rawCards[0]?.deckName || '';
  let deckMatched = actualDeck.trim().toLowerCase() === expectedDeck.trim().toLowerCase();

  // If card was assigned to another deck (e.g. Default due to template default), move it now!
  if (!deckMatched && expectedDeck) {
    const moveRes = await changeCardsDeck(baseUrl, cardIds, expectedDeck.trim());
    if (moveRes.success) {
      // Re-read cards to confirm new deck assignment
      const reCardsRes = await callAnkiConnect(baseUrl, 'cardsInfo', { cards: cardIds });
      if (reCardsRes.success && Array.isArray(reCardsRes.result) && reCardsRes.result.length > 0) {
        actualDeck = reCardsRes.result[0]?.deckName || expectedDeck;
        deckMatched = actualDeck.trim().toLowerCase() === expectedDeck.trim().toLowerCase();
      }
    }
  }

  // Format fields map
  const fieldsMap: Record<string, string> = {};
  if (rawNote.fields && typeof rawNote.fields === 'object') {
    for (const [k, v] of Object.entries(rawNote.fields)) {
      fieldsMap[k] = (v as any)?.value ?? String(v);
    }
  }

  let hasSuspendedCard = false;
  const parsedCards = rawCards.map((c: any) => {
    const isSusp = c.queue === -1;
    if (isSusp) hasSuspendedCard = true;
    return {
      cardId: c.cardId,
      deckName: c.deckName || actualDeck,
      noteId: c.note || noteId,
      ord: c.ord ?? 0,
      queue: c.queue ?? 0,
      queueLabel: QUEUE_LABELS[c.queue] || `Queue ${c.queue}`,
      type: c.type ?? 0,
      typeLabel: TYPE_LABELS[c.type] || `Type ${c.type}`,
      due: c.due ?? 0,
      suspended: isSusp,
    };
  });

  const isVerified = deckMatched && parsedCards.length > 0;
  const verificationMessage = isVerified
    ? `Card verified successfully in deck '${actualDeck}' with ${parsedCards.length} active card(s).`
    : `Card verification failed: Deck is '${actualDeck}' but expected '${expectedDeck}'.`;

  return {
    success: isVerified,
    isVerified,
    error: isVerified ? undefined : verificationMessage,
    verification: {
      noteId,
      cardIds,
      targetDeck: expectedDeck,
      actualDeck,
      modelName: rawNote.modelName || ANKI_NOTE_TYPE_NAME,
      tags: rawNote.tags || [],
      fields: fieldsMap,
      cardsCount: parsedCards.length,
      cardsInfo: parsedCards,
      deckMatched,
      isSuspended: hasSuspendedCard,
      isVerified,
      verificationMessage,
    },
  };
}

export async function createAnkiNote(
  baseUrl: string,
  deckName: string,
  cardData: CardData,
  themeId: ThemeId = 'comic-pop-dark'
): Promise<{
  success: boolean;
  noteId?: number;
  cardIds?: number[];
  verification?: any;
  error?: string;
}> {
  const targetDeck = deckName.trim();

  // 1. Ensure Model exists in Anki
  const modelRes = await ensureAnkiModel(baseUrl, themeId);
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
    audioUploads.push({ fileName: cardData.exampleAudioUsNormalFileName, base64: cardData.exampleAudioUsNormalBase64, label: 'Example US' });
  }
  if (cardData.exampleAudioUkNormalFileName && cardData.exampleAudioUkNormalBase64) {
    audioUploads.push({ fileName: cardData.exampleAudioUkNormalFileName, base64: cardData.exampleAudioUkNormalBase64, label: 'Example UK' });
  }
  if (cardData.audioFiles && Array.isArray(cardData.audioFiles)) {
    for (const f of cardData.audioFiles) {
      if (f.fileName && f.base64 && !audioUploads.some((u) => u.fileName === f.fileName)) {
        audioUploads.push({ fileName: f.fileName, base64: f.base64, label: f.label });
      }
    }
  }
  // Legacy single audio fallback
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
  if (cardData.exampleAudioUkNormalFileName) exampleAudioTags.push(`[sound:${cardData.exampleAudioUkNormalFileName}]`);
  if (exampleAudioTags.length === 0 && cardData.exampleAudioFileName) {
    exampleAudioTags.push(`[sound:${cardData.exampleAudioFileName}]`);
  }

  // 4. Construct Note Fields
  const fields: Record<string, string> = {
    Word: (cardData.word || '').trim(),
    Phonetic: (cardData.phonetic || '').trim(),
    PartOfSpeech: (cardData.partOfSpeech || '').trim(),
    Meaning: (cardData.meaningFa || '').trim(),
    Example: (cardData.example || '').trim(),
    Translation: (cardData.translationFa || '').trim(),
    Mnemonic: (cardData.mnemonic || '').trim(),
    WordAudio: wordAudioTags.join(' '),
    ExampleAudio: exampleAudioTags.join(' '),
    WordAudioUsNormal: cardData.wordAudioUsNormalFileName ? `[sound:${cardData.wordAudioUsNormalFileName}]` : '',
    WordAudioUsSlow: cardData.wordAudioUsSlowFileName ? `[sound:${cardData.wordAudioUsSlowFileName}]` : '',
    WordAudioUkNormal: cardData.wordAudioUkNormalFileName ? `[sound:${cardData.wordAudioUkNormalFileName}]` : '',
    WordAudioUkSlow: cardData.wordAudioUkSlowFileName ? `[sound:${cardData.wordAudioUkSlowFileName}]` : '',
    ExampleAudioUs: cardData.exampleAudioUsNormalFileName ? `[sound:${cardData.exampleAudioUsNormalFileName}]` : '',
    ExampleAudioUk: cardData.exampleAudioUkNormalFileName ? `[sound:${cardData.exampleAudioUkNormalFileName}]` : '',
  };

  // 5. Add Note
  const addRes = await callAnkiConnect(baseUrl, 'addNote', {
    note: {
      deckName: targetDeck,
      modelName: ANKI_NOTE_TYPE_NAME,
      fields: fields,
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck',
      },
      tags: ['local-ai-flashcard', 'english-vocabulary'],
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

  // 6. Strict Multi-Point Verification via AnkiConnect
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
    noteId: v.noteId,
    cardIds: v.cardIds,
    verification: v,
  };
}

export async function runAnkiPipelineDiagnostic(
  baseUrl: string = 'http://127.0.0.1:8765',
  targetDeck: string = 'English::B1',
  themeId: ThemeId = 'comic-pop-dark'
) {
  const steps: Array<{ step: string; status: 'ok' | 'error'; message: string; details?: any }> = [];

  // Step 1: Check Connection
  const conn = await checkAnkiConnection(baseUrl);
  if (!conn.connected) {
    steps.push({
      step: '1. Connection',
      status: 'error',
      message: `AnkiConnect is offline or unreachable at ${baseUrl}`,
      details: conn.error,
    });
    return { success: false, steps };
  }
  steps.push({
    step: '1. Connection',
    status: 'ok',
    message: `Connected to AnkiConnect v${conn.version}`,
  });

  // Step 2: Deck Access
  const decksRes = await getAnkiDecks(baseUrl);
  if (!decksRes.success) {
    steps.push({
      step: '2. Deck Access',
      status: 'error',
      message: `Failed to fetch decks: ${decksRes.error}`,
    });
    return { success: false, steps };
  }
  steps.push({
    step: '2. Deck Access',
    status: 'ok',
    message: `Found ${decksRes.decks.length} deck(s) in Anki`,
    details: decksRes.decks.slice(0, 5).join(', ') + (decksRes.decks.length > 5 ? '...' : ''),
  });

  // Step 3: Model Verification / Setup
  const modelRes = await ensureAnkiModel(baseUrl, themeId);
  if (!modelRes.success) {
    steps.push({
      step: '3. Model Setup',
      status: 'error',
      message: `Failed to setup model: ${modelRes.error}`,
    });
    return { success: false, steps };
  }
  steps.push({
    step: '3. Model Setup',
    status: 'ok',
    message: modelRes.message,
  });

  // Step 4: Create Test Note
  const testWord = `TEST_${Date.now().toString().slice(-4)}`;
  const testCardData: CardData = {
    word: testWord,
    phonetic: '/tɛst/',
    partOfSpeech: 'noun',
    meaningFa: 'تست آزمایشی اتصال انکی',
    example: 'This is an Anki diagnostic test card.',
    translationFa: 'این یک کارت تست آزمایشی انکی است.',
    mnemonic: 'Test mnemonic memory hook',
  };

  const createRes = await createAnkiNote(baseUrl, targetDeck, testCardData, themeId);
  if (!createRes.success || !createRes.noteId) {
    steps.push({
      step: '4. Note Creation',
      status: 'error',
      message: `Test note creation failed: ${createRes.error}`,
    });
    return { success: false, steps };
  }
  steps.push({
    step: '4. Note Creation',
    status: 'ok',
    message: `Test Note created successfully! (Note ID: ${createRes.noteId})`,
  });

  // Step 5: Read Note Back
  const v = createRes.verification;
  if (!v) {
    steps.push({
      step: '5. Verification',
      status: 'error',
      message: 'Failed to verify Note and Cards in Anki.',
    });
    return { success: false, steps };
  }

  steps.push({
    step: '5. Note Verified',
    status: 'ok',
    message: `Note #${v.noteId} verified in model '${v.modelName}'`,
  });

  // Step 6: Deck Verified
  steps.push({
    step: '6. Deck Verified',
    status: v.deckMatched ? 'ok' : 'error',
    message: `Deck: ${v.actualDeck} (Target: ${v.targetDeck})`,
  });

  // Step 7: Cards Verified
  steps.push({
    step: '7. Card(s) Verified',
    status: 'ok',
    message: `Found ${v.cardIds.length} card(s): IDs [${v.cardIds.join(', ')}] | Queue: ${v.cardsInfo[0]?.queueLabel || 'New'}`,
  });

  return {
    success: true,
    steps,
    testNoteId: createRes.noteId,
    testCardIds: createRes.cardIds,
    verification: v,
  };
}
