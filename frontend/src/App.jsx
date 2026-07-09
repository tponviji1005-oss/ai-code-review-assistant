import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NewReview from './pages/NewReview';
import Dashboard from './pages/Dashboard';
import ReviewView from './pages/ReviewView';

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<NewReview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/review/:id" element={<ReviewView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/*" element={<AuthenticatedLayout />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
