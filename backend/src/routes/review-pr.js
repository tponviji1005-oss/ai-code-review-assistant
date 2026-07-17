import { Router } from 'express';
import { reviewPullRequest } from '../services/review.js';

const router = Router();

router.post('/review-pr', async (req, res) => {
  try {
    const { owner, repo, pullNumber } = req.body;

    if (!owner || typeof owner !== 'string' || owner.trim().length === 0) {
      return res.status(400).json({ error: 'owner is required' });
    }

    if (!repo || typeof repo !== 'string' || repo.trim().length === 0) {
      return res.status(400).json({ error: 'repo is required' });
    }

    if (pullNumber === undefined || pullNumber === null || typeof pullNumber !== 'number' || !Number.isInteger(pullNumber)) {
      return res.status(400).json({ error: 'pullNumber is required and must be an integer' });
    }

    const result = await reviewPullRequest(owner.trim(), repo.trim(), pullNumber);
    res.json(result);
  } catch (err) {
    console.error('PR review error:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
