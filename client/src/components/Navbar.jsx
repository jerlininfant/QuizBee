import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LogOut, User, PlusCircle, Play, Layers } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide regular navbar during active player quiz room to avoid distractions
  const isMinimal = location.pathname.startsWith('/player/quiz');
  if (isMinimal) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            🐝
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                QUIZBEE
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Upload. Generate. Compete. Win.</p>
          </div>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/join"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border border-amber-500/20 hover:border-amber-400/40 transition-all shadow-sm"
          >
            <Play className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Join Room</span>
          </Link>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/host"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  location.pathname === '/host'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>

              <Link
                to="/host/create"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 transition-all hover:scale-102"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Quiz</span>
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-amber-400 text-sm font-bold border border-slate-700">
                  {user.name?.charAt(0).toUpperCase() || 'H'}
                </div>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Host Login
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-md shadow-amber-500/20"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
