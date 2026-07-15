function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseInline(text) {
  let result = escapeHtml(text);
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>');
  return result;
}

function markdownToHtml(md) {
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let codeLines = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-3"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
        codeLines = [];
        inCodeBlock = false;
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (trimmed === '') {
      if (inList) { html += '</ul>'; inList = false; }
      continue;
    }

    if (/^---+\s*$/.test(trimmed)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<hr class="my-4 border-gray-200" />';
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (inList) { html += '</ul>'; inList = false; }
      const level = headingMatch[1].length;
      const tag = `h${level}`;
      const sizeClass = level === 1 ? 'text-2xl' : level === 2 ? 'text-xl' : 'text-lg';
      html += `<${tag} class="font-bold ${sizeClass} mt-4 mb-2 text-gray-800">${parseInline(headingMatch[2])}</${tag}>`;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) { html += '<ul class="list-disc pl-6 space-y-1 my-2">'; inList = true; }
      html += `<li class="text-sm text-gray-700">${parseInline(trimmed.replace(/^[-*]\s+/, ''))}</li>`;
      continue;
    }

    if (inList) { html += '</ul>'; inList = false; }
    html += `<p class="text-sm text-gray-700 my-2 leading-relaxed">${parseInline(trimmed)}</p>`;
  }

  if (inList) html += '</ul>';
  if (inCodeBlock) {
    html += `<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-3"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`;
  }

  return html;
}

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  );
}
