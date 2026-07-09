import { Router } from 'express';
import { parseDiffText } from '../parseDiff.js';
import { reviewWithGemini } from '../geminiReviewer.js';

const router = Router();

router.post('/review', async (req, res) => {
  try {
    const { diff } = req.body;
    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      return res.status(400).json({ error: 'No diff or code provided' });
    }

    const parsedFiles = parseDiffText(diff);
    const result = await reviewWithGemini(parsedFiles, diff);

    res.json(result);
  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
