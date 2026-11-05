function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert stored Markdown text to editable HTML for Quasar QEditor. */
export function markdownToEditorHtml(text: string): string {
  return text.split('\n').map(escapeHtml).join('<br>');
}

/**
 * Convert QEditor HTML back to plain Markdown text. Block boundaries and
 * `<br>` become newlines; inline formatting is not interpreted because raw mode
 * is a plain-text editor.
 */
export function editorHtmlToMarkdown(html: string): string {
  const container = document.createElement('div');
  container.innerHTML = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|h[1-6]|blockquote|pre)>/gi, '\n');
  return (container.textContent ?? '').replace(/\n$/, '');
}
