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
    confidence >= 80 ? 'bg-green-500'
    : confidence >= 50 ? 'bg-yellow-500'
    : 'bg-gray-300';

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      {confidence}% confidence
    </span>
  );
}

export default function IssueCard({ issue, feedback, onFeedback }) {
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
        {issue.id && onFeedback && (
          <span className="ml-auto inline-flex items-center gap-1">
            <button
              onClick={() => onFeedback(issue.id, true)}
              disabled={feedback !== null}
              className={`px-2 py-0.5 text-sm rounded border ${
                feedback === true
                  ? 'bg-green-100 border-green-400 text-green-700'
                  : feedback === false
                    ? 'border-gray-200 text-gray-400'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              👍
            </button>
            <button
              onClick={() => onFeedback(issue.id, false)}
              disabled={feedback !== null}
              className={`px-2 py-0.5 text-sm rounded border ${
                feedback === false
                  ? 'bg-red-100 border-red-400 text-red-700'
                  : feedback === true
                    ? 'border-gray-200 text-gray-400'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
            >
              👎
            </button>
          </span>
        )}
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
