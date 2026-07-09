import { GoogleGenerativeAI } from '@google/generative-ai';

function buildPrompt(parsedFiles, rawDiff) {
  const filesSummary = parsedFiles
    .map((f) => {
      let out = `File: ${f.name}\n`;
      if (f.additions.length > 0) {
        out += 'Additions:\n' + f.additions.map((a) => `+${a.line}: ${a.content}`).join('\n') + '\n';
      }
      if (f.deletions.length > 0) {
        out += 'Deletions:\n' + f.deletions.map((d) => `-${d.line}: ${d.content}`).join('\n') + '\n';
      }
      return out;
    })
    .join('\n---\n');

  return `You are an expert senior software engineer conducting a code review. Analyze the following code diff for bugs, security vulnerabilities, performance issues, and style problems.

## Raw Diff
\`\`\`diff
${rawDiff}
\`\`\`

## Parsed Changes
${filesSummary || '(no structured changes found)'}

For each issue found, provide the file name, exact line number, a category (bug|security|performance|style), severity (critical|high|medium|low), a confidence score (0-100), a clear description, and a specific fix suggestion.

Assign LOWER confidence (below 50) to minor style preferences or subjective suggestions, and HIGHER confidence (above 80) to clear bugs, security vulnerabilities, or definite logic errors.

Return ONLY valid JSON in this exact shape — no markdown, no code fences, no explanation outside the JSON:
{
  "issues": [
    {
      "file": "filename",
      "line": 12,
      "category": "bug|security|performance|style",
      "severity": "critical|high|medium|low",
      "confidence": 85,
      "description": "what is wrong",
      "suggestion": "how to fix it"
    }
  ]
}

If no issues are found, return { "issues": [] }.`;
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned;
}

export async function reviewWithGemini(parsedFiles, rawDiff) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = buildPrompt(parsedFiles, rawDiff);
  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const cleaned = cleanJsonResponse(text);
      const parsed = JSON.parse(cleaned);

      if (!parsed.issues || !Array.isArray(parsed.issues)) {
        throw new Error('Response missing issues array');
      }

      return parsed;
    } catch (err) {
      lastError = err;

      const isRateLimit =
        err.status === 429 ||
        (err.message && err.message.includes('429')) ||
        (err.message && err.message.includes('RATE_LIMIT')) ||
        (err.message && err.message.includes('Too Many Requests')) ||
        (err.message && err.message.includes('Resource has been exhausted'));

      if (isRateLimit && attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(`Rate limited — retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      break;
    }
  }

  const message = lastError?.message || 'Unknown error';
  throw new Error(`Review failed: ${message}`);
}
