import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  UploadCloud,
  Zap,
  Users,
  Trophy,
  Gauge,
  ArrowRight,
  CheckCircle2,
  FileText,
  Play
} from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-amber-400" />,
      title: 'AI Quiz Generation',
      description: 'Transform raw notes, slides, and syllabus topics into multi-choice challenges with instant answer explanations.'
    },
    {
      icon: <UploadCloud className="w-6 h-6 text-amber-400" />,
      title: 'Upload Study Material',
      description: 'Drag & drop PDF, Word DOCX, PowerPoint PPTX, or plain text notes to generate quizzes in seconds.'
    },
    {
      icon: <Zap className="w-6 h-6 text-amber-400" />,
      title: 'Real-Time Competition',
      description: 'Low-latency Socket.IO multiplayer architecture keeps every player and screen perfectly synchronized.'
    },
    {
      icon: <Users className="w-6 h-6 text-amber-400" />,
      title: 'Teams Up To 4',
      description: 'Compete individually in Solo mode or collaborate in dynamic teams of up to 4 members with combined scoring.'
    },
    {
      icon: <Trophy className="w-6 h-6 text-amber-400" />,
      title: 'Live Host Leaderboard',
      description: 'The host system displays real-time podium updates, response graphs, and live accuracy statistics.'
    },
    {
      icon: <Gauge className="w-6 h-6 text-amber-400" />,
      title: 'Smart Scoring',
      description: 'Authoritative server-side algorithm calculates precision accuracy + lightning-fast speed bonuses up to 1000 points.'
    }
  ];

  return (
    <div className="relative overflow-hidden pt-8 pb-20">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto pt-10 pb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs sm:text-sm font-semibold mb-8 animate-bounce-subtle">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
            AI-Powered Competitive Learning Arena
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tight mb-4">
            QUIZ<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-500">BEE</span>
          </h1>

          <p className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-wide mb-6">
            Upload. Generate. Compete. Win.
          </p>

          <p className="text-lg sm:text-xl text-slate-300 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
            Turn your study material into interactive competitive quizzes. Upload documents or pick topics, unleash AI-generated MCQs, and battle friends in real-time.
          </p>

          {/* Core Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <Link
              to="/host/create"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="w-5 h-5" />
              <span>CREATE QUIZ</span>
            </Link>

            <Link
              to="/join"
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-bold bg-slate-800/90 hover:bg-slate-700/90 text-white border border-slate-700 hover:border-amber-400/50 shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              <Play className="w-5 h-5 fill-amber-400 text-amber-400" />
              <span>JOIN QUIZ</span>
            </Link>
          </div>

          {/* Quick Stats Banner */}
          <div className="mt-14 pt-8 border-t border-slate-800/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-extrabold text-white">4 Files</p>
              <p className="text-xs text-slate-400 font-medium mt-1">PDF, DOCX, PPTX, TXT</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-400">&lt; 3 Sec</p>
              <p className="text-xs text-slate-400 font-medium mt-1">AI Generation Speed</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">1000 Pts</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Accuracy + Speed Score</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-400">1 - 4 Members</p>
              <p className="text-xs text-slate-400 font-medium mt-1">Solo or Team Battle</p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid (Section 14) */}
        <div className="mt-12">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              Engineered For High-Stakes Multiplayer Competition
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-2">
              Everything educators and students need to run thrilling competitive review sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className="glass-card p-6 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all hover:-translate-y-1 group"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works (Section 31 Flow) */}
        <div className="mt-24 p-8 sm:p-12 rounded-3xl glass-panel border border-slate-800">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-12">
            The Quizbee Battle Cycle
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 text-center">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-3">1</span>
              <h4 className="font-bold text-white text-sm mb-1">Upload / Topic</h4>
              <p className="text-xs text-slate-400">Feed your notes or choose any curriculum subject.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-3">2</span>
              <h4 className="font-bold text-white text-sm mb-1">AI Generation</h4>
              <p className="text-xs text-slate-400">OpenAI synthesizes 4-choice questions & explanations.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-3">3</span>
              <h4 className="font-bold text-white text-sm mb-1">Create Room</h4>
              <p className="text-xs text-slate-400">Broadcast unique 6-character room code (e.g. QZB482).</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-3">4</span>
              <h4 className="font-bold text-white text-sm mb-1">Compete Live</h4>
              <p className="text-xs text-slate-400">Players battle solo or in 4-member teams on phones/laptops.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center mx-auto mb-3">5</span>
              <h4 className="font-bold text-white text-sm mb-1">Win & Podium</h4>
              <p className="text-xs text-slate-400">Host leaderboard celebrates top scorers with full analytics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
