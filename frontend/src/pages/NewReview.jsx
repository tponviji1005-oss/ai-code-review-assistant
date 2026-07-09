import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import IssueCard from '../components/IssueCard';
import SensitivitySlider from '../components/SensitivitySlider';

export default function NewReview() {
  const { supabase } = useAuth();
  const [diff, setDiff] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sensitivity, setSensitivity] = useState(50);
  const [feedbackMap, setFeedbackMap] = useState({});

  const filteredIssues = useMemo(
    () => issues.filter((issue) => (issue.confidence ?? 0) >= sensitivity),
    [issues, sensitivity]
  );

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
    } catch (err) {
      setError(err.message);
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
        <p className="text-gray-500 text-center py-8">Analyzing code with AI...</p>
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && issues.length > 0 && (
        <div>
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
