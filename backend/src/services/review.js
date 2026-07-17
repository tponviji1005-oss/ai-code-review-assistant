import { getPullRequestFiles, postReviewComment } from './github.js';
import { reviewWithGemini } from '../geminiReviewer.js';
import { parseDiffText } from '../parseDiff.js';

function buildReviewReport(reviews) {
  const totalIssues = reviews.reduce((sum, r) => sum + r.issues.length, 0);

  const lines = [
    `## AI Code Review`,
    ``,
    `**Files reviewed:** ${reviews.length} | **Issues found:** ${totalIssues}`,
  ];

  if (totalIssues === 0) {
    lines.push(``, `No issues found. The changes look good.`);
    return lines.join('\n');
  }

  for (const { filename, issues } of reviews) {
    if (issues.length === 0) continue;

    lines.push(``, `---`, ``);
    lines.push(`### \`${filename}\``);

    for (const issue of issues) {
      const confidence = issue.confidence ?? 'N/A';
      lines.push(``, `**[${issue.severity.toUpperCase()}]** ${issue.category} (confidence: ${confidence}%) — line ${issue.line}`);
      lines.push(``, `> ${issue.description}`);

      if (issue.suggestion) {
        lines.push(``, `**Suggestion:** ${issue.suggestion}`);
      }

      if (issue.businessImpact) {
        const { riskLevel, estimatedFixTime, priorityRank } = issue.businessImpact;
        const parts = [];
        if (riskLevel) parts.push(`Risk: ${riskLevel}`);
        if (estimatedFixTime) parts.push(`Est. fix: ${estimatedFixTime}`);
        if (priorityRank) parts.push(`Priority: #${priorityRank}`);
        if (parts.length > 0) {
          lines.push(``, `*${parts.join(' | ')}*`);
        }
      }
    }
  }

  lines.push(``, `---`, `*Reviewed by AI Code Review Assistant*`);
  return lines.join('\n');
}

export async function reviewPullRequest(owner, repo, pullNumber) {
  console.log(`[review] Starting review for ${owner}/${repo}#${pullNumber}`);

  const files = await getPullRequestFiles(owner, repo, pullNumber);
  console.log(`[review] Fetched ${files.length} changed files from GitHub`);

  const reviewable = files.filter(
    (f) => f.status !== 'removed' && f.status !== 'deleted' && f.patch
  );
  console.log(`[review] ${reviewable.length} reviewable files (after filtering)`);

  if (reviewable.length === 0) {
    console.warn('[review] No reviewable files found — skipping comment');
    return { success: true, reviews: [], commentPosted: false };
  }

  const reviews = [];

  for (const file of reviewable) {
    try {
      console.log(`[review] Reviewing ${file.filename}...`);
      const parsedFiles = parseDiffText(file.patch);
      const result = await reviewWithGemini(parsedFiles, file.patch, null);

      reviews.push({
        filename: file.filename,
        issues: result.issues || [],
      });
      console.log(`[review] ${file.filename}: ${result.issues?.length || 0} issues found`);
    } catch (err) {
      console.error(`[review] FAILED to review ${file.filename}: ${err.message}`);
      reviews.push({
        filename: file.filename,
        issues: [],
        error: err.message,
      });
    }
  }

  const report = buildReviewReport(reviews);
  console.log(`[review] Report built: ${report.length} chars, ${reviews.length} files`);

  await postReviewComment(owner, repo, pullNumber, report);
  console.log(`[review] Comment posted successfully on ${owner}/${repo}#${pullNumber}`);

  return { success: true, reviews, commentPosted: true };
}
