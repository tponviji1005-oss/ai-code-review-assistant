import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-lg">Code Review Assistant</span>
        {user && (
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={`text-sm hover:text-gray-300 ${
                location.pathname === '/' ? 'text-blue-400' : 'text-gray-300'
              }`}
            >
              New Review
            </Link>
            <Link
              to="/review-pr"
              className={`text-sm hover:text-gray-300 ${
                location.pathname === '/review-pr' ? 'text-blue-400' : 'text-gray-300'
              }`}
            >
              Review PR
            </Link>
            <Link
              to="/dashboard"
              className={`text-sm hover:text-gray-300 ${
                location.pathname === '/dashboard' ? 'text-blue-400' : 'text-gray-300'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/benchmark"
              className={`text-sm hover:text-gray-300 ${
                location.pathname === '/benchmark' ? 'text-blue-400' : 'text-gray-300'
              }`}
            >
              Benchmark
            </Link>
          </div>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{user.email}</span>
          <button
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded text-sm"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
