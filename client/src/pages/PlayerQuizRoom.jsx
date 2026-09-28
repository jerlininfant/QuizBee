import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, emitWhenConnected } from '../services/socket';
import Timer from '../components/Timer';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  Award,
  AlertCircle
} from 'lucide-react';

export default function PlayerQuizRoom() {
  const { code } = useParams();
  const roomCode = code?.toUpperCase();
  const navigate = useNavigate();

  const [player, setPlayer] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState(null);
  const [questionEndedInfo, setQuestionEndedInfo] = useState(null);
  const [myScore, setMyScore] = useState(0);

  // Track submission lock
  const submittedRef = useRef(false);

  useEffect(() => {
    // Read player session
    const savedPlayerStr = sessionStorage.getItem(`quizbee_player_${roomCode}`);
    if (!savedPlayerStr) {
      navigate(`/join?code=${roomCode}`);
      return;
    }
    const currentPlayerData = JSON.parse(savedPlayerStr);
    setPlayer(currentPlayerData);
    setMyScore(currentPlayerData.score || 0);

    const socket = getSocket();
    emitWhenConnected('join_room', {
      roomCode,
      playerId: currentPlayerData.id,
      isHost: false
    });

    socket.on('question_started', (data) => {
      // New question arrived! Reset local question state
      setCurrentQuestion(data.playerPayload);
      setSelectedOption(null);
      setSubmitted(false);
      submittedRef.current = false;
      setSubmissionFeedback(null);
      setQuestionEndedInfo(null);
    });

    socket.on('answer_result', (data) => {
      setSubmissionFeedback(data);
      if (data.totalScore !== undefined) {
        setMyScore(data.totalScore);
      }
    });

    socket.on('question_ended', (data) => {
      setQuestionEndedInfo(data);
      // If time expired without answering, lock UI
      if (!submittedRef.current) {
        setSubmitted(true);
        submittedRef.current = true;
      }
    });

    socket.on('quiz_finished', (data) => {
      navigate(`/results/${roomCode}`);
    });

    return () => {
      socket.off('question_started');
      socket.off('answer_result');
      socket.off('question_ended');
      socket.off('quiz_finished');
    };
  }, [roomCode, navigate]);

  const handleSelectOption = (letter) => {
    if (submitted) return;
    setSelectedOption(letter);
  };

  const handleSubmitAnswer = (chosenLetter) => {
    const finalChoice = chosenLetter || selectedOption;
    if (submittedRef.current || !finalChoice || !currentQuestion) return;

    setSubmitted(true);
    submittedRef.current = true;

    const socket = getSocket();
    socket.emit('submit_answer', {
      roomCode,
      playerId: player.id,
      questionId: currentQuestion.questionId,
      selectedOption: finalChoice,
      clientSubmitTime: Date.now()
    });
  };

  const handleTimeoutExpire = () => {
    // If player selected an option but didn't press submit, submit it!
    if (!submittedRef.current && selectedOption) {
      handleSubmitAnswer(selectedOption);
    } else {
      setSubmitted(true);
      submittedRef.current = true;
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-4xl mb-4 animate-bounce">
          🐝
        </div>
        <h2 className="text-2xl font-black text-white">Get Ready!</h2>
        <p className="text-slate-400 text-sm mt-1 max-w-sm">
          Next question is preparing. Be fast: speed bonus awards up to 1000 points.
        </p>
        <div className="mt-8 flex items-center gap-2 text-xs font-semibold text-amber-400">
          <Clock className="w-4 h-4 animate-spin" />
          <span>Synchronizing with host clock...</span>
        </div>
      </div>
    );
  }

  const options = [
    { letter: 'A', text: currentQuestion.optionA },
    { letter: 'B', text: currentQuestion.optionB },
    { letter: 'C', text: currentQuestion.optionC },
    { letter: 'D', text: currentQuestion.optionD }
  ];

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-4 py-6 flex flex-col justify-between">
      {/* Top HUD */}
      <div>
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block">
              QUESTION {currentQuestion.questionIndex + 1} OF {currentQuestion.totalQuestions}
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-extrabold text-white text-sm">{player?.name}</span>
              {player?.team_name && (
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {player.team_name}
                </span>
              )}
            </div>
          </div>

          {/* Points & Timer */}
          <div className="flex items-center gap-5">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 uppercase block">Score</span>
              <span className="text-xl font-black text-amber-400">{myScore.toLocaleString()}</span>
            </div>

            <Timer
              durationSeconds={currentQuestion.timeLimit}
              startTime={currentQuestion.startTime}
              onExpire={handleTimeoutExpire}
              paused={false}
            />
          </div>
        </div>

        {/* Question Prompt */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl mb-6">
          <h1 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
            {currentQuestion.questionText}
          </h1>
        </div>
      </div>

      {/* Answer Choices Grid (4 Choices) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
        {options.map((opt) => {
          const isSelected = selectedOption === opt.letter;
          const isQuestionEnded = !!questionEndedInfo;
          const isCorrectAnswer = isQuestionEnded && questionEndedInfo.correctAnswer === opt.letter;
          const isWrongChoice = isQuestionEnded && isSelected && !isCorrectAnswer;

          let cardStyle = 'border-slate-800 bg-slate-900/80 hover:border-slate-700 text-white';
          if (isSelected && !isQuestionEnded) {
            cardStyle = 'border-amber-400 bg-amber-500/20 text-white glow-amber';
          } else if (isCorrectAnswer) {
            cardStyle = 'border-emerald-500 bg-emerald-500/20 text-white glow-amber';
          } else if (isWrongChoice) {
            cardStyle = 'border-red-500 bg-red-500/20 text-white';
          }

          return (
            <button
              key={opt.letter}
              type="button"
              disabled={submitted}
              onClick={() => handleSelectOption(opt.letter)}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all duration-150 transform active:scale-98 disabled:cursor-not-allowed ${cardStyle}`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : isCorrectAnswer
                    ? 'bg-emerald-400 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {opt.letter}
              </div>
              <span className="text-base font-bold leading-snug pt-1">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Bar: Submit Button or Post-Answer Feedback */}
      <div className="pt-4">
        {!submitted ? (
          <button
            type="button"
            disabled={!selectedOption}
            onClick={() => handleSubmitAnswer(selectedOption)}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="w-5 h-5 fill-slate-950" />
            <span>CONFIRM ANSWER</span>
          </button>
        ) : submissionFeedback ? (
          /* Real-time result banner after answer */
          <div
            className={`p-5 rounded-2xl border text-center transition-all animate-fadeIn ${
              submissionFeedback.isCorrect
                ? 'bg-emerald-500/15 border-emerald-500/40 glow-amber'
                : 'bg-red-500/15 border-red-500/40'
            }`}
          >
            <div className="flex items-center justify-center gap-2 font-black text-lg mb-1">
              {submissionFeedback.isCorrect ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400">CORRECT! +{submissionFeedback.pointsAwarded} PTS</span>
                </>
              ) : (
                <>
                  <XCircle className="w-6 h-6 text-red-400" />
                  <span className="text-red-400">INCORRECT (+0 PTS)</span>
                </>
              )}
            </div>

            {submissionFeedback.explanation && (
              <p className="text-xs text-slate-300 max-w-md mx-auto mt-2">
                {submissionFeedback.explanation}
              </p>
            )}

            <p className="text-[11px] text-slate-400 mt-2">
              Answer locked. Waiting for next question from host...
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-center">
            <p className="text-sm font-bold text-amber-400">Answer Submitted!</p>
            <p className="text-xs text-slate-400 mt-0.5">Awaiting round completion...</p>
          </div>
        )}
      </div>
    </div>
  );
}
