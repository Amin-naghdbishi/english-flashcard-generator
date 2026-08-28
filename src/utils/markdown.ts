/**
 * HTML/CSS formatting utility for Card Preview, Editor, and Anki Cards.
 * Directly applies HTML/CSS tags so Anki cards render natively without requiring Markdown parsers.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const isBlockElement = (str: string): boolean => {
  return /<\/?(ul|ol|li|p|div|h[1-6]|hr|blockquote)\b/i.test(str);
};

/**
 * Formats card field content into clean, standard HTML ready for Anki and Live Preview.
 * Preserves all valid HTML/CSS tags while providing backward compatibility for legacy Markdown.
 */
export function formatCardFieldHtml(input: string | undefined | null): string {
  if (!input) return '';

  let text = String(input);

  // 1. Convert legacy Markdown syntax to HTML if present
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_ (ensure not part of HTML tag or attribute)
  text = text.replace(/(^|[^\*\w])\*([^\*\s][^\*]*?)\*(?=[^\*\w]|$)/g, '$1<em>$2</em>');

  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '<code class="card-inline-code">$1</code>');

  // Underline: ==text== or ~text~
  text = text.replace(/==([^=]+)==/g, '<u>$1</u>');
  text = text.replace(/~([^~]+)~/g, '<u>$1</u>');

  // Legacy Markdown link: [text](url)
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="card-link">$1</a>');

  // Legacy Markdown lists (- item or 1. item) if not already inside <ul> or <ol>
  if (!text.includes('<ul') && !text.includes('<ol>')) {
    const lines = text.split(/\r?\n/);
    let inList = false;
    let listType = '';
    const newLines: string[] = [];

    for (const line of lines) {
      const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
      const numberMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) newLines.push(`</${listType}>`);
          newLines.push('<ul class="card-list card-bullet-list">');
          inList = true;
          listType = 'ul';
        }
        newLines.push(`  <li>${bulletMatch[2]}</li>`);
      } else if (numberMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) newLines.push(`</${listType}>`);
          newLines.push('<ol class="card-list card-number-list">');
          inList = true;
          listType = 'ol';
        }
        newLines.push(`  <li>${numberMatch[2]}</li>`);
      } else {
        if (inList) {
          newLines.push(`</${listType}>`);
          inList = false;
          listType = '';
        }
        newLines.push(line);
      }
    }

    if (inList) {
      newLines.push(`</${listType}>`);
    }
    text = newLines.join('\n');
  }

  // 2. Ensure clean line breaks: convert standalone newlines outside of block elements to <br/>
  const lines = text.split(/\r?\n/);
  const formatted: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    formatted.push(line);

    if (i < lines.length - 1) {
      const nextLine = lines[i + 1];
      const currentTrim = line.trim();
      const nextTrim = nextLine.trim();

      if (
        !isBlockElement(line) &&
        !isBlockElement(nextLine) &&
        !currentTrim.endsWith('<br>') &&
        !currentTrim.endsWith('<br/>') &&
        currentTrim !== '' &&
        nextTrim !== ''
      ) {
        formatted.push('<br/>');
      }
    }
  }

  return formatted.join('\n');
}

/**
 * Backward-compatible alias for formatCardFieldHtml.
 */
export const renderMarkdown = formatCardFieldHtml;

export type HtmlToolbarAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'link'
  | 'bulletList'
  | 'numberedList'
  | 'code'
  | 'color'
  | 'highlight';

export type MarkdownAction = HtmlToolbarAction;

/**
 * Inserts or wraps HTML/CSS formatting directly around the selected text in input fields or textareas.
 */
export function applyHtmlFormattingToText(
  fullText: string,
  start: number,
  end: number,
  action: HtmlToolbarAction,
  extraValue?: string
): { newText: string; newStart: number; newEnd: number } {
  const selected = fullText.slice(start, end);
  const before = fullText.slice(0, start);
  const after = fullText.slice(end);

  let prefix = '';
  let suffix = '';
  let replacement = selected;

  switch (action) {
    case 'bold':
      prefix = '<strong>';
      suffix = '</strong>';
      if (!selected) replacement = 'bold text';
      break;

    case 'italic':
      prefix = '<em>';
      suffix = '</em>';
      if (!selected) replacement = 'italic text';
      break;

    case 'underline':
      prefix = '<u>';
      suffix = '</u>';
      if (!selected) replacement = 'underlined text';
      break;

    case 'color': {
      const colorHex = extraValue || '#38BDF8';
      prefix = `<span style="color: ${colorHex};">`;
      suffix = '</span>';
      if (!selected) replacement = 'colored text';
      break;
    }

    case 'highlight': {
      const bgHex = extraValue || '#FEF08A';
      prefix = `<mark style="background-color: ${bgHex}; color: #0f172a; padding: 1px 4px; border-radius: 3px;">`;
      suffix = '</mark>';
      if (!selected) replacement = 'highlighted text';
      break;
    }

    case 'code':
      prefix = '<code class="card-inline-code">';
      suffix = '</code>';
      if (!selected) replacement = 'code';
      break;

    case 'link':
      if (selected) {
        prefix = '<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="card-link">';
        suffix = '</a>';
      } else {
        prefix = '<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="card-link">';
        replacement = 'link text';
        suffix = '</a>';
      }
      break;

    case 'bulletList': {
      if (selected) {
        const rawLines = selected.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const listItems = (rawLines.length > 0 ? rawLines : [selected.trim() || 'list item'])
          .map((l) => `  <li>${l}</li>`)
          .join('\n');
        prefix = '<ul class="card-list card-bullet-list">\n';
        replacement = listItems;
        suffix = '\n</ul>';
      } else {
        prefix = '<ul class="card-list card-bullet-list">\n';
        replacement = '  <li>list item</li>';
        suffix = '\n</ul>';
      }
      break;
    }

    case 'numberedList': {
      if (selected) {
        const rawLines = selected.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const listItems = (rawLines.length > 0 ? rawLines : [selected.trim() || 'first item'])
          .map((l) => `  <li>${l}</li>`)
          .join('\n');
        prefix = '<ol class="card-list card-number-list">\n';
        replacement = listItems;
        suffix = '\n</ol>';
      } else {
        prefix = '<ol class="card-list card-number-list">\n';
        replacement = '  <li>first item</li>';
        suffix = '\n</ol>';
      }
      break;
    }
  }

  const inserted = `${prefix}${replacement}${suffix}`;
  const newText = `${before}${inserted}${after}`;
  const newStart = start + prefix.length;
  const newEnd = newStart + replacement.length;

  return { newText, newStart, newEnd };
}

/**
 * Backward-compatible alias for applyHtmlFormattingToText.
 */
export const applyMarkdownToText = applyHtmlFormattingToText;
