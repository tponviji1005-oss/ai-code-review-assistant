import { reviewCode } from "./backend/src/gemini.js";
import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({
  path: join(__dirname, "backend", ".env"),
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Fetch open PRs
const { data: prs } = await octokit.pulls.list({
  owner: "tponviji1005-oss",
  repo: "ai-code-review-assistant",
  state: "open",
});

if (prs.length === 0) {
  console.log("❌ No open pull requests found.");
  process.exit(0);
}

console.log(`✅ Found ${prs.length} open PR(s)\n`);

for (const pr of prs) {
  console.log("========================================");
  console.log(`PR #${pr.number}`);
  console.log(`Title   : ${pr.title}`);
  console.log(`Author  : ${pr.user.login}`);
  console.log(`State   : ${pr.state}`);
  console.log(`Created : ${pr.created_at}`);
  console.log("========================================\n");

  // Fetch changed files
  const { data: files } = await octokit.pulls.listFiles({
    owner: "tponviji1005-oss",
    repo: "ai-code-review-assistant",
    pull_number: pr.number,
  });

  if (files.length === 0) {
    console.log("No changed files found.\n");
    continue;
  }

  console.log(`Changed Files: ${files.length}\n`);

  for (const file of files) {
    console.log("----------------------------------------");
    console.log(`File      : ${file.filename}`);
    console.log(`Status    : ${file.status}`);
    console.log(`Additions : ${file.additions}`);
    console.log(`Deletions : ${file.deletions}`);
    console.log("----------------------------------------");

    if (!file.patch) {
      console.log("⚠️ No patch available for this file.\n");
      continue;
    }

    console.log("\nGenerating AI Review...\n");

    try {
      const review = await reviewCode(file.patch);

      console.log("🤖 AI REVIEW");
      console.log("========================================");
      console.log(review);
      console.log("========================================\n");
    } catch (error) {
      console.error("❌ Failed to generate AI review:");
      console.error(error.message);
    }
  }
}