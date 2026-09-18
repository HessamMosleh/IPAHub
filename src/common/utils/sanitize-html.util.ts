/**
 * Minimal, dependency-free rich-text sanitiser applied on WRITE (not render).
 *
 * It is intentionally conservative: it strips the constructs that turn stored
 * content into stored XSS — `<script>`/`<style>`/`<iframe>`/`<object>` blocks,
 * inline `on*` event handlers, and `javascript:` URLs — while leaving ordinary
 * formatting markup intact. Rich-text fields are sanitised here, at save time,
 * so a later render cannot be the only line of defence.
 */
export function sanitizeHtml(input?: string | null): string {
  if (!input) return '';

  let html = input;

  // Drop dangerous element blocks entirely, including their content.
  html = html.replace(
    /<(script|style|iframe|object|embed|form)\b[^>]*>[\s\S]*?<\/\1>/gi,
    '',
  );
  // Drop self-closing / unclosed variants of the same tags.
  html = html.replace(
    /<\/?(script|style|iframe|object|embed|form)\b[^>]*>/gi,
    '',
  );

  // Strip inline event handlers: on*="..." / on*='...' / on*=value.
  html = html.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '');
  html = html.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');

  // Neutralise javascript: and data: URIs in href/src.
  html = html.replace(
    /(href|src)\s*=\s*("|')\s*(javascript|data):[^"']*\2/gi,
    '$1=$2#$2',
  );

  return html.trim();
}
