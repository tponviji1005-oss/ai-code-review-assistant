import { GoogleGenerativeAI } from '@google/generative-ai';

function buildPrompt(parsedFiles, rawDiff, personalizationContext) {
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

  let personalizationBlock = '';
  if (personalizationContext) {
    personalizationBlock = `\n## User Preferences\n${personalizationContext}\n`;
  }

  return `You are an expert senior software engineer conducting a code review. Analyze the following code diff for bugs, security vulnerabilities, performance issues, and style problems.

## Raw Diff
\`\`\`diff
${rawDiff}
\`\`\`

## Parsed Changes
${filesSummary || '(no structured changes found)'}
${personalizationBlock}
For each issue found, provide the file name, exact line number, a category (bug|security|performance|style), severity (critical|high|medium|low), a confidence score (0-100), a clear description, and a specific fix suggestion.

Assign LOWER confidence (below 50) to minor style preferences or subjective suggestions, and HIGHER confidence (above 80) to clear bugs, security vulnerabilities, or definite logic errors.

For each issue, also provide a businessImpact object with:
- riskLevel: "critical" | "high" | "medium" | "low" (based on real-world business impact — data loss, downtime, revenue, security exposure)
- estimatedFixTime: a human-readable estimate like "5 minutes", "30 minutes", "2 hours", "1 day"
- priorityRank: an integer (1 = most urgent to fix first). Assign ranks across ALL issues based on a combination of severity, confidence, and riskLevel. Critical/high confidence issues get lower numbers.

${personalizationContext ? 'Weight your findings according to the user preferences above: provide more detail and higher confidence on categories the user values, and be more conservative with lower confidence on categories the user tends to dismiss.' : ''}

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
      "suggestion": "how to fix it",
      "businessImpact": {
        "riskLevel": "critical|high|medium|low",
        "estimatedFixTime": "e.g. 15 minutes",
        "priorityRank": 1
      }
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

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const maxRetries = 3;
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return cleanJsonResponse(text);
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
  if (message.includes('429') || message.includes('RATE_LIMIT') || message.includes('Too Many Requests') || message.includes('Resource has been exhausted')) {
    throw new Error('Gemini API rate limit exceeded. Please wait a moment and try again.');
  }
  if (message.includes('API key') || message.includes('invalid') || message.includes('PERMISSION_DENIED')) {
    throw new Error('Gemini API key is invalid or not configured.');
  }
  throw new Error(`Gemini call failed: ${message}`);
}

export async function reviewWithGemini(parsedFiles, rawDiff, personalizationContext) {
  const prompt = buildPrompt(parsedFiles, rawDiff, personalizationContext);
  const cleaned = await callGemini(prompt);
  const parsed = JSON.parse(cleaned);

  if (!parsed.issues || !Array.isArray(parsed.issues)) {
    throw new Error('Response missing issues array');
  }

  return parsed;
}

export async function detectRootCause(issues) {
  const issueList = issues.map((issue, idx) =>
    `[${idx}] File: ${issue.file}, Line: ${issue.line}, Category: ${issue.category}, Description: ${issue.description}`
  ).join('\n');

  const prompt = `You are an expert software engineer. Given the following list of code review issues, determine if multiple issues share a common underlying root cause.

## Issues
${issueList}

If multiple issues share a common root cause, return a short summary of that root cause and the indexes of the related issues.

Return ONLY valid JSON in this exact shape — no markdown, no code fences, no explanation outside the JSON:
{
  "rootCause": "short description of the shared root cause, or null if no clear shared cause exists",
  "relatedIssueIndexes": [0, 2, 5]
}

If no clear shared cause exists, return { "rootCause": null, "relatedIssueIndexes": [] }.`;

  try {
    const cleaned = await callGemini(prompt);
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (err) {
    console.error('Root cause detection failed:', err.message);
    return { rootCause: null, relatedIssueIndexes: [] };
  }
}
