import MarkdownIt from 'markdown-it'

const safeMarkdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})

export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderSafeMarkdown(input: unknown): string {
  return safeMarkdown.render(String(input ?? ''))
}

export function renderSafeMarkdownInline(input: unknown): string {
  return safeMarkdown.renderInline(String(input ?? ''))
}

