import "dotenv/config";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function test() {
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });

    console.log("✅ Your repositories:\n");

    data.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}`);
    });

  } catch (err) {
    console.error(err.message);
  }
}

test();