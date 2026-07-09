import { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/IssueCard';
import SensitivitySlider from '../components/SensitivitySlider';

export default function ReviewView() {
  const { id } = useParams();
  const { supabase } = useAuth();
  const [issues, setIssues] = useState([]);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [sensitivity, setSensitivity] = useState(50);

  useEffect(() => {
    const fetchReview = async () => {
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

  const filteredIssues = useMemo(
    () => issues.filter((issue) => (issue.confidence ?? 0) >= sensitivity),
    [issues, sensitivity]
  );

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
        <p className="text-gray-500">Loading review...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link to="/dashboard" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>

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
          />
        ))}
      </div>
    </div>
  );
}
