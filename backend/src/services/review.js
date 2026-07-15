import { getPullRequestFiles } from "./github.js";
import { reviewCode } from "../gemini.js";

export async function reviewPullRequest(owner, repo, pullNumber) {
  const files = await getPullRequestFiles(owner, repo, pullNumber);

  const filesWithPatch = files.filter(
    (file) => file.patch && file.patch.trim().length > 0
  );

  if (filesWithPatch.length === 0) {
    return [];
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

  return reviews;
}
