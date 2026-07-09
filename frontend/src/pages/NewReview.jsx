import { useState, useMemo } from 'react';

const CATEGORY_COLORS = {
  bug: 'bg-red-100 text-red-800',
  security: 'bg-orange-100 text-orange-800',
  performance: 'bg-yellow-100 text-yellow-800',
  style: 'bg-blue-100 text-blue-800',
};

const SEVERITY_COLORS = {
  critical: 'bg-red-200 text-red-900',
  high: 'bg-orange-200 text-orange-900',
  medium: 'bg-yellow-200 text-yellow-900',
  low: 'bg-gray-100 text-gray-600',
};

function ConfidenceDot({ confidence }) {
  const color =
    confidence >= 80 ? 'bg-green-500' :
    confidence >= 50 ? 'bg-yellow-500' :
    'bg-gray-300';

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {confidence}% confidence
    </span>
  );
}

function IssueCard({ issue }) {
  const catColor = CATEGORY_COLORS[issue.category] || 'bg-gray-100 text-gray-800';
  const sevColor = SEVERITY_COLORS[issue.severity] || 'bg-gray-100 text-gray-600';

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-mono text-sm text-gray-500">
          {issue.file}:{issue.line}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${catColor}`}>
          {issue.category}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${sevColor}`}>
          {issue.severity}
        </span>
        <ConfidenceDot confidence={issue.confidence} />
      </div>
      <p className="text-sm mb-1">{issue.description}</p>
      {issue.suggestion && (
        <pre className="bg-gray-50 text-xs p-2 rounded overflow-x-auto whitespace-pre-wrap">
          {issue.suggestion}
        </pre>
      )}
    </div>
  );
}

function SensitivitySlider({ value, onChange, total, filtered }) {
  const hidden = total - filtered;
  const noisePct = total > 0 ? Math.round((hidden / total) * 100) : 0;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 font-semibold">Chill</span>
        <span className="text-sm font-medium">Sensitivity: {value}</span>
        <span className="text-xs text-gray-500 font-semibold">Assertive</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Show all</span>
        <span>Show only high-confidence</span>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Showing <strong>{filtered}</strong> of <strong>{total}</strong> total issues
        {hidden > 0 && (
          <span className="text-gray-400">
            {' — '}Filtered out {hidden} low-confidence suggestions (noise reduction: {noisePct}%)
          </span>
        )}
      </p>
    </div>
  );
}

export default function NewReview() {
  const [diff, setDiff] = useState('');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sensitivity, setSensitivity] = useState(50);

  const filteredIssues = useMemo(
    () => issues.filter((issue) => (issue.confidence ?? 0) >= sensitivity),
    [issues, sensitivity]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!diff.trim()) return;

    setLoading(true);
    setError(null);
    setIssues([]);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              <IssueCard key={i} issue={issue} />
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
