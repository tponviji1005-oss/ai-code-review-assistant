import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import LoadingSpinner from '../components/LoadingSpinner';

const TOOL_COLORS = {
  myTool: '#3b82f6',
  coderabbit: '#f59e0b',
  copilot: '#8b55e3',
};

function signalToNoise(bugs, fps) {
  if (!bugs || bugs === 0) return 'N/A';
  return `${Math.round(((bugs - (fps || 0)) / bugs) * 100)}%`;
}

export default function Benchmark() {
  const { supabase, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [selectedReviewId, setSelectedReviewId] = useState('');
  const [testDiffName, setTestDiffName] = useState('');
  const [knownActualBugs, setKnownActualBugs] = useState('');
  const [myToolFalsePositives, setMyToolFalsePositives] = useState('');
  const [coderabbitBugsFound, setCoderabbitBugsFound] = useState('');
  const [coderabbitFalsePositives, setCoderabbitFalsePositives] = useState('');
  const [coderabbitTimeSeconds, setCoderabbitTimeSeconds] = useState('');
  const [copilotBugsFound, setCopilotBugsFound] = useState('');
  const [copilotFalsePositives, setCopilotFalsePositives] = useState('');
  const [copilotTimeSeconds, setCopilotTimeSeconds] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from('reviews')
        .select('id, created_at')
        .order('created_at', { ascending: false });

      if (reviewsErr) {
        console.error('Failed to fetch reviews:', reviewsErr.message);
      } else {
        setReviews(reviewsData || []);
      }

      const { data: benchmarksData, error: benchmarksErr } = await supabase
        .from('benchmarks')
        .select('*')
        .order('created_at', { ascending: false });

      if (benchmarksErr) {
        console.error('Failed to fetch benchmarks:', benchmarksErr.message);
      } else {
        setBenchmarks(benchmarksData || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/benchmark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          review_id: selectedReviewId || null,
          test_diff_name: testDiffName,
          known_actual_bugs: parseInt(knownActualBugs, 10) || 0,
          my_tool_false_positives: parseInt(myToolFalsePositives, 10) || 0,
          coderabbit_bugs_found: coderabbitBugsFound !== '' ? parseInt(coderabbitBugsFound, 10) : null,
          coderabbit_false_positives: coderabbitFalsePositives !== '' ? parseInt(coderabbitFalsePositives, 10) : null,
          coderabbit_time_seconds: coderabbitTimeSeconds !== '' ? parseFloat(coderabbitTimeSeconds) : null,
          copilot_bugs_found: copilotBugsFound !== '' ? parseInt(copilotBugsFound, 10) : null,
          copilot_false_positives: copilotFalsePositives !== '' ? parseInt(copilotFalsePositives, 10) : null,
          copilot_time_seconds: copilotTimeSeconds !== '' ? parseFloat(copilotTimeSeconds) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save benchmark');

      setBenchmarks((prev) => [data.benchmark, ...prev]);
      setSuccess('Benchmark saved successfully');
      setSelectedReviewId('');
      setTestDiffName('');
      setKnownActualBugs('');
      setMyToolFalsePositives('');
      setCoderabbitBugsFound('');
      setCoderabbitFalsePositives('');
      setCoderabbitTimeSeconds('');
      setCopilotBugsFound('');
      setCopilotFalsePositives('');
      setCopilotTimeSeconds('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = useMemo(() => {
    if (benchmarks.length === 0) return [];

    const totals = { myTool: { bugs: 0, fps: 0 }, coderabbit: { bugs: 0, fps: 0 }, copilot: { bugs: 0, fps: 0 } };
    let coderabbitCount = 0;
    let copilotCount = 0;

    benchmarks.forEach((b) => {
      totals.myTool.bugs += b.my_tool_bugs_found || 0;
      totals.myTool.fps += b.my_tool_false_positives || 0;
      if (b.coderabbit_bugs_found !== null) {
        totals.coderabbit.bugs += b.coderabbit_bugs_found || 0;
        totals.coderabbit.fps += b.coderabbit_false_positives || 0;
        coderabbitCount++;
      }
      if (b.copilot_bugs_found !== null) {
        totals.copilot.bugs += b.copilot_bugs_found || 0;
        totals.copilot.fps += b.copilot_false_positives || 0;
        copilotCount++;
      }
    });

    const count = benchmarks.length;
    return [
      { name: 'My Tool', avgBugs: +(totals.myTool.bugs / count).toFixed(1), avgFps: +(totals.myTool.fps / count).toFixed(1) },
      { name: 'CodeRabbit', avgBugs: coderabbitCount > 0 ? +(totals.coderabbit.bugs / coderabbitCount).toFixed(1) : 0, avgFps: coderabbitCount > 0 ? +(totals.coderabbit.fps / coderabbitCount).toFixed(1) : 0 },
      { name: 'Copilot', avgBugs: copilotCount > 0 ? +(totals.copilot.bugs / copilotCount).toFixed(1) : 0, avgFps: copilotCount > 0 ? +(totals.copilot.fps / copilotCount).toFixed(1) : 0 },
    ];
  }, [benchmarks]);

  const summaryStats = useMemo(() => {
    if (benchmarks.length === 0) return { myTool: null, coderabbit: null, copilot: null };

    let myToolBugs = 0, myToolFps = 0;
    let coderabbitBugs = 0, coderabbitFps = 0, coderabbitCount = 0;
    let copilotBugs = 0, copilotFps = 0, copilotCount = 0;

    benchmarks.forEach((b) => {
      myToolBugs += b.my_tool_bugs_found || 0;
      myToolFps += b.my_tool_false_positives || 0;
      if (b.coderabbit_bugs_found !== null) {
        coderabbitBugs += b.coderabbit_bugs_found || 0;
        coderabbitFps += b.coderabbit_false_positives || 0;
        coderabbitCount++;
      }
      if (b.copilot_bugs_found !== null) {
        copilotBugs += b.copilot_bugs_found || 0;
        copilotFps += b.copilot_false_positives || 0;
        copilotCount++;
      }
    });

    return {
      myTool: { bugs: myToolBugs, fps: myToolFps, snr: signalToNoise(myToolBugs, myToolFps) },
      coderabbit: coderabbitCount > 0 ? { bugs: coderabbitBugs, fps: coderabbitFps, snr: signalToNoise(coderabbitBugs, coderabbitFps) } : null,
      copilot: copilotCount > 0 ? { bugs: copilotBugs, fps: copilotFps, snr: signalToNoise(copilotBugs, copilotFps) } : null,
    };
  }, [benchmarks]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSpinner message="Loading benchmarks..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Benchmark</h1>

      {/* Form */}
      <div className="bg-white border rounded-lg p-6 shadow-sm mb-8">
        <h2 className="text-lg font-semibold mb-4">New Benchmark Entry</h2>
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 text-green-700 p-2 rounded mb-4 text-sm">{success}</div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1 text-sm font-medium">Test Diff Name</label>
              <input
                type="text"
                value={testDiffName}
                onChange={(e) => setTestDiffName(e.target.value)}
                placeholder="e.g. Test Case 1: SQL Injection"
                required
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Known Actual Bugs (Ground Truth)</label>
              <input
                type="number"
                value={knownActualBugs}
                onChange={(e) => setKnownActualBugs(e.target.value)}
                min="0"
                required
                className="w-full border px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Link to My Review (optional)</label>
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              >
                <option value="">-- Select a past review --</option>
                {reviews.map((r) => (
                  <option key={r.id} value={r.id}>
                    {new Date(r.created_at).toLocaleString()} — {r.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">My Tool False Positives</label>
              <input
                type="number"
                value={myToolFalsePositives}
                onChange={(e) => setMyToolFalsePositives(e.target.value)}
                min="0"
                className="w-full border px-3 py-2 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-3">CodeRabbit</h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Bugs Found</label>
                  <input
                    type="number"
                    value={coderabbitBugsFound}
                    onChange={(e) => setCoderabbitBugsFound(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">False Positives</label>
                  <input
                    type="number"
                    value={coderabbitFalsePositives}
                    onChange={(e) => setCoderabbitFalsePositives(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Time (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={coderabbitTimeSeconds}
                    onChange={(e) => setCoderabbitTimeSeconds(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-800 mb-3">GitHub Copilot</h3>
              <div className="space-y-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Bugs Found</label>
                  <input
                    type="number"
                    value={copilotBugsFound}
                    onChange={(e) => setCopilotBugsFound(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">False Positives</label>
                  <input
                    type="number"
                    value={copilotFalsePositives}
                    onChange={(e) => setCopilotFalsePositives(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Time (seconds)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={copilotTimeSeconds}
                    onChange={(e) => setCopilotTimeSeconds(e.target.value)}
                    min="0"
                    placeholder="N/A"
                    className="w-full border px-3 py-2 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Save Benchmark'}
          </button>
        </form>
      </div>

      {/* Signal-to-Noise Ratio Summary */}
      {benchmarks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">My Tool — Signal-to-Noise</p>
            <p className="text-2xl font-bold" style={{ color: TOOL_COLORS.myTool }}>{summaryStats.myTool?.snr || 'N/A'}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">CodeRabbit — Signal-to-Noise</p>
            <p className="text-2xl font-bold" style={{ color: TOOL_COLORS.coderabbit }}>{summaryStats.coderabbit?.snr || 'N/A'}</p>
          </div>
          <div className="bg-white border rounded-lg p-4 shadow-sm text-center">
            <p className="text-xs text-gray-500 mb-1">Copilot — Signal-to-Noise</p>
            <p className="text-2xl font-bold" style={{ color: TOOL_COLORS.copilot }}>{summaryStats.copilot?.snr || 'N/A'}</p>
          </div>
        </div>
      )}

      {/* Bar Chart */}
      {benchmarks.length > 0 && (
        <div className="bg-white border rounded-lg p-4 shadow-sm mb-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Average Bugs Found & False Positives by Tool</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgBugs" name="Avg Bugs Found" fill={TOOL_COLORS.myTool} radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgFps" name="Avg False Positives" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Results Table */}
      {benchmarks.length > 0 ? (
        <div className="bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Test Case</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">My Tool</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">CodeRabbit</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Copilot</th>
                <th className="text-center px-3 py-3 font-medium text-gray-600">Ground Truth</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.test_diff_name}</p>
                    <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="font-semibold" style={{ color: TOOL_COLORS.myTool }}>
                      {b.my_tool_bugs_found}/{b.my_tool_false_positives}
                    </span>
                    {b.my_tool_time_seconds !== null && (
                      <p className="text-xs text-gray-400">{b.my_tool_time_seconds}s</p>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    {b.coderabbit_bugs_found !== null ? (
                      <>
                        <span className="font-semibold" style={{ color: TOOL_COLORS.coderabbit }}>
                          {b.coderabbit_bugs_found}/{b.coderabbit_false_positives || 0}
                        </span>
                        {b.coderabbit_time_seconds !== null && (
                          <p className="text-xs text-gray-400">{b.coderabbit_time_seconds}s</p>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3">
                    {b.copilot_bugs_found !== null ? (
                      <>
                        <span className="font-semibold" style={{ color: TOOL_COLORS.copilot }}>
                          {b.copilot_bugs_found}/{b.copilot_false_positives || 0}
                        </span>
                        {b.copilot_time_seconds !== null && (
                          <p className="text-xs text-gray-400">{b.copilot_time_seconds}s</p>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3 font-semibold text-gray-800">
                    {b.known_actual_bugs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">No benchmarks yet</p>
          <p className="text-gray-500 mt-2">
            Run the same diff through CodeRabbit and Copilot, then enter the results above.
          </p>
        </div>
      )}
    </div>
  );
}
