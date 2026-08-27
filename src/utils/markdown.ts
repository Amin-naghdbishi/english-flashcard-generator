/**
 * Markdown utility for Card Preview, Editor, and Anki Cards
 * Supports bold, italic, underline, links, bullet lists, numbered lists, and code.
 */

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts Markdown text into clean, safe HTML for card rendering.
 */
export function renderMarkdown(markdownText: string | undefined | null): string {
  if (!markdownText) return '';

  const text = String(markdownText);

  // Preserve pre-existing supported safe HTML tags (like <u>, <b>, <i>, <strong>, <em>, <code>, <br>)
  // First escape everything safely:
  let escaped = escapeHtml(text);

  // Allow safe tags back: &lt;u&gt; -> <u>, &lt;/u&gt; -> </u>, etc.
  escaped = escaped
    .replace(/&lt;(\/)?(u|b|i|strong|em|code|br|span)&gt;/gi, '<$1$2>')
    .replace(/&lt;span class=&quot;([^&"]+)&quot;&gt;/gi, '<span class="$1">')
    .replace(/&lt;a href=&quot;([^&"]+)&quot;( target=&quot;_blank&quot;)?&gt;/gi, '<a href="$1" target="_blank" rel="noopener noreferrer">')
    .replace(/&lt;\/a&gt;/gi, '</a>');

  // Split into lines for list and block processing
  const lines = escaped.split(/\r?\n/);
  const processedLines: string[] = [];

  let inBulletList = false;
  let inNumberList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);

    if (bulletMatch) {
      if (inNumberList) {
        processedLines.push('</ol>');
        inNumberList = false;
      }
      if (!inBulletList) {
        processedLines.push('<ul class="card-list card-bullet-list">');
        inBulletList = true;
      }
      processedLines.push(`<li>${parseInlineMarkdown(bulletMatch[2])}</li>`);
    } else if (numberMatch) {
      if (inBulletList) {
        processedLines.push('</ul>');
        inBulletList = false;
      }
      if (!inNumberList) {
        processedLines.push('<ol class="card-list card-number-list">');
        inNumberList = true;
      }
      processedLines.push(`<li>${parseInlineMarkdown(numberMatch[2])}</li>`);
    } else {
      if (inBulletList) {
        processedLines.push('</ul>');
        inBulletList = false;
      }
      if (inNumberList) {
        processedLines.push('</ol>');
        inNumberList = false;
      }

      if (line.trim() === '') {
        processedLines.push('<br/>');
      } else {
        processedLines.push(parseInlineMarkdown(line));
      }
    }
  }

  if (inBulletList) {
    processedLines.push('</ul>');
  }
  if (inNumberList) {
    processedLines.push('</ol>');
  }

  // Join lines with newline / break
  let result = processedLines.join('\n');

  // Replace double br with single paragraph spacing if excessive
  result = result.replace(/(?:<br\s*\/?>\s*){3,}/gi, '<br/><br/>');

  return result;
}

/**
 * Parses inline markdown: bold, italic, underline, links, inline code
 */
function parseInlineMarkdown(text: string): string {
  let out = text;

  // 1. Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code class="card-inline-code">$1</code>');

  // 2. Bold: **text** or __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // 3. Italic: *text* or _text_ (must not be inside word like a_b)
  out = out.replace(/(?:^|\s)\*([^*]+)\*(?=\s|$|[.,!?;:])/g, ' <em>$1</em>');
  out = out.replace(/(?:^|\s)_([^_]+)_(?=\s|$|[.,!?;:])/g, ' <em>$1</em>');

  // 4. Underline: ==text== or ~text~
  out = out.replace(/==([^=]+)==/g, '<u>$1</u>');
  out = out.replace(/~([^~]+)~/g, '<u>$1</u>');

  // 5. Links: [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="card-link">$1</a>');

  return out;
}

export type MarkdownAction =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'link'
  | 'bulletList'
  | 'numberedList'
  | 'code';

/**
 * Helper for textarea toolbars to insert or wrap markdown formatting around current selection
 */
export function applyMarkdownToText(
  fullText: string,
  start: number,
  end: number,
  action: MarkdownAction
): { newText: string; newStart: number; newEnd: number } {
  const selected = fullText.slice(start, end);
  const before = fullText.slice(0, start);
  const after = fullText.slice(end);

  let prefix = '';
  let suffix = '';
  let replacement = selected;

  switch (action) {
    case 'bold':
      prefix = '**';
      suffix = '**';
      if (!selected) replacement = 'bold text';
      break;

    case 'italic':
      prefix = '*';
      suffix = '*';
      if (!selected) replacement = 'italic text';
      break;

    case 'underline':
      prefix = '<u>';
      suffix = '</u>';
      if (!selected) replacement = 'underlined text';
      break;

    case 'code':
      prefix = '`';
      suffix = '`';
      if (!selected) replacement = 'code';
      break;

    case 'link':
      if (selected) {
        prefix = '[';
        suffix = '](https://example.com)';
      } else {
        prefix = '[';
        replacement = 'link text';
        suffix = '](https://example.com)';
      }
      break;

    case 'bulletList': {
      if (selected) {
        const lines = selected.split('\n');
        replacement = lines.map((l) => (l.startsWith('- ') ? l : `- ${l}`)).join('\n');
      } else {
        prefix = '\n- ';
        replacement = 'list item';
      }
      break;
    }

    case 'numberedList': {
      if (selected) {
        const lines = selected.split('\n');
        replacement = lines.map((l, idx) => (l.match(/^\d+\.\s/) ? l : `${idx + 1}. ${l}`)).join('\n');
      } else {
        prefix = '\n1. ';
        replacement = 'first item';
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
