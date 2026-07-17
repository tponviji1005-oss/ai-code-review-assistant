import { Router } from 'express';
import { reviewPullRequest } from '../services/review.js';

const router = Router();

const VALID_ACTIONS = new Set(['opened', 'synchronize', 'reopened']);

router.post('/github', async (req, res) => {
  const event = req.headers['x-github-event'];

  if (event !== 'pull_request') {
    return res.json({ success: true, message: 'Ignored non pull_request event' });
  }

  const action = req.body.action;
  const owner = req.body.repository.owner.login;
  const repo = req.body.repository.name;
  const prNumber = req.body.pull_request.number;

  console.log({ action, owner, repo, prNumber });

  if (!VALID_ACTIONS.has(action)) {
    return res.json({ success: true, message: 'Ignored non pull_request event' });
  }

  try {
    const result = await reviewPullRequest(owner, repo, prNumber);
    console.log(`[webhook] Review complete: commentPosted=${result.commentPosted}, reviews=${result.reviews.length}`);
    res.json({ success: true, message: 'Webhook received successfully', commentPosted: result.commentPosted });
  } catch (err) {
    console.error('[webhook] Review error:', err.message);
    console.error('[webhook] Full error:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

export default router;
