import { getPullRequestFiles, postReviewComment } from "./github.js";
import { reviewCode } from "../gemini.js";

export async function reviewPullRequest(owner, repo, pullNumber) {
  const files = await getPullRequestFiles(owner, repo, pullNumber);

  const filesWithPatch = files.filter(
    (file) => file.patch && file.patch.trim().length > 0
  );

  if (filesWithPatch.length === 0) {
    return { success: true, reviews: [], commentPosted: false };
  }

  const reviews = await Promise.all(
    filesWithPatch.map(async (file) => {
      const review = await reviewCode(file.patch);
      return {
        file: file.filename,
        review,
      };
    })
  );

  const markdownBody = reviews
    .map((r) => `### ${r.file}\n\n${r.review}`)
    .join("\n\n---\n\n");

  let commentPosted = false;

  try {
    await postReviewComment(owner, repo, pullNumber, markdownBody);
    commentPosted = true;
  } catch (err) {
    console.error("Failed to post review comment:", err.message);
  }

  return { success: true, reviews, commentPosted };
}
