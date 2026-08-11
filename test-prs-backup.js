import { config } from "dotenv";
import { Octokit } from "@octokit/rest";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: join(__dirname, "backend", ".env") });

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const { data: prs } = await octokit.pulls.list({
  owner: "tponviji1005-oss",
  repo: "ai-code-review-assistant",
  state: "open",
});

if (prs.length === 0) {
  console.log("No open pull requests found.");
} else {
  console.log(`Found ${prs.length} open PR(s):\n`);

  for (const pr of prs) {
    console.log(`PR #${pr.number}`);
    console.log(`  Title:   ${pr.title}`);
    console.log(`  Author:  ${pr.user.login}`);
    console.log(`  State:   ${pr.state}`);
    console.log(`  Created: ${pr.created_at}`);

    // Fetch changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner: "tponviji1005-oss",
      repo: "ai-code-review-assistant",
      pull_number: pr.number,
    });

    console.log("\nChanged Files:");
    console.log("----------------------------");

    for (const file of files) {
      console.log(`File: ${file.filename}`);
      console.log(`Status: ${file.status}`);
      console.log(`Additions: ${file.additions}`);
      console.log(`Deletions: ${file.deletions}`);

      if (file.patch) {
        console.log("\nPatch:");
        console.log(file.patch);
      }

      console.log("\n============================\n");
    }
  }
}