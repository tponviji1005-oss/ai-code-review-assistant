import { Router } from 'express';
import { parseDiffText } from '../parseDiff.js';
import { reviewWithGemini } from '../geminiReviewer.js';
import { supabase } from '../supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/review', authenticate, async (req, res) => {
  try {
    const { diff } = req.body;
    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      return res.status(400).json({ error: 'No diff or code provided' });
    }

    const parsedFiles = parseDiffText(diff);
    const result = await reviewWithGemini(parsedFiles, diff);

    const { data: review, error: reviewErr } = await supabase
      .from('reviews')
      .insert({ user_id: req.user.id, diff_content: diff })
      .select('id')
      .single();

    if (reviewErr) {
      console.error('Failed to save review:', reviewErr.message);
      return res.json(result);
    }

    const issuesToInsert = (result.issues || []).map((issue) => ({
      review_id: review.id,
      file: issue.file || 'input',
      line: issue.line || 0,
      category: issue.category || 'style',
      severity: issue.severity || 'low',
      confidence: issue.confidence ?? 50,
      description: issue.description || '',
      suggestion: issue.suggestion || '',
    }));

    if (issuesToInsert.length > 0) {
      const { data: savedIssues, error: issuesErr } = await supabase
        .from('issues')
        .insert(issuesToInsert)
        .select('id, file, line, category, severity, confidence, description, suggestion');

      if (issuesErr) {
        console.error('Failed to save issues:', issuesErr.message);
      } else {
        res.json({ review_id: review.id, issues: savedIssues });
        return;
      }
    }

    res.json({ review_id: review.id, issues: result.issues || [] });
  } catch (err) {
    console.error('Review error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/feedback', authenticate, async (req, res) => {
  try {
    const { issue_id, is_helpful } = req.body;
    if (!issue_id || typeof is_helpful !== 'boolean') {
      return res.status(400).json({ error: 'issue_id and is_helpful are required' });
    }

    const { data, error } = await supabase
      .from('feedback')
      .upsert(
        { issue_id, user_id: req.user.id, is_helpful },
        { onConflict: 'issue_id, user_id' }
      )
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({ feedback: data });
  } catch (err) {
    console.error('Feedback error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
