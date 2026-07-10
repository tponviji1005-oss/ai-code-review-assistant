import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  ResponsiveContainer,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const CATEGORY_COLORS = {
  bug: '#ef4444',
  security: '#f59e0b',
  performance: '#3b82f6',
  style: '#8b5cf6',
};

export default function Dashboard() {
  const { supabase } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [allIssues, setAllIssues] = useState([]);
  const [allFeedback, setAllFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewsErr) {
        console.error('Failed to fetch reviews:', reviewsErr.message);
        setLoading(false);
        return;
      }

      const reviewsList = reviewsData || [];
      setReviews(reviewsList);

      if (reviewsList.length === 0) {
        setLoading(false);
        return;
      }

      const reviewIds = reviewsList.map((r) => r.id);

      const { data: issuesData } = await supabase
        .from('issues')
        .select('*')
        .in('review_id', reviewIds);

      const issuesList = issuesData || [];
      setAllIssues(issuesList);

      if (issuesList.length > 0) {
        const issueIds = issuesList.map((i) => i.id);
        const { data: feedbackData } = await supabase
          .from('feedback')
          .select('*')
          .in('issue_id', issueIds);
        setAllFeedback(feedbackData || []);
      }

      setLoading(false);
    };

    fetchDashboardData();
  }, [supabase]);

  const stats = useMemo(() => {
    if (allIssues.length === 0) {
      return {
        totalReviews: reviews.length,
        totalIssues: 0,
        avgConfidence: 0,
        noiseReduction: 0,
        helpfulCount: 0,
        unhelpfulCount: 0,
        categoryBreakdown: [],
        confidenceTrend: [],
      };
    }

    const totalReviews = reviews.length;
    const totalIssues = allIssues.length;
    const avgConfidence = Math.round(
      allIssues.reduce((sum, i) => sum + (i.confidence || 0), 0) / totalIssues
    );
    const noiseCount = allIssues.filter((i) => i.confidence < 50).length;
    const noiseReduction = Math.round((noiseCount / totalIssues) * 100);

    const helpfulCount = allFeedback.filter((f) => f.is_helpful === true).length;
    const unhelpfulCount = allFeedback.filter((f) => f.is_helpful === false).length;

    // Category breakdown
    const categoryMap = {};
    allIssues.forEach((i) => {
      const cat = i.category || 'unknown';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Confidence trend: avg confidence per review, ordered by date
    const issuesByReview = {};
    allIssues.forEach((i) => {
      if (!issuesByReview[i.review_id]) issuesByReview[i.review_id] = [];
      issuesByReview[i.review_id].push(i.confidence || 0);
    });

    const reviewDateMap = {};
    reviews.forEach((r) => {
      reviewDateMap[r.id] = r.created_at;
    });

    const confidenceTrend = reviews
      .filter((r) => issuesByReview[r.id]?.length > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map((r) => {
        const confs = issuesByReview[r.id];
        const avg = Math.round(confs.reduce((s, c) => s + c, 0) / confs.length);
        return {
          date: new Date(r.created_at).toLocaleDateString(),
          confidence: avg,
        };
      });

    return {
      totalReviews,
      totalIssues,
      avgConfidence,
      noiseReduction,
      helpfulCount,
      unhelpfulCount,
      categoryBreakdown,
      confidenceTrend,
    };
  }, [reviews, allIssues, allFeedback]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSpinner message="Loading dashboard..." />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">No reviews yet</p>
          <p className="text-gray-500 mt-2">
            Submit your first code review to see analytics here.
          </p>
          <Link
            to="/"
            className="inline-block mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Submit a Review
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Reviews" value={stats.totalReviews} />
        <StatCard label="Issues Found" value={stats.totalIssues} />
        <StatCard label="Avg Confidence" value={`${stats.avgConfidence}%`} />
        <StatCard label="Noise Reduction" value={`${stats.noiseReduction}%`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Category Pie Chart */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Issue Categories</h2>
          {stats.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.categoryBreakdown.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CATEGORY_COLORS[entry.name] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No issues yet</p>
          )}
        </div>

        {/* Feedback Bar Chart */}
        <div className="bg-white border rounded-lg p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Feedback</h2>
          {(stats.helpfulCount + stats.unhelpfulCount) > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: 'Helpful', count: stats.helpfulCount },
                  { name: 'Unhelpful', count: stats.unhelpfulCount },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No feedback yet</p>
          )}
        </div>
      </div>

      {/* Confidence Trend Line Chart */}
      <div className="bg-white border rounded-lg p-4 shadow-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Confidence Trend</h2>
        {stats.confidenceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.confidenceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>
        )}
      </div>

      {/* Review History */}
      <h2 className="text-xl font-semibold mb-3">Review History</h2>
      <div className="space-y-3">
        {reviews.map((review) => {
          const reviewIssues = allIssues.filter((i) => i.review_id === review.id);
          const count = reviewIssues.length;
          const avgConf =
            count > 0
              ? Math.round(reviewIssues.reduce((s, i) => s + (i.confidence || 0), 0) / count)
              : 0;

          return (
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
                    {count} issue{count !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{avgConf}%</p>
                  <p className="text-xs text-gray-400">avg confidence</p>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400 truncate max-w-full">
                {review.diff_content?.split('\n').slice(0, 3).join(' ')}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
      <p className="text-2xl font-bold text-blue-600">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
