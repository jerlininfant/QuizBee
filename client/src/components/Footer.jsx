import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Footer() {
  const location = useLocation();

  // Hide footer on active game rooms to maintain clean focus
  if (
    location.pathname.startsWith('/player/quiz') ||
    location.pathname.startsWith('/player/room') ||
    location.pathname.startsWith('/host/room')
  ) {
    return null;
  }

  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🐝</span>
            <div>
              <p className="font-extrabold text-white tracking-wide">QUIZBEE</p>
              <p className="text-xs text-slate-400">Upload. Generate. Compete. Win.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <Link to="/join" className="hover:text-amber-400 transition-colors">Join Quiz</Link>
            <Link to="/host" className="hover:text-amber-400 transition-colors">Host Console</Link>
            <Link to="/host/create" className="hover:text-amber-400 transition-colors">AI Quiz Maker</Link>
          </div>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Quizbee Platform. Authoritative multiplayer architecture.
          </p>
        </div>
      </div>
    </footer>
  );
}
