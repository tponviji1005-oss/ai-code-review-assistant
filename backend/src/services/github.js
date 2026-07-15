import { Octokit } from "@octokit/rest";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export async function getOpenPullRequests(owner, repo) {
  const { data } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
  });
  return data;
}

export async function getPullRequestFiles(owner, repo, pullNumber) {
  const { data } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return data;
}

export async function postReviewComment(owner, repo, pullNumber, body) {
  const { data } = await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
  return data;
}
