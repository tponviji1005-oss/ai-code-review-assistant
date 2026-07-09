import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between">
      <span className="font-bold text-lg">Code Review Assistant</span>
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
