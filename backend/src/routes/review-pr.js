import { Router } from "express";
import { reviewPullRequest } from "../services/review.js";

const router = Router();

router.post("/review-pr", async (req, res) => {
  try {
    const { owner, repo, pullNumber } = req.body;

    if (!owner || !repo || !pullNumber) {
      return res.status(400).json({
        success: false,
        error: "owner, repo, and pullNumber are required",
      });
    }

    const result = await reviewPullRequest(owner, repo, pullNumber);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    console.error("PR review error:", err.message);

    if (err.status === 404) {
      return res.status(404).json({
        success: false,
        error: "Repository or pull request not found",
      });
    }

    if (err.status === 401 || err.status === 403) {
      return res.status(401).json({
        success: false,
        error: "Invalid or missing GitHub token",
      });
    }

    if (err.status === 403 && err.message?.includes("rate limit")) {
      return res.status(429).json({
        success: false,
        error: "GitHub API rate limit exceeded. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

export default router;
