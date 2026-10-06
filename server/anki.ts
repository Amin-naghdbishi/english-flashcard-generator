import { THEMES, getSpellingFrontHtml, renderCustomBlocksHtml, renderMainBoxStyles, SHARED_CARD_CSS } from '../src/themes';
import { CardData, ThemeId, CardType, getFrontCustomBlocks, getBackCustomBlocks } from '../src/types';
import { renderMarkdown } from '../src/utils/markdown';

export const ANKI_NOTE_TYPE_NAME = 'AI Vocabulary';
export const ANKI_MODEL_FIELDS = [
  'Word',
  'Phonetic',
  'PartOfSpeech',
  'Meaning',
  'EnglishDefinition',
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
  'CustomFrontSections',
  'CustomBackSections',
  'CustomSections',
  'MainBoxStyles',
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
          const addFieldRes = await callAnkiConnect(baseUrl, 'modelFieldAdd', {
            modelName: targetModel,
            fieldName: requiredField,
          });
          if (!addFieldRes.success) {
            console.warn(`[Anki] Warning: Could not add field '${requiredField}' to model '${targetModel}': ${addFieldRes.error}`);
          }
        }
      }
    }

    // 2. Update model CSS styling
    const cssRes = await callAnkiConnect(baseUrl, 'updateModelStyling', {
      model: {
        name: targetModel,
        css: `${theme.css}\n${SHARED_CARD_CSS}`,
      },
    });
    if (!cssRes.success) {
      console.warn(`[Anki] Warning: Could not update styling for model '${targetModel}': ${cssRes.error}`);
    }

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

        const updateTemplateRes = await callAnkiConnect(baseUrl, 'updateModelTemplates', {
          model: {
            name: targetModel,
            templates: templateUpdates,
          },
        });
        if (!updateTemplateRes.success) {
          console.warn(`[Anki] Warning: Could not update templates for model '${targetModel}': ${updateTemplateRes.error}`);
        }
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
  cardType: CardType = 'normal',
  tags?: string[],
  modelName?: string
): Promise<{
  success: boolean;
  noteId?: number;
  cardIds?: number[];
  verification?: any;
  error?: string;
}> {
  const targetDeck = deckName.trim();
  const effectiveCardType = cardData.cardType || cardType || 'normal';

  const explicitModelName = (modelName || cardData.modelName || cardData.noteType || '').trim();
  const targetModelName = explicitModelName || getThemedModelName(themeId, effectiveCardType);

  // 1. Ensure Model exists in Anki with complete HTML/CSS templates for AI Vocabulary models
  if (/^AI Vocabulary/i.test(targetModelName)) {
    const modelRes = await ensureAnkiModel(baseUrl, themeId, effectiveCardType, targetModelName);
    if (!modelRes.success) {
      return {
        success: false,
        error: `Model setup failed: ${modelRes.error || modelRes.message}`,
      };
    }
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
    EnglishDefinition: renderMarkdown((cardData.definitionEn || '').trim()),
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
    CustomFrontSections: renderCustomBlocksHtml(getFrontCustomBlocks(cardData), themeId),
    CustomBackSections: renderCustomBlocksHtml(getBackCustomBlocks(cardData), themeId),
    CustomSections: renderCustomBlocksHtml(getBackCustomBlocks(cardData), themeId),
    MainBoxStyles: renderMainBoxStyles(cardData.mainBoxStyles, themeId),
  };

  // Adapt fields for targetModelName (especially non-AI models like Basic, Cloze, etc.)
  let noteFieldsToSubmit: Record<string, string> = fields;
  try {
    const fieldsRes = await callAnkiConnect(baseUrl, 'modelFieldNames', { modelName: targetModelName });
    if (fieldsRes.success && Array.isArray(fieldsRes.result) && fieldsRes.result.length > 0) {
      const validFieldNames = fieldsRes.result;
      if (!validFieldNames.includes('Word') && validFieldNames.includes('Front')) {
        fields.Front = (cardData.word || '').trim();
      }
      if (!validFieldNames.includes('Meaning') && validFieldNames.includes('Back')) {
        fields.Back = renderMarkdown((cardData.meaningFa || '').trim());
      }
      if (!validFieldNames.includes('Word') && validFieldNames.includes('Text')) {
        fields.Text = (cardData.word || '').trim();
      }
      if (!validFieldNames.includes('Meaning') && validFieldNames.includes('Extra')) {
        fields.Extra = renderMarkdown((cardData.meaningFa || '').trim());
      }
      const frontBlocksHtml = renderCustomBlocksHtml(getFrontCustomBlocks(cardData), themeId);
      const backBlocksHtml = renderCustomBlocksHtml(getBackCustomBlocks(cardData), themeId);
      if (frontBlocksHtml && !validFieldNames.includes('CustomFrontSections') && validFieldNames.includes('Front')) {
        fields.Front = (fields.Front || '') + (fields.Front ? '<br>' : '') + frontBlocksHtml;
      }
      if (backBlocksHtml && !validFieldNames.includes('CustomBackSections') && !validFieldNames.includes('CustomSections')) {
        if (validFieldNames.includes('Back')) {
          fields.Back = (fields.Back || '') + (fields.Back ? '<br>' : '') + backBlocksHtml;
        } else if (validFieldNames.includes('Extra')) {
          fields.Extra = (fields.Extra || '') + (fields.Extra ? '<br>' : '') + backBlocksHtml;
        }
      }
      noteFieldsToSubmit = {};
      for (const [key, val] of Object.entries(fields)) {
        if (validFieldNames.includes(key)) {
          noteFieldsToSubmit[key] = val;
        }
      }
    }
  } catch (fieldCheckErr) {
    console.warn(`[Anki] Could not check modelFieldNames for ${targetModelName}:`, fieldCheckErr);
  }

  // 6. Add Note (IMPORTANT: allowDuplicate: true so user can create multiple cards for the same word with different meanings)
  // Strictly preserve user-specified tags without injecting automatic clutter tags
  const userTags = Array.isArray(tags) && tags.length > 0
    ? tags
    : (Array.isArray(cardData.tags) && cardData.tags.length > 0 ? cardData.tags : []);
  const mergedTags = Array.from(new Set(userTags.map((t) => t.trim()).filter(Boolean)));

  const addRes = await callAnkiConnect(baseUrl, 'addNote', {
    note: {
      deckName: targetDeck,
      modelName: targetModelName,
      fields: noteFieldsToSubmit,
      options: {
        allowDuplicate: true,
        duplicateScope: 'deck',
      },
      tags: mergedTags,
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

export async function updateAnkiNoteModel(
  baseUrl: string = 'http://127.0.0.1:8765',
  noteId: number,
  modelName: string,
  fields: Record<string, string>,
  tags?: string[]
): Promise<{ success: boolean; error?: string }> {
  const noteParam: any = {
    id: noteId,
    modelName,
    fields,
  };
  if (tags && Array.isArray(tags)) {
    noteParam.tags = tags;
  }
  const res = await callAnkiConnect(baseUrl, 'updateNoteModel', { note: noteParam });
  if (res.success) {
    return { success: true };
  }
  return { success: false, error: res.error };
}

export async function getAnkiModelNames(
  baseUrl: string = 'http://127.0.0.1:8765'
): Promise<{ success: boolean; modelNames: string[]; error?: string }> {
  const res = await callAnkiConnect(baseUrl, 'modelNames');
  if (res.success && Array.isArray(res.result)) {
    return { success: true, modelNames: res.result };
  }
  return { success: false, modelNames: [], error: res.error };
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

export function parseCustomBlocksHtml(html?: string, side: 'front' | 'back' = 'back'): any[] {
  if (!html || typeof html !== 'string' || !html.trim()) return [];

  const blocks: any[] = [];
  const blockRegex = /<div\s+[^>]*class="[^"]*custom-card-block[^"]*"[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*(?=(?:<div\s+[^>]*class="[^"]*custom-card-block|$))/gi;

  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) !== null) {
    const styleAttr = match[1] || '';
    const innerHtml = match[2] || '';

    const bgMatch = styleAttr.match(/background-color:\s*([^;!]+)/i);
    const bgColor = bgMatch ? bgMatch[1].trim() : undefined;

    const textMatch = styleAttr.match(/(?:^|;)\s*color:\s*([^;!]+)/i);
    const textColor = textMatch ? textMatch[1].trim() : undefined;

    const borderMatch = styleAttr.match(/border(?:-color)?:\s*(?:[0-9.]+(?:px|rem)?\s+solid\s+)?([^;!]+)/i);
    const borderColor = borderMatch ? borderMatch[1].trim() : undefined;

    const titleMatch = innerHtml.match(/<(?:span|div)\s+[^>]*class="[^"]*(?:box-label|botanical-custom-title|quest-tag-purple|washi-title|minimal-mnemonic-label)[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/i);
    let title = '';
    if (titleMatch) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
      title = title.replace(/^📌\s*/, '');
    }

    const contentMatch = innerHtml.match(/<div\s+[^>]*class="[^"]*(?:custom-block-content|botanical-custom-content|quest-custom-content|washi-text|minimal-custom-content)[^"]*"[^>]*dir="([^"]*)"[^>]*>([\s\S]*?)<\/div>/i) ||
      innerHtml.match(/<div\s+[^>]*class="[^"]*(?:custom-block-content|botanical-custom-content|quest-custom-content|washi-text|minimal-custom-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

    let content = '';
    let dir: 'rtl' | 'ltr' | 'auto' | undefined = undefined;
    if (contentMatch) {
      if (contentMatch.length === 3) {
        dir = (contentMatch[1] as any) || undefined;
        content = contentMatch[2].trim();
      } else {
        content = contentMatch[1].trim();
      }
    }

    if (title || content) {
      blocks.push({
        id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title,
        content,
        color: bgColor,
        textColor,
        borderColor,
        dir,
        side,
      });
    }
  }

  return blocks;
}

export function parseMainBoxStyles(html?: string): any | undefined {
  if (!html || typeof html !== 'string') return undefined;
  const res: any = {};
  let hasAny = false;

  const boxes: Array<'meaning' | 'definition' | 'example' | 'mnemonic'> = ['meaning', 'definition', 'example', 'mnemonic'];

  for (const box of boxes) {
    const titleRegex = new RegExp(`setBoxTitle\\(\\[[^\\]]*label-${box}[^\\]]*\\],\\s*(".*?"|'.*?')\\)`, 'i');
    const titleMatch = html.match(titleRegex);
    let title: string | undefined = undefined;
    if (titleMatch) {
      try {
        title = JSON.parse(titleMatch[1]);
      } catch {
        title = titleMatch[1].slice(1, -1);
      }
    }

    const cssRegex = new RegExp(`\\.(?:comic|quest|notebook|minimal|botanical)-${box}-[a-z]+[^\\{]*\\{([^\\}]*)\\}`, 'i');
    const cssMatch = html.match(cssRegex);
    let bgColor: string | undefined;
    let textColor: string | undefined;
    let borderColor: string | undefined;

    if (cssMatch) {
      const styles = cssMatch[1];
      const bg = styles.match(/background-color:\s*([^;!]+)/i);
      if (bg) bgColor = bg[1].trim();

      const tc = styles.match(/(?:^|;)\s*color:\s*([^;!]+)/i);
      if (tc) textColor = tc[1].trim();

      const bc = styles.match(/border(?:-left)?-color:\s*([^;!]+)/i);
      if (bc) borderColor = bc[1].trim();
    }

    if (title || bgColor || textColor || borderColor) {
      hasAny = true;
      res[box] = {
        title,
        bgColor,
        textColor,
        borderColor,
      };
    }
  }

  return hasAny ? res : undefined;
}

export function detectThemeFromAnkiData(params: {
  modelName?: string;
  css?: string;
  templatesHtml?: string;
  fields?: Record<string, string>;
}): ThemeId | null {
  const modelName = (params.modelName || '').toLowerCase();
  const css = params.css || '';
  const templatesHtml = params.templatesHtml || '';
  const fieldsCombined = Object.values(params.fields || {}).join(' ');

  const allContent = `${modelName}\n${css}\n${templatesHtml}\n${fieldsCombined}`;
  const allContentLower = allContent.toLowerCase();

  const has = (re: RegExp) => re.test(allContentLower);

  // 1. Explicit CSS Theme Headers (most authoritative when present)
  if (/THEME 3:\s*DUO QUEST LIGHT/i.test(css) || /DUO QUEST LIGHT/i.test(css)) {
    return 'comic-quest-light';
  }
  if (/THEME 3:\s*DUO QUEST DARK/i.test(css) || /DUO QUEST DARK/i.test(css)) {
    return 'comic-quest-dark';
  }
  if (/THEME 5:\s*BOTANICAL SAGE/i.test(css) || /BOTANICAL SAGE \(LIGHT\)/i.test(css)) {
    return 'botanical-light';
  }
  if (/THEME 6:\s*BOTANICAL SAGE/i.test(css) || /BOTANICAL SAGE \(DARK\)/i.test(css)) {
    return 'botanical-dark';
  }
  if (/THEME 4:\s*INDEX NOTEBOOK LIGHT/i.test(css) || /INDEX NOTEBOOK LIGHT/i.test(css)) {
    return 'comic-notebook-light';
  }
  if (/THEME 4:\s*INDEX NOTEBOOK DARK/i.test(css) || /INDEX NOTEBOOK DARK/i.test(css)) {
    return 'comic-notebook-dark';
  }
  if (/THEME:\s*MINIMAL LIGHT/i.test(css) || /MINIMAL LIGHT/i.test(css)) {
    return 'minimal-light';
  }
  if (/THEME:\s*MINIMAL DARK/i.test(css) || /MINIMAL DARK/i.test(css)) {
    return 'minimal-dark';
  }
  if (/THEME 1:\s*HERO POP LIGHT/i.test(css) || /HERO POP LIGHT/i.test(css)) {
    return 'comic-pop-light';
  }
  if (/THEME 1:\s*HERO POP DARK/i.test(css) || /HERO POP DARK/i.test(css)) {
    return 'comic-pop-dark';
  }

  // 2. Specific Theme Template / HTML / CSS Classes / Selectors & Model Name Checks
  // Duo Quest / Duolingo
  if (
    has(/theme-quest|quest-card|duo-quest|duolingo|quest-mnemonic-card|quest-meaning-banner|quest-tag-purple|quest-tag-blue|meaning-quest-label/) ||
    modelName.includes('duo quest') ||
    modelName.includes('duolingo') ||
    modelName.includes('quest')
  ) {
    const isDark =
      modelName.includes('dark') ||
      /duo quest dark|duolingo dark|quest-dark/i.test(allContent) ||
      /#0f172a|#1e293b/i.test(css);
    return isDark ? 'comic-quest-dark' : 'comic-quest-light';
  }

  // Botanical Sage
  if (
    has(/theme-botanical|botanical-card|botanical-meaning-box|botanical-definition-box|botanical-example-box|botanical-custom-title/) ||
    modelName.includes('botanical') ||
    modelName.includes('sage')
  ) {
    const isDark =
      modelName.includes('dark') ||
      /botanical.*dark|theme-botanical-dark|theme 6/i.test(allContent) ||
      /#1a201c|#19231a/i.test(css);
    return isDark ? 'botanical-dark' : 'botanical-light';
  }

  // Index Notebook
  if (
    has(/theme-notebook|notebook-card|notebook-washi-mnemonic|notebook-highlighter-meaning|notebook-sticky-example|washi-title/) ||
    modelName.includes('notebook')
  ) {
    const isDark =
      modelName.includes('dark') ||
      /notebook.*dark|theme-notebook-dark/i.test(allContent) ||
      /#1e232a|#181c22/i.test(css);
    return isDark ? 'comic-notebook-dark' : 'comic-notebook-light';
  }

  // Minimal
  if (
    has(/theme-minimal|minimal-card|minimal-mnemonic-block|minimal-meaning-block|minimal-definition-block/) ||
    modelName.includes('minimal')
  ) {
    const isDark =
      modelName.includes('dark') ||
      /minimal.*dark|theme-minimal-dark/i.test(allContent);
    return isDark ? 'minimal-dark' : 'minimal-light';
  }

  // Hero Pop / Comic Pop
  if (
    has(/theme-pop|hero-pop|comic-mnemonic-box|comic-word-hero-card|comic-meaning-box|comic-definition-box|comic-example-box/) ||
    modelName.includes('hero pop') ||
    modelName.includes('comic-pop') ||
    modelName.includes('comic pop') ||
    modelName.includes('hero')
  ) {
    const isDark =
      modelName.includes('dark') ||
      /hero pop dark|comic pop dark|theme-pop-dark/i.test(allContent) ||
      /#0b0f19/i.test(css);
    return isDark ? 'comic-pop-dark' : 'comic-pop-light';
  }

  // Legacy Manga / Arcade
  if (modelName.includes('manga') || modelName.includes('arcade')) {
    return modelName.includes('dark') ? 'comic-quest-dark' : 'comic-quest-light';
  }

  // Legacy Strip
  if (modelName.includes('strip')) {
    return modelName.includes('dark') ? 'comic-pop-dark' : 'comic-pop-light';
  }

  // Generic Light / Dark fallback from modelName if it has "Light" or "Dark"
  if (modelName.includes('dark')) {
    return 'comic-pop-dark';
  }
  if (modelName.includes('light')) {
    return 'comic-pop-light';
  }

  return null;
}

export interface AnkiModelMetadata {
  modelName: string;
  css: string;
  templateNames: string[];
  templates: Record<string, { Front: string; Back: string }>;
  templatesHtml: string;
  frontTemplatesHtml: string;
  isSpelling: boolean;
  fieldNames: string[];
}

export function isSpellingModel(
  modelName: string,
  templateNames: string[],
  frontTemplatesHtml: string
): boolean {
  // 1. Model name contains (Spelling) or Spelling or Spell
  if (/(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(modelName)) {
    return true;
  }
  // 2. Any template name in the model contains Spelling
  if (templateNames.some((name) => /(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(name))) {
    return true;
  }
  // 3. Template Front HTML contains spelling interactive check elements or inputs
  if (
    /id=["']spelling-input["']/i.test(frontTemplatesHtml) ||
    /checkSpelling\s*\(/i.test(frontTemplatesHtml) ||
    /spelling-target-word/i.test(frontTemplatesHtml) ||
    /spellingScript/i.test(frontTemplatesHtml) ||
    /class=["'][^"']*spelling-card[^"']*["']/i.test(frontTemplatesHtml) ||
    /class=["'][^"']*spelling-result[^"']*["']/i.test(frontTemplatesHtml) ||
    /\{\{type:[^}]+\}\}/i.test(frontTemplatesHtml) ||
    /<input[^>]*id=["']typeans["']/i.test(frontTemplatesHtml)
  ) {
    return true;
  }
  return false;
}

export async function searchAnkiNotes(
  baseUrl: string = 'http://127.0.0.1:8765',
  query: string = '',
  limit: number = 300
): Promise<{
  success: boolean;
  totalCount: number;
  noteIds: number[];
  notes: any[];
  error?: string;
}> {
  const cleanQuery = (query || '').trim();
  const ankiQuery = cleanQuery || '';

  const findRes = await callAnkiConnect(baseUrl, 'findNotes', { query: ankiQuery });
  if (!findRes.success) {
    return {
      success: false,
      totalCount: 0,
      noteIds: [],
      notes: [],
      error: findRes.error || 'Failed to search notes in Anki',
    };
  }

  const allNoteIds: number[] = Array.isArray(findRes.result) ? findRes.result : [];
  const totalCount = allNoteIds.length;
  if (totalCount === 0) {
    return {
      success: true,
      totalCount: 0,
      noteIds: [],
      notes: [],
    };
  }

  const pagedNoteIds = limit > 0 ? allNoteIds.slice(0, limit) : allNoteIds;
  const notesInfoRes = await callAnkiConnect(baseUrl, 'notesInfo', { notes: pagedNoteIds });
  if (!notesInfoRes.success) {
    return {
      success: false,
      totalCount,
      noteIds: pagedNoteIds,
      notes: [],
      error: notesInfoRes.error || 'Failed to fetch notes information from Anki',
    };
  }

  const rawNotes: any[] = Array.isArray(notesInfoRes.result) ? notesInfoRes.result : [];

  const firstCardIds: number[] = [];
  const noteToFirstCard = new Map<number, number>();
  for (const n of rawNotes) {
    if (Array.isArray(n.cards) && n.cards.length > 0) {
      firstCardIds.push(n.cards[0]);
      noteToFirstCard.set(n.noteId, n.cards[0]);
    }
  }

  const cardDeckMap = new Map<number, string>();
  const cardInfoByCardId = new Map<number, any>();
  if (firstCardIds.length > 0) {
    const cardsInfoRes = await callAnkiConnect(baseUrl, 'cardsInfo', { cards: firstCardIds });
    if (cardsInfoRes.success && Array.isArray(cardsInfoRes.result)) {
      for (const c of cardsInfoRes.result) {
        if (c.cardId) {
          cardInfoByCardId.set(c.cardId, c);
          if (c.deckName) {
            cardDeckMap.set(c.cardId, c.deckName);
          }
        }
      }
    }
  }

  // Pre-fetch model styling & templates for all unique note models directly from AnkiConnect
  const uniqueModelNames = Array.from(
    new Set(rawNotes.map((n) => n.modelName).filter(Boolean))
  ) as string[];

  const modelMetadataMap = new Map<string, AnkiModelMetadata>();

  if (uniqueModelNames.length > 0) {
    await Promise.all(
      uniqueModelNames.map(async (modelName) => {
        try {
          const [stylingRes, templatesRes, fieldsRes] = await Promise.all([
            callAnkiConnect(baseUrl, 'modelStyling', { modelName }),
            callAnkiConnect(baseUrl, 'modelTemplates', { modelName }),
            callAnkiConnect(baseUrl, 'modelFieldNames', { modelName }),
          ]);

          let css = '';
          if (stylingRes.success && stylingRes.result) {
            css =
              typeof stylingRes.result === 'string'
                ? stylingRes.result
                : stylingRes.result.css || '';
          }

          let templateNames: string[] = [];
          const templates: Record<string, { Front: string; Back: string }> = {};
          let templatesHtml = '';
          let frontTemplatesHtml = '';

          if (templatesRes.success && templatesRes.result && typeof templatesRes.result === 'object') {
            templateNames = Object.keys(templatesRes.result);
            for (const [tName, tDef] of Object.entries(templatesRes.result as Record<string, any>)) {
              const front = tDef?.Front || '';
              const back = tDef?.Back || '';
              templates[tName] = { Front: front, Back: back };
              frontTemplatesHtml += ` ${front}`;
              templatesHtml += ` ${front} ${back}`;
            }
          }

          const fieldNames: string[] =
            fieldsRes.success && Array.isArray(fieldsRes.result) ? fieldsRes.result : [];

          // Multi-point detection directly from AnkiConnect model information
          const isSpelling = isSpellingModel(modelName, templateNames, frontTemplatesHtml);

          modelMetadataMap.set(modelName, {
            modelName,
            css,
            templateNames,
            templates,
            templatesHtml,
            frontTemplatesHtml,
            isSpelling,
            fieldNames,
          });
        } catch (e) {
          console.warn(`[Anki] Could not fetch styling/templates for model "${modelName}":`, e);
        }
      })
    );
  }

  const formattedNotes = rawNotes.map((n) => {
    const noteFields = n.fields || {};
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (noteFields[k]?.value !== undefined) {
          const raw = String(noteFields[k].value).replace(/<[^>]+>/g, '').trim();
          if (raw) return raw;
        }
      }
      return '';
    };

    const getRawVal = (...keys: string[]) => {
      for (const k of keys) {
        if (noteFields[k]?.value !== undefined) {
          return String(noteFields[k].value).trim();
        }
      }
      return '';
    };

    const word = getVal('Word', 'word', 'Front', 'front', 'English', 'english', 'Term', 'term', 'Text', 'text') || `Note #${n.noteId}`;
    const meaning = getRawVal('Meaning', 'meaning', 'Persian Meaning', 'persianmeaning', 'Back', 'back', 'Translation', 'translation');
    const definitionEn = getRawVal('EnglishDefinition', 'englishdefinition', 'Definition', 'definition', 'DefinitionEn', 'definitionen', 'Extra', 'extra');
    const phonetic = getVal('Phonetic', 'phonetic', 'IPA', 'ipa', 'Pronunciation', 'pronunciation');
    // Note: 'Type' / 'type' removed to avoid misinterpreting card type fields as part of speech
    const partOfSpeech = getVal('PartOfSpeech', 'partofspeech', 'Part of Speech', 'pos', 'POS');
    const example = getRawVal('Example', 'example', 'Example Sentence', 'examplesentence', 'Sentence', 'sentence');
    const translation = getRawVal('Translation', 'translation', 'Example Translation', 'exampletranslation', 'Sentence Fa', 'sentencefa');
    const mnemonic = getRawVal('Mnemonic', 'mnemonic', 'Memory Aid', 'memoryaid', 'Aid', 'aid');
    const spellingSentence = getVal('SpellingSentence', 'spellingsentence');

    const firstCard = noteToFirstCard.get(n.noteId);
    const cardInfo = firstCard ? cardInfoByCardId.get(firstCard) : undefined;
    const modelMeta = modelMetadataMap.get(n.modelName);
    const cardOrd = typeof cardInfo?.ord === 'number' ? cardInfo.ord : 0;
    const cardTemplateName =
      cardInfo?.cardTemplate ||
      cardInfo?.template ||
      (modelMeta?.templateNames && modelMeta.templateNames[cardOrd]) ||
      '';
    const specificTemplate = cardTemplateName && modelMeta?.templates ? modelMeta.templates[cardTemplateName] : undefined;
    const specificFrontHtml = specificTemplate?.Front || '';

    // Authoritative Note Type name directly from AnkiConnect
    const actualNoteType = n.modelName || cardInfo?.modelName || 'Standard';

    // Multi-point determination of Card Type (Normal vs Spelling)
    let cardType: CardType = 'normal';
    if (
      specificFrontHtml &&
      (
        /id=["']spelling-input["']/i.test(specificFrontHtml) ||
        /checkSpelling\s*\(/i.test(specificFrontHtml) ||
        /spelling-target-word/i.test(specificFrontHtml) ||
        /spellingScript/i.test(specificFrontHtml) ||
        /class=["'][^"']*spelling-card[^"']*["']/i.test(specificFrontHtml) ||
        /class=["'][^"']*spelling-result[^"']*["']/i.test(specificFrontHtml) ||
        /\{\{type:[^}]+\}\}/i.test(specificFrontHtml) ||
        /<input[^>]*id=["']typeans["']/i.test(specificFrontHtml)
      )
    ) {
      cardType = 'spelling';
    } else if (cardTemplateName && /(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(cardTemplateName)) {
      cardType = 'spelling';
    } else if (actualNoteType && /(\b|_|\(|-)spell(ing)?(\b|_|\)|-)/i.test(actualNoteType)) {
      cardType = 'spelling';
    } else if (getVal('CardType', 'cardtype') === 'spelling') {
      cardType = 'spelling';
    } else if (modelMeta?.isSpelling && (!cardTemplateName || !/vocab|normal|card\s*1/i.test(cardTemplateName))) {
      cardType = 'spelling';
    } else {
      cardType = 'normal';
    }

    const cardImageRaw = getRawVal('CardImage', 'cardimage', 'Image', 'image', 'Picture', 'picture', 'Photo', 'photo');
    let imageFileName = '';
    const imgMatch = cardImageRaw.match(/<img\s+[^>]*src="([^"]+)"/i);
    if (imgMatch) {
      imageFileName = imgMatch[1];
    }

    const customFrontRaw = getRawVal('CustomFrontSections');
    const customBackRaw = getRawVal('CustomBackSections') || getRawVal('CustomSections');
    const mainBoxStylesRaw = getRawVal('MainBoxStyles');

    const frontCustomBlocks = parseCustomBlocksHtml(customFrontRaw, 'front');
    const backCustomBlocks = parseCustomBlocksHtml(customBackRaw, 'back');
    const mainBoxStyles = parseMainBoxStyles(mainBoxStylesRaw);

    const deckName = firstCard ? (cardDeckMap.get(firstCard) || 'Default') : 'Default';

    const extractSound = (val: string) => {
      const m = val.match(/\[sound:([^\]]+)\]/);
      return m ? m[1] : '';
    };

    const wordAudioUsNormalFileName = extractSound(getRawVal('WordAudioUsNormal'));
    const wordAudioUsSlowFileName = extractSound(getRawVal('WordAudioUsSlow'));
    const wordAudioUkNormalFileName = extractSound(getRawVal('WordAudioUkNormal'));
    const wordAudioUkSlowFileName = extractSound(getRawVal('WordAudioUkSlow'));
    const exampleAudioUsNormalFileName = extractSound(getRawVal('ExampleAudioUsNormal'));
    const exampleAudioUsSlowFileName = extractSound(getRawVal('ExampleAudioUsSlow'));
    const exampleAudioUkNormalFileName = extractSound(getRawVal('ExampleAudioUkNormal'));
    const exampleAudioUkSlowFileName = extractSound(getRawVal('ExampleAudioUkSlow'));
    const wordAudioFileName = extractSound(getRawVal('WordAudio')) || wordAudioUsNormalFileName;
    const exampleAudioFileName = extractSound(getRawVal('ExampleAudio')) || exampleAudioUsNormalFileName;

    const cleanFieldsMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(noteFields)) {
      cleanFieldsMap[k] = (v as any)?.value || '';
    }

    // Inspect note model styling, templates, and note content to detect original theme
    const detectedTheme = detectThemeFromAnkiData({
      modelName: actualNoteType,
      css: modelMeta?.css,
      templatesHtml: modelMeta?.templatesHtml,
      fields: cleanFieldsMap,
    });

    const cardData: CardData = {
      word,
      phonetic,
      partOfSpeech,
      meaningFa: meaning,
      definitionEn,
      example,
      translationFa: translation,
      mnemonic,
      cardType,
      noteType: actualNoteType,
      modelName: actualNoteType,
      spellingSentence,
      imageFileName,
      wordAudioUsNormalFileName,
      wordAudioUsSlowFileName,
      wordAudioUkNormalFileName,
      wordAudioUkSlowFileName,
      exampleAudioUsNormalFileName,
      exampleAudioUsSlowFileName,
      exampleAudioUkNormalFileName,
      exampleAudioUkSlowFileName,
      wordAudioFileName,
      exampleAudioFileName,
      frontCustomBlocks,
      backCustomBlocks,
      mainBoxStyles,
      tags: n.tags || [],
    };

    return {
      noteId: n.noteId,
      modelName: actualNoteType,
      noteType: actualNoteType,
      deckName,
      tags: n.tags || [],
      word,
      partOfSpeech,
      meaningFa: meaning,
      definitionEn,
      phonetic,
      example,
      translationFa: translation,
      mnemonic,
      cardType,
      detectedTheme: detectedTheme || undefined,
      fields: cleanFieldsMap,
      cardIds: n.cards || [],
      cardData,
    };
  });

  return {
    success: true,
    totalCount,
    noteIds: allNoteIds,
    notes: formattedNotes,
  };
}

