import { useState } from 'react';
import MarkdownRenderer from '../components/MarkdownRenderer';
import LoadingSpinner from '../components/LoadingSpinner';

function friendlyError(msg) {
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('404') || lower.includes('not found')) {
    return 'Repository or pull request not found. Please check the owner, repo name, and PR number.';
  }
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'Invalid or missing GitHub token. Please check your configuration.';
  }
  if (lower.includes('429') || lower.includes('rate') || lower.includes('too many')) {
    return 'GitHub API rate limit exceeded. Please try again later.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }
  return msg;
}

export default function ReviewPR() {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [pullNumber, setPullNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [commentPosted, setCommentPosted] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!owner.trim() || !repo.trim() || !pullNumber.trim()) return;

    setLoading(true);
    setError(null);
    setReviews([]);
    setCommentPosted(null);

    try {
      const res = await fetch('/api/review/review-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: owner.trim(),
          repo: repo.trim(),
          pullNumber: Number(pullNumber.trim()),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Review request failed');
      }

      setReviews(data.reviews || []);
      setCommentPosted(data.commentPosted ?? false);
    } catch (err) {
      setError(friendlyError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Review Pull Request</h1>
      <p className="text-sm text-gray-500 mb-6">
        Enter the GitHub repository details and PR number to generate an AI code review.
      </p>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block mb-1 text-sm font-medium">GitHub Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. octocat"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Repository Name</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="e.g. my-project"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium">Pull Request Number</label>
            <input
              type="number"
              value={pullNumber}
              onChange={(e) => setPullNumber(e.target.value)}
              placeholder="e.g. 42"
              min="1"
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !owner.trim() || !repo.trim() || !pullNumber.trim()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Reviewing...' : 'Review PR'}
        </button>
      </form>

      {loading && (
        <LoadingSpinner message="Fetching PR files and analyzing with AI..." />
      )}

      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {!loading && reviews.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              Review Results ({reviews.length} file{reviews.length !== 1 ? 's' : ''})
            </h2>
            {commentPosted !== null && (
              <span
                className={`text-sm font-medium px-3 py-1 rounded-full ${
                  commentPosted
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {commentPosted
                  ? 'Comment posted to GitHub'
                  : 'Comment not posted'}
              </span>
            )}
          </div>

          <div className="space-y-6">
            {reviews.map((item, i) => (
              <div key={i} className="border rounded-lg p-5 bg-white shadow-sm">
                <h3 className="font-mono text-sm font-semibold text-gray-800 bg-gray-50 px-3 py-2 rounded mb-3">
                  {item.file}
                </h3>
                <MarkdownRenderer content={item.review} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && reviews.length === 0 && owner && repo && pullNumber && (
        <p className="text-gray-500 text-center py-4">
          No reviewable files found in this pull request.
        </p>
      )}
    </div>
  );
}
