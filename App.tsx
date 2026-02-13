
import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import DiagnosticDisplay from './components/DiagnosticDisplay';
import { getChiefAnalysis, getChiefTip } from './services/geminiService';
import { Paper, Question, HistoryEntry, ExamRecord } from './types';
import { generateQuestionFromEngine } from './utils/questionFactory';
import { generateSecureSequence } from './utils/entropy';

const TOTAL_QUESTIONS_PER_SECTION = 300;
const EXAM_LENGTH = 100;
const PASS_MARK = 65;

type AppMode = 'training' | 'simulation' | 'exam' | 'scoreboard';

const App: React.FC = () => {
  const [activePaper, setActivePaper] = useState<Paper>(Paper.P2A1);
  const [appMode, setAppMode] = useState<AppMode>(() => (localStorage.getItem('chief_mode') as AppMode) || 'training');
  const [score, setScore] = useState(() => Number(localStorage.getItem('chief_score')) || 0);
  const [history, setHistory] = useState<HistoryEntry[]>(() => JSON.parse(localStorage.getItem('chief_history') || '[]'));
  const [highScores, setHighScores] = useState<ExamRecord[]>(() => JSON.parse(localStorage.getItem('chief_high_scores') || '[]'));
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('chief_theme') as 'dark' | 'light') || 'dark');
  
  // Ref for scroll control
  const mainRef = useRef<HTMLElement>(null);

  const [examSequences] = useState<Record<string, number[]>>(() => {
    const saved = localStorage.getItem('chief_sequences');
    if (saved) return JSON.parse(saved);
    const initial = {
      [Paper.P2A1]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION),
      [Paper.P2A2]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION),
      [Paper.P2A3]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION),
      [Paper.P2B1]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION),
      [Paper.P2B2]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION),
      [Paper.P2B3]: generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION)
    };
    localStorage.setItem('chief_sequences', JSON.stringify(initial));
    return initial;
  });

  const [sequencePositions, setSequencePositions] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('chief_positions');
    const defaultPositions = {
      [Paper.P2A1]: 0, [Paper.P2A2]: 0, [Paper.P2A3]: 0,
      [Paper.P2B1]: 0, [Paper.P2B2]: 0, [Paper.P2B3]: 0
    };
    if (!saved) return defaultPositions;
    try {
      return JSON.parse(saved);
    } catch {
      return defaultPositions;
    }
  });

  const [examState, setExamState] = useState<{
    currentIndex: number;
    correctCount: number;
    questionIndices: number[];
    isFinished: boolean;
  } | null>(null);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; message: string; explanation?: string } | null>(null);
  const [chiefAnalysis, setChiefAnalysis] = useState<string | null>(null);
  const [chiefTip, setChiefTip] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('chief_score', score.toString());
    localStorage.setItem('chief_history', JSON.stringify(history));
    localStorage.setItem('chief_high_scores', JSON.stringify(highScores));
    localStorage.setItem('chief_theme', theme);
    localStorage.setItem('chief_mode', appMode);
    localStorage.setItem('chief_positions', JSON.stringify(sequencePositions));
  }, [score, history, highScores, theme, sequencePositions, appMode]);

  // AUTO-SCROLL TO TOP ON NEW QUESTION
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [currentQuestion?.id]);

  const loadQuestion = useCallback(async (paper: Paper, position: number, isExam: boolean = false) => {
    setLoading(true);
    setFeedback(null);
    setChiefAnalysis(null);
    setSelectedOption(null);
    
    if (!isExam) getChiefTip(paper).then(setChiefTip);
    
    const sequence = examSequences[paper];
    const actualIndex = sequence[position % TOTAL_QUESTIONS_PER_SECTION];
    const q = generateQuestionFromEngine(paper, actualIndex);
    setCurrentQuestion(q);
    setLoading(false);
  }, [examSequences]);

  useEffect(() => {
    if (appMode === 'exam') {
      if (examState && !examState.isFinished) {
        loadQuestion(activePaper, examState.questionIndices[examState.currentIndex], true);
      }
    } else if (appMode === 'training') {
      loadQuestion(activePaper, sequencePositions[activePaper] ?? 0);
    }
  }, [activePaper, sequencePositions[activePaper], appMode, examState, loadQuestion]);

  const startExam = () => {
    const indices = generateSecureSequence(TOTAL_QUESTIONS_PER_SECTION).slice(0, EXAM_LENGTH);
    setExamState({
      currentIndex: 0,
      correctCount: 0,
      questionIndices: indices,
      isFinished: false
    });
    setAppMode('exam');
    setIsMenuOpen(false);
  };

  const resetActivePractice = () => {
    if (confirm(`Reset all training progress for ${activePaper.split(' ')[0]}?`)) {
      setSequencePositions(prev => ({
        ...prev,
        [activePaper]: 0
      }));
      setAppMode('training');
      setIsMenuOpen(false);
    }
  };

  const nextQuestion = () => {
    if (appMode === 'exam' && examState) {
      if (examState.currentIndex + 1 >= EXAM_LENGTH) {
        finishExam();
      } else {
        setExamState(prev => prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null);
      }
    } else {
      setSequencePositions(prev => ({
        ...prev,
        [activePaper]: (prev[activePaper] + 1) % TOTAL_QUESTIONS_PER_SECTION
      }));
    }
  };

  const finishExam = () => {
    if (!examState) return;
    const finalScore = examState.correctCount;
    const passed = finalScore >= PASS_MARK;
    
    const record: ExamRecord = {
      id: crypto.randomUUID(),
      paper: activePaper,
      score: finalScore,
      total: EXAM_LENGTH,
      timestamp: Date.now(),
      passed
    };

    setHighScores(prev => [record, ...prev].slice(0, 50));
    setExamState(prev => prev ? { ...prev, isFinished: true } : null);
  };

  const handleOptionSelect = (key: string) => {
    if (feedback || !currentQuestion) return;
    
    setSelectedOption(key);
    const isCorrect = key === currentQuestion.correctKey;

    if (appMode === 'exam' && examState) {
      setExamState(prev => prev ? { ...prev, correctCount: prev.correctCount + (isCorrect ? 1 : 0) } : null);
    } else {
      setScore(s => isCorrect ? s + 1 : s);
    }

    setHistory(prev => [{ 
      questionId: currentQuestion.id, 
      paper: activePaper, 
      topic: currentQuestion.topic, 
      isCorrect, 
      timestamp: Date.now() 
    }, ...prev].slice(0, 10));

    // Instant Feedback
    setFeedback({ 
      isCorrect, 
      message: isCorrect ? "Log Verified." : "Critical Oversight.", 
      explanation: currentQuestion.explanation 
    });
  };

  const consultTheChief = async () => {
    if (!currentQuestion || !selectedOption || aiLoading) return;
    
    setAiLoading(true);
    const note = await getChiefAnalysis(
      currentQuestion.prompt,
      currentQuestion.options[selectedOption],
      selectedOption === currentQuestion.correctKey,
      currentQuestion.explanation,
      currentQuestion.topic
    );
    setChiefAnalysis(note);
    setAiLoading(false);
  };

  const currentPosInSession = (sequencePositions[activePaper] ?? 0) + 1;
  const progressPercent = appMode === 'exam' && examState 
    ? (examState.currentIndex / EXAM_LENGTH) * 100 
    : (currentPosInSession / TOTAL_QUESTIONS_PER_SECTION) * 100;

  const themeClasses = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-[#faf0ca] text-[#0d3b66]';
  const cardClasses = theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-[#0d3b6622] shadow-md';
  const sidebarClasses = theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-[#0d3b66] border-[#0d3b66] text-[#faf0ca]';

  if (appMode === 'scoreboard') {
    return (
      <div className={`min-h-screen flex flex-col font-mono ${themeClasses}`}>
        <header className="px-6 py-4 border-b flex justify-between items-center bg-black/20 backdrop-blur-lg">
          <h1 className="text-xl font-black italic tracking-tighter uppercase">Station Performance Log</h1>
          <button onClick={() => setAppMode('training')} className="px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest active:scale-90 transition-transform">Close</button>
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto space-y-4">
            {highScores.length === 0 ? (
              <div className="text-center py-20 opacity-30 italic">No records found. Complete an exam to begin tracking.</div>
            ) : (
              highScores.map((hs) => (
                <div key={hs.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between ${hs.passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${hs.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{hs.passed ? 'PASSED' : 'FAILED'}</span>
                    <h3 className="text-sm font-black">{hs.paper.split(' - ')[0]}</h3>
                    <p className="text-[10px] opacity-50 uppercase tracking-widest">{new Date(hs.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                     <span className="text-3xl font-black tracking-tighter">{hs.score}%</span>
                     <p className="text-[8px] opacity-40 uppercase">Grade</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${themeClasses}`}>
      <header className={`z-50 border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900/95' : 'border-[#0d3b6622] bg-white/95'} backdrop-blur-md`}>
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 -ml-2 rounded-xl bg-blue-500/10 text-blue-400 md:hidden active:scale-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <h1 className="text-sm font-black mono italic tracking-tighter uppercase">Chief's Log</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[7px] opacity-50 mono font-bold uppercase mb-0.5">Prog</span>
              <span className="text-xs font-black text-blue-400">
                {appMode === 'exam' ? `${(examState?.currentIndex || 0) + 1}/${EXAM_LENGTH}` : `${currentPosInSession}/${TOTAL_QUESTIONS_PER_SECTION}`}
              </span>
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-xl bg-white/5 active:scale-90">
              {theme === 'dark' ? <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> : <svg className="w-5 h-5 text-[#0d3b66]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            </button>
          </div>
        </div>
        <div className="w-full h-1 bg-white/5">
          <div className={`h-full ${appMode === 'exam' ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-blue-600 shadow-[0_0_10px_#2563eb]'} transition-all duration-700`} style={{ width: `${progressPercent}%` }}></div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className={`absolute md:relative z-[60] inset-y-0 left-0 w-80 md:w-72 border-r transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col ${sidebarClasses}`}>
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="font-black italic text-white uppercase text-xs">Navigation</h2>
            <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-white/50 text-2xl active:scale-90">&times;</button>
          </div>
          <div className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-2">
              <p className="text-[9px] opacity-50 mono uppercase font-black px-2">Station Controls</p>
              <button onClick={() => { setAppMode('training'); setIsMenuOpen(false); }} className={`w-full py-4 rounded-2xl flex items-center px-4 gap-3 font-black text-xs uppercase ${appMode === 'training' ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                Practice Room
              </button>
              <button onClick={() => { setAppMode('scoreboard'); setIsMenuOpen(false); }} className="w-full py-4 rounded-2xl flex items-center px-4 gap-3 font-black text-xs uppercase hover:bg-white/5 border border-white/5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Scoreboard
              </button>
              <button onClick={resetActivePractice} className="w-full py-4 rounded-2xl flex items-center px-4 gap-3 font-black text-xs uppercase text-rose-400 border border-rose-500/20 active:bg-rose-500/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Reset Progress
              </button>
            </div>
            <nav className="space-y-1">
              <p className="text-[9px] opacity-50 mono uppercase font-black px-2 mb-2">Examination Papers</p>
              {Object.values(Paper).map(paper => (
                <button
                  key={paper}
                  onClick={() => { setActivePaper(paper); setIsMenuOpen(false); setAppMode('training'); }}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all border-l-4 ${activePaper === paper ? 'bg-blue-600/10 border-blue-500 text-white' : 'border-transparent hover:bg-white/5 text-white/40'}`}
                >
                  <span className="text-[10px] font-black uppercase block">{paper.split(' - ')[0]}</span>
                  <span className="text-[8px] opacity-60 truncate block">{paper.split(' - ')[1]}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="p-6 bg-black/20 text-center">
            <button onClick={startExam} className="w-full py-4 rounded-2xl bg-orange-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-transform">Begin Final Exam</button>
          </div>
        </aside>

        {/* Main scrollable area */}
        <main 
          ref={mainRef}
          className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar scroll-smooth"
        >
          <div className="max-w-4xl mx-auto pb-24">
            {currentQuestion && (
              <div className="space-y-6">
                <div className={`${cardClasses} p-6 md:p-10 rounded-3xl animate-in slide-in-from-top-4 fade-in duration-500`}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-[10px] mono font-black rounded-lg uppercase">{currentQuestion.topic}</span>
                    <span className="text-[10px] mono opacity-30 uppercase">{currentQuestion.id}</span>
                  </div>
                  <p className="text-xl md:text-3xl font-bold leading-tight mb-10 select-text">
                    {currentQuestion.prompt}
                  </p>
                  <div className="grid gap-4">
                    {Object.entries(currentQuestion.options).map(([key, val]) => (
                      <button
                        key={key}
                        onClick={() => handleOptionSelect(key)}
                        disabled={!!feedback}
                        className={`w-full p-5 md:p-6 text-left border-2 rounded-2xl transition-all flex items-center gap-5 ${feedback ? key === currentQuestion.correctKey ? 'border-emerald-500 bg-emerald-500/5' : selectedOption === key ? 'border-rose-500 bg-rose-500/5' : 'border-transparent opacity-20' : selectedOption === key ? 'border-blue-500 bg-blue-500/5' : 'border-white/5 hover:border-white/20 active:bg-white/5'}`}
                      >
                        <span className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl font-black text-sm mono ${selectedOption === key ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>{key}</span>
                        <span className="text-sm md:text-lg font-semibold leading-tight">{val}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {feedback && (
                  <div className={`p-6 md:p-10 border-2 rounded-3xl animate-in slide-in-from-bottom-8 duration-500 ${feedback.isCorrect ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'}`}>
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-4 h-4 rounded-full ${feedback.isCorrect ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
                        <h4 className={`text-xl font-black mono uppercase ${feedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>{feedback.message}</h4>
                      </div>
                      
                      {!chiefAnalysis && !aiLoading && (
                        <button 
                          onClick={consultTheChief}
                          className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                        >
                          Request Debrief [AI]
                        </button>
                      )}
                    </div>

                    <div className="mb-8 p-6 rounded-2xl bg-black/20 border border-white/5">
                       <p className="text-xs md:text-sm leading-relaxed opacity-80">{feedback.explanation}</p>
                    </div>

                    {aiLoading && (
                      <div className="py-6 text-center animate-pulse">
                        <div className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        <div className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        <div className="inline-block w-2 h-2 bg-blue-500 rounded-full"></div>
                        <p className="text-[9px] mono uppercase font-black mt-2 opacity-50">Chief is drafting analysis...</p>
                      </div>
                    )}

                    {chiefAnalysis && (
                      <div className="mb-8 p-6 rounded-2xl bg-blue-600/5 border border-blue-500/20 animate-in fade-in duration-700">
                         <p className="text-[11px] md:text-sm italic leading-relaxed text-blue-100 opacity-90">
                           <span className="text-blue-400 font-black mr-2">CHIEF'S DEBRIEF:</span>
                           "{chiefAnalysis}"
                         </p>
                      </div>
                    )}

                    <div className="space-y-6">
                      <button onClick={nextQuestion} className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-widest text-sm rounded-2xl shadow-xl active:scale-95 transition-transform">Next Log Entry</button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-10">
                   <div className={`${cardClasses} p-6 rounded-3xl`}>
                      <h3 className="text-[10px] font-black uppercase opacity-40 mb-4 tracking-widest">Chief's Tip</h3>
                      <p className="text-sm italic leading-relaxed opacity-80">"{chiefTip}"</p>
                   </div>
                   <DiagnosticDisplay paper={activePaper} currentQuestion={currentQuestion} theme={theme} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      {isMenuOpen && <div onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] md:hidden" />}
    </div>
  );
};

export default App;
