import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HostDashboard from './pages/HostDashboard';
import HostCreateQuiz from './pages/HostCreateQuiz';
import HostQuizEditor from './pages/HostQuizEditor';
import HostRoom from './pages/HostRoom';
import JoinQuizPage from './pages/JoinQuizPage';
import PlayerWaitingRoom from './pages/PlayerWaitingRoom';
import PlayerQuizRoom from './pages/PlayerQuizRoom';
import FinalResultsPage from './pages/FinalResultsPage';

// Layout
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Protected Route Wrapper for Host
function ProtectedHostRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="inline-block w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Verifying host credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Section 13 Web Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Host Portal Routes */}
          <Route
            path="/host"
            element={
              <ProtectedHostRoute>
                <HostDashboard />
              </ProtectedHostRoute>
            }
          />
          <Route
            path="/host/create"
            element={
              <ProtectedHostRoute>
                <HostCreateQuiz />
              </ProtectedHostRoute>
            }
          />
          <Route
            path="/host/quiz/:id"
            element={
              <ProtectedHostRoute>
                <HostQuizEditor />
              </ProtectedHostRoute>
            }
          />
          <Route
            path="/host/room/:code"
            element={
              <ProtectedHostRoute>
                <HostRoom />
              </ProtectedHostRoute>
            }
          />

          {/* Player Routes */}
          <Route path="/join" element={<JoinQuizPage />} />
          <Route path="/player/room/:code" element={<PlayerWaitingRoom />} />
          <Route path="/player/quiz/:code" element={<PlayerQuizRoom />} />

          {/* Results Route */}
          <Route path="/results/:code" element={<FinalResultsPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
