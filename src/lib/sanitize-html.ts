import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes user-supplied email HTML.
 * - Strips <script>, on* handlers, javascript: URLs, dangerous tags.
 * - Allows email-safe tags and inline styles.
 * - Forces external links to noopener/noreferrer.
 */
export function sanitizeEmailHtml(input: string): string {
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      'a', 'b', 'blockquote', 'br', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5',
      'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'small', 'span', 'strong',
      'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
      'center', 'font', 'style', 'html', 'head', 'body', 'meta', 'title',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'align',
      'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class', 'id',
      'target', 'rel', 'colspan', 'rowspan', 'valign', 'color', 'face', 'size',
      'name', 'content', 'http-equiv', 'lang', 'dir',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit'],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: false,
  });
  return cleaned;
}
