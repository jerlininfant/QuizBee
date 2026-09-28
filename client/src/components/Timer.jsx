import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function Timer({ durationSeconds, startTime, onExpire, paused = false }) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);

  useEffect(() => {
    if (paused) return;

    const calculateRemaining = () => {
      if (!startTime) return durationSeconds;
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, durationSeconds - elapsed);
      return parseFloat(remaining.toFixed(1));
    };

    setTimeLeft(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [durationSeconds, startTime, paused, onExpire]);

  const percentage = Math.max(0, Math.min(100, (timeLeft / durationSeconds) * 100));

  // Determine color states based on urgency
  let strokeColor = 'text-emerald-500';
  let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

  if (percentage <= 25) {
    strokeColor = 'text-red-500 animate-pulse';
    badgeBg = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
  } else if (percentage <= 50) {
    strokeColor = 'text-amber-500';
    badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  }

  return (
    <div className="flex items-center gap-3">
      {/* Circular graphic indicator */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-slate-800"
            strokeWidth="3.5"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className={`${strokeColor} transition-all duration-150`}
            strokeWidth="3.5"
            strokeDasharray="94.2"
            strokeDashoffset={94.2 - (percentage / 100) * 94.2}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xs font-black text-white">
          {Math.ceil(timeLeft)}s
        </span>
      </div>

      {/* Numerical pill */}
      <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeBg}`}>
        <Clock className="w-3.5 h-3.5" />
        <span>{Math.ceil(timeLeft)}s remaining</span>
      </div>
    </div>
  );
}
