import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { sortIssues } from '../utils/sortIssues';
import IssueCard from '../components/IssueCard';
import SensitivitySlider from '../components/SensitivitySlider';
import LoadingSpinner from '../components/LoadingSpinner';

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('429') || lower.includes('rate') || lower.includes('too many requests') || lower.includes('resource has been exhausted')) {
    return 'The AI service is rate-limited right now. Please wait a moment and try again.';
  }
  if (lower.includes('api key') || lower.includes('not configured')) {
    return 'AI service is not configured. Please contact your administrator.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (lower.includes('no diff')) {
    return 'Please paste a code diff before submitting.';
  }
  return msg;
}

export default function NewReview() {
  const { supabase } = useAuth();
  const [diff, setDiff] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sensitivity, setSensitivity] = useState(50);
  const [sortBy, setSortBy] = useState('priority');
  const [feedbackMap, setFeedbackMap] = useState({});
  const [personalized, setPersonalized] = useState(false);
  const [rootCause, setRootCause] = useState(null);
  const [rootCauseIndexes, setRootCauseIndexes] = useState([]);

  const filteredIssues = useMemo(() => {
    const filtered = issues.filter((issue) => (issue.confidence ?? 0) >= sensitivity);
    return sortIssues(filtered, sortBy);
  }, [issues, sensitivity, sortBy]);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diff.trim()) return;

    setLoading(true);
    setError(null);
    setIssues([]);
    setFeedbackMap({});
    setPersonalized(false);
    setRootCause(null);
    setRootCauseIndexes([]);

    try {
      const token = await getToken();
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ diff }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Review request failed');
      }

      setIssues(data.issues || []);
      setSensitivity(50);
      setSortBy('priority');
      setPersonalized(data.personalized || false);
      setRootCause(data.root_cause_summary || null);
      setRootCauseIndexes(data.root_cause_related_indexes || []);
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (issueId, isHelpful) => {
    setFeedbackMap((prev) => ({ ...prev, [issueId]: isHelpful }));
    try {
      const token = await getToken();
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">New Review</h1>

      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={diff}
          onChange={(e) => setDiff(e.target.value)}
          placeholder="Paste your git diff or code here..."
          rows={12}
          className="w-full border rounded-lg p-3 font-mono text-sm resize-y"
        />
        <button
          type="submit"
          disabled={loading || !diff.trim()}
          className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Reviewing...' : 'Submit for Review'}
        </button>
      </form>

      {loading && (
        <LoadingSpinner message="Analyzing code with AI..." />
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div>
          {personalized && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg mb-4 text-sm">
              Personalized based on your feedback history
            </div>
          )}

          {rootCause && (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg mb-4">
              <p className="text-sm font-semibold text-amber-800">
                Root Cause Detected
              </p>
              <p className="text-sm text-amber-700 mt-1">{rootCause}</p>
              {rootCauseIndexes.length > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Related issues: {rootCauseIndexes.map((i) => i + 1).join(', ')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-2">
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
          </div>

          <SensitivitySlider
            value={sensitivity}
            onChange={setSensitivity}
            total={issues.length}
            filtered={filteredIssues.length}
          />
          <h2 className="text-xl font-semibold mb-3">
            Issues Found ({issues.length})
          </h2>
          <div className="space-y-3">
            {filteredIssues.map((issue, i) => (
              <IssueCard
                key={issue.id || i}
                issue={issue}
                feedback={issue.id ? (feedbackMap[issue.id] ?? null) : null}
                onFeedback={issue.id ? handleFeedback : null}
                priorityNumber={issue.business_impact_priority_rank ?? null}
              />
            ))}
          </div>
          {filteredIssues.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              All issues filtered out. Lower the sensitivity to see more.
            </p>
          )}
        </div>
      )}

      {!loading && !error && issues.length === 0 && diff && (
        <p className="text-gray-500 text-center py-4">No issues were found.</p>
      )}
    </div>
  );
}
