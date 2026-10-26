import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  UploadCloud,
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sliders,
  Users,
  Clock,
  Layers,
  FileCode
} from 'lucide-react';

export default function HostCreateQuiz() {
  const navigate = useNavigate();

  // Mode: 'file' or 'topic'
  const [sourceMode, setSourceMode] = useState('file');

  // File state
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Manual topic / text state
  const [manualTopic, setManualTopic] = useState('');
  const [manualText, setManualText] = useState('');

  // Quiz config
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [timePerQuestion, setTimePerQuestion] = useState(20);
  const [mode, setMode] = useState('solo'); // 'solo' or 'team'

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0); // 0, 1, 2, 3, 4
  const [error, setError] = useState('');

  const progressSteps = [
    'Analyzing study material...',
    'Generating questions with AI...',
    'Checking answers & distractors...',
    'Preparing interactive quiz...',
    'Questions generated successfully!'
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    setError('');
    const ext = file.name.toLowerCase();
    const valid = ['.pdf', '.docx', '.pptx', '.txt'].some((x) => ext.endsWith(x));
    if (!valid) {
      setError('Please upload a PDF, DOCX, PPTX, or TXT document.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size is 15MB.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');

    if (sourceMode === 'file' && !selectedFile) {
      setError('Please select or drop a study file to upload.');
      return;
    }

    if (sourceMode === 'topic' && !manualTopic.trim() && !manualText.trim()) {
      setError('Please enter a topic name or paste study notes.');
      return;
    }

    setGenerating(true);
    setGenStep(0);

    // Step animation ticker
    const stepInterval = setInterval(() => {
      setGenStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 700);

    try {
      let aiResult;
      const quizTitle = title.trim() || manualTopic.trim() || selectedFile?.name?.replace(/\.[^/.]+$/, '') || 'New Quiz';
      const quizSubject = subject.trim() || manualTopic.trim() || 'General';

      if (sourceMode === 'file') {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('topic', quizSubject);
        formData.append('difficulty', difficulty);
        formData.append('count', questionCount);

        aiResult = await api.generateFromFile(formData);
      } else {
        aiResult = await api.generateFromText({
          topic: manualTopic,
          text: manualText,
          difficulty,
          count: questionCount
        });
      }

      clearInterval(stepInterval);
      setGenStep(4); // Success step

      // Create quiz in database with generated questions
      const createRes = await api.createQuiz({
        title: quizTitle,
        subject: quizSubject,
        difficulty,
        question_count: aiResult.questions?.length || questionCount,
        time_per_question: timePerQuestion,
        mode,
        questions: aiResult.questions || []
      });

      if (!createRes || !createRes.quiz) {
        throw new Error(createRes?.error || 'Failed to initialize quiz. Please try again.');
      }

      // Pause briefly so host sees success step
      setTimeout(() => {
        navigate(`/host/quiz/${createRes.quiz.id}`);
      }, 900);
    } catch (err) {
      clearInterval(stepInterval);
      setGenerating(false);
      setError(err.message || 'Quiz generation failed.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Create New Quiz</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload documents or input topics. Quizbee AI will synthesize competitive MCQs.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generation Progress Overlay (Section 17) */}
      {generating && (
        <div className="mb-8 p-8 rounded-2xl glass-card border border-amber-500/40 glow-amber text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
            {genStep === 4 ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
            ) : (
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
            )}
          </div>

          <h3 className="text-xl font-extrabold text-white mb-2">
            {progressSteps[genStep]}
          </h3>

          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-6">
            Synthesizing 4 options, identifying correct answers, and structuring speed scoring parameters.
          </p>

          <div className="w-full max-w-md mx-auto bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${((genStep + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* Source Mode Selector Tabs */}
        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSourceMode('file')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              sourceMode === 'file'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Study Material (PDF, DOCX, PPTX, TXT)</span>
          </button>

          <button
            type="button"
            onClick={() => setSourceMode('topic')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              sourceMode === 'topic'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Enter Topic / Notes Manually</span>
          </button>
        </div>

        {/* Source Mode: File Upload (Section 16) */}
        {sourceMode === 'file' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800">
            <label className="block text-sm font-bold text-white mb-2">
              Study Document
            </label>

            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
                  dragActive
                    ? 'border-amber-400 bg-amber-500/5'
                    : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
                }`}
              >
                <UploadCloud className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-white mb-1">
                  Drag and drop your file here, or{' '}
                  <label className="text-amber-400 hover:underline cursor-pointer">
                    Browse Files
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.pptx,.txt"
                      onChange={handleFileInput}
                    />
                  </label>
                </p>
                <p className="text-xs text-slate-500">
                  Supported: PDF, DOCX, PPTX, TXT (Up to 15MB)
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Ready to parse
                  </span>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Source Mode: Manual Topic / Notes */}
        {sourceMode === 'topic' && (
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Topic Name
              </label>
              <input
                type="text"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder="e.g. Cell Biology & Mitosis, World War II, React Hooks"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Paste Study Notes / Content (Optional)
              </label>
              <textarea
                rows={4}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste reference text, lecture summaries, key terms, or definitions..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              />
            </div>
          </div>
        )}

        {/* Quiz Configuration (Section 4) */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Quiz Configuration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midterm Physics Review"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Subject / Category
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Science, History, Computer Science"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              >
                <option value="Easy">Easy (Fundamentals)</option>
                <option value="Medium">Medium (Balanced)</option>
                <option value="Hard">Hard (Advanced Challenge)</option>
              </select>
            </div>

            {/* Question count */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Question Count
              </label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              >
                <option value={3}>3 Questions (Quick Test)</option>
                <option value={5}>5 Questions (Standard)</option>
                <option value={10}>10 Questions (Tournament)</option>
                <option value={15}>15 Questions (Mastery)</option>
              </select>
            </div>

            {/* Time per question */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Time Per Question
              </label>
              <select
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-400 text-white text-sm"
              >
                <option value={15}>15 Seconds (Lightning)</option>
                <option value={20}>20 Seconds (Recommended)</option>
                <option value={30}>30 Seconds (Thoughtful)</option>
                <option value={45}>45 Seconds (Deep Analysis)</option>
              </select>
            </div>
          </div>

          {/* Solo vs Team Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Competition Mode
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'solo'
                    ? 'border-amber-400 bg-amber-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <p className="font-bold text-sm text-white">Solo Battle</p>
                <p className="text-xs text-slate-400 mt-0.5">Every player competes individually on the leaderboard.</p>
              </button>

              <button
                type="button"
                onClick={() => setMode('team')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'team'
                    ? 'border-amber-400 bg-amber-500/10 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                <p className="font-bold text-sm text-white">Team Battle (Up to 4)</p>
                <p className="text-xs text-slate-400 mt-0.5">Players form squads of up to 4 with combined scoring.</p>
              </button>
            </div>
          </div>
        </div>

        {/* Generate Action Button */}
        <button
          type="submit"
          disabled={generating}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-base shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 transition-all hover:scale-101 disabled:opacity-50"
        >
          {generating ? (
            <span className="inline-block w-5 h-5 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>GENERATE AI QUIZ & REVIEW</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
