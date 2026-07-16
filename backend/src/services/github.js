import { Octokit } from '@octokit/rest';
import 'dotenv/config';

const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.warn('GITHUB_TOKEN not set — GitHub PR operations will fail');
}

const octokit = new Octokit({ auth: token || undefined });

export async function getPullRequest(owner, repo, pullNumber) {
  try {
    const { data } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
    return data;
  } catch (err) {
    const status = err.status || err.response?.status;
    if (status === 404) {
      throw new Error(`Pull request ${owner}/${repo}#${pullNumber} not found`);
    }
    if (status === 403) {
      throw new Error('GitHub token lacks permission to access this repository');
    }
    throw new Error(`Failed to fetch pull request: ${err.message}`);
  }
}

export async function getPullRequestFiles(owner, repo, pullNumber) {
  try {
    const files = [];
    const iterator = octokit.paginate.iterator(octokit.pulls.listFiles, {
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
    });

    for await (const { data } of iterator) {
      files.push(...data);
    }

    return files;
  } catch (err) {
    const status = err.status || err.response?.status;
    if (status === 404) {
      throw new Error(`Pull request ${owner}/${repo}#${pullNumber} not found`);
    }
    throw new Error(`Failed to fetch pull request files: ${err.message}`);
  }
}

export async function postReviewComment(owner, repo, pullNumber, body) {
  try {
    const { data } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body,
    });
    return data;
  } catch (err) {
    const status = err.status || err.response?.status;
    if (status === 404) {
      throw new Error(`Pull request ${owner}/${repo}#${pullNumber} not found`);
    }
    if (status === 403) {
      throw new Error('GitHub token lacks permission to post comments on this repository');
    }
    throw new Error(`Failed to post review comment: ${err.message}`);
  }
}
