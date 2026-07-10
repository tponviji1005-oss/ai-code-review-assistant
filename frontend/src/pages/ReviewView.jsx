import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { jsPDF } from 'jspdf';
import IssueCard from '../components/IssueCard';
import SensitivitySlider from '../components/SensitivitySlider';
import LoadingSpinner from '../components/LoadingSpinner';

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function sortIssues(issues, sortBy) {
  const sorted = [...issues];
  if (sortBy === 'priority') {
    sorted.sort((a, b) => (a.business_impact_priority_rank ?? 999) - (b.business_impact_priority_rank ?? 999));
  } else if (sortBy === 'severity') {
    sorted.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));
  } else if (sortBy === 'confidence') {
    sorted.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
  }
  return sorted;
}

function buildPriorityMap(issues) {
  const map = {};
  issues.forEach((issue) => {
    if (issue.business_impact_priority_rank != null) {
      map[issue.id] = issue.business_impact_priority_rank;
    }
  });
  return map;
}

function exportPdf(review, issues, filteredIssues) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(18);
  doc.text('Code Review Report', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Date: ${new Date(review.created_at || Date.now()).toLocaleDateString()}`, 20, y);
  y += 6;
  doc.text(`Total Issues: ${issues.length} | Showing: ${filteredIssues.length}`, 20, y);
  y += 12;

  doc.setTextColor(0);

  filteredIssues.forEach((issue, idx) => {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    const priority = issue.business_impact_priority_rank != null ? `#${issue.business_impact_priority_rank}` : '';

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${idx + 1}. ${priority} ${issue.file}:${issue.line}`, 20, y);
    y += 6;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Category: ${issue.category} | Severity: ${issue.severity} | Confidence: ${issue.confidence}%`, 20, y);
    y += 5;

    if (issue.business_impact_risk_level || issue.business_impact_fix_time) {
      doc.text(`Risk: ${issue.business_impact_risk_level || 'N/A'} | Fix Time: ~${issue.business_impact_fix_time || 'N/A'}`, 20, y);
      y += 5;
    }

    const descLines = doc.splitTextToSize(`Description: ${issue.description}`, pageWidth - 40);
    doc.text(descLines, 20, y);
    y += descLines.length * 4 + 2;

    if (issue.suggestion) {
      const sugLines = doc.splitTextToSize(`Suggestion: ${issue.suggestion}`, pageWidth - 40);
      doc.text(sugLines, 20, y);
      y += sugLines.length * 4 + 2;
    }

    y += 4;
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`code-review-${dateStr}.pdf`);
}

function exportMarkdown(review, issues, filteredIssues) {
  let md = '# Code Review Report\n\n';
  md += `**Date:** ${new Date(review.created_at || Date.now()).toLocaleDateString()}\n`;
  md += `**Total Issues:** ${issues.length} | **Showing:** ${filteredIssues.length}\n\n`;
  md += '---\n\n';

  filteredIssues.forEach((issue, idx) => {
    const priority = issue.business_impact_priority_rank != null ? `#${issue.business_impact_priority_rank}` : '';
    md += `## ${idx + 1}. ${priority} \`${issue.file}:${issue.line}\`\n\n`;
    md += `| Field | Value |\n|---|---|\n`;
    md += `| Category | ${issue.category} |\n`;
    md += `| Severity | ${issue.severity} |\n`;
    md += `| Confidence | ${issue.confidence}% |\n`;
    if (issue.business_impact_risk_level) {
      md += `| Risk Level | ${issue.business_impact_risk_level} |\n`;
    }
    if (issue.business_impact_fix_time) {
      md += `| Est. Fix Time | ~${issue.business_impact_fix_time} |\n`;
    }
    md += `\n**Description:** ${issue.description}\n\n`;
    if (issue.suggestion) {
      md += `**Suggestion:**\n\`\`\`\n${issue.suggestion}\n\`\`\`\n\n`;
    }
    md += '---\n\n';
  });

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `code-review-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReviewView() {
  const { id } = useParams();
  const { supabase } = useAuth();
  const [review, setReview] = useState(null);
  const [issues, setIssues] = useState([]);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [sensitivity, setSensitivity] = useState(50);
  const [sortBy, setSortBy] = useState('priority');

  useEffect(() => {
    const fetchReview = async () => {
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('root_cause_summary')
        .eq('id', id)
        .single();

      setReview(reviewData);

      const { data: issuesData, error } = await supabase
        .from('issues')
        .select('*')
        .eq('review_id', id);

      if (error) {
        console.error('Failed to fetch issues:', error.message);
        setIssues([]);
      } else {
        setIssues(issuesData || []);
        const issueIds = (issuesData || []).map((i) => i.id);

        if (issueIds.length > 0) {
          const { data: feedbackData } = await supabase
            .from('feedback')
            .select('issue_id, is_helpful')
            .in('issue_id', issueIds);

          const fbMap = {};
          (feedbackData || []).forEach((f) => {
            fbMap[f.issue_id] = f.is_helpful;
          });
          setFeedbackMap(fbMap);
        }
      }
      setLoading(false);
    };

    fetchReview();
  }, [id, supabase]);

  const filteredIssues = useMemo(() => {
    const filtered = issues.filter((issue) => (issue.confidence ?? 0) >= sensitivity);
    return sortIssues(filtered, sortBy);
  }, [issues, sensitivity, sortBy]);

  const priorityMap = useMemo(() => buildPriorityMap(issues), [issues]);

  const handleFeedback = async (issueId, isHelpful) => {
    setFeedbackMap((prev) => ({ ...prev, [issueId]: isHelpful }));
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || '';
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ issue_id: issueId, is_helpful: isHelpful }),
      });
    } catch {
      // silent fail
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSpinner message="Loading review..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/dashboard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

      {review?.root_cause_summary && (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg mb-4">
          <p className="text-sm font-semibold text-amber-800">
            Root Cause Detected
          </p>
          <p className="text-sm text-amber-700 mt-1">{review.root_cause_summary}</p>
        </div>
      )}

      {/* Export + Sort Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {issues.length > 0 && (
          <>
            <button
              onClick={() => exportPdf(review, issues, filteredIssues)}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-1.5 rounded"
            >
              Export as PDF
            </button>
            <button
              onClick={() => exportMarkdown(review, issues, filteredIssues)}
              className="bg-gray-700 hover:bg-gray-800 text-white text-sm px-4 py-1.5 rounded"
            >
              Export as Markdown
            </button>
          </>
        )}
        {issues.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-gray-500">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="priority">Priority</option>
              <option value="severity">Severity</option>
              <option value="confidence">Confidence</option>
            </select>
          </div>
        )}
      </div>

      {issues.length > 0 && (
        <SensitivitySlider
          value={sensitivity}
          onChange={setSensitivity}
          total={issues.length}
          filtered={filteredIssues.length}
        />
      )}

      <h2 className="text-xl font-semibold mb-3">
        Issues ({issues.length})
      </h2>

      {filteredIssues.length === 0 && (
        <p className="text-gray-500 text-center py-4">
          {issues.length === 0
            ? 'No issues found for this review.'
            : 'All issues filtered out. Lower the sensitivity to see more.'}
        </p>
      )}

      <div className="space-y-3">
        {filteredIssues.map((issue, i) => (
          <IssueCard
            key={issue.id || i}
            issue={issue}
            feedback={feedbackMap[issue.id] ?? null}
            onFeedback={handleFeedback}
            priorityNumber={issue.business_impact_priority_rank ?? null}
          />
        ))}
      </div>
    </div>
  );
}
