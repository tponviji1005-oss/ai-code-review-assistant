import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { supabase } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch reviews:', error.message);
        setReviews([]);
      } else {
        const withStats = await Promise.all(
          (data || []).map(async (review) => {
            const { data: issues } = await supabase
              .from('issues')
              .select('confidence')
              .eq('review_id', review.id);

            const count = issues?.length || 0;
            const avgConf =
              count > 0
                ? Math.round(issues.reduce((s, i) => s + (i.confidence || 0), 0) / count)
                : 0;

            return { ...review, issueCount: count, avgConfidence: avgConf };
          })
        );
        setReviews(withStats);
      }
      setLoading(false);
    };

    fetchReviews();
  }, [supabase]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-500">Loading reviews...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Review History</h1>
      {reviews.length === 0 ? (
        <p className="text-gray-500">No reviews yet. Submit your first diff!</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Link
              key={review.id}
              to={`/review/${review.id}`}
              className="block border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {new Date(review.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {review.issueCount} issue{review.issueCount !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    {review.avgConfidence}%
                  </p>
                  <p className="text-xs text-gray-400">avg confidence</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400 truncate max-w-full">
                {review.diff_content?.split('\n').slice(0, 3).join(' ')}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
