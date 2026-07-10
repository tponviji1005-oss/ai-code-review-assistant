import { Router } from 'express';
import { parseDiffText } from '../parseDiff.js';
import { reviewWithGemini, detectRootCause } from '../geminiReviewer.js';
import { supabase } from '../supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

async function buildPersonalizationContext(userId) {
  try {
    const { data: feedbackData } = await supabase
      .from('feedback')
      .select('is_helpful, issues(category)')
      .eq('user_id', userId);

    if (!feedbackData || feedbackData.length < 5) {
      return null;
    }

    const categories = ['bug', 'security', 'performance', 'style'];
    const categoryStats = {};

    for (const fb of feedbackData) {
      const cat = fb.issues?.category;
      if (!cat || !categories.includes(cat)) continue;
      if (!categoryStats[cat]) {
        categoryStats[cat] = { helpful: 0, unhelpful: 0 };
      }
      if (fb.is_helpful) {
        categoryStats[cat].helpful++;
      } else {
        categoryStats[cat].unhelpful++;
      }
    }

    const valued = [];
    const dismissed = [];

    for (const [cat, stats] of Object.entries(categoryStats)) {
      const total = stats.helpful + stats.unhelpful;
      if (total < 2) continue;
      const helpfulRate = stats.helpful / total;
      if (helpfulRate >= 0.6) {
        valued.push(cat);
      } else if (helpfulRate <= 0.3) {
        dismissed.push(cat);
      }
    }

    if (valued.length === 0 && dismissed.length === 0) {
      return null;
    }

    let summary = 'The user has provided feedback on past reviews. ';
    if (valued.length > 0) {
      summary += `They consistently find ${valued.join(' and ')} issues helpful. `;
    }
    if (dismissed.length > 0) {
      summary += `They tend to dismiss ${dismissed.join(' and ')} suggestions as unhelpful. `;
    }
    return summary;
  } catch (err) {
    console.error('Failed to build personalization context:', err.message);
    return null;
  }
}

router.post('/review', authenticate, async (req, res) => {
  try {
    const { diff } = req.body;
    if (!diff || typeof diff !== 'string' || diff.trim().length === 0) {
      return res.status(400).json({ error: 'No diff or code provided' });
    }

    const parsedFiles = parseDiffText(diff);

    const personalizationContext = await buildPersonalizationContext(req.user.id);
    const personalized = personalizationContext !== null;

    const result = await reviewWithGemini(parsedFiles, diff, personalizationContext);

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
      business_impact_risk_level: issue.businessImpact?.riskLevel || null,
      business_impact_fix_time: issue.businessImpact?.estimatedFixTime || null,
      business_impact_priority_rank: issue.businessImpact?.priorityRank || null,
    }));

    let savedIssues = result.issues || [];

    if (issuesToInsert.length > 0) {
      const { data: insertedIssues, error: issuesErr } = await supabase
        .from('issues')
        .insert(issuesToInsert)
        .select('id, file, line, category, severity, confidence, description, suggestion, business_impact_risk_level, business_impact_fix_time, business_impact_priority_rank');

      if (issuesErr) {
        console.error('Failed to save issues:', issuesErr.message);
      } else {
        savedIssues = insertedIssues;
      }
    }

    let rootCauseSummary = null;
    let rootCauseRelatedIndexes = [];

    if (savedIssues.length >= 3) {
      const rootCauseResult = await detectRootCause(savedIssues);
      if (rootCauseResult.rootCause) {
        rootCauseSummary = rootCauseResult.rootCause;
        rootCauseRelatedIndexes = rootCauseResult.relatedIssueIndexes || [];

        await supabase
          .from('reviews')
          .update({ root_cause_summary: rootCauseSummary })
          .eq('id', review.id);
      }
    }

    res.json({
      review_id: review.id,
      issues: savedIssues,
      personalized,
      root_cause_summary: rootCauseSummary,
      root_cause_related_indexes: rootCauseRelatedIndexes,
    });
  } catch (err) {
    console.error('Review error:', err.message);
    const msg = err.message || 'Internal server error';
    if (msg.includes('429') || msg.includes('RATE_LIMIT') || msg.includes('Too Many Requests') || msg.includes('Resource has been exhausted')) {
      return res.status(429).json({ error: 'The AI service is rate-limited right now. Please wait a moment and try again.' });
    }
    if (msg.includes('API key') || msg.includes('not configured')) {
      return res.status(500).json({ error: 'AI service is not configured. Please contact your administrator.' });
    }
    res.status(500).json({ error: msg });
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
