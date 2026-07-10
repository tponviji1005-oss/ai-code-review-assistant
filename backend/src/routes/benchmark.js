import { Router } from 'express';
import { supabase } from '../supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/benchmark', authenticate, async (req, res) => {
  try {
    const {
      review_id,
      test_diff_name,
      known_actual_bugs,
      coderabbit_bugs_found,
      coderabbit_false_positives,
      coderabbit_time_seconds,
      copilot_bugs_found,
      copilot_false_positives,
      copilot_time_seconds,
    } = req.body;

    if (!test_diff_name || typeof test_diff_name !== 'string' || test_diff_name.trim().length === 0) {
      return res.status(400).json({ error: 'test_diff_name is required' });
    }

    if (known_actual_bugs === undefined || known_actual_bugs === null || typeof known_actual_bugs !== 'number') {
      return res.status(400).json({ error: 'known_actual_bugs is required and must be a number' });
    }

    let myToolBugsFound = 0;
    let myToolFalsePositives = 0;
    let myToolTimeSeconds = null;

    if (review_id) {
      const { data: issues, error: issuesErr } = await supabase
        .from('issues')
        .select('confidence')
        .eq('review_id', review_id);

      if (issuesErr) {
        console.error('Failed to fetch issues for benchmark:', issuesErr.message);
      } else if (issues) {
        myToolBugsFound = issues.filter((i) => (i.confidence || 0) >= 50).length;
      }
    }

    const { data, error } = await supabase
      .from('benchmarks')
      .insert({
        user_id: req.user.id,
        review_id: review_id || null,
        test_diff_name: test_diff_name.trim(),
        my_tool_bugs_found: myToolBugsFound,
        my_tool_false_positives: myToolFalsePositives,
        my_tool_time_seconds: myToolTimeSeconds,
        coderabbit_bugs_found: coderabbit_bugs_found ?? null,
        coderabbit_false_positives: coderabbit_false_positives ?? null,
        coderabbit_time_seconds: coderabbit_time_seconds ?? null,
        copilot_bugs_found: copilot_bugs_found ?? null,
        copilot_false_positives: copilot_false_positives ?? null,
        copilot_time_seconds: copilot_time_seconds ?? null,
        known_actual_bugs: known_actual_bugs,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    res.json({ benchmark: data });
  } catch (err) {
    console.error('Benchmark error:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
